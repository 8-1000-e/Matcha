# API — documentation des endpoints

Toutes les routes sont sous `/api`. Les réponses sont en JSON, sauf
`GET /auth/verify` qui redirige.

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

**Ce qui n'est jamais renvoyé** : `password_hash`, l'adresse e-mail d'un
utilisateur, et la valeur en clair d'un jeton stocké.

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
| `201` | `{ "id": "uuid", "username": "bob" }` | créé |
| `400` | `{ "errors": [...] }` | validation |
| `409` | `{ "errors": ["email or username is already in use"] }` | e-mail **ou** username pris — message unique, pour ne pas révéler lequel |
| `415` | `{ "errors": ["content-type must be application/json"] }` | |

Un jeton de vérification est créé (`EMAIL_TOKEN_TTL`, 900 s) et le lien envoyé
par mail. Un échec SMTP est logué mais **ne fait pas échouer l'inscription** :
le compte existe déjà à ce stade.

---

## `POST /api/auth/login`

**Corps** : `{ "username": string, "password": string }` — `username` est trimé
et insensible à la casse.

**Réponses**

| Code | Corps | Cas |
| --- | --- | --- |
| `200` | `{ "ok": true, "user": { "id", "username" } }` | + cookies `access` et `refresh` |
| `400` | `{ "errors": ["username and password are required"] }` | champ absent ou mauvais type |
| `401` | `{ "errors": ["invalid username or password"] }` | identifiants faux **ou** compte inexistant — réponse identique dans les deux cas |
| `403` | `{ "errors": ["email address not verified"], "code": "email_not_verified" }` | mot de passe correct mais e-mail non vérifié |
| `415` | | |

Le **403** n'apparaît qu'après validation du mot de passe : un inconnu ne peut
pas s'en servir pour savoir si un compte existe.

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
genre, biographie non vide, au moins un tag, une photo de profil, et une
localisation (GPS **ou** ville).

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
| `401` | `{ "errors": ["invalid session"] }` | jeton inconnu, expiré ou déjà révoqué |
| `401` | `{ "errors": ["unauthorized"] }` | compte supprimé |

**Rotation** : l'ancien jeton est révoqué avant l'émission du nouveau.

**Détection de réutilisation** : présenter un jeton **déjà révoqué** révoque
*toutes* les sessions de l'utilisateur. C'est le signe d'un vol — quelqu'un
rejoue un jeton que le client légitime a déjà renouvelé.

---

## `GET /api/auth/verify?token=...`

Le lien reçu par mail. Le jeton est à usage unique.

| Code | Réponse | Cas |
| --- | --- | --- |
| `302` | redirection vers `/login?verified=1` | vérifié |
| `400` | `{ "errors": ["token is required"] }` | paramètre absent |
| `400` | `{ "errors": ["invalid or expired token"] }` | inconnu, expiré, déjà utilisé, ou de type `password_reset` |
| `400` | `{ "errors": ["token has already been used"] }` | consommé entre-temps par une requête concurrente |

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

---

## `POST /api/auth/password/forgot`

Envoie un lien de réinitialisation.

**Corps** : `{ "email": string }`

| Code | Corps |
| --- | --- |
| `200` | `{ "ok": true, "message": "if the address exists, a link has been sent" }` |
| `400` | `{ "errors": ["email is required"] }` |
| `415` | |

Même réponse que l'adresse existe ou non. Les liens de reset précédents sont
révoqués : un seul est vivant à la fois.

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
