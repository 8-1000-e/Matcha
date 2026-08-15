# Tâche en cours — audit du sujet

Branche `fix/activity-and-deck`, partie de `main` après le merge de la PR #18.
Mise à jour : 2026-08-15.

## Fait sur cette branche

- **Bug des onglets** — recliquer l'onglet actif de `/views` ou `/likes` laissait
  « Chargement… » pour toujours : le handler remettait la liste à `null` alors
  que `scope` ne changeait pas, donc l'effet ne se rejouait pas. Les deux écrans
  partagent maintenant `ActivityTabs`, le doublon a disparu.
- **Pagination** — `/api/likes` et `/api/views` acceptent `page` et rendent
  `page`, `pages`, `total`. 20 par page, pages numérotées dans l'écran.
- **Profil bloqué** — écran dédié au lieu du `404`, avec bouton Débloquer quand
  c'est moi qui ai bloqué. Seule `GET /api/users/[id]` distingue le cas.
- **Chiffrement des messages** — AES-256-GCM, clé `MESSAGES_KEY` dans `.env`.
- **Feed en deck** — une carte montée, flèches, clavier, glisser.
- **Largeur du feed** — `wide` comme toutes les autres routes.

## Ce qui est fait et vérifié au navigateur

- **Feed** — carte plein écran deux colonnes (galerie à gauche, identité,
  biographie et tags à droite), défilement carte par carte, filtres avec
  brouillon et bouton Appliquer, tri et sens du tri, like optimiste, lien vers
  le profil. Session rejouée au retour depuis `sessionStorage`.
- **Profil public** `/users/[id]` — en-tête façon Instagram, onglets Photos et
  Avis, galerie plein écran, présence, like, menu Signaler / Bloquer.
- **Mon profil** `/me` — même grammaire visuelle, édition en place (identité,
  biographie, centres d'intérêt avec le sélecteur de l'inscription), gestion des
  photos, avis reçus.
- **Réglages** `/settings` — trois sections : localisation (consentement stocké
  en base, relevé quotidien, choix de ville), comptes bloqués, compte.
- **Activité** — `/views` (qui m'a vu, mes visites) et `/likes` (qui m'a liké,
  mes likes), atteignables depuis le rail.
- **Chrome** — rail de gauche avec avatar et déconnexion, cloche de
  notifications, heartbeat de présence, synchronisation de position.

## Ce qui manque pour le sujet

1. **Recherche avancée** — écran dédié absent. Le back est prêt :
   `GET /api/discovery` accepte déjà tous les filtres et tris.
2. **Filtre par centres d'intérêt** — la route accepte `tags=`, la barre de
   filtres ne l'expose pas.
3. **Repli IP pour la localisation** — le sujet demande de localiser par IP
   quand l'utilisateur refuse le GPS. Aujourd'hui : ville choisie à la main.
4. **Écrire un avis** — aucune route. `upsertReview` et `removeReview` existent
   dans le repository mais ne sont appelés par personne, donc la note de
   popularité ne peut bouger que par le seed.
5. **Changer d'adresse e-mail** — `PATCH /api/profile` l'accepte et relance la
   vérification, aucun écran ne le propose.

## Points ouverts

- `users.is_online` n'est jamais écrite : la présence se calcule partout depuis
  `last_seen_at`. La colonne devrait disparaître du schéma.
- Un profil peut être complet avec une ville mais sans coordonnées ; il sort
  alors du tri par distance.
- Une **route d'export RGPD** reste à écrire. Le chiffrement des messages est
  réversible exprès pour la rendre possible, mais rien ne l'appelle encore.
- `src/app/debug/` (non suivi) lit `popularity_score`, supprimé de
  `DiscoveryRow` le 2026-08-14 : `npm run build` et `tsc` échouent dessus.

## Rappels d'exécution

- Toute modification du schéma exige `npm run db:migrate` (ou un redémarrage) :
  `applySchema` ne tourne qu'à l'ouverture de la base. Oublier la migration
  donne un `500` sur la route qui écrit la nouvelle colonne.
- Le dossier est synchronisé par iCloud : des fichiers « X 2.ts » réapparaissent
  dans `.next` après chaque build et cassent `tsc`. Les supprimer, ou couper la
  synchronisation du dossier.
- Compte de test : `feed19120` / `Qw7!zplmVnb2` — **ne fonctionne plus**, le
  mot de passe a changé depuis.
- `MESSAGES_KEY` doit exister dans `.env` (32 octets hex, `openssl rand -hex 32`)
  ou toute lecture de message jette au démarrage. Volontaire : pas de repli
  silencieux sur du clair.
