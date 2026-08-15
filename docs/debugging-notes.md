# Notes de débogage

Pièges rencontrés et leur cause réelle. Classés du plus coûteux au plus anodin.

---

## Le schéma ne se met pas à jour sur une base existante

**Symptômes.** `no such table: cities` alors que la table est déclarée dans le
code. Puis, plus tard, une vue modifiée qui continue de renvoyer les anciennes
valeurs. Supprimer la base « répare » le problème.

**Cause.** `applySchema` sort si `user_version === SCHEMA_VERSION`, et **toutes**
les instructions sont en `CREATE ... IF NOT EXISTS`. Sur une base déjà créée,
seul un objet dont le *nom* n'existe pas encore est créé. Le reste est un no-op
silencieux, et `user_version` est bumpé quand même.

**Correctifs appliqués.**
- Incrémenter `SCHEMA_VERSION` à chaque ajout ou modification d'objet
  (commentaire en place au-dessus de la constante, avec l'historique).
- Les **vues** sont précédées de `DROP VIEW IF EXISTS` : elles sont sans état,
  donc toujours recréées à l'identique du code.
- Les tables **de cache** (`feed_sessions`, `feed_entries`) sont également
  droppées et recréées à chaque changement de version.

**Reste ouvert.** Ajouter une **colonne** à une table de données reste
impossible : il faudra une vraie liste de migrations indexées par version avec
des `ALTER TABLE`.

---

## Un script écrit dans une autre base que l'application

**Symptômes.** `npm run db:seed:cities` annonce « 235 285 villes chargées », et
l'application n'en voit aucune. Plus tard, un `RangeError [ERR_OUT_OF_RANGE]`
levé par `randomInt(0)`, à cinq appels de la vraie cause.

**Cause.** `node`/`tsx` ne lisent pas `.env`. Sans `DATABASE_PATH`,
`connection.ts` retombe sur `process.cwd()/matcha.db`, que SQLite **crée**. Le
script remplit donc une base neuve pendant que l'application lit `data/matcha.db`.

**Correctifs.**
- Tous les scripts npm passent `--env-file-if-exists=.env`.
- `drawCities` lève une erreur explicite quand la table est vide, en disant quoi
  lancer. Une erreur doit se plaindre là où l'hypothèse est violée, pas là où la
  conséquence finit par planter.

---

## Le tri par défaut du feed ne s'appliquait pas

**Symptômes.** Feed trié par note alors que `DEFAULT_SORT` commence par la
distance : premiers résultats à 6 500 km.

**Cause.** `readSort` rend `[]` quand aucun tri n'est demandé, et
`options.sort ?? DEFAULT_SORT` ne se déclenche que sur `undefined`. Un tableau
vide passait donc dans `ordering([])`, dont la branche de repli était
`ORDER BY review_average DESC`.

**Correctif.** `options.sort?.length ? options.sort : DEFAULT_SORT`.

---

## Deux zones de défilement imbriquées sur le feed

**Symptômes.** Le scroll « se bloque », les cartes passent derrière un bloc blanc.

**Cause.** La page (`body scrollHeight 846` pour un viewport de 800) **et** le
deck (560 px) défilent tous les deux. Le navigateur fait bouger la page en
premier.

**Correctif prévu** (non appliqué) : mise en page `h-dvh` en
`flex flex-col overflow-hidden`, deck en `flex-1` comme seule zone défilante.

---

## `for...in` sur un tableau parcourt les indices

**Symptôme.** `?tags=cinema,vegan,moto` ne levait aucune erreur et rendait
`[0, 1, 2]` — trois ids inventés.

**Cause.** `for (const tag in raw)` donne `"0"`, `"1"`, `"2"`, qui passent une
regex d'entier. `for...of` donne les valeurs.

---

## `Number()` est trop permissif pour valider une saisie

`Number("0x10")` vaut 16, `Number("1e3")` vaut 1000, `Number("")` vaut 0,
`Number(" 7 ")` vaut 7. Toujours tester le **format** avec une regex
(`/^-?\d+$/`) avant de convertir. Le projet a rencontré ce piège deux fois :
dans `readTtl` (tokens) puis dans `readInteger` (filtres de découverte).

---

## `params.get()` rend `null`, jamais `undefined`

Un test `value === undefined` ou `typeof value !== "number"` sur le retour de
`URLSearchParams.get` ne se déclenche jamais correctement — la valeur est
toujours une chaîne ou `null`. Et `!value` traite la chaîne vide comme absente,
ce qui n'est pas la même chose : `?sort=` est une **erreur**, `sort` absent est
un défaut.

---

## `typeof x === undefined` est toujours faux

`typeof` rend une **chaîne**. Il faut `typeof x === "undefined"` ou, plus
simplement, `x === undefined`. Rencontré dans `readSort`, où une clé de tri
invalide passait le contrôle.

---

## `RETURNING *` capture la ligne avant les triggers `AFTER`

`reviews.updateById(... RETURNING *)` renvoyait systématiquement l'ancien
`updated_at`, puisque le trigger qui le met à jour s'exécute après. Correctif :
relire la ligne après l'écriture, dans la même transaction.

---

## Les transactions better-sqlite3 sont synchrones

Impossible d'`await` dedans. Tout script qui mélange réseau et écriture doit se
faire en deux temps : d'abord tout l'asynchrone (HTTP, sharp) en mémoire, puis
une seule transaction synchrone. C'est aussi ce qui donne le facteur ~50 sur le
temps d'exécution du seed.
