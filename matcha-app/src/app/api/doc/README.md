# API — documentation des endpoints

Toutes les routes sont sous `/api`. Les réponses sont en JSON, sauf
`GET /auth/verify` qui redirige et `GET /photos/[id]` qui renvoie une image.

## Conventions communes

**Corps de requête.** Les routes en `POST` attendent
`Content-Type: application/json`. Sinon : **415**. Un corps illisible ou qui
n'est pas du JSON valide donne **400**, de même qu'un corps qui n'est pas un
objet (`null`, tableau, nombre, chaîne).

**Erreurs.** Toujours la même forme, avec un tableau — un formulaire peut
échouer sur plusieurs champs à la fois :

```json
{ "errors": ["email is invalid", "username is too short"] }
```

**Cookies.** L'authentification passe par deux cookies posés par le serveur,
jamais lus par le JavaScript du client :

| Cookie | Contenu | Durée | Attributs |
| --- | --- | --- | --- |
| `access` | JWT signé HS256 (`sub`, `iat`, `exp`, `jti`) | `ACCESS_TOKEN_TTL` (900 s) | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` en production |
| `refresh` | valeur opaque de 32 octets | `REFRESH_TOKEN_TTL` (2 592 000 s) | idem |

**Codes de statut.** `405` sur tout verbe non implémenté (comportement Next).
`OPTIONS` renvoie `204`.

**Comptes non vérifiés.** Un compte authentifié mais dont l'adresse n'est pas
confirmée reçoit **403** `email_not_verified` sur toutes les routes qui
modifient le profil. Restent ouvertes : `GET /profile` (la page de complétion
en a besoin pour savoir qu'elle doit rediriger vers `/verify-email`),
`GET /auth/me`, `logout`, `refresh`, `verify` et `verify/resend`. La garde vit
dans `requireSession` ; `requireAnySession` est sa variante sans ce contrôle.

**Ce qui n'est jamais renvoyé** : `password_hash`, l'adresse e-mail d'un
utilisateur, et la valeur en clair d'un jeton stocké. Seule exception :
`GET /profile` renvoie l'adresse du **connecté**, pour préremplir son propre
formulaire.

---

## `POST /api/auth/register`

Crée un compte et envoie le lien de vérification.

**Corps**

| Champ | Type | Contraintes |
| --- | --- | --- |
| `email` | string | 3 à 254 caractères, format valide, trimé et mis en minuscules |
| `username` | string | 3 à 32 caractères, `[A-Za-z0-9._-]` uniquement, trimé |
| `first_name` | string | ≤ 50, lettres avec `'` et `-` comme séparateurs simples |
| `last_name` | string | idem |
| `birth_date` | string | `YYYY-MM-DD`, date réelle, 18 ans minimum, 120 ans maximum |
| `password` | string | ≥ 8 caractères, ≤ 71 **octets**, un chiffre, un caractère spécial, pas de caractère de contrôle, ne doit pas contenir de mot anglais courant |

**Réponses**

| Code | Corps | Cas |
| --- | --- | --- |
| `201` | `{ "id": "uuid", "username": "bob", "is_verified": false, "verification_email_sent": true }` | créé, **+ cookies `access` et `refresh`** |
| `400` | `{ "errors": [...] }` | validation |
| `409` | `{ "errors": ["email or username is already in use"] }` | e-mail **ou** username pris — message unique, pour ne pas révéler lequel |
| `415` | `{ "errors": ["content-type must be application/json"] }` | |

**L'inscription ouvre la session.** Redemander les identifiants qu'on vient de
choisir n'apporte rien ; le front enchaîne donc sur la vérification d'adresse.

Un jeton de vérification est créé (`EMAIL_TOKEN_TTL`, 900 s) et le lien envoyé
par mail. Un échec SMTP est logué mais **ne fait pas échouer l'inscription** :
le compte existe déjà à ce stade. Le champ `verification_email_sent` dit si le
mail est réellement parti, pour que le front propose un renvoi plutôt que de
laisser l'utilisateur attendre un lien qui ne viendra pas. Le révéler ici ne
crée pas d'oracle : le 409 dit déjà si un compte existe.

---

## `POST /api/auth/login`

**Corps** : `{ "username": string, "password": string }` — `username` est trimé
et insensible à la casse.

**Réponses**

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | `{ "ok": true, "user": { "id", "username", "is_verified" } }` | + cookies `access` et `refresh` |
| `400` | `{ "errors": ["username and password are required"] }` | champ absent ou mauvais type |
| `401` | `{ "errors": ["invalid username or password"] }` | identifiants faux **ou** compte inexistant — réponse identique dans les deux cas |
| `415` | | |

**Un compte non vérifié reçoit quand même sa session**, avec
`is_verified: false`. Le front lit ce drapeau (ou celui de `/auth/me`) et
affiche la page de renvoi du lien. Le blocage réel se fait sur les routes de
fonctionnalité, pas ici — même logique que pour un profil incomplet.

---

## `GET /api/auth/me`

Le profil de l'utilisateur connecté. Lit le cookie `access`, vérifie la
signature et l'expiration, **puis relit l'utilisateur en base** — un compte
supprimé est donc rejeté sans attendre l'expiration du jeton.

| Code | Corps |
| --- | --- |
| `200` | voir ci-dessous |
| `401` | `{ "errors": ["unauthorized"] }` — pas de cookie, jeton invalide, expiré, ou compte disparu |

```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "username": "bob",
    "first_name": "Ana",
    "last_name": "Bob",
    "is_verified": true,
    "profile_completed": false,
    "missing": ["gender", "biography", "tags", "profile_photo", "location"]
  }
}
```

**Un profil incomplet reste un 200.** Renvoyer une erreur empêcherait le front
de savoir qui est l'utilisateur et ce qu'il lui manque — soit exactement ce
dont il a besoin pour afficher le formulaire de complétion. C'est `missing` qui
porte l'information, et le blocage se fera sur les routes de fonctionnalité
(suggestions, recherche, like), pas ici.

Les critères de `missing` sont ceux de `refreshProfileCompletion` en base :
genre, biographie non vide, au moins `MINIMUM_TAGS` tags (3), une photo de
profil, et une localisation (GPS **ou** ville).

---

## `POST /api/auth/logout`

Révoque le refresh token en base et efface les deux cookies.

| Code | Corps |
| --- | --- |
| `200` | `{ "ok": true }` |

**Toujours 200**, même sans cookie ou avec un jeton expiré : une déconnexion ne
peut pas échouer. Le sujet impose qu'elle marche depuis n'importe quelle page.

L'access token déjà émis reste techniquement valide jusqu'à son `exp` — c'est
inhérent à un JWT sans liste de révocation. Fenêtre : `ACCESS_TOKEN_TTL`.

---

## `POST /api/auth/refresh`

Échange le cookie `refresh` contre un nouveau couple de jetons.

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | `{ "ok": true }` | + nouveaux cookies `access` et `refresh` |
| `401` | `{ "errors": ["refresh token is required"] }` | cookie absent |
| `401` | `{ "errors": ["refresh_retry"] }` | course entre deux renouvellements : rejouer, la session est intacte |
| `401` | `{ "errors": ["invalid session"] }` | jeton inconnu, expiré, ou rejeu avéré |
| `401` | `{ "errors": ["unauthorized"] }` | compte supprimé |

**Rotation** : lecture et révocation sont dans la même transaction, l'ancien
jeton est révoqué avant l'émission du nouveau.

**Détection de réutilisation** : présenter un jeton **déjà révoqué** révoque
*toutes* les sessions de l'utilisateur. C'est le signe d'un vol — quelqu'un
rejoue un jeton que le client légitime a déjà renouvelé.

**Fenêtre de grâce de 30 secondes.** Deux onglets ouverts renouvellent en même
temps : les deux présentent le même jeton, le perdant tombe donc sur un jeton
révoqué une milliseconde plus tôt. Sans garde-fou, cette course parfaitement
légitime était prise pour un vol et déconnectait l'utilisateur de partout. Un
jeton révoqué depuis **moins de 30 s** renvoie donc `refresh_retry` sans rien
révoquer ni toucher aux cookies : le navigateur a déjà reçu ceux du gagnant, il
lui suffit de rejouer la requête. Au-delà de 30 s, c'est un rejeu et toute la
famille saute.

