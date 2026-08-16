# Mise en route

Tout se passe dans `matcha-app/`.

```bash
cd matcha-app
npm install
npm run dev          # http://localhost:3000
```

**Aucune commande de données n'est nécessaire.** Les 235 285 villes GeoNames
sont versionnées (`data/cities.tsv.gz`) et chargées automatiquement à la
première ouverture de la base, en ~600 ms. Ensuite un `COUNT(*)` suffit et on
passe.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run lint` / `lint:fix` | ESLint, `--max-warnings=0` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:seed:profiles` | génère les faux profils (~20 min pour 500) |

`scripts/build-cities.ts` n'est plus dans `package.json` : c'est un outil de
maintenance, à lancer à la main le jour où on veut rafraîchir GeoNames.

```bash
npx tsx --env-file-if-exists=.env scripts/build-cities.ts
```

**Toujours passer `--env-file-if-exists=.env`** pour un script lancé à la main :
sans lui, `DATABASE_PATH` n'est pas lu et le script crée une base vide à la
racine au lieu d'écrire dans `data/matcha.db`.

## Variables d'environnement

`.env` (non versionné, voir `.env.example`) :

- `AUTH_SECRET` — obligatoire, l'application refuse de démarrer sans
- `DATABASE_PATH` — `./data/matcha.db`
- `UPLOAD_DIR` — `./data/uploads` (hors de `public/`, servi par une route authentifiée)
- `APP_URL`, SMTP Gmail, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `EMAIL_TOKEN_TTL`
- `PHOTON_URL`, `BAN_URL`, `NOMINATIM_URL` — géocodage, valeurs par défaut publiques

## Le seed de profils

`npm run db:seed:profiles` — `COUNT` est en tête de
`scripts/seed-profiles.ts`.

Ce qu'il fait : récupère les identités sur randomuser.me en **un seul appel**
(avec repli hors ligne complet), tire un vivier de 50 villes dans la table
`cities` et disperse les coordonnées de ±0,05°, télécharge 1 à 4 photos par
profil sur pravatar en passant par la **même** normalisation que l'upload réel
(sharp → WebP dans `UPLOAD_DIR`), puis écrit tout dans **une seule transaction**.
Enfin il génère likes, matchs, visites et avis.

Les comptes de test portent le domaine `@seed.matcha` et sont purgés au
lancement suivant, fichiers photo compris. Mot de passe commun :
`Seed!Matcha42`.

Compter ~20 minutes pour 500 profils : les téléchargements sont séquentiels
pour ne pas se faire couper par pravatar.

## Environnement de développement

- Node 24, Next.js 16.3 (App Router), React 19, Tailwind v4 (config CSS-first
  dans `globals.css`, pas de `tailwind.config`)
- `middleware.ts` s'appelle **`proxy.ts`** dans Next 16
- better-sqlite3 et bcrypt sont des modules natifs, déclarés dans
  `serverExternalPackages`
- Husky : pre-commit = `lint-staged` (ESLint sur les fichiers indexés) puis
  `typecheck` **sur tout le projet**. Un squelette de fonction au corps vide
  bloque donc le commit, même s'il n'est pas dans le commit.
- CI : lint, `next typegen`, typecheck, build — avec `AUTH_SECRET` et
  `DATABASE_PATH` fournis pour le build.

## Playwright

Non installé dans le projet, volontairement. Pour des captures ou des tests
d'interaction, l'installer dans un dossier temporaire hors du dépôt.

## Ajouts du 2026-08-16

**Dépendances** : `maplibre-gl` (globe et carte), `leaflet` + `react-leaflet` +
`@types/leaflet` installés puis **abandonnés** au profit de MapLibre — ils
peuvent être désinstallés.

**Variables d'environnement** (déjà renseignées dans `.env`) :

```
OAUTH_42_CLIENT_ID=        OAUTH_42_CLIENT_SECRET=
OAUTH_GOOGLE_CLIENT_ID=    OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_REDIRECT_BASE=http://localhost:3000
```

`OAUTH_REDIRECT_BASE` doit correspondre **au caractère près** aux URI de
redirection déclarées sur l'intra 42 et dans Google Cloud :
`<base>/api/auth/42/callback` et `<base>/api/auth/google/callback`.

**Console Google** : l'écran de consentement s'appelle maintenant « Google Auth
Platform ». Les scopes sont dans « Accès aux données », les comptes autorisés
dans « Public » (obligatoire tant que l'application est en statut Test).

**Scripts** : `npm run db:migrate` applique le schéma sans redémarrer le serveur.

**ESLint** : `argsIgnorePattern: "^_"` ajouté — le hook de pré-commit refuse tout
warning, les paramètres non encore utilisés doivent donc être préfixés par `_`.

