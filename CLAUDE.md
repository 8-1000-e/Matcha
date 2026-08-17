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

- **Branche** : `bonus` (poussée sur origin, part de `main`)
- **Statut** : tous les bonus visés sont écrits — OAuth 42 + Google, éditeur de
  photos, recherche, carte globe, et **rendez-vous** (routes, agenda Google,
  panneau dans la conversation, carte dédiée dans le fil). Reste à dérouler un
  test complet au navigateur avec deux comptes Google.
- **Dernière mise à jour** : 2026-08-16

## Task Progress

- [x] Tronc commun : auth, profil, feed, recherche, chat, notifications, modération
- [x] Bonus : connexion 42 et Google, liaison de comptes depuis les réglages
- [x] Bonus : éditeur de photos (recadrage, rotation, filtres) + glisser-déposer
- [x] Bonus : carte globe MapLibre avec regroupement et chargement par zone
- [x] Recherche par nom, prénom ou nom d'utilisateur (`/search`)
- [x] Bonus rendez-vous : agenda Google, quatre routes, panneau et carte dans le
      fil de conversation — voir `docs/current-task.md`
- [ ] Repli de localisation quand l'utilisateur refuse le GPS (décision : écarté)

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
- **Coordonnées floutées** avant d'atteindre le client : `blurPoint` décale de
  700 m maximum, de façon déterministe (hash de l'identifiant). Un décalage
  aléatoire serait moyennable sur plusieurs chargements.
- **Villes embarquées** dans le dépôt (`data/cities.tsv.gz`) et chargées à
  l'ouverture de la base : ce sont des données de référence, pas un seed.
- **Pagination par `LIMIT/OFFSET`** sur les listes d'activité, contrairement au
  feed : elles sont ordonnées par un horodatage figé, pas par un critère
  volatil, donc le raisonnement du feed figé ne s'y applique pas.
- **Messages chiffrés, pas hachés** : un hachage est à sens unique et rendrait
  l'export RGPD impossible. Le sujet ne demande pas de chiffrement ; c'est un
  choix assumé, qui protège du vol du fichier SQLite et de rien d'autre.
- **Le blocage n'est plus un `404`** sur `GET /api/users/[id]` seulement. Toutes
  les autres routes gardent le `404` indistinct.
- **Export RGPD en JSON** depuis les réglages (`GET /api/profile/export`) :
  messages déchiffrés, tiers réduits à leur nom d'utilisateur, photos par
  identifiant seulement, aucun secret (hachage, jetons) exporté.
- **Un avis se mérite : 20 messages texte échangés, au moins un de chaque
  côté.** Un simple match ne suffit plus. Le droit de noter et l'avis lui-même
  survivent au « dématch » et au blocage : ni les messages ni la ligne `matches`
  ne sont supprimés, et la liste des avis n'exclut plus les auteurs bloqués —
  sinon on effacerait un avis gênant en bloquant son auteur.
- **Un rendez-vous est un message de type `event`**, pas un texte : le message
  porte un `event_id` et aucun corps, la carte du fil lit le rendez-vous en
  direct. Une modification ou une annulation se reflète donc dans la
  conversation, alors qu'un texte figé aurait menti dès le premier changement.
- **Compte supprimé = invisible tout de suite, effacé au 14ᵉ jour.** Le RGPD
  n'accorde aucun délai de rétention ; il impose l'arrêt du traitement. Les 14
  jours sont un garde-fou produit, la rétention reste technique et invisible.
