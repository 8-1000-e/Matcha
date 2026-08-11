# Matcha — contexte projet

Site de rencontre complet (42, projet Web « Matcha », **sujet v6.0**) : inscription → profil →
suggestions → recherche → like → match → chat temps réel. Ce README est le **document de
contexte** du projet : les contraintes du sujet, la stack retenue, l'audit de conformité et les
décisions ouvertes. À lire avant toute session de dev.

## Fichiers de référence

| Fichier | Rôle |
|---|---|
| [SUBJECT.md](SUBJECT.md) | **Le sujet** (v6.0), transcrit en markdown — la référence |
| [README.md](README.md) | Contraintes + stack + décisions (ce fichier) |
| [matcha-app/AGENTS.md](matcha-app/AGENTS.md) | Règles Next.js auto-générées par `next dev` (lire §0) |

---

## 0. État des lieux du dépôt

**Ce qui existe** (`git log --oneline`) :

```
4323795  Merge pull request #2 from 8-1000-e/Next-Scaffold
f5d8cb9  init NextJs          ← ajoute matcha-app/, supprime mon-api/
504a03b  Merge pull request #1 from 8-1000-e/back-init
7994c8c  init backend         ← ajoute SUBJECT.md + .gitignore, supprime le README initial
ea36e93  first commit
```

Workflow par branches + pull requests sur `main`. Une tentative de backend séparé (`mon-api/`,
route handlers Next) a été **abandonnée au profit d'un Next.js unique** — c'est cohérent avec
la stack décidée ici : une seule app, front et API dans le même projet.

**Le scaffold en place** — `matcha-app/`, issu de `create-next-app` :

| Élément | Version / état |
|---|---|
| `next` | **16.3.0** |
| `react` / `react-dom` | 19.2.8 |
| `tailwindcss` | **v4** (config CSS-first via `@theme`, pas de `tailwind.config`) |
| `typescript` | v5, `strict: true`, alias `@/*` → `./src/*` |
| `eslint` | v9 + `eslint-config-next` (flat config) |
| Structure | `src/app/` — App Router, `layout.tsx` + `page.tsx` par défaut |
| Dépendances projet | **aucune** : ni base, ni Pusher, ni mail, ni images |

Le `layout.tsx` est déjà gréé pour un footer collant (`h-full` sur `<html>`,
`min-h-full flex flex-col` sur `<body>`) : c'est la bonne base pour l'exigence
**header + main + footer**.

### ⚠️ Next.js 16 n'est pas le Next.js que tu connais

`matcha-app/AGENTS.md` (généré par `next dev`, et re-généré à chaque fois) le dit
explicitement : cette version a des **breaking changes** par rapport aux connaissances
d'entraînement des modèles, et la doc de référence est **locale**, dans
`matcha-app/node_modules/next/dist/docs/`. À lire avant d'écrire du code Next, plutôt que de
se fier à une habitude de Next 13/14/15. Deux signes déjà visibles dans le scaffold :

- `layout.tsx` utilise `LayoutProps<"/">` (types de routes générés), pas `{ children }: { children: React.ReactNode }`.
- `package.json` déclare `"lint": "eslint"` — `next lint` a disparu.

### À corriger tout de suite (avant d'écrire des features)

Rien de tout ceci n'est fait ; ce sont des correctifs de scaffold, pas des fonctionnalités.

- 🔴 **`.gitignore` : la base SQLite n'est protégée nulle part.** Ajouter
  `matcha-app/data/*.db*` et `matcha-app/public/uploads/`. Aujourd'hui un `git add -A` après
  le premier seed committerait la base entière, avec les hashs et les e-mails (§4).
- 🟠 **Le `.gitignore` racine ne correspond plus à l'arborescence** : il ignore
  `client/public/mediapipe-wasm/`, `client/public/models/`, `server/models/`,
  `server/captures/` — des chemins d'une architecture `client/` + `server/` qui n'existe plus.
  Les modèles MediaPipe seront bien nécessaires (captcha ③, §7), mais sous
  `matcha-app/public/models/`. À réécrire en conséquence.
- `next.config.ts` est vide → il lui faut `serverExternalPackages: ['better-sqlite3']`, sinon
  le build casse sur le binaire natif (§2).
- `layout.tsx` : `lang="en"` → `lang="fr"`, et `metadata` encore à « Create Next App ».
- `globals.css` : la règle `body { font-family: Arial, Helvetica, sans-serif }` **écrase** les
  variables Geist déclarées juste au-dessus. Résidu de `create-next-app` à nettoyer.
- `package.json` : pas encore de scripts `db:migrate`, `db:seed`, `db:reset` (§4).
- `src/app/page.tsx` et les SVG de `public/` sont la page de démo Next à supprimer.

---

## 1. Les règles qui font échouer le projet

Trois phrases du sujet dominent tout le reste :

