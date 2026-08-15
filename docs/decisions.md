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

---

## 2026-08-15 — Chiffrement des messages, hors sujet et assumé

**Décision.** `messages.body` est chiffré en **AES-256-GCM**, clé `MESSAGES_KEY`
dans `.env`. Format `v1:<iv>:<tag>:<chiffré>` en base64url, IV tiré par message.

**Pourquoi.** Le sujet ne le demande pas : il exige que les **mots de passe** ne
soient pas en clair (§VI.1). C'est un choix de l'utilisateur, dont la portée
est étroite et connue — cela protège du vol du fichier SQLite, pas d'une
application compromise, qui détient la clé.

**Chiffrer et non hacher.** Un hachage est à sens unique : ni l'utilisateur ni
un export RGPD ne pourraient relire la conversation. La réversibilité est une
contrainte, pas un compromis.

**Alternative écartée.** Le bout en bout, qui supposerait des clés côté client,
un échange de clés et la perte définitive de l'historique à chaque appareil
perdu. Hors de proportion pour un projet noté sur les failles classiques.

**Conséquences.** La contrainte `CHECK` passe à 8000 caractères, ce que SQLite
ne sait pas faire sans **reconstruire la table** — d'où `encryptExistingMessages`
et `SCHEMA_VERSION` 9. `messagesTable(name)` devient la définition unique du
schéma : la dupliquer avait déjà fait perdre le `DEFAULT` de `sent_at`.
Chercher dans le contenu des messages devient impossible en SQL ; personne ne le
fait, et le sujet ne le demande pas. Une route d'export RGPD reste à écrire,
mais le format s'y prête.

---

## 2026-08-15 — `LIMIT/OFFSET` pour les listes d'activité, pas de session figée

**Décision.** `/api/likes` et `/api/views` sont paginées par pages numérotées de
20, en `LIMIT/OFFSET`, avec `page`, `pages` et `total` dans la réponse.

**Pourquoi.** Le raisonnement du 2026-08-14 qui a imposé le feed figé par
session ne s'applique pas ici : ces listes sont ordonnées par un horodatage
**figé** (`liked_at`, `viewed_at`), pas par des critères volatils comme la note
ou l'activité. Un `OFFSET` y est correct, et bien plus simple. L'ordre est
départagé par `profiles.id` pour rester total.

**Conséquences.** Une page au-delà de `pages` renvoie `400`, pas une liste vide
qui se confondrait avec « plus personne ». Les quatre requêtes SQL gagnent une
fonction `count*` sœur.

---

## 2026-08-15 — Le blocage cesse d'être un `404` sur le profil

**Contexte.** `requireTarget` fondait le blocage dans `user not found`. Un
profil qu'on avait soi-même bloqué renvoyait donc une page « introuvable »
incompréhensible, sans aucun moyen de débloquer.

**Décision.** `GET /api/users/[id]` — et elle seule — passe `allowBlocked: true`
et répond `403` avec `code: "blocked_by_me"` ou `"blocked_by_them"`. Le front
rend un écran expliqué, avec un bouton Débloquer dans le premier cas.

**Pourquoi c'est acceptable.** `blocked_by_them` confirme l'existence d'un
compte dont on connaissait déjà l'identifiant, et rien d'autre : ni photo, ni
nom, ni présence. Et le texte affiché ne nomme jamais le blocage dans ce sens.

**Ce qui ne change pas.** Toutes les autres routes gardent le `404` indistinct —
like, view, reviews, photos. Y révéler un blocage n'apporterait rien à
l'utilisateur et ne serait qu'une fuite.

---

## 2026-08-15 — Les notifications mènent quelque part

**Constat.** Sur 131 notifications en base, **105 n'avaient aucun lien** : seul
`MESSAGE` en posait un. `LIKED`, `MATCH`, `UNLIKED` et `VIEWED` sortaient avec
`link: null`, et la cloche les rendait en `<button>` inerte. Cliquer dessus ne
faisait rien.

**Décision.** Deux mécanismes complémentaires.

`emitMatch` reçoit désormais le `matchId` et **stocke** le lien vers la
conversation, comme `emitMessage` le faisait déjà. C'est la destination utile
d'un match : la discussion qui vient de s'ouvrir.

`serializeNotification` **déduit** un lien vers `/users/<actor_id>` quand la
colonne est nulle. C'est ce qui répare les 105 lignes existantes sans migration,
et ça rend le système auto-réparateur : un futur type de notification oublié
mènera au profil de l'acteur plutôt que nulle part.

