# Tâche en cours — correctifs d'audit

Branche `fix/audit`, partie de `main`. Mise à jour : 2026-08-17.

## Audit complet et correctifs

Quatre audits (sécurité, données, front, qualité) ont tourné sur l'ensemble du
projet. Ce qui a été corrigé sur cette branche :

**Sécurité**

- **XSS stocké sur la carte** — `UsersGlobe.tsx` construisait la bulle avec
  `Popup.setHTML()` en interpolant la ville, qui n'est validée que contre les
  caractères de contrôle. Reconstruit en DOM avec `textContent`.
- **Déanonymisation GPS** — le filtre de la carte portait sur les vraies
  coordonnées alors que seul le point renvoyé était flouté (dichotomie sur les
  bornes), et `distance_km` exact permettait une trilatération en choisissant sa
  propre position. `coarseDistance` arrondit au kilomètre, `coarseBound`
  quantifie les bornes au centième de degré : les deux oracles tombent sous les
  700 m du floutage.
- **Limitation de débit** (`lib/http/rateLimit.ts`, table `rate_hits`) sur
  `login` (10 / 5 min), `register` (5 / h), `password/forgot` et `verify/resend`
  (3 / 15 min). Compteurs par IP **et** par identifiant.

**`500` supprimés**

- `PATCH /api/profile/location` avec le corps `null` (garde `isRecord`).
- Signalement en double : `409 already_reported` au lieu de `500`, et la
  réponse ne renvoie plus l'ancien motif à la place du nouveau.
- `readBody` ne laisse plus une erreur de déchiffrement tuer toute une
  conversation.
- Six `await fetch` sans garde dans l'agenda Google et le flux OAuth.
- Course sur les sessions de feed : `total` est relu **dans** la transaction
  d'extension, sinon deux requêtes concurrentes visaient les mêmes positions.

**Bugs fonctionnels**

- `recordView` ne s'exécutait plus après le premier profil (`useRef` jamais
  réinitialisé) — fonctionnalité notée du sujet.
- `getCurrentPosition` sans `timeout` : bouton bloqué à vie si l'utilisateur
  ignore la demande.
- Un échec d'envoi de photo laissait la modale ouverte devant le message
  d'erreur.
- Orientations `pan` et `other` affichées en brut sur le profil public.
- Boutons de gestion des photos invisibles sur écran tactile.
- Panne serveur déguisée en liste vide : feed, comptes bloqués, comptes liés.
- `GET /api/notifications` passait par `requireSession`, donc `403` sur
  `/verify-email` où la cloche est montée.

**Rendez-vous**

- Création atomique : la ligne `events` et le message du fil sont écrits dans
  une même transaction, l'appel Google vient après.
- `PATCH` et `DELETE` renvoient `calendar_synced` au lieu d'un `{ ok: true }`
  menteur quand Google refuse, et le panneau l'affiche.

**Schéma** — `user_version 17` : table `rate_hits` + index, suppression de
`users_is_online_idx` (index sur une colonne morte).

**Divers** — `leaflet`, `react-leaflet` et `@types/leaflet` retirés de
`package.json` ; trois affirmations de `api/doc/README.md` qui disaient
l'inverse du code ont été corrigées.

## Écarté volontairement

Les refactors (le garde de conversation existe en trois exemplaires, le filtre
de blocage est réécrit dix fois en SQL), la suite de tests, la reprise de
l'accessibilité des six modales, et les optimisations (`JOIN user_popularity`,
N+1 sur les matchs, cache de requêtes préparées sans plafond).

---

# Tâche précédente — bonus rendez-vous

Branche `bonus` (poussée sur origin). Mise à jour : 2026-08-16.

## Où on en est

**Le bonus rendez-vous est écrit de bout en bout** : base, jetons Google,
validation, appels à l'API Calendar, les quatre routes et le front. `tsc`,
ESLint et `npm run build` passent sans erreur ni warning.

**Testé au navigateur** : proposition, synchronisation Google (`synced: true`),
carte dans le fil, panneau, fermeture automatique après succès. Restent à
dérouler la modification, l'annulation et les deux `409`.