1. **« Toute faille de sécurité entraînera une note de 0. »**
2. **« Votre application ne doit produire aucune erreur, warning ou notice, côté serveur et côté client (dans la console web). »**
3. **« Tout ce qui n'est pas explicitement autorisé est strictement interdit. »**

Et une quatrième pour les bonus : **« La partie bonus ne sera évaluée que si la partie
obligatoire est parfaite »** — donc les captchas goofy (§7) ne valent **rien** tant que
l'obligatoire n'est pas irréprochable, et ils ne doivent **jamais** empêcher l'évaluateur de
dérouler la checklist obligatoire.

### Contraintes générales (chapitre III)

- [ ] Zéro erreur / warning / notice, **serveur et client**.
- [ ] Langage libre. Micro-frameworks et bibliothèques autorisés.
- [ ] Bibliothèques UI explicitement autorisées : React, Angular, Vue, Bootstrap, Semantic.
- [ ] **Définition de « micro-framework » qui fera autorité en soutenance** : routeur +
      éventuellement templating, **sans ORM, sans validateurs, sans gestionnaire de comptes
      utilisateurs**.
- [ ] Base de données **relationnelle ou orientée graphe**, **gratuite**.
- [ ] **Requêtes écrites à la main.** Créer sa propre petite lib de gestion de requêtes est
      explicitement autorisé (« si vous êtes malin »).
- [ ] **≥ 500 profils distincts** en base pour l'évaluation.
- [ ] Serveur web libre (Apache, Nginx ou **serveur intégré** → Next.js OK).
- [ ] Compatible dernières versions **Firefox** et **Chrome**.
- [ ] Mise en page structurée : **header + main + footer** au minimum.
- [ ] **Responsive** / utilisable sur petits écrans.
- [ ] Validation de **tous** les formulaires.
- [ ] Interdits explicitement cités : mots de passe en clair, injection HTML/JS dans des
      variables non protégées, upload de contenu non autorisé, injection SQL.
- [ ] Secrets (identifiants, clés API, env) dans un **`.env` exclu de Git**. Fuite = échec possible.

### Partie obligatoire (chapitre IV)

**IV.1 Inscription / connexion**
- [ ] Inscription : e-mail, **username**, nom, prénom, mot de passe sécurisé (minimum requis).
- [ ] **Les mots anglais courants sont refusés comme mot de passe.**
- [ ] E-mail de vérification avec **lien unique**.
- [ ] Connexion par **username + mot de passe** (pas par e-mail).
- [ ] Reset de mot de passe par e-mail.
- [ ] Déconnexion **en un clic depuis n'importe quelle page**.