**Pourquoi déduire plutôt que migrer.** Une migration aurait figé un lien dans
des lignes anciennes sans garantir que les prochaines en aient un. Déduire à la
lecture traite les deux cas d'un coup.

---

## 2026-08-15 — Suppression de compte : invisible tout de suite, effacé au 14ᵉ jour

**Ce que le RGPD demande vraiment.** L'article 17 dit « sans délai injustifié ».
Il n'accorde **aucun** délai de rétention à l'utilisateur : les 14 ou 30 jours
de Meta et consorts sont un garde-fou produit contre le clic regretté, pas une
obligation. Ce qui est imposé, c'est que le **traitement cesse dès la demande**.

**Décision.** `users.deleted_at`. Dès la demande, le compte disparaît partout ;
les données restent 14 jours pour permettre le retour en arrière ; au terme,
effacement réel. La rétention est technique, jamais visible.

**Écarté :** garder le profil visible pendant les 14 jours — ce serait
continuer à traiter les données après la demande d'effacement. Écarté aussi :
convertir en compte fantôme permanent au 14ᵉ jour — conserver indéfiniment les
données de quelqu'un qui a demandé leur effacement est l'inverse de l'article 17.

**Le levier, c'est la vue.** `user_profiles` gagne `WHERE deleted_at IS NULL`,
et les **dix** requêtes qui la traversent héritent de l'exclusion sans une ligne
de plus : résumés, likes dans les deux sens, visites dans les deux sens, comptes
bloqués. Restent quatre points qui lisent `users` en direct et qu'il a fallu
traiter à la main : `discoveryConditions`, `requireTarget`, la conversation, et
les notifications.

**Pierre tombale dans les conversations.** Le correspondant garde l'accès en
lecture à l'historique, sous « Utilisateur supprimé », et le composeur est
fermé (`403 partner_deleted` côté serveur). Un écran vide aurait été plus
simple mais incompréhensible pour lui. Tout part au 14ᵉ jour.

**L'ordre de la purge n'est pas négociable.** `purgeDeletedAccounts` supprime
**d'abord les fichiers `.webp`, ensuite la ligne**. Les fichiers ne sont pas
couverts par `ON DELETE CASCADE` : dans l'autre ordre on perd le chemin et les
photos restent sur le disque pour toujours — un effacement en trompe-l'œil,
exactement ce que l'article 17 interdit. Vérifié de bout en bout : ligne,
cascade et fichier disparus.

**Pas de cron.** La purge rejoint `purgeExpiredTokens` et `purgeFeedSessions`
dans `purgeIfDue`, déclenchée par les requêtes, au plus une fois par heure.
Aucun worker n'est introduit.

**Le mot de passe est exigé** à la suppression : un effacement déclenché depuis
une session volée serait indéfendable. Les jetons ne sont pas révoqués, sinon la
restauration serait impossible.

**Hors sujet, assumé.** Le sujet ne cite le RGPD qu'en note 4, à propos du
consentement de géolocalisation, déjà en place. L'export (articles 15 et 20)
reste à écrire ; il a été reporté à la fin du projet.

---

## 2026-08-15 — Noter quelqu'un exige un match, et c'est la base qui l'impose

**Décision.** `PUT` et `DELETE /api/users/[id]/reviews`. `PUT` et non `POST` :
`upsertReview` remplace l'avis existant, il n'y en a qu'un par couple.

**La contrainte du match ne vient pas de la route.** Le déclencheur
`reviews_require_match_before_insert` existe depuis la conception du schéma. La
route la vérifie d'abord pour rendre un `403 review_requires_match` propre, et
rattrape quand même la `ConstraintError` : vérifier puis écrire n'est pas
atomique.

**Pourquoi c'est bien ainsi.** On ne note que quelqu'un avec qui on s'est
connecté, comme un hôte qu'on a rencontré. Une note ouverte à tous serait un
outil de harcèlement, et le sujet demande des critères « cohérents ».

**Conséquence assumée.** La note bouge lentement et un profil sans match reste à
zéro avis. Mesuré de bout en bout : moyenne 0 → 5 → 3, puis retour à 0 après
suppression.

---

## 2026-08-15 — Les identifiants de tags viennent du serveur, pas d'une requête

