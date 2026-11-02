@AGENTS.md

# Règles de Julien

- Écrire en français avec les accents. Ne jamais utiliser de tiret cadratin.
- Aucun secret dans le dépôt. Seule la clé publishable Supabase (`sb_publishable_…`) est autorisée ; jamais la clé `secret` ni `service_role`. Le fichier `.env` reste hors de git.
- Une branche par user story.
- Un commit par story, avec le message `US-XX: ...`.
- Jamais de push sur `main` sans demande explicite de Julien.
- Toute évolution de la base passe par un nouveau fichier dans `supabase/migrations` (ne jamais modifier une migration existante), puis lancer `select * from private.run_smoke_tests();` : toutes les lignes doivent revenir à `ok = true`.
- Julien débute avec git et le déploiement : expliquer simplement chaque commande avant de la lancer.
- Commit hors user story (config, déploiement, documentation) : message `chore: ...`.

## Commandes du projet

- `npm run dev` : lance l'app en local sur http://localhost:3000
- `npm run build` : construit la version de production
- `npm run typecheck` : vérifie les types TypeScript
- `npm run lint` : vérifie le style et les erreurs courantes du code

## Interface EP-1

- Avant toute interface, lis `docs/spec-interface.md`. N'ouvre pas les maquettes HTML, sauf si Julien te demande une page précise.
- Reconstruis les écrans avec les composants shadcn et les jetons de la charte (#FBF9F8, #171818, #1B1C1C, #444748, #FCDBDB, #EFEDED, #E6E6E1, #747878). Polices : Comfortaa pour les titres, Inter pour le texte, JetBrains Mono pour les libellés, tags et compteurs.
- Aucune ombre. Rayons de 4 px et 8 px. Focus visible : contour de 2 px anthracite décalé de 2 px sur tout contrôle. Survol avec fond sur tout bouton. Cibles de 44 px.
- Utilisable au clavier : Échap ferme une fenêtre et rend le focus à son déclencheur. Focus initial sur le premier champ (ou sur « Fermer » pour une lecture).
- Avant de coder une story : Julien colle ses critères dans le message ; propose un plan et attends son accord.
- Après une story : `npm run typecheck`, `npm run lint`, test au clavier, test avec deux comptes si des données sont touchées, puis résumé en français simple.
