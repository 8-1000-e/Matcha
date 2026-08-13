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
la photo de profil est réattribuée à la suivante s'il le faut. Supprimer la
dernière photo repasse donc `profile_completed` à 0.

| Code | Cas |
| --- | --- |
| `200` | supprimée |
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