**Décision.** `app/feed/page.tsx` appelle `listTags()` et passe la liste en
props jusqu'à `FilterBar`.

**Pourquoi.** Le filtre de découverte prend des **identifiants**
(`tags=22,7`), alors que le sélecteur de l'inscription travaille sur des
**libellés**. Il fallait la correspondance. Trois options : se fier à l'ordre de
`TAG_LABELS` pour deviner les identifiants — fragile ; ouvrir un `GET /api/tags`
— un aller-retour et une route de plus ; ou charger la liste dans le composant
serveur qui rend déjà la première page du feed. La troisième ne coûte rien.

**Limite connue.** Le jour où la recherche avancée aura son propre écran, il
faudra soit répéter ce chargement, soit ouvrir la route. À ce moment-là
seulement.

---

## 2026-08-15 — Le rail et la cloche descendent dans la conversation

**Contexte.** `/messages/[matchId]` était le seul écran privé hors
`PrivateScreen`. Sans rail, donc sans déconnexion (§IV.1) ; sans cloche, donc
sans notifications ni signal de nouveau message venu d'une autre conversation
(§IV.6, §IV.7).

**Décision.** `AppNav` et `NotificationBell` ajoutés à l'ossature propre de la
page, plutôt qu'un passage par `PrivateScreen`.

**Pourquoi ne pas utiliser `PrivateScreen`.** Il impose son propre en-tête et
son propre pied de page, alors que la conversation a besoin des siens : un
en-tête qui porte le partenaire, sa présence et le menu de modération, et un
pied de page qui **est** le composeur. Les emboîter aurait cassé la disposition
en `h-dvh` qui garde le composeur au bas de l'écran.

**Au passage.** Le §III était déjà respecté sur cette page : `<header>`,
`<main>` et `<footer>` y étaient tous les trois. `LocationSync` a été ajouté,
il manquait aussi.

---

## 2026-08-15 — `GET /api/discovery` ne renvoie plus les colonnes brutes

**Contexte.** La route rendait `page.items` tel quel. Chaque candidat du feed
arrivait donc au navigateur avec `birth_date`, `latitude`, `longitude`,
`location_consent` et `profile_photo_path` — vingt personnes par page.

**Pourquoi c'est grave.** `GET /api/users/[id]` masque délibérément ces trois
premiers champs, et la doc de l'API explique pourquoi : « renvoyer les
coordonnées exactes d'une personne à quiconque ouvre son profil reviendrait à
publier son domicile ». Le sujet demande une localisation « jusqu'au quartier »
(§IV.2) et sanctionne toute faille de sécurité d'un zéro (§VI.1). Le feed
contredisait le profil, en pire : en lot.

**Décision.** `serializeCandidate` dans `lib/discovery/candidate.ts`, sur le
modèle de `buildPublicProfile`. Le `SELECT` garde ces colonnes — `distance_km`
et `age` s'en servent en SQL — mais elles ne franchissent plus la frontière HTTP.

**Conséquence.** `Candidate` côté client dérive maintenant de `CandidatePayload`
plutôt que d'être redéclaré à la main. Les deux avaient divergé, ce qui est
exactement ce qui a laissé la fuite passer. `is_online` et `viewer_liked`
deviennent des booléens, comme partout ailleurs dans les charges utiles.

---

## 2026-08-15 — Le blocage filtre aussi l'historique de visites

`listLikers`, `listLiked` et `listViewers` excluaient les personnes bloquées
dans les deux sens ; `listVisitHistory` était la seule à ne pas le faire. Rien
ne justifiait l'exception. Corrigé dans la requête et dans son compteur, qui
doivent rester d'accord.

---

## 2026-08-15 — Le feed devient un deck, l'observer disparaît

**Décision.** Une seule carte montée, `position` comme source de vérité,
navigation aux flèches, au clavier et au glisser. L'`IntersectionObserver` est
supprimé.

**Pourquoi.** Il portait trois responsabilités (suivre la position, charger la
suite, restaurer le scroll) alors qu'aucune n'est intrinsèquement liée à la
visibilité. Les trois se replacent sur `position`, et la restauration perd son
`requestAnimationFrame` et son `querySelector`.

**Conséquence.** L'état `liked` remonte de `CandidateSlide` vers `FeedPage` :
un glissement doit pouvoir liker sans que le bouton soit cliqué. Le bouton
reste, parce qu'un geste n'est pas découvrable et que le sujet exige de pouvoir
**retirer** un like.