---

## `GET /api/auth/verify?token=...`

Le lien reçu par mail. Le jeton est à usage unique.

| Code | Réponse | Cas |
| --- | --- | --- |
| `302` | redirection vers `/login?verified=1` | vérifié |
| `302` | redirection vers `/link-expired?type=verification` | paramètre absent, jeton inconnu, expiré, déjà utilisé, de type `password_reset`, ou consommé entre-temps par une requête concurrente |

Cette route est ouverte dans un navigateur, jamais en `fetch` : un JSON d'erreur
y serait illisible. Tous les échecs mènent donc à une page du front, qui propose
de redemander un lien.

Passe `is_verified` à 1. La base ne contient que le **SHA-256** du jeton : la
valeur en clair n'existe que dans le mail.

---

## `POST /api/auth/verify/resend`

Renvoie un lien de vérification.

**Corps** : `{ "email": string }`

| Code | Corps |
| --- | --- |
| `200` | `{ "ok": true, "message": "if the address exists, a link has been sent" }` |
| `400` | `{ "errors": ["email is required"] }` |
| `415` | |

La réponse est **identique** que l'adresse soit inconnue, déjà vérifiée, ou
qu'un mail parte réellement — sinon l'endpoint permettrait de tester qui a un
compte. Les liens précédents sont révoqués : un seul est vivant à la fois.

**La réponse part avant l'envoi du mail** (émission du jeton et SMTP dans
`after()`). Une adresse existante déclenchait sinon une écriture en base et un
aller-retour SMTP de plusieurs centaines de millisecondes, quand une adresse
inconnue répondait immédiatement : chronométrer la réponse suffisait à trier
une liste d'adresses. Corollaire : `ok: true` ne garantit pas la remise du mail,
un échec d'envoi n'est que journalisé.

---

## `POST /api/auth/password/forgot`

Envoie un lien de réinitialisation.

**Corps** : `{ "email": string }`

| Code | Corps |
| --- | --- |
| `200` | `{ "ok": true, "message": "if the address exists, a link has been sent" }` |
| `400` | `{ "errors": ["email is required"] }` |
| `415` | |

Même réponse que l'adresse existe ou non, et **la réponse part avant l'envoi du
mail** : sinon une adresse connue coûtait une écriture en base plus un
aller-retour SMTP quand une adresse inconnue répondait tout de suite, et
chronométrer suffisait à savoir qui a un compte. Un `ok: true` ne garantit donc
pas la remise du mail. Les liens de reset précédents sont révoqués : un seul est
vivant à la fois.

Le lien mène à une **page du front** (`/reset-password?token=...`), pas à
l'API : l'utilisateur doit encore saisir son nouveau mot de passe.

---

## `POST /api/auth/password/reset`

Change le mot de passe et **coupe toutes les sessions**.

**Corps** : `{ "token": string, "password": string }`

En `POST` et non en `GET` : un mot de passe n'a rien à faire dans une URL, qui
finit dans l'historique du navigateur, les logs serveur et l'en-tête `Referer`.

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | `{ "ok": true }` | mot de passe changé |
| `400` | `{ "errors": ["token and password are required"] }` | champ absent ou mauvais type |
| `400` | `{ "errors": ["invalid or expired token"] }` | jeton inconnu, expiré, déjà utilisé, ou de type `email_verification` |
| `400` | `{ "errors": ["password is too short"] }` etc. | mêmes règles qu'à l'inscription |
| `415` | | |

**L'ordre compte** : le mot de passe est validé **avant** que le jeton soit
consommé. Un mot de passe refusé ne brûle donc pas le lien, sinon il faudrait
en redemander un à chaque tentative ratée.

`revokeAllRefreshTokens` est appelé en fin de parcours : si le compte était
compromis, changer le mot de passe déconnecte l'attaquant au lieu de le laisser
30 jours avec son refresh token.

---

# Profil

Toutes les routes de cette section exigent une **session valide** (cookie
`access`, ou `refresh` renouvelé par le proxy). Sans session : `401
{ "errors": ["unauthorized"] }`.

Elles **n'exigent pas** que le compte soit vérifié. Un compte non vérifié peut
donc remplir son profil ; le blocage se fait sur les routes de fonctionnalité
(suggestions, recherche, like), comme pour `profile_completed`. Sans quoi
changer d'adresse — qui remet `is_verified` à 0 — enfermerait l'utilisateur
dans un profil qu'il ne peut plus corriger.

Chaque écriture recalcule `profile_completed` et **renvoie le profil complet**,
pour que le front n'ait pas à refetcher :

```json
{ "ok": true, "profile": { ... } }
```

## `GET /api/profile`

Le profil **éditable** du connecté. À ne pas confondre avec `/auth/me`, qui
reste le gardien léger du routage.

```json
{
  "ok": true,
  "profile": {
    "id": "uuid",
    "email": "ana@example.com",
    "username": "ana",
    "first_name": "Ana",
    "last_name": "Bob",
    "birth_date": "1995-04-12",
    "gender": "woman",
    "orientation": "bi",
    "biography": "Je bois du matcha.",
    "city": "Paris",
    "neighborhood": "Quartier des Halles",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "location_consent": true,
    "tags": ["books", "cats", "tea"],
    "photos": [
      { "id": "uuid", "url": "/api/photos/uuid", "is_profile": true, "position": 0 }
    ],
    "is_verified": true,
    "profile_completed": true,
    "missing": []
  }
}
```

C'est la **seule** route qui renvoie une adresse e-mail, et uniquement celle du
connecté : le formulaire d'édition doit pouvoir la préremplir.

## `PATCH /api/profile`

Modification partielle. Une clé absente est laissée telle quelle ; `null` n'est
jamais accepté. Aucune clé connue = `400 ["no field to update"]`.

| Champ | Contraintes |
| --- | --- |
| `first_name`, `last_name` | ≤ 50, lettres avec `'` et `-` comme séparateurs simples |
| `email` | mêmes règles qu'à l'inscription |
| `gender` | `woman`, `man`, `non_binary`, `other` |
| `orientation` | `hetero`, `homo`, `bi`, `pan`, `other` |
| `biography` | 1 à 500 caractères, retours à la ligne autorisés, autres caractères de contrôle refusés |

`birth_date` et `username` ne sont pas modifiables.

**Changement d'adresse** : `is_verified` repasse à 0, les liens de vérification
en cours sont révoqués, un nouveau part par mail, et la réponse porte
`email_verification_sent: true`. Le front rebascule alors sur `/verify-email`.
Même adresse qu'avant (casse comprise) = aucun mail. Les sessions ne sont pas
coupées : ce n'est pas un changement de mot de passe.

| Code | Cas |
| --- | --- |
| `200` | modifié |
| `400` | validation, ou aucun champ connu |
| `409` | `["email is already in use"]` |
| `415` | |

## `PUT /api/profile/tags`

**Corps** : `{ "tags": ["vegan", "coffee", "gaming"] }`

Remplace la liste. 3 minimum (`MINIMUM_TAGS`), 10 maximum. Les labels sont
trimés et dédoublonnés sans tenir compte de la casse — `Vegan` et `vegan` sont
le même tag, la colonne est en `COLLATE NOCASE`.

Seuls les labels de la table `tags` (`TAG_LABELS`, 100 entrées) sont acceptés :
la réutilisabilité vient de ce catalogue partagé, pas de la saisie libre.

| Code | Cas |
| --- | --- |
| `200` | enregistré |
| `400` | `["tags must be a list of labels"]`, `["at least 3 tags are required"]`, `["at most 10 tags are allowed"]`, `["one or more tags do not exist"]` |

## `PUT /api/profile/location`

Trois formes, distinguées par les champs présents :

| Corps | Effet |
| --- | --- |
| `{ "latitude": 48.8566, "longitude": 2.3522 }` | `location_consent = 1`, puis reverse geocoding pour remplir `city` et `neighborhood` |
| `{ "city": "Lyon" }` | `location_consent = 0`, puis geocoding direct pour obtenir les coordonnées, nécessaires au tri par distance |
| `{ "city": "Bordeaux", "neighborhood": "Bordeaux Centre", "latitude": 44.84, "longitude": -0.58 }` | `location_consent = 0`, tout est déjà connu : c'est une suggestion choisie dans `GET /api/profile/location/search`, donc aucun géocodage |

