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
