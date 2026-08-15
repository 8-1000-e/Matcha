# Architecture — découverte et feed

Complète `db-schema.md`, qui décrit les tables. Ce fichier décrit le mécanisme
du feed, ajouté le 2026-08-14.

## Le feed figé par session

```
GET /api/discovery?ageMin=25&tags=3,7&sort=distance&session=…&after=40
        │
        ├─ validateDiscoveryQuery   lit et borne les parametres, accumule les erreurs
        ├─ filtersHash              SHA-256 d'un JSON normalise (tags tries, sans pagination)
        │
        ├─ findFeedSession          (user_id, filters_hash) + moins de 30 min ?
        │      trouvee  ──────────────────────────────┐
        │      absente  ─→ openFeedSession            │
        │                    supprime l'ancienne      │
        │                    materialise 100 candidats│
        │                                             ▼
        └─ readFeedPage    lit les positions, etend la session si on approche de la fin,
                           puis REJOUE les exclusions via findCandidatesByIds
```

### Deux tables

`feed_sessions` — `(id, user_id, filters_hash, total, exhausted, created_at)`,
avec `UNIQUE (user_id, filters_hash)` : mêmes filtres = même session.

`feed_entries` — `(session_id, position, candidate_id)`, clé primaire
`(session_id, position)`. Lire une page est un parcours d'index, sans tri.

`ON DELETE CASCADE` partout : supprimer une session efface ses entrées.

### Pourquoi l'ordre est figé mais pas les droits

L'instantané garantit qu'aucun profil n'est vu deux fois ni sauté. Mais entre
deux pages, quelqu'un peut avoir été liké ou avoir bloqué le lecteur. C'est
pourquoi `readFeedPage` ne renvoie pas les lignes de `feed_entries` telles
quelles : il rappelle `findCandidatesByIds`, qui réapplique
`discoveryConditions` — soi-même, profils incomplets ou non vérifiés, blocages
dans les deux sens, orientation, déjà likés.

Conséquence assumée : **une page peut rendre moins d'éléments que demandé**. Le
curseur renvoyé est la **dernière position lue**, jamais le nombre d'éléments
rendus, sinon on décale et on saute des profils.

### Matérialisation par tranches

`openFeedSession` n'écrit que les 100 premiers. `readFeedPage` étend de 100 dès
que la lecture s'en approche, en excluant explicitement les candidats déjà
présents (`excludeIds`), ce qui rend un doublon impossible même si les données
bougent entre deux tranches. `exhausted` passe à 1 quand une extension rend
moins que la tranche demandée — c'est le seul vrai signal de fin.

### Durée de vie

30 minutes, purgées par `purgeIfDue` (au plus une fois par heure, déclenchée par
les requêtes, il n'y a ni cron ni worker). Le TTL borne à quel point le feed peut
avoir tort, et empêche l'accumulation de sessions mortes.

## Tri par défaut

```sql
ORDER BY distance_km IS NULL, distance_km ASC,
         common_tags DESC,
         review_average DESC,
         candidate.id
```

Cascade, pas score pondéré. La distance d'abord parce que le sujet impose la
priorité géographique. `candidate.id` garantit un **ordre total** : sans lui,
deux profils à égalité pourraient permuter entre deux exécutions et l'instantané
perdrait son sens.

`distance_km` est une **fonction JavaScript** enregistrée à l'ouverture de la
connexion (haversine, rayon 6 371 km). Elle sert au `SELECT` comme au `WHERE`,
mais **ne peut pas utiliser d'index** : à très grande échelle il faudrait
dégrossir par un encadrement rectangulaire sur latitude/longitude.

## Front

`app/feed/page.tsx` (serveur) charge la **première page** et la passe en props :
le premier écran est rendu sans aller-retour client, et surtout aucun `setState`
n'est déclenché depuis un effet — la règle `react-hooks/set-state-in-effect` du
projet l'interdit.

Ensuite `views/Feed/FeedPage.tsx` (client) ne charge la suite que depuis un
`IntersectionObserver`, c'est-à-dire depuis une callback, ce qui est autorisé.

Changer un filtre passe par un gestionnaire d'événement, jamais par un effet.
