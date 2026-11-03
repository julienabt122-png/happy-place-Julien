---
created: 2026-11-02
updated: 2026-11-02
status: draft-ia
---

# Spec - Composants interface EP-1 - v1

Résumé court des maquettes validées, pour que Claude Code reconstruise l'interface sans relire les gros fichiers HTML (économie de crédits). Les valeurs viennent de `F-01 - Accueil admin desktop - v8.html` (référence) et du skill `charte-happy-place`. À copier dans le dépôt (par exemple `docs/spec-interface.md`) et à référencer dans `CLAUDE.md`. En cas d'écart avec un HTML, le HTML de référence fait foi.

## 1. Jetons

| Rôle | Valeur |
|---|---|
| Fond de page | `#FBF9F8` |
| Carte, fenêtre | `#FFFFFF`, bordure `#E6E6E1` |
| Texte, texte secondaire | `#1B1C1C`, `#444748` |
| Anthracite (boutons pleins, focus, icônes) | `#171818` |
| Gris de zone (bandeaux, champs en lecture) | `#EFEDED` |
| Bordure de champ, icône neutre | `#747878` |
| Survol : fond clair, bouton plein | `#E2DEDD`, `#4F5252` |
| Rose (nouveauté, actif du menu, bouton Highlight) | `#FCDBDB`, survol `#DEBFBF` |
| Statut positif | fond `#D9EDDC`, bordure et icône `#2D6A3E` |
| Statut négatif | fond `#FFC4BC`, bordure et icône `#BA1A1A` (valeur des accueils validés ; décision de Julien du 2026-11-02, registre E37) |
| Statut « à mettre à jour » | fond `#FFF1CC`, bordure et icône `#8A5A00` |
| Polices | Comfortaa (titres), Inter (texte), JetBrains Mono (libellés, tags, compteurs) |
| Rayons | 4 px (boutons, champs, tags), 8 px (cartes, fenêtres) |
| Ombres | aucune |
| Focus | contour 2 px `#171818`, décalage 2 px, sur tout lien, bouton et champ |

## 2. Composants (classes Tailwind de référence)