Les coordonnées **seules** viennent du navigateur, d'où le consentement ; les
mêmes coordonnées **accompagnées d'un nom** viennent d'un choix dans une liste,
qui ne partage aucune position réelle.

Le géocodage direct interroge d'abord le référentiel local (voir
`/api/profile/location/search`) : une ville saisie à la main a ainsi toujours ses
coordonnées, même réseau coupé. Sans elles, le profil sortirait du tri par
proximité. Sinon on essaie trois services dans l'ordre, aucun ne demandant de clé :
**Photon** (`PHOTON_URL`, noms de quartiers), la **BAN**
(`BAN_URL`, données officielles françaises, 50 requêtes/s) puis **Nominatim**
(`NOMINATIM_URL`, une requête/s). Timeout de 3 s chacun. En reverse, on s'arrête
dès que ville **et** quartier sont trouvés, en complétant l'un par l'autre au
besoin.

En geocoding direct, la réponse est **rejetée si le nom rendu ne correspond pas
à la saisie** — accents et ponctuation ignorés. Photon fait de la correspondance
approximative : sans ce garde-fou, `"zzzqqqxxxvvv"` atterrissait à Doullens.

**Un échec ne fait pas échouer la requête** : on garde ce que l'utilisateur a
fourni et on laisse le reste à `NULL`. La complétion n'exige que des coordonnées
**ou** une ville.

| Code | Cas |
| --- | --- |
| `200` | enregistré |
| `400` | `["coordinates are invalid"]`, `["city is invalid"]`, `["neighborhood is invalid"]`, `["coordinates or a city are required"]` |

## `PATCH /api/profile/location`

**Corps** : `{ "consent": false }` — pose le consentement de géolocalisation
**sans toucher à la position**. `PUT` déduisait le consentement du mode d'envoi
(coordonnées = accepté, ville = refusé), ce qui rendait impossible de le
révoquer en gardant sa ville.

Chaque écriture de position renseigne `users.location_updated_at`. C'est cette
date que le front compare pour son cycle de 24 h : tant qu'elle a moins d'un
jour, aucune demande de position n'est faite au navigateur.

| Code | Cas |
| --- | --- |
| `200` | le profil complet |
| `400` | `["consent must be a boolean"]` |
| `400` | `["send your position before enabling tracking"]` — aucune coordonnée enregistrée |

## `GET /api/profile/location/search?q=`

Suggestions de villes pour la saisie manuelle. Moins de 2 caractères renvoie une
liste vide.

```json
{
  "places": [
    {
      "city": "Bordeaux",
      "neighborhood": null,
      "region": "New Aquitaine",
      "country": "France",
      "latitude": 44.84044,
      "longitude": -0.5805
    }
  ]
}
```

Les villes viennent de la table `cities`, alimentée par le jeu de données
**GeoNames `cities500`** (235 285 communes de plus de 500 habitants, monde
entier) via `npm run db:seed:cities`. Une recherche ne coûte donc **aucune
requête réseau** et ne dépend d'aucun quota, ce qui rend viable la recherche à la
frappe. Le tri est `population DESC` : sur un préfixe court, ce sont les grandes
villes qui sont attendues en tête.

**Photon complète, il ne double pas** : ses résultats ne sont retenus que
lorsqu'ils descendent sous la ville (quartier, arrondissement), niveau que
GeoNames ne couvre pas. Six suggestions au maximum.

Le référentiel n'est pas versionné (13 Mo) : `data/geonames/` est ignoré par git
et le script retélécharge à la demande.

| Code | Cas |
| --- | --- |
| `200` | `{ "places": [...] }`, éventuellement vide |
| `401` | pas de session |

## `POST /api/profile/photos`

`multipart/form-data`, champ `photo`. 5 photos par compte, la première devient
automatiquement la photo de profil.

Le type est déterminé par les **octets d'en-tête** du fichier, jamais par son
`content-type` ni son extension : JPEG, PNG, WebP. Le nom du client est jeté,
le fichier est stocké sous un uuid dans `UPLOAD_DIR` (`./data/uploads`), en
dehors de `public/` — rien n'y est donc servi statiquement.

L'image est ensuite **ré-encodée en WebP** par sharp : l'orientation EXIF est
appliquée puis toutes les métadonnées disparaissent — une photo de téléphone
porte les coordonnées GPS du domicile. Le grand côté est ramené à 1 200 px et
l'entrée est plafonnée à 50 mégapixels, ce qu'un simple contrôle d'en-tête ne
verrait pas passer. Un fichier dont l'en-tête est correct mais les données
illisibles échoue ici, d'où `photo could not be processed`.

| Code | Cas |
| --- | --- |
| `201` | ajoutée |
| `400` | `["photo is required"]`, `["photo must be a jpeg, png or webp image"]`, `["photo could not be processed"]` |
| `409` | `["photo limit reached"]` |
| `413` | `["photo is too large"]` — voir ci-dessous |
| `415` | `["content-type must be multipart/form-data"]` |
| `500` | violation de contrainte réelle — elle n'est plus maquillée en erreur métier |