**IV.2 Profil**
- [ ] Genre, préférences sexuelles, biographie, **tags réutilisables** (#vegan, #geek…),
      **jusqu'à 5 photos** dont **une** photo de profil.
- [ ] Tout est modifiable à tout moment, y compris nom / prénom / e-mail.
- [ ] Voir **qui a consulté** son profil.
- [ ] Voir **qui l'a liké**.
- [ ] **Note de popularité publique** (définition libre mais **cohérente** → §5).
- [ ] Localisation GPS jusqu'au quartier **avec consentement explicite** ; si refus →
      **saisie manuelle obligatoire** (ville / quartier) ; modifiable à tout moment.
- [ ] ⚠️ **Piège** : l'âge n'est pas listé dans les champs de profil, mais le tri et le filtre
      par âge sont obligatoires (IV.3 / IV.4) → **date de naissance requise** au profil.

**IV.3 Navigation / suggestions**
- [ ] Liste de profils suggérés cohérente avec genre + orientation ; **bisexuel par défaut**
      si l'orientation n'est pas spécifiée.
- [ ] Matching **intelligent et multi-critères** : proximité géo + nb de tags communs + popularité.
- [ ] **Priorité à la même zone géographique.**
- [ ] Tri **et** filtre par âge, localisation, popularité, tags communs.

**IV.4 Recherche avancée**
- [ ] Critères combinables : tranche d'âge, plage de popularité, localisation, tags.
- [ ] Résultats également triables et filtrables (mêmes 4 axes).

**IV.5 Consultation de profil**
- [ ] Affiche tout **sauf e-mail et mot de passe**.
- [ ] Chaque visite est enregistrée dans l'historique de visites.
- [ ] Like de la photo de profil ; **impossible si on n'a pas soi-même de photo de profil**.
- [ ] Like mutuel ⇒ « connectés » ⇒ chat ouvert.
- [ ] Unlike ⇒ plus de notifications de cette personne **et chat désactivé**.
- [ ] Voir la popularité de l'autre.
- [ ] Voir **en ligne / dernière connexion (date + heure)**.
- [ ] Signaler comme **faux compte**.
- [ ] **Bloquer** : disparaît des résultats de recherche, plus de notifications, chat impossible.
- [ ] Statut de relation visible clairement (l'autre m'a liké ? on est connectés ?) + action
      unlike / déconnexion.

**IV.6 Chat**
- [ ] Temps réel entre utilisateurs connectés, **délai max 10 secondes**.
- [ ] Indicateur de nouveau message visible **depuis n'importe quelle page**.

**IV.7 Notifications** (temps réel, **délai max 10 s**)
- [ ] Like reçu.
- [ ] Profil consulté.
- [ ] Message reçu.
- [ ] Like rendu (match).
- [ ] Unlike par une personne connectée.
- [ ] Compteur de non-lues visible **depuis n'importe quelle page**.

### Bonus (chapitre V) — seulement si l'obligatoire est parfait

OmniAuth · galerie photo drag & drop + édition basique (crop, rotate, filtres) · carte
interactive des utilisateurs · chat vidéo/audio · organisation de rendez-vous réels.

---

## 2. Stack retenue

| Couche | Choix | Statut |
|---|---|---|
| Framework | **Next.js 16.3.0** (App Router, TypeScript), serveur intégré | ✅ installé |
| UI | **React 19.2.8** (explicitement autorisé) + **Tailwind v4** | ✅ installé |
| Lint / types | ESLint 9 (flat config) + TypeScript 5 `strict` | ✅ installé |
| Base de données | **SQLite** via `better-sqlite3`, SQL brut | ⬜ à installer (§4) |
| Temps réel | **Pusher Channels** (channels privés + presence) | ⬜ à installer (§6) |
| Auth | **Fait main** : `scrypt`/argon2id + sessions opaques en base | ⬜ à écrire |
| Validation | **Fait main** (`src/lib/validate.ts`) | ⬜ à écrire |
| E-mails | `nodemailer` + SMTP (compte applicatif dans `.env`) | ⬜ à installer |
| Images | `sharp` (resize + strip EXIF), stockage disque hors dépôt | ⬜ à installer |

### Audit de conformité de la stack

| Contrainte du sujet | Next.js + Pusher + SQLite | Verdict |
|---|---|---|
| Routeur inclus | App Router | ✅ autorisé |
| Templating inclus | JSX / RSC — « éventuellement du templating » | ✅ autorisé |
| **Pas d'ORM** dans le framework | Next.js n'embarque aucun ORM | ✅ |
| **Pas de validateurs** | Next.js n'embarque aucun validateur | ✅ |
| **Pas de gestionnaire de comptes** | Next.js n'embarque aucun système d'auth | ✅ |
| Requêtes à la main | `better-sqlite3` + SQL préparé écrit à la main | ✅ |
| DB **relationnelle** et **gratuite** | SQLite | ✅ (liste du sujet illustrative → §4) |
| Serveur web | serveur intégré Next.js (ou derrière Nginx) | ✅ |
| Bibliothèques autorisées | Pusher, nodemailer, sharp, better-sqlite3 | ✅ |
| Secrets en `.env` hors Git | `.env.local` + `.gitignore` | ✅ à faire dès le commit 1 |

**Conclusion : Next.js coche la définition de « micro-framework » du sujet, terme pour terme.**
C'est cette définition qui « fera autorité lors de la soutenance, quelles que soient les
définitions alternatives trouvées en ligne » — argument à sortir tel quel si un évaluateur
objecte que Next.js est un « full-stack framework ».

### Ce que la stack interdit par conséquence

Ces outils sont **bannis** du projet, car ils fournissent précisément ce que la définition
exclut (ou contournent l'écriture manuelle des requêtes) :

- **ORM / query builder** : Prisma, Drizzle, TypeORM, **Sequelize**, Knex, Kysely, MikroORM.
  Le sujet est explicite : « Vous devez créer vos requêtes manuellement. »
  `better-sqlite3` est un **driver**, pas un ORM : il exécute le SQL qu'on écrit, rien de plus.
  En revanche le sujet autorise explicitement **notre propre mini-bibliothèque** de requêtes
  (« si vous êtes malin, vous pouvez créer votre propre bibliothèque pour simplifier la gestion
  des requêtes ») → c'est le rôle de `src/lib/db/query.ts`.
- **Gestionnaire de comptes** : NextAuth / Auth.js, Clerk, Lucia, Passport, Supabase Auth,
  Better Auth.
- **Validateurs** (zone grise, voir §3) : Zod, Yup, Joi, class-validator, `react-hook-form`
  + resolver.

### Pièges Next.js à connaître (source classique de warnings ⇒ note en jeu)

- **`better-sqlite3` est un module natif** : il doit être déclaré dans
  `serverExternalPackages: ['better-sqlite3']` (`next.config.ts`), sinon le bundler essaie
  d'embarquer le binaire `.node` et le build casse.
- **Connexion et HMR** : en dev, chaque rechargement de module réouvre la base → verrous et
  handles qui s'accumulent. Stocker l'instance sur `globalThis` (singleton).
- **Cache Next.js** : une page authentifiée mise en cache affiche des données périmées (ça
  passe pour un bug en soutenance). Lecture de `cookies()` ⇒ dynamique ; sinon
  `export const dynamic = 'force-dynamic'` et `fetch(..., { cache: 'no-store' })`.
- **Warnings React** : clés manquantes dans les listes, hydratation (dates/`Math.random()`
  rendus côté serveur puis client), `<img>` vs `next/image`. La console doit être **vide**.
- Soutenance en **mode production** (`npm run build && npm start`) : `next dev` est plus
  bavard, et le build échoue sur les erreurs TS/ESLint — c'est ce qu'on veut vérifier avant.

---

## 3. Zones grises et défense en soutenance

| Sujet | Risque | Position retenue |
|---|---|---|
| Next.js = micro-framework ? | Évaluateur qui applique sa propre définition | Citer la définition du sujet + sa note de bas de page. Montrer qu'il n'y a ni ORM, ni validateur, ni auth tiers dans `package.json`. |
| Zod / bibliothèque de validation | Le sujet interdit les validateurs **dans le framework**, et autorise « toutes les bibliothèques nécessaires ». Ambigu. | ✅ **Décidé : validation écrite à la main.** Le gain est faible, le risque non nul, et ça se démontre bien. |
| `better-sqlite3` = ORM ? | Non : c'est un driver. | Montrer les fichiers `.sql` bruts et les `db.prepare('… WHERE username = ?')`. |
| **SQLite pas dans la liste du sujet** | ⚠️ **Le seul risque réel du projet.** Un évaluateur tatillon peut contester. | Voir la défense préparée en §4. Risque assumé en échange d'un setup sans root, sans Docker et sans serveur. |
| Pusher = service externe | Dépendance réseau + clés API | Clés en `.env`. Prévoir un **fallback** si le réseau bloque (§6). |
| Captchas goofy | Peuvent bloquer la checklist obligatoire | Toujours contournables + `CAPTCHA_MODE` dans `.env` (§7). |
| Migrations | Un « migration runner » n'est pas un ORM | Fichiers `.sql` numérotés + petit script `db:migrate` maison. |

---

## 4. Base de données — SQLite via `better-sqlite3` ✅

**Contexte** : développement et soutenance sur les machines **Ubuntu du cluster 42**, sans
`sudo`. Docker existe sur le campus mais on ne veut pas en dépendre.

**Ce que le sujet exige** : base **relationnelle ou orientée graphe**, **gratuite**,
« comme MySQL, MariaDB, PostgreSQL, Cassandra, InfluxDB, Neo4j, **etc.** », **requêtes écrites
à la main**, **≥ 500 profils distincts**.

**Pourquoi SQLite** : un seul fichier, aucun serveur à démarrer, aucun root, aucun Docker,
fonctionne hors ligne, et `db:reset` se résume à supprimer un fichier. Sur un cluster où on n'a
ni `sudo` ni `/goinfre` garanti, c'est le seul choix qui ne demande aucune infrastructure.

### ⚠️ Le risque assumé, et sa défense

SQLite **n'est pas dans la liste d'exemples du sujet**. C'est le seul point contestable du
projet, et il faut arriver en soutenance avec la réponse prête :

1. La contrainte réelle est « **relationnelle ou orientée graphe** » + « **gratuite** ».
   SQLite est relationnelle, en SQL, et dans le domaine public. La liste est introduite par
   « **comme** » et fermée par « **etc.** » : elle illustre, elle ne restreint pas.
2. La vraie exigence technique du paragraphe, c'est « **vous devez créer vos requêtes
   manuellement** » — et 100 % du SQL du projet est écrit à la main, sans ORM. Montrer
   `db/migrations/*.sql` et `src/lib/db/queries/`.
3. SQLite est le moteur de base de données le plus déployé au monde et tourne en production
   (navigateurs, Android, avionique). Ce n'est pas un jouet.

**À décider maintenant, pas le jour de la soutenance** : si tu veux zéro discussion possible,
la seule option est une base **citée nommément**. Pour que ce basculement reste bon marché si
tu changes d'avis, on garde une règle de conception : **tout le SQL vit dans
`src/lib/db/queries/` et `db/migrations/`, jamais dispersé dans les composants.** Migrer vers
PostgreSQL ou MariaDB devient alors un travail localisé (types de colonnes + placeholders),
pas une réécriture.

### Pièges SQLite à traiter dès le premier commit

- 🔴 **Le fichier `.db` ne doit JAMAIS être dans `public/`** — il serait téléchargeable par
  n'importe qui, avec tous les hashs et tous les e-mails. C'est une **faille = 0**.
  Le fichier vit dans `data/` (hors `public/`), et `data/*.db*` est dans `.gitignore`.
- **Les clés étrangères sont désactivées par défaut** : `db.pragma('foreign_keys = ON')` à
  chaque ouverture, sinon les contraintes ne servent à rien.
- **`journal_mode = WAL`** : lectures concurrentes pendant une écriture. Indispensable avec
  Next.js qui traite plusieurs requêtes en parallèle.
- **`busy_timeout = 5000`** : SQLite n'accepte qu'un seul écrivain. Sans ce pragma, deux
  écritures simultanées lèvent `SQLITE_BUSY` → une erreur serveur visible = contrainte violée.
- **Pas de type date ni booléen** : convention à respecter partout — dates en **TEXT
  ISO-8601 UTC**, booléens en **INTEGER 0/1**. À écrire une fois et à ne jamais dévier.
- **Unicité insensible à la casse** pour `username` et `email` : colonnes déclarées
  `COLLATE NOCASE`, sinon `Alice` et `alice` coexistent et l'authentification devient ambiguë.
- **Pas de fonction géo** : distance par fonction SQL maison enregistrée au démarrage
  (`db.function('haversine', …)`), ou pré-filtrage par bounding box puis tri exact.
- **`better-sqlite3` est synchrone** : parfait à cette échelle, mais chaque requête doit être
  indexée (`username`, `email`, `user_id`, `(from_user, to_user)`) — pas de scan complet dans
  les suggestions.
- **Module natif** : prebuilds fournis ; si la version de Node est trop récente, compilation
  locale (`python3` + `gcc`, présents sur Ubuntu). Fixer la version de Node avec `.nvmrc`.

### Mise en place

Toutes les commandes se lancent depuis `matcha-app/` (c'est là qu'est le `package.json`).

```bash
cd matcha-app
npm i better-sqlite3
npm i -D @types/better-sqlite3

npm run db:reset     # rm -f data/matcha.db && db:migrate && db:seed (500 profils)
npm run dev
```

`next.config.ts` (aujourd'hui vide) doit déclarer le module natif, sinon le build échoue :

```ts
const nextConfig: NextConfig = { serverExternalPackages: ['better-sqlite3'] }
```

```ts
// src/lib/db/pool.ts — singleton, safe HMR
import Database from 'better-sqlite3'

function open() {
  const db = new Database(process.env.DB_FILE!)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.function('haversine', { deterministic: true }, haversineKm)
  return db
}

const g = globalThis as unknown as { __db?: Database.Database }
export const db = (g.__db ??= open())
```

`npm run db:reset` doit rester **idempotent** et reconstruire schéma + 500 profils en une
commande : c'est ce qui rend le projet transportable d'une machine à l'autre en dix secondes.

## 5. Décisions produit à figer

### Note de popularité (le sujet impose seulement d'être **cohérent**)

Proposition, calculée en SQL et documentée dans le code :

```
score = 40 × (likes reçus / max likes reçus sur le site)
      + 25 × (matches / max matches)
      + 15 × (complétion du profil : photos, bio, tags, localisation)
      + 10 × (visites reçues / max visites)
      + 10 × (activité récente : connecté dans les 7 derniers jours)
      − 20 × (signalements « faux compte » confirmés)
```

Normalisé sur 0–100, arrondi, recalculé à chaque événement pertinent (ou vue matérialisée
rafraîchie). L'essentiel en soutenance : pouvoir **expliquer la formule** et montrer qu'elle
est appliquée partout de la même façon.

### Algorithme de suggestion

Filtrage dur, puis scoring :

1. **Exclure** : soi-même, comptes non vérifiés / profil incomplet, bloqués (dans les deux
   sens), incompatibles genre ↔ orientation (orientation absente = bisexuel).
2. **Scorer** : distance géo (fonction SQL `haversine()` maison sur lat/lon) + nb de tags
   communs + popularité.
3. **Bonus de zone** : même ville/quartier remonté en tête (exigé par le sujet).
4. Tri / filtres utilisateur appliqués **par-dessus** (âge, localisation, popularité, tags).

### Sécurité — checklist d'implémentation

- Mot de passe : **argon2id** (`@node-rs/argon2`) ou **`crypto.scrypt`** de Node (zéro
  dépendance, défendable) — jamais de MD5/SHA nu.
- **Refus des mots anglais courants** : liste locale (`data/common-words.txt`) + règles de
  complexité, vérifié **côté serveur**.
- **SQL** : uniquement des requêtes préparées (`db.prepare(...)`, placeholders `?`). Aucune
  concaténation de chaîne, y compris pour les tris/filtres → **whitelist** des colonnes et
  directions autorisées (un `ORDER BY` ne peut pas être paramétré, c'est le trou classique).
- **XSS** : React échappe par défaut. `dangerouslySetInnerHTML` **interdit** dans le projet.
- **CSRF** : cookies `httpOnly` + `SameSite=Lax` + vérification de l'origine sur toute mutation.
- **Sessions** : id opaque `crypto.randomBytes(32)` stocké haché en base, révocable, expirant.
- **Tokens e-mail** (vérification, reset) : aléatoires, **hachés en base**, à usage unique, expirants.
- **Uploads** : taille max, type vérifié par **magic bytes** (pas par extension ni Content-Type),
  nom de fichier généré côté serveur, ré-encodage `sharp`, stockage hors dépôt, max 5 photos.
- **Autorisation sur chaque route** : on ne lit pas une conversation dont on n'est pas membre,
  on ne voit pas un profil qui nous a bloqué, on ne like pas sans photo de profil.
- **Rate limiting** sur login / signup / reset / like.
- **Fuite de données** : l'API profil ne renvoie **jamais** e-mail ni hash de mot de passe.
- **Aucun secret côté client** hormis la clé publique Pusher (`NEXT_PUBLIC_PUSHER_KEY`), qui
  est publique par conception — le `PUSHER_SECRET` reste serveur.

---

## 6. Temps réel — Pusher

**Plan gratuit (Sandbox)** : 100 connexions simultanées, 200 000 messages/jour, channels
illimités — largement suffisant pour le dev et une soutenance.

### Règles de sécurité Pusher (⚠️ sinon faille = 0)

1. **Channels privés uniquement** : `private-user-<id>` (notifications) et
   `private-chat-<matchId>` (conversation). Un channel public laisserait n'importe qui
   s'abonner et lire les messages des autres.
2. **Endpoint d'auth serveur** (`/api/pusher/auth`) qui vérifie la session **et** le droit
   d'accès au channel demandé (membre du match, non bloqué).
3. **Client events désactivés** : tout événement est publié par le serveur, **après**
   écriture en base. Le client ne publie jamais rien directement.
4. Le payload d'un événement ne contient que ce que le destinataire a le droit de voir.

### Découpage

- **Chat** : `POST /api/messages` → validation → INSERT → `pusher.trigger('private-chat-…')`.
  La source de vérité est la base ; Pusher ne fait que pousser.
- **Notifications** : INSERT en base puis trigger sur `private-user-<destinataire>`.
  Le badge « non lues » est monté dans le **layout racine** (exigence « depuis n'importe
  quelle page »).
- **Présence** : channel presence pour « en ligne », + `last_seen` en base pour la
  « dernière connexion (date + heure) » exigée par le sujet.

### Plan de secours si le réseau bloque WebSocket en soutenance

Garder derrière une variable d'env `REALTIME_DRIVER=pusher|sse` un second driver
**SSE** (`/api/stream`, zéro dépendance, 100 % local). Les 10 secondes exigées sont
atteignables avec les deux. Décision : à implémenter **seulement si** le point 4 du §4
révèle un risque réseau réel.

---

## 7. Les captchas goofy (idée maison, hors sujet)

**Le concept** : pour liker / matcher quelqu'un, il faut passer un captcha absurde et
thématique. C'est l'identité du site, pas une mesure de sécurité.

### Trois règles non négociables

1. **Jamais un mur.** L'évaluateur doit pouvoir dérouler toute la partie obligatoire.
   ⇒ échappatoire garantie : bouton « passer » après N échecs ou X secondes, **et**
   `CAPTCHA_MODE=off|easy|full` dans `.env`.
2. **Zéro erreur console.** Webcam refusée, WebGL absent, canvas non supporté → dégradation
   propre vers un captcha plus simple. Aucune exception non catchée.
3. **On ne prétend jamais que c'est de la sécurité.** Un captcha jugé côté client est
   contournable ; le dire clairement en soutenance évite de transformer un gadget en « faille
   de sécurité ». Le serveur émet un **jeton à usage unique** consommé par l'action de like —
   c'est propre, pas incassable, et ça ne remplace pas le rate limiting.

### Les trois captchas

**① Préparer un matcha** — *à faire en premier* 🍵
Mini-jeu canvas/DOM 100 % client : température de l'eau (~80 °C), dose (2 g), tamisage,
fouet en W, ratio de lait. Score = somme des écarts à la cible. Zéro dépendance, zéro
permission navigateur, marche partout. C'est le captcha par défaut et le fallback des deux
autres.

**② Dessiner le visage de la personne** — seuil de réussite **60 %** ✏️
Canvas de dessin + photo de profil en référence. Notation honnête et faisable : on découpe
en zones (grille 3×3 ou zones yeux / nez / bouche), on compare la **distribution d'encre** du
dessin à une carte de contours (Sobel) de la photo réduite en niveaux de gris, avec une courbe
généreuse. Le « 60 % » est une constante à régler, pas une vérité mathématique — et il faut
assumer que c'est une heuristique rigolote, pas de la reconnaissance faciale.

**③ Mimer les lettres du prénom en langue des signes** — le plus dur 🤟
`@mediapipe/tasks-vision` (Hand Landmarker, WASM, **100 % dans le navigateur**).
- Modèles **auto-hébergés dans `/public`** : pas de CDN (marche hors ligne, pas de dépendance
  externe, cohérent avec « secrets et assets maîtrisés »).
- Classification : règles géométriques sur les 21 landmarks, ou petit KNN sur quelques
  échantillons enregistrés à la main. **Limiter à 2–3 lettres**, une à la fois, avec timeout.
- **Aucune image ne quitte le navigateur** — à afficher explicitement dans l'UI. Cohérent
  avec l'axe vie privée du sujet (consentement explicite, RGPD).
- Consentement caméra demandé au dernier moment, refus = bascule sur ① sans erreur.

### Où les brancher

| Emplacement | Verdict |
|---|---|
| Confirmation d'un like / d'un match | ✅ le cœur de l'idée, avec échappatoire |
| Déblocage du premier message d'un nouveau match | ✅ sympa, avec échappatoire |
| Inscription / connexion / reset | ❌ jamais — flux obligatoires critiques |
| Chat, notifications, recherche | ❌ jamais — exigences temps réel et navigation |

---

## 8. Arborescence

### Ce qui existe aujourd'hui

```
matcha/
├── .gitignore                     # ⚠️ chemins client/ + server/ obsolètes (§0)
├── README.md                      # ce fichier — pas encore committé
├── SUBJECT.md                     # le sujet v6.0
└── matcha-app/                    # l'application (create-next-app)
    ├── AGENTS.md                  # règles Next.js régénérées par `next dev`
    ├── CLAUDE.md                  # → @AGENTS.md
    ├── README.md                  # README par défaut de create-next-app
    ├── next.config.ts             # vide
    ├── eslint.config.mjs          # flat config + eslint-config-next
    ├── postcss.config.mjs         # @tailwindcss/postcss
    ├── tsconfig.json              # strict, alias @/* → ./src/*
    ├── package.json               # next 16.3.0, react 19.2.8, tailwind v4
    ├── public/                    # file/globe/next/vercel/window.svg (démo, à virer)
    └── src/app/
        ├── layout.tsx             # flex column prêt pour header/main/footer
        ├── page.tsx               # page de démo Next
        ├── globals.css            # @import "tailwindcss" + tokens
        └── favicon.ico
```

### La cible

Tout se greffe dans `matcha-app/`, puisque c'est là que vivent `package.json` et les scripts
npm. Le code applicatif va dans `src/` (alias `@/`), le reste à la racine de l'app.

```
matcha-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # header + main + footer + badge notifs global
│   │   ├── (auth)/                # signup, login, verify, reset
│   │   ├── (app)/                 # suggestions, search, profile/[username], chat, me
│   │   └── api/                   # route handlers (auth, profile, likes, messages,
│   │                              #   notifications, upload, pusher/auth, captcha)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── pool.ts            # singleton better-sqlite3 + pragmas (safe HMR)
│   │   │   ├── query.ts           # mini-bibliothèque maison (autorisée par le sujet)
│   │   │   ├── haversine.ts       # fonction SQL géo enregistrée au démarrage
│   │   │   └── queries/           # SQL brut par domaine — TOUT le SQL vit ici
│   │   ├── auth/                  # hash, sessions, guards
│   │   ├── validate.ts            # validation maison
│   │   ├── realtime.ts            # publication Pusher côté serveur
│   │   └── captcha/               # les 3 captchas + jetons serveur
│   └── components/                # UI partagée (header, footer, cartes de profil…)
├── db/
│   ├── migrations/001_init.sql …  # SQL numéroté
│   └── seed/                      # ≥ 500 profils distincts
├── scripts/
│   ├── db-migrate.ts              # runner maison (pas un ORM)
│   └── db-seed.ts                 # 500 profils distincts
├── data/
│   ├── matcha.db                  # 🔴 JAMAIS dans public/, JAMAIS committé
│   └── common-words.txt           # mots anglais courants refusés
├── public/
│   ├── uploads/                   # photos servies (jamais la base)
│   └── models/                    # modèles MediaPipe auto-hébergés (captcha ③)
├── .env.example                   # committé, sans valeurs
└── .env.local                     # JAMAIS committé
```

**À ajouter au `.gitignore` racine** (il ne couvre aujourd'hui que `.env*` et `node_modules/`) :
`matcha-app/data/*.db*`, `matcha-app/public/uploads/`, `matcha-app/public/models/`,
et supprimer les entrées `client/` / `server/` devenues fausses.

### Modèle de données (esquisse)

`users` (identité, hash, `email_verified_at`, `last_seen_at`, `birth_date`, `gender`,
`orientation`, `bio`, `fame_rating`, `lat`, `lon`, `city`, `neighborhood`, `location_source`)
· `photos` (≤ 5, flag `is_profile`) · `tags` + `user_tags` (tags **réutilisables**) · `likes`
(unicité `(from,to)`) · `matches` (dérivé des likes mutuels) · `visits` (historique) ·
`blocks` · `reports` · `messages` · `notifications` (`read_at`) · `sessions` ·
`email_tokens` · `captcha_tokens`.

### Variables d'environnement

`matcha-app/.env.local`, chemins relatifs à `matcha-app/` :

```
DB_FILE=./data/matcha.db
APP_URL=
SESSION_SECRET=
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= MAIL_FROM=
PUSHER_APP_ID= PUSHER_SECRET= PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY= NEXT_PUBLIC_PUSHER_CLUSTER=
REALTIME_DRIVER=pusher
CAPTCHA_MODE=full
UPLOAD_DIR=
```

---

## 9. Checklist avant soutenance

- [ ] `npm run build` : aucune erreur, aucun warning.
- [ ] Console navigateur **vide** sur chaque page, en mode production.
- [ ] `.env*` absent du dépôt ; `git log -p` vérifié — **aucun secret dans l'historique**.
- [ ] 🔴 `data/matcha.db` **hors de `public/`** et absent du dépôt : `curl $APP_URL/matcha.db`
      et `curl $APP_URL/data/matcha.db` doivent renvoyer 404.
- [ ] `SELECT count(*) FROM users` ≥ 500, profils **distincts** (noms, photos, tags, villes,
      âges variés).
- [ ] Deux écritures simultanées (deux onglets qui envoient un message) : aucun `SQLITE_BUSY`.
- [ ] `PRAGMA foreign_keys` renvoie bien `1` sur la connexion applicative.
- [ ] Chat et notifications < 10 s, testés sur deux navigateurs différents.
- [ ] Un compte sans photo de profil **ne peut pas** liker.
- [ ] Unlike ⇒ chat coupé + plus de notifications. Blocage ⇒ invisible en recherche.
- [ ] E-mail ni hash de mot de passe dans **aucune** réponse API (vérifié dans l'onglet réseau).
- [ ] Tentative d'injection SQL sur chaque champ, y compris les paramètres de tri.
- [ ] Upload : fichier `.jpg` contenant du PHP/JS refusé ; fichier > taille max refusé.
- [ ] Accès direct à une URL de conversation d'autrui ⇒ 403.
- [ ] Abonnement à `private-user-<autre id>` refusé par l'endpoint d'auth Pusher.
- [ ] Responsive vérifié en 375 px de large.
- [ ] Header / main / footer présents partout.
- [ ] Captchas contournables, aucune erreur console si caméra refusée.

---

## 10. Décisions prises

| Sujet | Décision |
|---|---|
| Framework | Next.js 16.3.0, App Router, TypeScript, dans `matcha-app/` |
| Architecture | **une seule app** front + API (le backend séparé `mon-api/` a été abandonné) |
| Style | Tailwind v4 (config CSS-first, pas de `tailwind.config`) |
| Base de données | **SQLite**, fichier `matcha-app/data/matcha.db` — aucun serveur, aucun root, aucun Docker |
| Accès DB | driver `better-sqlite3`, SQL brut écrit à la main, requêtes préparées, mini-lib maison autorisée |
| ORM | **aucun** — Sequelize/Prisma/Drizzle exclus par « créez vos requêtes manuellement » |
| Temps réel | Pusher Channels, **channels privés uniquement**, publication serveur only |
| Auth | fait main (hash + sessions opaques en base), aucune lib d'auth |
| Validation | fait main, pas de Zod |
| Machines | cluster **Ubuntu 42** en principal, sans `sudo` |
| Captchas | **bloquants pour le like, avec échappatoire garantie** + `CAPTCHA_MODE` |

### Prochaines étapes

Aucune fonctionnalité n'est implémentée : le dépôt contient le sujet, ce contexte et un
scaffold `create-next-app` intact (§0). Dans l'ordre :

1. **Nettoyage du scaffold** et durcissement du `.gitignore` — la liste est en §0. Le point
   sur `matcha-app/data/*.db*` est à faire **avant** le premier seed, pas après.
2. **Socle base** : `better-sqlite3`, `serverExternalPackages`, `src/lib/db/pool.ts`,
   `001_init.sql`, runner de migration, seed de 500 profils, `npm run db:reset`.
3. **Auth complète** (§IV.1) : signup, vérification par e-mail, login par username, reset,
   logout — c'est le prérequis de tout le reste et la partie la plus scrutée en sécurité.
4. **Layout header/main/footer** définitif + profil (§IV.2), puis suggestions/recherche,
   consultation, likes, et enfin chat + notifications Pusher.
5. **Captchas** en dernier : ce sont des bonus, ils ne comptent que si tout le reste est
   parfait.

### Le seul risque à garder en tête

**SQLite n'est pas dans la liste d'exemples du sujet** (§4). La défense est préparée, le
risque est assumé et accepté. La contrepartie à tenir : **tout le SQL reste concentré dans
`src/lib/db/queries/` et `db/migrations/`**, pour qu'un basculement vers PostgreSQL ou MariaDB
reste un travail localisé si tu changes d'avis avant la soutenance.

### Points à valider sur une machine du cluster

1. Version de Node (via `nvm`/`fnm`, sans root) + prebuild `better-sqlite3` disponible,
   sinon compilation locale (`python3`, `gcc`).
2. Le réseau du cluster laisse-t-il passer les WebSocket vers Pusher (sinon driver SSE, §6) ?
3. Où vit `data/matcha.db` si le home a un petit quota (le fichier reste léger : 500 profils
   sans les photos, c'est quelques Mo — les photos, elles, vont dans `public/uploads/`).
