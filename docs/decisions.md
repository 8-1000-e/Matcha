# Journal des décisions

Fichier en ajout seul : ne jamais supprimer une entrée, seulement en ajouter.

---

## 2026-08-14 — Feed figé par session plutôt que pagination par curseur

**Contexte.** Il fallait paginer les suggestions sans jamais reservir ni sauter
un profil, alors que les données bougent en permanence (connexions, likes, avis).

**Décision.** L'ordre est calculé **une fois** puis stocké dans
`feed_sessions` / `feed_entries`. Les pages ne font plus que lire des positions.

**Pourquoi.** `LIMIT/OFFSET` suppose une liste stable : un profil qui remonte
pendant le scroll est vu deux fois, un profil qui descend est sauté. Le curseur
keyset règle le cas des critères stables (distance, âge) mais pas des critères
volatils (note, activité).

**Alternatives écartées.** Curseur keyset seul — insuffisant sur un tri par
note. Pas de pagination — non tenable.

**Conséquences.** Une session est identifiée par `(user_id, filters_hash)`, avec
un TTL de 30 min. Les exclusions (likés, bloqués, comptes disparus) sont
**rejouées à chaque lecture** via `findCandidatesByIds` : l'instantané fige
l'ordre, pas le droit d'être vu. La matérialisation se fait par tranches de 100,
étendues à l'approche de la fin, pour que l'ouverture reste instantanée.

---

## 2026-08-14 — Un seul endpoint pour les suggestions et la recherche

**Décision.** `GET /api/discovery`, sans paramètre pour la recommandation par
défaut, avec paramètres pour la recherche avancée.

**Pourquoi.** Le sujet exige les **mêmes tris et filtres** pour la liste
suggérée (IV.3) et pour la recherche (IV.4). Deux endpoints auraient été deux
fois le même code.

---

## 2026-08-14 — Note de popularité ramenée à la moyenne des avis

**Contexte.** La vue `user_popularity` calculait un score composite sur 100
(moyenne bayésienne 60 % + engagement 40 % − signalements), inventé lors de la
conception du schéma.

**Décision.** `AVG(reviews.score)` sur 5, plus un compteur d'avis. Rien d'autre.

**Pourquoi.** Ce n'était pas ce qui avait été demandé : le besoin était une note
à la Airbnb. Le score composite affichait « 64,5 » là où l'utilisateur attendait
une note sur 5.

**Conséquences.** `popularity_score`, `bayesian_score`, `engagement_score` et les
compteurs associés supprimés de la vue, de `types.ts`, de `discovery.ts`, de
`profile.ts` et de `docs/db-schema.md`. Le filtre `popularityMin/Max` est
maintenant borné 0-5. Limite assumée : une moyenne simple fait remonter un
unique 5/5 devant un 4,8 sur trente avis — le tri départage par nombre d'avis.

---

## 2026-08-14 — Référentiel des villes embarqué dans le dépôt

**Décision.** `matcha-app/data/cities.tsv.gz` (5,7 Mo, 235 285 villes GeoNames)
est versionné et chargé automatiquement à l'ouverture de la base si la table est
vide. `seed-cities.ts` devient `build-cities.ts`, un outil de régénération, et
sort de `package.json`.

**Pourquoi.** Les villes sont des **données de référence**, pas des données de
test : sans elles le sélecteur de ville est cassé. Un correcteur qui clone le
dépôt ne doit avoir aucune commande à connaître, ni dépendre du réseau.

**Mesuré.** 622 ms au premier démarrage, ensuite un `COUNT(*)` et on passe.

---

## 2026-08-14 — Fenêtre de grâce sur la rotation des refresh tokens

**Décision.** Un jeton révoqué depuis moins de 30 s renvoie `refresh_retry` sans
révoquer la famille ; au-delà, c'est un rejeu et tout saute.

**Pourquoi.** Deux onglets qui renouvellent en même temps présentent le même
jeton : le perdant était pris pour un voleur et déconnectait l'utilisateur
partout.

**Alternative écartée.** Mémoriser le successeur (`replaced_by`) et le renvoyer
au perdant — meilleur, mais exige une migration, et le mécanisme de migration
était lui-même cassé à ce moment-là.

---

## 2026-08-13 — Correctifs d'audit

Audit complet mené par agents (sécurité auth, SQL/upload/IDOR, back, front).
Aucune faille critique. Correctifs appliqués : oracles temporels (login, forgot,
resend), limite de taille d'upload comptée sur le flux, contrôle de blocage sur
`GET /photos/[id]`, `is_verified` exigé sur les routes de profil, âge calendaire,
index `cities_search` réellement utilisé, `SELECT candidate.*` remplacé par une
liste de colonnes explicite.

Écartés volontairement par l'utilisateur : rate limiting, limite de taille du
corps JSON.

## 2026-08-15 — Feed, profils et chrome

**Les profils likés restent dans la session de feed.** `readFeedPage` lit avec
`includeLiked: true` ; la matérialisation des tranches suivantes continue de les
exclure. Sans cela, liker faisait disparaître la carte sous le doigt. Le retour
sur `/feed` rejoue la session mémorisée dans `sessionStorage` au lieu d'en
ouvrir une neuve.

**La présence se calcule, elle ne se stocke pas.** `users.is_online` n'était
jamais écrite : le feed affichait donc tout le monde hors ligne. Toutes les
requêtes utilisent maintenant `last_seen_at > now - 120 s`.

**Le consentement de géolocalisation est une donnée, pas un effet de bord.**
`PATCH /api/profile/location` le pose explicitement, et `location_updated_at`
horodate chaque relevé. Le cycle de 24 h se décide sur cette colonne, pas sur le
`localStorage` du navigateur.

**La dernière photo ne peut pas être supprimée**, côté serveur. Les autres
garde-fous de complétude (biographie, genre, trois centres d'intérêt, ville)
existaient déjà dans les validateurs ; celui-là manquait, un appel direct à
l'API rendait le profil incomplet.

**Une seule requête de profil par page** via `sharedProfile()`, mémorisée 30 s
et invalidée à chaque mutation.

**La messagerie vient de la PR #17**, elle n'a pas été réécrite. Le
`ModerationMenu` de cette PR est réutilisé sur le profil public.