**La taille est comptée sur le flux**, pas déduite de `content-length` : cet
en-tête est fourni par le client, donc absent d'une requête en
`Transfer-Encoding: chunked` et arbitraire sinon. Le corps est lu morceau par
morceau et la lecture est interrompue dès `MAX_PHOTO_BYTES + 8 Kio` (marge
d'enveloppe multipart), avant toute mise en mémoire complète. Auparavant le
contrôle réel n'arrivait qu'après `formData()`, qui avait déjà tout chargé : un
corps de plusieurs Go suffisait à faire tomber le serveur avec une seule session
valide. Le contrôle `file.size` reste en second rideau.

## `PATCH /api/profile/photos/[id]`

**Corps** : `{ "is_profile": true }` — désigne la photo de profil. L'ancienne
est démise dans la même transaction : l'index `photos_single_profile_idx`
garantit qu'il n'y en a jamais deux.

`400 ["is_profile must be true"]` sinon, `404 ["photo not found"]` si la photo
n'existe pas **ou** n'appartient pas au connecté — un seul message, pour ne pas
révéler l'existence des photos des autres.

Ces codes métier viennent d'un résultat explicite du repository, plus du type
de l'exception : une `ConstraintError` concurrente était auparavant attrapée
comme un `DatabaseError` et rendue en `404` sur une photo qui existait
pourtant. Une vraie erreur de base remonte maintenant en `500`, où elle est
visible.

## `DELETE /api/profile/photos/[id]`

Supprime la ligne **et** le fichier. Les positions restantes sont resserrées et
la photo de profil est réattribuée à la suivante s'il le faut.

**La dernière photo ne peut pas être supprimée** : sans photo de profil le
compte repasserait `profile_completed = 0`, alors que le sujet exige un profil
complet pour utiliser le site. La garde est côté serveur, pas seulement dans le
formulaire : un appel direct à la route est refusé de la même façon.

| Code | Cas |
| --- | --- |
| `200` | supprimée |
| `400` | `["last_photo_required"]` — c'était la seule photo |
| `404` | `["photo not found"]` |

## `PUT /api/profile/photos/order`

**Corps** : `{ "ids": ["uuid", "uuid", ...] }` — la liste **complète** des
photos du connecté, dans l'ordre voulu.

| Code | Cas |
| --- | --- |
| `200` | réordonné |
| `400` | `["photo order must be a list of ids"]`, `["photo order contains duplicates"]`, `["photo order does not match your photos"]` |

## `GET /api/photos/[id]`

Sert le fichier, `Cache-Control: private`. Session requise — les photos ne sont
pas des URL publiques devinables. L'id d'URL sert à lire le chemin **en base** :
il ne touche jamais le système de fichiers, et le nom stocké est revalidé avant
lecture. Une traversée de répertoire est donc impossible.

| Code | Cas |
| --- | --- |
| `200` | l'image, avec son vrai `content-type` |
| `401` | pas de session |
| `403` | compte non vérifié |
| `404` | id inconnu, fichier absent du disque, ou **blocage** entre le connecté et le propriétaire |

Le blocage est vérifié **dans les deux sens** : un utilisateur bloqué garde
sinon les URL en mémoire et continue de voir les photos, alors que le sujet
demande qu'il disparaisse. La réponse est un `404`, pas un `403`, pour ne pas
confirmer que la photo existe.

La réponse porte `X-Content-Type-Options: nosniff`. Le risque est faible — les
octets servis sont toujours du WebP ré-encodé par sharp — mais l'en-tête coûte
une ligne.

---

# Découverte

## `GET /api/discovery`

Le feed de suggestions et, à terme, la recherche avancée : le sujet impose les
mêmes tris et les mêmes filtres pour les deux, une seule route les sert donc.

**Paramètres**

| Paramètre | Valeurs | Défaut |
| --- | --- | --- |
| `sort` | `distance`, `age`, `popularity`, `common_tags`, `last_seen`, `online`, `created` | tri composite : distance, puis affinités, puis note |
| `direction` | `asc`, `desc` | `asc` |
| `ageMin`, `ageMax` | 18 à 120 | — |
| `ratingMin` | 0 à 5, entier | — |
| `maxDistanceKm` | 0 à 20038 | — |
| `tags` | identifiants séparés par des virgules | — |
| `session` | identifiant d'une session ouverte | une nouvelle session |
| `after`, `limit` | pagination dans la session | `0`, `20` |

`online` ne trie pas sur la colonne `users.is_online`, jamais écrite, mais sur
l'expression de présence `last_seen_at > now - 120s` — la même que partout
ailleurs. `is_online` renvoyé dans les cartes vient de ce calcul, pas de la
colonne.

**Réponse**

```json
{
  "session": "uuid", "reset": false, "next": 20, "total": 100,
  "items": [
    {
      "id": "uuid", "username": "ana", "first_name": "Ana", "age": 31,
      "gender": "woman", "orientation": "bi", "biography": "…",
      "city": "Paris", "neighborhood": null, "distance_km": 4.2,
      "common_tags": 3, "review_average": 4.2, "review_count": 12,
      "photo_count": 3, "profile_photo_id": "uuid",
      "photo_ids": "uuid,uuid,uuid", "tags": "books,cats",
      "viewer_liked": 0, "is_online": 1, "last_seen_at": "…"
    }
  ]
}
```

`photo_ids` liste **toutes** les photos, la photo de profil en premier
(`ORDER BY is_profile DESC, created_at, id`), pour la galerie de la carte.
`viewer_liked` dit si le cœur doit être plein au chargement.

**Le feed est figé par session.** L'ordre est calculé une fois, stocké dans
`feed_entries`, puis relu page par page : aucun doublon ni saut pendant le
défilement, même si une note change entre deux pages. La session dure une heure.

Les exclusions (bloqués dans un sens ou l'autre, orientation incompatible) sont
**rejouées à chaque lecture** pour rester justes. Une seule exception : les
profils likés restent visibles dans la session en cours — `readFeedPage` lit
avec `includeLiked: true`. Sans cela, liker quelqu'un le faisait disparaître
sous le doigt. Les tranches suivantes, elles, continuent d'exclure les likés :
ils ne reviendront pas dans une session ultérieure.

Comme `/feed` est une page serveur, chaque retour sur l'écran ouvrirait une
session neuve. Le front mémorise donc l'identifiant de session et la position
dans `sessionStorage`, et rejoue la session au retour.

| Code | Cas |
| --- | --- |
| `200` | une page de résultats |
| `400` | `["invalid sort key: …"]`, `["invalid sort direction: …"]`, `["unknown tags: …"]` |
| `401` | pas de session |
| `403` | `["profile_incomplete"]` — le visiteur n'a pas fini son profil |

---

# Likes

## `PUT /api/users/[id]/like` · `DELETE /api/users/[id]/like`

Liker un utilisateur, ou retirer son like. `[id]` est l'identifiant de la cible.

**`PUT` et non `POST`, parce que l'opération est idempotente** : liker deux fois
renvoie le même état plutôt qu'une erreur. C'est ce que fait déjà `like()` en
base avec son `ON CONFLICT DO NOTHING`, et ça évite au feed de traiter un
double-tap comme un échec.

Les gardes, dans cet ordre :

| Contrôle | Échec |
| --- | --- |
| session valide et compte vérifié | `401` / `403 ["email_not_verified"]` |
| la cible n'est pas soi-même | `400 ["you cannot like yourself"]`, `["you cannot unlike yourself"]` |
| mon profil est complet | `403 ["profile_incomplete"]` |
| j'ai une photo de profil — **`PUT` seulement** | `403 ["profile_photo_required"]` |
| la cible existe, est vérifiée, profil complet | `404 ["user not found"]` |
| aucun blocage dans les deux sens | `404 ["user not found"]` |

La photo de profil est exigée par le §IV.5 — « si l'utilisateur actuel n'a pas
de photo de profil, il ne peut pas effectuer cette action ». Elle est vérifiée
explicitement bien que `profile_completed` l'implique, parce que cette colonne
est dénormalisée et peut être périmée. Le `DELETE` ne l'exige **pas** : on doit
pouvoir retirer un like même après avoir supprimé ses photos.

Cible inexistante, non vérifiée, au profil incomplet, ou blocage : **même
`404`, même message**. Comme pour `GET /api/photos/[id]`, distinguer les cas
permettrait de sonder qui existe et de découvrir qu'on a été bloqué.

**Réponses**

```json
PUT    → { "ok": true, "liked": true,   "matched": true,  "match_id": "uuid" }
DELETE → { "ok": true, "unliked": true, "disconnected": true }
```

`liked: false` signifie « le like existait déjà » et reste un `200` : l'état
demandé est atteint. `matched` permet au feed d'annoncer le match sur un swipe.
`disconnected` dit qu'un match **actif** a été coupé.

La base double deux de ces gardes par des triggers — `likes_require_profile_photo`
et `likes_block_guard`. Les gardes de la route servent à rendre un message
propre plutôt qu'une `ConstraintError` ; si un blocage survient entre la garde
et l'insertion, le trigger lève et la réponse est un `500`. La fenêtre est
minuscule et le résultat reste sûr : le like n'est pas enregistré.

## `POST /api/users/[id]/view`

Enregistre la consultation d'un profil dans l'historique de visites (§IV.5) et
émet la notification `VIEWED`. Mêmes gardes que le like, **sans** l'exigence de
photo de profil.

Aucune contrainte d'unicité : chaque visite compte, le sujet parle d'un
historique. Renvoie `{ "ok": true }`.

## `GET /api/users/[id]/reviews`

Les avis reçus par un profil, pour la page publique. Mêmes gardes que
`GET /api/users/[id]` : session, compte vérifié, profil du visiteur complet, et
`404` indistinct si la cible est inconnue ou s'il y a un blocage.

```json
{
  "ok": true,
  "reviews": [
    {
      "id": "uuid", "author_id": "uuid", "author_username": "ana",
      "score": 4, "body": "Rendez-vous agréable.",
      "created_at": "2026-08-01T10:00:00.000Z",
      "updated_at": "2026-08-02T09:12:00.000Z"
    }
  ]
}
```

Les avis écrits par quelqu'un que la **cible** a bloqué sont exclus, et la liste
est plafonnée à 50, du plus récemment modifié au plus ancien. La note affichée
sur le profil reste `review_average` de `GET /api/users/[id]` : la moyenne des
avis sur 5, rien d'autre.

Écrire ou supprimer un avis n'a **pas** encore de route.

## `GET /api/profile/reviews`

Mes propres avis reçus, pour la page `/me`. `GET /api/users/[id]/reviews` ne
peut pas servir : elle refuse son propre identifiant avec un `400`.

```json
{ "ok": true, "review_average": 4.2, "review_count": 12, "reviews": [ ... ] }
```

Les avis ont la même forme que sur le profil public. Écrire ou supprimer un avis
n'a **toujours pas de route** : la note de popularité ne peut donc bouger que
par le seed.

## Quelle notification pour quelle action

| Situation | Notification | Destinataire |
| --- | --- | --- |
| Ana like Bob, pas de réciprocité | `LIKED` | Bob |
| Bob like Ana en retour | `MATCH` | **Ana seulement** |
| Ana retire son like alors qu'ils étaient connectés | `UNLIKED` | Bob |
| Ana retire un like jamais réciproque | *aucune* | — |
| Ana consulte le profil de Bob | `VIEWED` | Bob |

Le `MATCH` ne part que vers Ana, parce que le §IV.7 dit « lorsqu'un utilisateur
**qu'ils ont liké** les like également en retour » : c'est Ana qui avait liké.
Bob apprend le match par la réponse de sa propre requête, et son like n'émet
**pas** de `LIKED` en plus du `MATCH` — sinon Ana reçoit deux notifications pour
un seul geste. Un like déjà existant n'émet rien.

`UNLIKED` ne part que si un match actif a réellement été coupé : le §IV.7 parle
d'« un utilisateur **connecté** ». Retirer un like jamais réciproque ne notifie
personne.

**Le chat se ferme tout seul.** Un trigger `likes_deactivate_match_after_delete`
passe `matches.is_active` à 0 dès qu'un like est supprimé, ce qui satisfait
« la fonction de chat entre eux sera désactivée » du §IV.5 sans code applicatif.
`unlike()` ne fait que **rapporter** l'état lu avant la suppression.

---

# Notifications

Les cinq types du §IV.7, ni plus ni moins : `LIKED`, `VIEWED`, `MESSAGE`,
`MATCH`, `UNLIKED`.

Toute notification passe par un point unique côté serveur, qui appelle
`notify()` puis publie sur `private-user-<destinataire>`. `notify()` écarte déjà
toute notification entre deux utilisateurs dont l'un a bloqué l'autre : le
filtre vaut donc pour la base **et** pour le temps réel, et aucun chemin ne le
contourne. Ne jamais insérer dans `notifications` directement.

## `GET /api/notifications`

Les 50 dernières notifications du connecté, avec les deux compteurs.

```json
{
  "ok": true,
  "unread": 3,
  "unread_messages": 1,
  "channel": "private-user-<mon-id>",
  "notifications": [
    {
      "id": "uuid",
      "type": "MATCH",
      "actor_id": "uuid",
      "actor_username": "bob",
      "link": null,
      "created_at": "2026-08-14T12:00:00.000Z",
      "read": false
    }
  ]
}
```

**`channel`** est renvoyé pour que le client n'ait à connaître ni son propre
identifiant ni la convention de nommage des canaux : il lit, puis il s'abonne à
ce qu'on lui donne. Le champ ne fuite rien — c'est l'id du destinataire, dans sa
propre réponse.

**`unread_messages` n'est pas un doublon de `unread`.** Le §IV.6 exige de voir
l'arrivée d'un nouveau message depuis n'importe quelle page, le §IV.7 exige de
voir les notifications non lues : deux exigences distinctes. Les compteurs
divergent dès qu'on ouvre la cloche, puisqu'une notification devient lue à
l'ouverture alors qu'un message ne l'est qu'en ouvrant la conversation.

**`link` est `null`** pour les quatre notifications liées à un acteur :
`actor_username` est déjà joint, donc le client construit la destination
lui-même, et le serveur s'épargne une requête. Seul `MESSAGE` porte un lien,
`/messages/<matchId>`, parce que le `matchId` n'est nulle part ailleurs dans la
charge.

`read_at` devient le booléen `read` : le front n'a pas besoin de l'horodatage.

**L'historique se purge tout seul.** Chaque insertion appelle
`pruneNotifications`, qui supprime les notifications **déjà lues** sorties des
`NOTIFICATION_HISTORY` (50) plus récentes du destinataire. Sans cela la table
grossit indéfiniment : un compte actif accumule un `VIEWED` par visite de son
profil. **Une notification non lue n'est jamais supprimée**, quel que soit son
âge — la purge ne doit pas faire disparaître ce que l'utilisateur n'a pas encore
vu. La limite est la même que celle de la lecture, donc la purge ne retire
jamais une ligne que cette route aurait renvoyée.

**Cette route est la seule des notifications à passer par `requireAnySession`** :
elle n'exige donc pas que le compte soit vérifié. La raison est concrète — la
cloche est montée dans `PrivateScreen`, qui habille aussi `/verify-email`, où
l'utilisateur n'est par définition pas vérifié. Avec `requireSession` la page
déclenchait un `403` que le navigateur affiche comme requête en échec, ce que le
sujet interdit. Un compte non vérifié ne peut de toute façon avoir aucune
notification : il ne peut être ni liké ni consulté, `requireTarget` l'exige. La
liste est donc vide, et rien ne fuite. Le **marquage** reste, lui, réservé aux
comptes vérifiés.

## `PATCH /api/notifications` · `PATCH /api/notifications/[id]`

**Corps** : `{ "read": true }` dans les deux cas — un seul corps, deux portées.
Sans `[id]`, tout est marqué lu et la réponse porte `updated`, le nombre de
lignes touchées. Avec `[id]`, une seule.

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | `{ "ok": true }`, ou `{ "ok": true, "updated": 2 }` | marqué |
| `400` | `{ "errors": ["read must be true"] }` | toute autre valeur |
| `401` | `{ "errors": ["unauthorized"] }` | pas de session |
| `404` | `{ "errors": ["notification not found"] }` | id inconnu, notification d'autrui, **ou déjà lue** |
| `415` | | pas du JSON |

Les trois cas de `404` partagent un message unique. `markNotificationRead`
filtre sur `recipient_id` **et** sur `read_at IS NULL`, donc marquer la
notification d'un autre est indistinguable d'un id inexistant : impossible de
sonder les notifications des autres.

---

# Messagerie

Deux utilisateurs connectés — c'est-à-dire qui se sont mutuellement likés —
peuvent discuter (§IV.6). Les messages sont rattachés au **match**, pas à un
couple d'utilisateurs.

## `GET /api/matches`

Les connexions actives du connecté, de la plus récente **activité** à la plus
ancienne — donc une conversation vivante remonte, alors qu'un tri sur la date de
connexion l'aurait figée en bas.

**Paramètres** : `limit` (1 à 50), `q` (recherche, 32 caractères maximum), et le
couple `before` / `before_id` pour paginer. Un `limit` hors bornes donne
`400 ["limit is invalid"]`, un `q` trop long ou porteur d'un caractère de
contrôle `400 ["search is invalid"]`, et un curseur à moitié fourni
`400 ["cursor is incomplete"]`.

```json
{
  "ok": true,
  "unread_messages": 3,
  "cursor": { "activity_at": "2026-08-14T12:07:11.246Z", "id": "uuid" },
  "matches": [
    {
      "match_id": "uuid",
      "connected_at": "2026-08-14T12:07:11.246Z",
      "activity_at": "2026-08-15T09:31:02.881Z",
      "unread": 0,
      "partner": {
        "id": "uuid",
        "username": "bob",
        "first_name": "Bob",
        "photo_url": "/api/photos/uuid"
      },
      "last_message": {
        "body": "à demain",
        "sent_at": "2026-08-15T09:31:02.881Z",
        "mine": false
      }
    }
  ]
}
```

**Le curseur est un couple, pas une date.** Deux connexions créées dans la même
milliseconde partageraient un `activity_at` ; un curseur réduit à l'horodatage
sauterait l'une des deux ou la servirait deux fois. La comparaison porte donc sur
`(activity_at, id)`, avec le même couple en `ORDER BY`.

`q` cherche une sous-chaîne dans le prénom **ou** le pseudo du partenaire. Les
jokers `%` et `_` sont échappés : les taper cherche ces caractères, il ne
sélectionnent pas tout.

**Le filtre de blocage est dans la requête SQL**, pas dans la route. Écarter les
partenaires bloqués après coup amputerait la page — on demande 15 lignes, on en
rend 12 sans que le client puisse savoir s'il reste des pages.

**`unread_messages` est un total global**, pas la somme des lignes renvoyées.
Une liste paginée ne connaît que sa première page : additionner les `unread`
reçus afficherait « 3 messages non lus » alors qu'il y en a douze plus bas.

## `GET /api/messages/[matchId]`

La conversation, en ordre chronologique, **et le partenaire** — même objet que
dans `GET /api/matches`. L'écran de conversation a besoin du nom, de la photo et
de la présence : les prendre ici lui épargne un second appel, et surtout un appel
à la liste des connexions, qui est paginée et pourrait ne pas contenir la
conversation ouverte.

**Paramètres** : `before` (horodatage ISO, pour paginer vers le passé) et
`limit` (entier de 1 à 200, 50 par défaut). Un `limit` non entier ou hors bornes
donne `400 ["limit is invalid"]` — contrôlé dans la route pour ne pas laisser
`boundedInteger` lever et produire un `500`.

## `POST /api/messages/[matchId]`

**Corps** : `{ "body": string }` — trimé, 1 à 1000 caractères, retours à la
ligne autorisés, tout autre caractère de contrôle refusé. Mêmes règles que
`biography`.

| Code | Corps | Cas |
| --- | --- | --- |
| `201` | `{ "ok": true, "message": { ... } }` | envoyé |
| `400` | `{ "errors": ["message is empty"] }` | vide ou blancs seulement |
| `400` | `{ "errors": ["message is too long"] }` | plus de 1000 caractères |
| `400` | `{ "errors": ["message is invalid"] }` | pas une chaîne, ou caractère de contrôle |
| `404` | `{ "errors": ["conversation not found"] }` | voir ci-dessous |
| `415` | | pas du JSON |

Le corps est du **contenu utilisateur affiché à un autre utilisateur** : il est
rendu comme texte par React, jamais via `dangerouslySetInnerHTML`. C'est une
faille éliminatoire au sujet.

Après l'écriture, le message est publié sur `private-chat-<matchId>` et une
notification `MESSAGE` part vers le destinataire, avec
`link: "/messages/<matchId>"`.

### Les messages sont chiffrés en base

`messages.body` ne contient pas de texte lisible mais
`v1:<iv>:<tag>:<chiffré>`, en base64url. **AES-256-GCM**, clé `MESSAGES_KEY`
(32 octets hexadécimaux) lue depuis `.env` et absente de Git. L'IV fait 12
octets et est **tiré à chaque message** : le réutiliser casserait GCM.

Le sujet ne l'exige pas — il demande que les **mots de passe** ne soient pas en
clair. C'est un choix assumé, et sa portée est étroite : cela protège du vol du
fichier SQLite, rien de plus. Le serveur détient la clé, donc une application
compromise lit tout. Ce n'est **pas** du chiffrement de bout en bout.

Chiffrer et non hacher est une obligation, pas une préférence : un hachage est à
sens unique, ni l'utilisateur ni un export RGPD ne pourraient relire la
conversation.

Le chiffrement vit dans `lib/crypto/messages.ts` et n'est appelé qu'aux
frontières — `sendMessage` chiffre, `serializeMessage` déchiffre, et
`GET /api/matches` déchiffre `last_body`. Ce dernier est le point sensible :
`listMatches` récupère l'aperçu de conversation **en SQL**, par un `LEFT JOIN`
sur le dernier message ; le déchiffrement se fait donc en JavaScript sur la
ligne rendue. **Conséquence assumée** : chercher dans le contenu des messages
devient impossible en SQL. `validateMatchList` ne cherche que sur `first_name`
et `username`, et le sujet ne demande rien de plus.

La contrainte `CHECK` sur `messages.body` porte sur le **chiffré** et vaut
`1 à 8000` : 1 000 caractères de clair font jusqu'à 4 000 octets UTF-8, soit
environ 5 400 caractères en base64. La longueur du clair reste vérifiée dans
`validateMessageBody`, seul endroit où elle a un sens pour l'utilisateur.

Migration : `SCHEMA_VERSION` 9. SQLite ne sait pas modifier un `CHECK`, la table
est donc **reconstruite** par `encryptExistingMessages`, entre la création des
tables et celle des déclencheurs — supprimer une table supprime ses
déclencheurs et ses index, que les boucles suivantes recréent.
`messagesTable(name)` est la définition unique, partagée par le schéma et par la
migration : les écrire deux fois avait déjà fait perdre le `DEFAULT` de
`sent_at`. Une ligne déjà préfixée `v1:` n'est pas rechiffrée.

## `PATCH /api/messages/[matchId]`

**Corps** : `{ "read": true }`. Marque lus tous les messages de la conversation
qui ne viennent pas de l'appelant, et publie l'événement `read` sur le canal du
chat pour que l'expéditeur voie son « vu » sans recharger.

**La même requête éteint les notifications de cette conversation.** Ouvrir un
fil et y voir les messages, tout en gardant « untel vous a envoyé un message »
dans la cloche, oblige l'utilisateur à acquitter deux fois la même information.
`markLinkedNotificationsRead` marque donc lues les notifications dont le `link`
vaut `/messages/<matchId>` — d'où le lien porté par les notifications `MESSAGE`,
qui sert ici de clé de regroupement et pas seulement de destination.

La réponse devient `{ "ok": true, "updated": n, "dismissed": n }`. Quand
`dismissed > 0`, l'événement **`notifications-read`** est publié sur le canal
personnel du lecteur avec `{ link }` : les autres onglets et la cloche
rafraîchissent leur compteur sans recharger la page.

## Les gardes des quatre routes

`findActiveMatchForUsers(matchId, userId)` vérifie d'un coup l'existence du
match, son **activité**, et l'appartenance de l'appelant. Puis un contrôle de
blocage dans les deux sens.

**Tous les échecs partagent le même `404 ["conversation not found"]`** : match
inexistant, match inactif, non-membre, ou blocage. Un `403` sur un match inactif
confirmerait qu'il a existé, donc que les deux personnes se sont likées.

Le contrôle de blocage est **indispensable** : `sendMessage()` en base ne
vérifie que le match actif — via le trigger `messages_require_active_match` —
alors que le §IV.5 exige qu'un blocage rende le chat impossible.

**Un unlike ferme la conversation immédiatement.** Le trigger
`likes_deactivate_match_after_delete` passe `is_active` à 0, et les quatre
routes tombent alors en `404`. Vérifié : après un unlike, envoyer comme lire
renvoient `404`, et la conversation disparaît de `GET /api/matches`.

---

# Temps réel

Les notifications et le chat sont poussés par **Pusher Channels**. Le serveur ne
tient aucune socket : il écrit en base, puis publie par un `POST` HTTPS vers
Pusher, qui pousse dans la websocket déjà ouverte du destinataire. La base reste
la source de vérité — si Pusher tombe, la notification existe quand même et
apparaît au prochain chargement.

**Sans clés Pusher dans l'environnement, l'application fonctionne
intégralement.** `publish()` ne fait rien, aucune erreur n'est levée, et seule
la poussée instantanée est absente. C'est ce qui permet de développer sans
compte.

| Canal | Événement | Charge |
| --- | --- | --- |
| `private-user-<id>` | `notification` | une notification sérialisée, identique à un élément de `GET /api/notifications` |
| `private-user-<id>` | `notifications-read` | `{ link }` — les notifications portant ce lien viennent d'être acquittées |
| `private-chat-<matchId>` | `message` | un message sérialisé |
| `private-chat-<matchId>` | `read` | `{ match_id, reader_id, read_at }` |
| `private-chat-<matchId>` | `closed` | `{ match_id }` — la connexion est rompue, la conversation n'est plus accessible |
| `presence-user-<id>` | `pusher:member_added` / `pusher:member_removed` | émis par Pusher, jamais par l'application : `<id>` vient d'ouvrir ou de fermer le site |

**`closed` part du retrait de like et du blocage**, les deux seules opérations
qui désactivent un match. Sans lui, l'écran de conversation restait ouvert sur
un fil devenu inaccessible : la saisie répondait `404` sans rien expliquer. Il
est publié sur le canal du chat parce que **les deux parties y sont déjà
abonnées** — celle qui subit la rupture n'a rien demandé et n'a donc aucun autre
signal.

Un seul nom d'événement pour les cinq types de notification : le client ajoute
en tête et incrémente son badge sans connaître les types. En ajouter un plus
tard ne touche pas le client.

**Le client tait les notifications de la conversation qu'il a sous les yeux.**
Recevoir « untel vous a envoyé un message » pendant qu'on lit ce message est
absurde. La conversation ouverte s'enregistre dans `notifications/active.ts`, et
la cloche ignore une notification `MESSAGE` dont le lien correspond. Le filtre
est côté client, pas serveur : le serveur ne sait pas quel écran est affiché, et
le lui apprendre demanderait de stocker un état d'interface en base. La ligne
existe donc bien en base, mais le `PATCH` déclenché par la lecture la marque lue
dans la foulée — au rechargement, elle est déjà acquittée.

Les **client events sont désactivés** dans le tableau de bord Pusher : un
navigateur ne publie jamais. Sinon n'importe qui fabriquerait un faux message
venant de quelqu'un d'autre.

## `POST /api/pusher/auth`

Autorise l'abonnement à un canal privé. Appelée par `pusher-js`, jamais à la
main. Corps en `application/x-www-form-urlencoded` : `socket_id` et
`channel_name`.

Pusher ne protège pas les canaux privés — il délègue entièrement à cet
endpoint. C'est donc ici, et nulle part ailleurs, que se joue l'isolation entre
utilisateurs.

| Canal | Condition |
| --- | --- |
| `private-user-<id>` | `<id>` est **exactement** celui de la session |
| `private-chat-<matchId>` | match **actif** dont l'appelant est membre, et aucun blocage avec le partenaire |
| `presence-user-<id>` | `<id>` est celui de la session, **ou** un match actif sans blocage avec lui |

Un canal de présence reçoit en plus des données de membre, `{ user_id }`, prises
de la session et jamais du corps de la requête : c'est ce qui identifie le
membre auprès de Pusher, et donc ce qui permet de distinguer le propriétaire du
canal de ceux qui l'observent.

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | `{ "auth": "<key>:<hmac>" }` | autorisé |
| `400` | `{ "errors": ["socket_id and channel_name are required"] }` | champ absent, vide, ou non textuel |
| `400` | `{ "errors": ["invalid request body"] }` | corps illisible |
| `401` | `{ "errors": ["unauthorized"] }` | pas de session |
| `403` | `{ "errors": ["forbidden"] }` | canal d'un autre, canal inconnu, match inactif ou blocage |
| `503` | `{ "errors": ["realtime_unavailable"] }` | aucune clé Pusher configurée |

La comparaison du canal utilisateur est une **égalité stricte** sur la chaîne
complète, jamais un `startsWith` : un identifiant qui serait préfixe d'un autre
ouvrirait sinon le canal du voisin. Le nom de canal de chat est reconstruit puis
recomparé, pour refuser un `matchId` porteur de caractères parasites.

`formData.get()` renvoie `string | File | null` : le contrôle `typeof` est
obligatoire, un fichier passerait sinon pour un identifiant de socket.

Tous les refus partagent le message `forbidden`, qui ne dit pas si le canal
existe.

---

# Modération

## `PUT /api/users/[id]/block` · `DELETE /api/users/[id]/block`

Bloque ou débloque un utilisateur. Idempotents : `created` et `removed` disent
si la ligne a réellement changé, mais l'état visé est atteint dans tous les cas.

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | `{ "ok": true, "created": true }` | bloqué |
| `200` | `{ "ok": true, "removed": true }` | débloqué |
| `400` | `{ "errors": ["you cannot block yourself"] }` | soi-même |
| `404` | `{ "errors": ["user not found"] }` | identifiant inconnu |

**Ces routes n'utilisent pas les mêmes gardes que le like.** Elles passent par
`requireModerationTarget`, qui exige seulement une session et une cible
existante — sans contrôler que la cible est vérifiée, que son profil est
complet, ni qu'aucun blocage n'existe déjà. C'est indispensable : avec les
gardes du like, quelqu'un qui vous a bloqué le premier vous rendrait incapable
de le bloquer en retour **et** de le débloquer, puisque sa fiche répondrait
`404`. On serait enfermé.

**Ce que la base fait toute seule au blocage**, par le trigger
`blocks_drop_likes_after_insert` : les likes croisés sont supprimés et les
notifications reçues de la personne bloquée disparaissent de votre liste. La
suppression des likes déclenche à son tour
`likes_deactivate_match_after_delete`, donc le match passe inactif — vérifié :
après un déblocage, la connexion ne réapparaît pas, l'état reste cohérent.

Conséquences observées, toutes conformes au §IV.5 : le chat répond `404` des
deux côtés, le canal Pusher du chat est refusé, un nouveau like de la personne
bloquée répond `404`, et elle disparaît de `GET /api/likes`.

## `POST /api/users/[id]/report`

Signale un utilisateur. **Corps** : `{ "reason": "fake_account" }`.

Motifs acceptés : `fake_account`, `harassment`, `scam`,
`inappropriate_behavior`, `inappropriate_content`, `identity_theft`. Le sujet
n'exige que le premier ; les autres viennent de la contrainte `CHECK` déjà en
base.

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | `{ "ok": true, "reason": "fake_account" }` | enregistré |
| `400` | `{ "errors": ["reason is invalid"] }` | motif absent ou hors liste |
| `400` | `{ "errors": ["you cannot report yourself"] }` | soi-même |
| `404` | `{ "errors": ["user not found"] }` | identifiant inconnu |

**Un second signalement de la même personne ne change pas le motif** : la
contrainte d'unicité `(reporter_id, reported_id)` évite le spam, et la réponse
renvoie le motif **réellement stocké** plutôt que celui qui vient d'être envoyé.

La personne signalée n'en est **jamais** informée : aucune notification n'est
émise, sans quoi le signalement deviendrait un outil de harcèlement.

---

# Listes de relations

Trois routes partagent la même forme de carte, produite par
`serializeUserSummary` :

```json
{
  "id": "uuid", "username": "ana", "first_name": "Ana", "age": 31,
  "city": "Paris", "neighborhood": null,
  "review_average": 4.2, "review_count": 12,
  "photo_url": "/api/photos/uuid", "is_online": false, "last_seen_at": null
}
```

Les requêtes lisent la vue `user_profiles` avec des **colonnes explicites**, et
jamais `SELECT *`. C'est délibéré : la vue est un `SELECT users.*`, elle porte
donc `password_hash` et `email`. Les sélectionner puis les filtrer plus tard
marcherait, mais un jour quelqu'un renverrait la ligne entière. Ici l'empreinte
n'est jamais lue.

| Route | Renvoie | Champs ajoutés à la carte |
| --- | --- | --- |
| `GET /api/likes?scope=received` | `{ "likers": [...] }` — qui m'a liké (§IV.2) | `liked_at` |
| `GET /api/likes?scope=sent` | `{ "likers": [...] }` — qui j'ai liké | `liked_at` |
| `GET /api/views?scope=received` | `{ "views": [...] }` — qui a consulté mon profil (§IV.2) | `viewed_at`, `visit_count` |
| `GET /api/views?scope=made` | `{ "views": [...] }` — mon historique de visites (§IV.5) | `viewed_at` |
| `GET /api/blocks` | `{ "blocked": [...] }` — qui j'ai bloqué | `blocked_at` |

`scope` vaut `received` par défaut. Sur `/api/views`, toute autre valeur que
`received` ou `made` donne `400 ["scope must be received or made"]` ; sur
`/api/likes`, `400 ["scope must be received or sent"]`.

`/api/likes` et `/api/views` sont **paginées**, 20 par page. Elles acceptent
`page` (entier, 1 à 1000) et ajoutent `page`, `pages` et `total` à leur réponse :

```json
{ "ok": true, "scope": "sent", "likers": [], "page": 2, "pages": 4, "total": 68 }
```

`page` non entier, inférieur à 1 ou supérieur à 1000 donne
`400 ["page is invalid"]` ; une page au-delà de `pages` donne
`400 ["page is out of range"]` plutôt qu'une liste vide, qui se confondrait avec
« plus personne ». `pages` vaut 1 quand `total` vaut 0.

La pagination est un `LIMIT/OFFSET`, contrairement au feed. C'est justifié ici :
ces listes sont ordonnées par un horodatage figé (`liked_at`, `viewed_at`), pas
par des critères volatils. Le raisonnement qui a imposé le feed figé par session
ne s'applique pas. L'ordre est départagé par `profiles.id` pour rester total.

`GET /api/blocks` existe pour une raison pratique : sans liste, on ne peut pas
débloquer quelqu'un qu'on ne retrouve plus.

Les personnes bloquées, dans un sens comme dans l'autre, sont exclues de
`/api/likes` et de `/api/views?scope=received`. `visit_count` compte les visites
répétées, puisque `profile_views` n'a pas de contrainte d'unicité — le §IV.5
demande un historique, pas un ensemble.

---

# Profil public

## `GET /api/users/[id]`

Le profil d'un **autre** utilisateur, tel que le sujet le décrit au §IV.5 :
« toutes les informations disponibles, à l'exception de l'adresse e-mail et du
mot de passe ». Pour son propre profil, c'est `GET /api/profile`.

```json
{
  "ok": true,
  "profile": {
    "id": "uuid", "username": "ana", "first_name": "Ana", "last_name": "Bob",
    "age": 31, "gender": "woman", "orientation": "bi",
    "biography": "Je bois du matcha.",
    "city": "Paris", "neighborhood": null, "distance_km": 4.2,
    "tags": ["books", "cats", "tea"],
    "photos": [
      { "id": "uuid", "url": "/api/photos/uuid", "is_profile": true, "position": 0 }
    ],
    "common_tags": 3,
    "popularity_score": 38.2, "review_average": 0, "review_count": 0,
    "is_online": false, "last_seen_at": null,
    "created_at": "2026-08-14T11:25:45.467Z",
    "viewer_liked_target": false, "target_liked_viewer": true,
    "is_connected": false, "match_id": null,
    "viewer_blocked_target": false, "viewer_reported_target": false,
    "viewer_review_score": null
  }
}
```

**Trois champs sont délibérément absents**, bien que la requête sous-jacente les
lise : `latitude`, `longitude` et `birth_date`. Le sujet veut une localisation
« jusqu'au quartier » et un consentement explicite au GPS ; renvoyer les
coordonnées exactes d'une personne à quiconque ouvre son profil reviendrait à
publier son domicile. `city`, `neighborhood` et `distance_km` donnent
l'information utile sans cela. Et l'âge suffit là où la date de naissance est
une donnée personnelle de plus à protéger.

**Les quatre champs de relation répondent à une exigence précise** du §IV.5 :
« les utilisateurs doivent clairement voir si le profil qu'ils consultent les a
likés ou s'ils sont déjà connectés ».

| Champ | Sens |
| --- | --- |
| `viewer_liked_target` | je l'ai liké |
| `target_liked_viewer` | il m'a liké |
| `is_connected` | likes réciproques, le chat est ouvert |
| `match_id` | **non nul seulement si `is_connected`** — c'est la conversation ouvrable |

`match_id` ne remonte que pour un match **actif**. Auparavant la requête
renvoyait aussi l'identifiant d'un match désactivé : le front aurait affiché un
lien de conversation qui répondait `404`.

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | le profil | |
| `400` | `{ "errors": ["use /api/profile for your own profile"] }` | son propre identifiant |
| `401` | `{ "errors": ["unauthorized"] }` | pas de session |
| `403` | `{ "errors": ["email_not_verified"] }` | compte non vérifié |
| `403` | `{ "errors": ["profile_incomplete"] }` | le **visiteur** n'a pas fini son profil |
| `403` | `{ "errors": ["profile_blocked"], "code": "blocked_by_me" }` | j'ai bloqué ce profil |
| `403` | `{ "errors": ["profile_blocked"], "code": "blocked_by_them" }` | ce profil m'a bloqué |
| `404` | `{ "errors": ["user not found"] }` | inconnu, non vérifié, profil incomplet |

**Le blocage est la seule exception au `404` indistinct**, et seulement sur
cette route. Elle passe `allowBlocked: true` à `requireTarget` pour distinguer
les deux sens et laisser le front rendre un écran expliqué — sinon un profil
qu'on a soi-même bloqué renvoyait une page « introuvable » incompréhensible,
sans aucun moyen de débloquer.

Le compromis est mesuré : `blocked_by_them` confirme l'existence d'un compte
dont on connaissait déjà l'identifiant, et rien d'autre — ni photo, ni nom, ni
présence. Le front n'affiche d'ailleurs jamais « cette personne vous a bloqué »,
seulement « ce profil n'est plus accessible ».

**Toutes les autres routes gardent le `404` indistinct** :
`PUT/DELETE /api/users/[id]/like`, `POST /api/users/[id]/view`,
`GET /api/users/[id]/reviews`, `GET /api/photos/[id]`. Là, révéler un blocage
n'apporterait rien à l'utilisateur et ne serait qu'une fuite.

**Cette route n'enregistre rien.** Consulter un profil doit apparaître dans
l'historique de visites (§IV.5) et déclencher la notification `VIEWED` (§IV.7),
mais c'est `POST /api/users/[id]/view` qui s'en charge. Un `GET` qui écrit
compterait deux visites au moindre préchargement du navigateur ou double montage
de React en mode strict — or `profile_views` n'a pas de contrainte d'unicité,
chaque ligne compte. Le front appelle donc les deux : le `GET` pour afficher, le
`POST` pour enregistrer.

---

# Présence

## `POST /api/presence`

Signale que le connecté est actif. Met `last_seen_at` à l'heure et renvoie
`{ "ok": true, "window_seconds": 120, "channel": "presence-user-<mon-id>" }`.
`401` sans session, `403` si le compte n'est pas vérifié.

Appelée automatiquement par `PresenceHeartbeat`, monté dans `PrivateScreen` et
dans `ThreadPage` — le seul écran privé à ne pas passer par `PrivateScreen`,
faute de quoi lire une conversation rendrait invisible :
toutes les **40 secondes** tant qu'un onglet est ouvert et visible, plus un
battement immédiat au montage et au retour sur l'onglet. Un onglet en arrière-plan
ne bat pas — inutile de compter en ligne quelqu'un qui a la page ouverte depuis
trois jours dans un onglet oublié.

**La présence en direct passe par les canaux de présence Pusher, pas par ce
battement.** Chacun s'abonne à `presence-user-<son-id>` dès le premier battement
— le canal est renvoyé par cette route, ce qui évite de faire descendre
l'identifiant de session jusqu'aux composants de mise en page. Être membre de
ce canal *est* le fait d'être en ligne : Pusher tient lui-même la liste des
connexions ouvertes, c'est exactement l'information qu'un battement essaie de
deviner.

Un écran qui affiche quelqu'un s'abonne au canal **du partenaire**. Il y devient
membre lui aussi, donc il ne regarde pas si le canal est occupé mais si le
membre attendu s'y trouve : `members.get(partnerId)` à la souscription, puis
`pusher:member_added` et `pusher:member_removed` filtrés sur cet identifiant.
Mesuré en bout de chaîne, le point passe du vert au gris **en moins de 200 ms**
dans les deux sens.

Aucun webhook n'est impliqué : `member_added` et `member_removed` descendent
directement au navigateur. C'est ce qui rend l'approche utilisable ici, alors
que les webhooks de présence — qui partent des serveurs de Pusher **vers**
l'application — ne peuvent pas joindre `http://localhost:3000` sans tunnel. Le
raisonnement d'origine est dans `docs/db-schema.md`, section `users`.

Le battement n'a donc plus qu'un rôle de repli : il alimente `last_seen_at`,
d'où viennent le « vu il y a trois heures » d'un absent et l'état affiché au
premier rendu, avant que la souscription n'ait abouti. **L'état en ligne n'est
toujours pas stocké, il est calculé à la lecture** : « en ligne » signifie
« `last_seen_at` il y a moins de 120 secondes », via la fonction `onlineNow()`
partagée. La colonne `users.is_online` existe encore mais n'est ni écrite ni
lue — une valeur dénormalisée que rien ne remet à zéro resterait vraie pour
toujours après une fermeture brutale du navigateur.

Cette valeur de repli n'est plus critique, ce qui permet d'espacer le battement
à un tiers de sa fenêtre plutôt qu'à un rythme serré : trois fois moins
d'écritures pour une présence pourtant devenue instantanée.

`is_online` et `last_seen_at` sont exposés partout où un utilisateur est décrit :
`GET /api/users/[id]`, `GET /api/likes`, `GET /api/views`, `GET /api/blocks` et
`GET /api/matches`.