## Ce qui a été écrit

**OAuth / jetons**

- `lib/oauth/providers.ts` — scope `calendar.events` ajouté à l'entrée `google`,
  `access_type=offline` et `prompt=consent` sur `authorizeUrl`, Google seulement.
- `lib/oauth/flow.ts` — `exchangeCode` renvoie `OAuthTokens { accessToken,
  refreshToken }` au lieu d'une chaîne.
- `api/auth/[provider]/callback` — helper local `rememberRefresh`, appelé aux
  trois endroits où une ligne `oauth_accounts` existe déjà : liaison
  (`session.sub`), reconnexion (`linked.user_id`), rattachement par courriel
  (`known.id`). Le jeton est chiffré avec `encryptMessage`.

**Calendrier**

- `lib/calendar/validation.ts` — `validateEvent` complète.
- `lib/calendar/google.ts` — `accessTokenFor`, `createCalendarEvent`,
  `updateCalendarEvent`, `cancelCalendarEvent`, plus deux helpers privés
  `headers` et `payload`.
- `lib/calendar/events.ts` — `serializeEvent` (nouveau).
- `lib/calendar/client.ts` — client HTTP + `toLocalInput` / `fromLocalInput`.

**Routes** — `GET`/`POST` sur `/api/matches/[matchId]/events`, `PATCH`/`DELETE`
sur `.../events/[eventId]`. Documentées dans `api/doc/README.md`.

**Base** — `user_version 15` : `messages.kind` accepte `'event'` et la table
gagne `event_id` (`REFERENCES events (id) ON DELETE CASCADE`), avec les
contraintes qui vont avec. Reconstruction par `rebuildEventMessages`.

**Front**

- `components/Event/EventPanel.tsx` — bouton agenda dans l'en-tête de
  `ThreadPage`, modale avec deux sections qui s'excluent (« Vos rendez-vous » et
  « Proposer un rendez-vous »), fermeture automatique après un succès.
- `components/Event/EventEntry.tsx` — la carte affichée dans le fil, cliquable,
  qui rouvre le panneau.
- `components/Event/EventIcons.tsx` — l'icône, isolée pour être réutilisable
  depuis l'inbox sans tirer tout le panneau.
- `views/Inbox/InboxPage.tsx` — aperçu « Vous avez proposé un rendez-vous ».
- Traductions d'erreurs dans `lib/auth/errorMessages.ts`.

L'état (liste des rendez-vous, ouverture du panneau) vit dans `ThreadPage` :
le panneau et les cartes du fil lisent la même source, donc une modification
faite dans la modale se voit immédiatement dans la conversation.

## À vérifier au navigateur

1. **Ajouter les deux comptes de test** dans Google Cloud Console → écran de
   consentement OAuth → Audience → Utilisateurs tests. Sans ça : `403
   access_denied`, l'application est en statut « Test ».
2. Relier Google depuis les réglages avec les **deux** comptes, pour que chacun
   ait un `refresh_token` et une adresse.
3. Proposer un rendez-vous, vérifier l'événement dans l'agenda de l'organisateur
   et l'invitation reçue par l'invité.
4. Modifier, puis annuler ; vérifier que Google suit dans les deux cas.
5. Vérifier les deux `409` : invité sans Google, organisateur sans jeton.

## Décisions prises

- **Le scope calendrier est demandé aussi à la connexion Google**, pas seulement
  à la liaison. L'alternative (conditionner au `mode` du state) a été écartée :
  un écran de consentement de plus ne justifiait pas la complexité.
- **Aucun refresh token pour un compte créé via Google.** La ligne
  `oauth_accounts` n'existe qu'après `/api/auth/oauth/complete` ; faire transiter
  le jeton par le cookie de draft compliquait tout. Conséquence assumée : ces
  comptes doivent relier Google depuis les réglages, ce qui donne le
  `409 calendar_not_connected` déjà prévu.
- **L'absence de refresh token ne fait jamais échouer une connexion.** C'est une
  fonctionnalité bonus, pas une panne d'authentification.