- **Bouton principal** : `h-11 px-5 bg-[#171818] hover:bg-[#4F5252] text-white text-[14px] font-semibold rounded-[4px] transition-colors`.
- **Bouton secondaire** : `h-11 px-5 border border-[#171818] bg-transparent text-[#171818] hover:bg-[#EFEDED] text-[14px] font-semibold rounded-[4px]`.
- **Bouton tertiaire** : texte souligné, `h-11 px-3 -ml-3 rounded-[4px] hover:bg-[#EFEDED] underline font-semibold`.
- **Bouton Highlight** (un par écran, seul rose) : `bg-[#FCDBDB] hover:bg-[#DEBFBF] text-[#171818]`.
- **Bouton icône** (cloche, aide, croix) : zone 44 x 44 ; sur fond gris `hover:bg-[#E2DEDD]`, sur blanc `hover:bg-[#EFEDED]`.
- **Carte** : `bg-white border border-[#E6E6E1] rounded-[8px] overflow-hidden`. La carte principale de l'écran ajoute `border-t-[3px] border-t-[#171818]` (une seule par écran).
- **Bandeau de carte** : `h-14 bg-[#EFEDED] border-b border-[#E6E6E1] px-6 flex items-center justify-between` ; icône Material 22 px, titre Comfortaa gras 18 px sur une ligne, compteur, puis lien « Voir tout » à droite (Inter 14 px semi-gras, souligné, flèche 18 px).
- **Compteur discret** : mono 12 px `#444748`, sans fond. **Compteur sombre** (un par écran, carte principale) : `bg-[#171818] text-white font-mono text-[11px] px-2 py-0.5 rounded-[4px]`.
- **Tag** : `font-mono text-[11px] leading-tight px-2 py-0.5 rounded-[4px] text-[#171818]`. Information : `bg-[#EFEDED]`. Nouveauté : `bg-[#FCDBDB] font-semibold` (étiquette « Nouveau » d'une actualité : visible 3 jours calendaires au plus, constante `NEWS_NEW_MAX_DAYS` dans `src/lib/news-recent.ts`). Statut : bordure 1 px, icône 14 px devant le mot (`check_circle` positif, `cancel` ou `error` négatif, `schedule` en attente, `update` à mettre à jour), couleurs du § 1. Jamais la couleur seule.
- **Ligne cliquable d'une liste** : bouton principal en `after:absolute after:inset-0`, `aria-haspopup="dialog"`, `aria-label="Ouvrir le détail : ..."`, boutons d'action au-dessus (`relative z-10`), focus de la ligne via `has-[...:focus-visible]`.
- **Champ de saisie** : bordure 1 px `#747878`, `rounded-[4px]`, hauteur 44 px pour un champ simple ; texte saisi Inter 16 px `#1B1C1C`, texte indicatif mono 13 px `#444748` ; libellé mono 13 px au-dessus, relié par `for`. Erreur : bordure 2 px `#BA1A1A`, icône `error`, message en `#BA1A1A` avec `role="alert"`. Champ prérempli : fond `#EFEDED`, icône `lock`, `aria-readonly`, atteignable au clavier.
- **Fenêtre modale** : voile `bg-[#171818]/50`, fenêtre `w-[640px]` (formulaire) ou `720px` (lecture), `bg-white border border-[#171818] rounded-[8px]`. Bandeau 56 px (même gabarit que la carte), croix 44 x 44 avec `-mr-[11px]`. Corps `p-6` avec 24 px entre blocs. Pied : bordure haute, `p-6`, tertiaire à gauche, secondaire puis principal à droite, 16 px d'écart. Échap ferme et rend le focus au déclencheur ; focus initial sur le premier champ (ou « Fermer » pour une lecture). Aucun rouge ni vert sur un bouton.
- **Menu latéral** (240 px, `bg-white border-r`) : entrées `h-12 px-6 gap-3 border-l-4`, actif `bg-[#FCDBDB] border-[#171818] font-bold` avec `aria-current="page"`, inactif `border-transparent text-[#444748] hover:bg-[#E2DEDD]`. Entrées : Accueil, Demandes, Points bloquants, Actualités, Indicateurs, puis Gestion (admin) et Aide.
- **En-tête** (64 px, `bg-white border-b`) : lien d'évitement « Aller au contenu principal » en premier, logo et « BIGGER BOAT » dans un bloc de 240 px, nom de la page, puis à droite cloche (compteur, panneau attaché, Échap), menu utilisateur, aide. Le logo vient de `BrandHeader` (image du dépôt).
- **États** : vide (message + bouton si le rôle peut agir), chargement (texte), erreur (rouge + icône + « Réessayer »), confirmation neutre (fond `#EFEDED`, coche anthracite). Modèle : `F-01 - Etats vides et erreurs - v1.html`.
- **Table** : vrai `<table>`, `th scope="col"`, en-tête mono 12 px sur `#FBF9F8`, colonnes d'actions de largeur fixe, aucun bouton sur deux lignes à 1 280 px.

## 3. Règles transverses

Titres en casse de phrase, boutons à l'infinitif, pas d'emoji, pas de tiret cadratin, accents français. Contenu centré sur 1 280 px au plus. Cibles de 44 px. Aucune information portée par la couleur seule. Texte courant jamais sous 16 px, aide jamais sous 14 px.

## 4. Composants partagés à créer une seule fois

`AppShell` (en-tête, menu, lien d'évitement), `ModuleCard` (carte à bandeau), `StatusTag` et `InfoTag`, `Field` (libellé, saisie, aide, erreur), `Modal` (gabarit ci-dessus), `EmptyState`, `DataTable`, boutons shadcn recolorés. Chaque page se compose ensuite avec eux : c'est ce qui rend l'interface homogène et les pages suivantes peu coûteuses.
