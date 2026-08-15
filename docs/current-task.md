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

## Audit du 2026-08-15 — ce qui bloque encore

1. **26 profils en base, le sujet en exige 500.** `npm run db:seed:profiles`
   n'a pas été rejoué depuis la dernière remise à zéro du schéma. Il ne
   supprime que les comptes `@`+`EMAIL_DOMAIN`, pas les comptes réels, mais il
   a besoin du réseau (randomuser.me). **Décision : lancé le jour de la
   soutenance, pas avant.**
2. **Recherche avancée absente** (§IV.4). Le back accepte déjà tous les
   critères ; il manque l'écran.
3. **Le pied de page est vide sur presque tous les écrans.** `Screen` rend bien
   un `<footer>`, mais sans contenu ; le §III exige « au moins un en-tête, une
   section principale et un pied de page ». `/messages/[matchId]` fait
   exception : son composeur **est** un `<footer>`.
4. **`src/app/debug/` n'est pas suivi par Git.** S'il est commité tel quel, il
   expose la liste des candidats en ignorant l'orientation. À laisser hors du
   dépôt, ou à fermer hors développement.

### Levé le 2026-08-15

- **Changement de mot de passe** — `PATCH /api/profile/password`, ancien mot de
  passe exigé, politique identique à l'inscription, autres appareils
  déconnectés (`revokeAllRefreshTokens`) et session courante réémise.
- **Page `/privacy`** — mention d'information de l'article 13, publique, fondée
  sur ce que l'application collecte réellement. Composant `Footer` fourni.

- **Suppression de compte RGPD** — `DELETE /api/profile` (mot de passe exigé) et
  `POST /api/profile/restore`. Disparition immédiate, rétention 14 jours,
  effacement réel au terme, fichiers photos compris. Écran `/account-deleted`.

- **Écriture d'avis** — `PUT` et `DELETE /api/users/[id]/reviews`, formulaire
  d'étoiles dans l'onglet Avis du profil public. Mesuré : la moyenne passe de
  0 à 5 puis à 3, et retombe à 0 après suppression. La « note de popularité »
  du §IV.2 peut enfin bouger.
- **Filtres tags et ville** dans la barre du feed (§IV.3). Les identifiants de
  tags viennent du composant serveur de `/feed`, pas d'un aller-retour.
- **Changement d'adresse e-mail** dans `/settings` (§IV.2), avec l'avertissement
  que la vérification est suspendue.
- **Rail et cloche sur la page de conversation** (§IV.1, §IV.6, §IV.7).

## Ce qui manque pour le sujet

1. **Recherche avancée** — écran dédié absent (§IV.4). Le back est prêt :
   `GET /api/discovery` accepte déjà tous les filtres et tris.
2. **Pied de page vide** sur presque tous les écrans (§III). Le composant
   `Footer` existe (`components/Layout/Footer.tsx`) ; il reste à le passer en
   `footer={<Footer />}` sur chaque écran.

Le « repli IP » listé ici jusqu'au 2026-08-15 était une **erreur** : le §IV.2
de la version 6.0 demande une saisie **manuelle** de la ville quand le GPS est
refusé, pas une géolocalisation par IP. C'est déjà en place.

## Points ouverts

- `users.is_online` n'est jamais écrite : la présence se calcule partout depuis
  `last_seen_at`. La colonne devrait disparaître du schéma.
- Un profil peut être complet avec une ville mais sans coordonnées ; il sort
  alors du tri par distance.
- L'**export RGPD** (articles 15 et 20) reste à écrire — reporté à la fin du
  projet. Le chiffrement des messages est réversible exprès pour le permettre.
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
