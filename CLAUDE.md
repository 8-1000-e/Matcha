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

- **Branche** : `back/discovery`
- **Statut** : endpoint de découverte terminé et testé ; front du feed en cours
  (carte plein écran + défilement carte par carte + bouton like)
- **Dernière mise à jour** : 2026-08-14

## Task Progress

- [x] Auth complète (inscription, vérification e-mail, login, reset, refresh)
- [x] Profil complet (genre, orientation, bio, tags, photos, géolocalisation)
- [x] Audit complet (sécurité, conformité, back, front) + correctifs appliqués
- [x] Référentiel GeoNames embarqué, chargé automatiquement
- [x] Seed de 500 faux profils (identités, villes, photos, likes, avis)
- [x] `GET /api/discovery` — feed figé par session, filtres, tri, pagination
- [x] `POST/DELETE /api/users/[id]/like`
- [ ] **Front du feed** <- EN COURS — voir `docs/current-task.md`
- [ ] Page profil public + historique de visites
- [ ] Recherche avancée (même endpoint, écran dédié)
- [ ] Chat temps réel, notifications (notifications faites par un collègue)
- [ ] Blocage / signalement, statut en ligne
- [ ] Chrome applicatif global (header, nav, déconnexion)

## Key Decisions

- **Feed figé par session** plutôt que curseur : l'ordre est calculé une fois et
  stocké, donc aucun doublon ni saut pendant le scroll. Les exclusions
  (likés, bloqués) sont **rejouées à chaque lecture** pour rester justes.
- **Un seul endpoint** pour les suggestions et la recherche avancée : le sujet
  exige les mêmes tris et filtres pour les deux.
- **Note de popularité = moyenne des avis sur 5**, rien d'autre. La formule
  composite précédente était une invention, elle a été supprimée partout.
- **Villes embarquées** dans le dépôt (`data/cities.tsv.gz`) et chargées à
  l'ouverture de la base : ce sont des données de référence, pas un seed.
