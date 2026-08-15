# Tâche en cours — front du feed

Branche `back/discovery`. Le back est terminé et testé ; il reste l'écran.

## Ce qui est déjà en place et fonctionne

**`GET /api/discovery`** — testé en réel : session créée, 100 candidats,
pages de 20, tri par défaut vérifié (Mont-de-Marsan à ~100 km de Bordeaux en
tête pour un profil bordelais).

- `matcha-app/src/app/api/discovery/route.ts` — valide, vérifie l'existence des
  tags, ouvre ou retrouve la session, lit une page. Traduit le
  `DatabaseError("profile_incomplete")` en **403** au lieu d'un 500.
- `matcha-app/src/lib/discovery/query.ts` — lecture et validation des paramètres
  d'URL, et `filtersHash` (SHA-256 d'un JSON normalisé, tags triés, sans
  `limit`/`after`/`session`). Vérifié : deux URLs aux mêmes filtres écrits dans
  un ordre différent donnent le même hash.
- `matcha-app/src/lib/db/queries/feed.ts` — `openFeedSession`,
  `findFeedSession`, `extendFeedSession` (tranches de 100), `readFeedPage`,
  `purgeFeedSessions`.
- `matcha-app/src/app/api/users/[id]/like/route.ts` — POST et DELETE. Exige une
  photo de profil (403 `profile_photo_required`), refuse l'auto-like, 404 si
  bloqué. **Aucun appel à `notify`** : les notifications sont faites par un
  collègue, à merger plus tard.

**Front partiel**, sur `matcha-app/src/`:

- `app/feed/page.tsx` — page serveur, trois gardes (connexion, vérification,
  profil complet), charge la **première page côté serveur** et la passe en props.
- `views/Feed/FeedPage.tsx` — état, chargement infini, suivi de la position.
- `views/Feed/FeedFilters.tsx` — barre repliable, chips de tri / distance /
  note, bornes d'âge, compteur `n / total`.
- `views/Feed/CandidateSlide.tsx` — carte plein écran, photo, dégradé, prénom,
  âge, ville, distance, bio, tags, étoiles.
- `lib/discovery/client.ts` — `fetchFeed`, `feedParams`, et `likeUser`
  (l'ajout de `likeUser` a été interrompu, **à vérifier**).
- `components/Profile/CandidateCard.tsx` — ancienne carte en grille, **plus
  utilisée** depuis le passage au deck. À supprimer si le deck est retenu.

## Ce qu'il reste à faire

### 1. Le défilement est cassé — deux zones de scroll imbriquées

Mesuré dans le navigateur :

```
main    y=68   hauteur 746
deck    y=230  hauteur 560
footer  y=814                (hors écran, viewport 800)
body scrollHeight 846        ← la page défile AUSSI
```

Le navigateur ne sait pas quelle zone faire défiler : la page bouge en premier,
d'où l'impression de blocage et le pied de page qui passe par-dessus.

**Correctif prévu** : sortir `FeedPage` de `PrivateScreen` et construire sa
propre mise en page `h-dvh` en `flex flex-col overflow-hidden` — en-tête
(BrandLockup + LogoutButton + filtres + compteur), puis le deck en `flex-1`
comme **seule** zone défilante.

### 2. Animation carte par carte

Demande explicite : défilement vertical classique, une personne à la fois, avec
une animation. `scroll-snap` est déjà posé (`snap-y snap-mandatory`,
`snap-start` sur chaque `li`). Il manque l'effet : mettre `data-active` depuis
l'`IntersectionObserver` déjà présent et animer `scale`/`opacity` en CSS
(150-300 ms). Ne pas utiliser de bibliothèque.

### 3. Bouton like

Cœur sur la carte, appel à `POST /api/users/[id]/like`, état optimiste, cœur
rempli après succès, badge si `matched`. Flèches clavier : haut/bas pour
naviguer, droite pour liker. Afficher une indication, l'utilisateur ne devinait
pas où liker.

### 4. Finir `likeUser` dans `lib/discovery/client.ts`

L'ajout a été coupé en plein milieu. `send` existe dans `lib/http/client.ts` :
`send<T>(method, path, fields)`.

## Notes de vérification

- Le compte de test est `feed*@example.com` / `Qw7!zplmVnb2`, jar de cookies
  dans le scratchpad. Le jeton d'accès dure 15 min : rafraîchir avec
  `POST /api/auth/refresh` avant de retester au navigateur.
- Playwright est installé **hors du projet**, dans le scratchpad de session.
- La base contient **100 profils de seed**, pas 500 : le dernier essai a été
  lancé avec `COUNT = 100`. `COUNT` est revenu à 500, il faut relancer
  `npm run db:seed:profiles` (~20 min, 1 250 photos).

## Points laissés ouverts volontairement

- Un profil peut être « complet » avec une ville mais **sans coordonnées** (la
  règle est un OU). Il sort alors du tri par distance et de tout filtre de
  distance. Décision reportée : durcir la complétion, ou l'exclure du feed.
- Le plafond de matérialisation est de 100 par tranche, sans limite haute
  globale depuis le passage aux tranches.
- Notes entières uniquement dans les filtres (`ratingMin=4`), pas de 4,5.
