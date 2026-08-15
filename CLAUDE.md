# Matcha — contexte projet

Projet 42 : site de rencontre. Application unique dans `matcha-app/`
(Next.js 16, App Router, TypeScript, SQLite via better-sqlite3, Tailwind v4).

## Context Recovery

IMPORTANT: au démarrage d'une session, lire tous les `.md` de `docs/` pour
restaurer le contexte complet de la session précédente.

## Règles de travail

- **Mode enseignement** : l'utilisateur écrit le code, j'explique. Exceptions
  systématiques et sans redemander : **toute regex** et **toute fonction qui
  contient du SQL** sont à moi. Je rends aussi les squelettes de fonctions
  (signatures + imports) quand il les demande.
- **Commits** : une seule ligne, en anglais, conventional commit
  (`type(scope): description`). **Jamais de corps.** Jamais de mention de
  Claude ni de `Co-Authored-By`.
- **Pas de commentaires dans le code** — l'utilisateur les fait supprimer
  systématiquement. Les explications vont dans `matcha-app/src/app/api/doc/`
  et dans `docs/`.
- **Réponses courtes et directes**, en français.
- Vérifier l'état réel des fichiers avant de répondre ; gérer les imports.
- Documenter chaque endpoint testé dans `matcha-app/src/app/api/doc/README.md`.

## Contraintes du sujet

- Pas d'ORM, pas de validateur tiers, pas de gestionnaire de comptes. SQL écrit
  à la main.
- Aucune erreur, aucun warning. Une faille de sécurité = note 0.
- Minimum 500 profils en base.

## Current State

- **Branche** : `front/profile`
- **Statut** : feed, profil public, mon profil, réglages, visites et likes
  terminés et vérifiés au navigateur. Messagerie et modération reprises de la
  PR #17. Reste la recherche avancée et les manques listés dans
  `docs/current-task.md`.
- **Dernière mise à jour** : 2026-08-15

## Task Progress

- [x] Auth complète (inscription, vérification e-mail, login, reset, refresh)
- [x] Profil complet (genre, orientation, bio, tags, photos, géolocalisation)
- [x] Audit complet (sécurité, conformité, back, front) + correctifs appliqués
- [x] Référentiel GeoNames embarqué, chargé automatiquement
- [x] Seed de 500 faux profils (identités, villes, photos, likes, avis)
- [x] `GET /api/discovery` — feed figé par session, filtres, tri, pagination
- [x] `POST/DELETE /api/users/[id]/like`
- [x] Front du feed (carte, filtres, tri, like, session rejouée)
- [x] Page profil public + historique de visites + avis
- [x] Mon profil éditable, réglages, likes reçus et envoyés
- [x] Chat temps réel, notifications (repris de la PR #17)
- [x] Blocage / signalement, statut en ligne
- [x] Chrome applicatif global (rail gauche, cloche, déconnexion)
- [ ] **Recherche avancée** (même endpoint, écran dédié) <- EN COURS
- [ ] Filtre par centres d'intérêt dans la barre de filtres
- [ ] Repli IP quand la géolocalisation est refusée
- [ ] Écrire et supprimer un avis (aucune route aujourd'hui)

## Key Decisions

- **Feed figé par session** plutôt que curseur : l'ordre est calculé une fois et
  stocké, donc aucun doublon ni saut pendant le scroll. Les exclusions
  (likés, bloqués) sont **rejouées à chaque lecture** pour rester justes.
- **Un seul endpoint** pour les suggestions et la recherche avancée : le sujet
  exige les mêmes tris et filtres pour les deux.
- **Note de popularité = moyenne des avis sur 5**, rien d'autre. La formule
  composite précédente était une invention, elle a été supprimée partout.
- **Présence calculée** depuis `last_seen_at` (fenêtre de 120 s), jamais lue
  dans `users.is_online`, colonne morte.
- **Consentement de géolocalisation en base** avec `location_updated_at` : le
  front ne redemande la position que passé 24 h, et seulement si l'utilisateur a
  accepté.
- **Villes embarquées** dans le dépôt (`data/cities.tsv.gz`) et chargées à
  l'ouverture de la base : ce sont des données de référence, pas un seed.