- Les **deux** utilisateurs doivent avoir lié Google (`guest_google_required`).
- Événement créé dans l'agenda de **l'organisateur**, invité en `attendees` avec
  `sendUpdates=all` : Google envoie les courriels, pas nous.
- Modification et annulation réservées à l'organisateur.
- Annulation = `status = 'cancelled'`, la ligne est conservée.
- Échec Google = rendez-vous local avec `google_event_id = null`, réponse `201`.
- `google_event_id` n'est jamais exposé au client, seulement `synced`.
- **Le rendez-vous apparaît dans le fil comme un message de type `event`**, pas
  comme un texte : le message porte un `event_id` et aucun corps, la carte lit le
  rendez-vous en direct. Une modification ou une annulation se reflète donc dans
  la conversation, alors qu'un texte figé aurait menti dès le premier changement.
- **Le sélecteur de date reste celui du navigateur.** Le sélecteur natif de macOS
  est inaccessible depuis une page web ; l'alternative serait un composant maison,
  écartée pour l'instant.

## Rappels d'exécution

- **Statut « Test » côté Google : les refresh tokens expirent au bout de 7
  jours.** Relier les comptes le jour de la soutenance.
- Le schéma est passé à `user_version 15` : la table `messages` accepte le type
  `event`. Il n'existe **pas** de script `npm run db:migrate` — `applySchema` ne
  tourne qu'à l'ouverture de la base, donc il faut redémarrer le serveur.
- Le hook de pré-commit refuse **tout** warning ESLint. Paramètres inutilisés à
  préfixer par `_`.
- Compte de test : `feed19120` / `Qw7!zplmVnb2`.
- Playwright est installé dans le scratchpad de session, pas dans le projet.

## Écart avec le sujet (audit du 2026-08-16)

Tout le tronc commun est couvert, vérifié fichier par fichier. Deux points
restent discutables, aucun n'est un manque fonctionnel :

1. **`/search` ne cherche que par nom, prénom ou nom d'utilisateur.** Les
   critères de la « recherche avancée » exigés par le sujet — tranche d'âge,
   plage de note, localisation, tags — existent bien, mais dans les **filtres du
   feed** (`views/Feed/FeedFilters.tsx`), conformément à la décision « un seul
   endpoint pour les suggestions et la recherche avancée ». Le risque est
   uniquement de présentation : un correcteur qui ouvre `/search` ne les voit
   pas. À trancher : soit exposer le panneau de filtres sur `/search`, soit
   l'expliquer à l'oral en montrant le feed.
2. **`ratingMax` n'est pas exposé dans l'interface.** L'API l'accepte
   (`lib/discovery/query.ts`), le formulaire n'offre que `ratingMin` — la
   « plage » de popularité est donc tronquée à sa borne basse.

Trois réserves à connaître pour la soutenance, sans correctif prévu :

- **Le temps réel dépend entièrement de Pusher.** Sans les variables
  `PUSHER_*`, `realtime()` renvoie `null` et il n'existe aucun repli par
  interrogation périodique : chat et notifications cessent d'être instantanés.
- **La note de popularité est la moyenne des avis reçus**, pas un score dérivé
  de l'activité. C'est un choix assumé, le sujet laisse la définition libre.
- **Le seed des 500 profils dépend du réseau** (identités et photos distantes) :
  il échoue hors ligne. La base actuelle est déjà peuplée.

La politique de mot de passe rejette tout mot de passe contenant un mot anglais
courant. Le dictionnaire ne descend pas sous 5 lettres, donc la règle est
sévère mais utilisable — c'est exactement ce que demande le sujet.

## Points ouverts

- `users.is_online` n'est jamais écrite : la présence se calcule partout depuis
  `last_seen_at`. La colonne devrait disparaître du schéma.
- Le registre d'appels vit en mémoire (`globalThis.matchaCalls`) : un appel
  décroché puis interrompu sans raccrocher bloque tout nouvel appel pendant
  4 heures (`409 already_in_call`).
- Le sujet demande de localiser l'utilisateur qui refuse le GPS (« par exemple
  son adresse IP »). Décision de l'utilisateur : on s'en tient à la saisie
  manuelle de ville.
