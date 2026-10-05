# Plateforme CTF — Section Cybersécurité ESATIC

Implémentation Next.js de la maquette `project/Plateforme CTF - ESATIC v4.dc.html` :
Accueil, Cours, Détail d’un cours, Défis, Détail d’un défi, Classement et Profil, avec en plus une page Connexion / Inscription.

## Démarrer

```bash
cd app
npm install
cp .env.example .env              # puis renseigner FLAG_SECRET (voir la commande dans le fichier)
npm run db:seed -- --demo         # défis + 7 comptes de démo (mot de passe : demo1234)
npm run dev                       # http://localhost:3000
```

En production : `npm run build && npm start`. En production, toute vérification de flag échoue tant que `FLAG_SECRET` n’est pas défini, et il faut relancer le seed avec ce même secret.

## Architecture

| Élément | Choix |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Base de données | SQLite via `better-sqlite3` (`data/ctf.db`, chemin modifiable avec `DATABASE_PATH`) |
| Authentification | Pseudo + mot de passe (scrypt), session par cookie `httpOnly` (jeton stocké haché en base) |
| Flags | Jamais envoyés au navigateur. Stockés en **HMAC-SHA256** (clé `FLAG_SECRET`), comparés en temps constant |
| Anti-bruteforce | 10 soumissions de flag max par minute et par joueur |
| Icônes / polices | Phosphor (paquet npm, servi localement) · Space Grotesk / IBM Plex Sans / JetBrains Mono (Google Fonts) |

```
src/
  app/                    pages (une route par écran) + actions.ts (flag, connexion, inscription, déconnexion)
  components/             Header, NavLinks, ChallengeCard, FlagForm, AuthForm
  lib/catalog.ts          niveaux, catégories, cours, liens des documents (sans secret, importable côté client)
  lib/db.ts               schéma SQLite
  lib/data.ts             requêtes : défis, classement, profil
  lib/crypto.ts           hachage des flags et des mots de passe
scripts/seed.ts           chargement des défis (et des comptes de démo)
data/                     challenges.example.json (versionné) · challenges.json et ctf.db (ignorés par git)
```

## Ajouter ou modifier des défis

1. Copier `data/challenges.example.json` en `data/challenges.json` (ce fichier n’est **pas versionné** : il contient les vrais flags).
2. Éditer les défis : `id`, `title`, `category` (`SYS`/`REC`/`WEB`/`EXP`), `level` (1–3), `points`, `description`, `goal`, `cmd`, `output`, `flag`, et `published: false` pour masquer un défi.
3. `npm run db:seed` : les défis sont mis à jour sans toucher aux résolutions existantes.

> Les flags de `challenges.example.json` sont ceux de la maquette, donc publics : ne pas les utiliser pour une vraie compétition.

## Documents de cours

Les boutons « Lire » et « PDF » pointent, comme dans la maquette, vers
`/docs/Niveau N/Partie P/Séance S/<fichier>.dc.html|.pdf`
(ex. `/docs/Niveau 2/Partie 2/Séance 2/N2-P2-S2 Pratique Nmap.pdf`).
Déposer les fichiers dans `public/docs/` en respectant cette arborescence, ou définir `NEXT_PUBLIC_DOCS_BASE` pour les servir depuis un autre hôte.
Le niveau 3 s’affiche « Bientôt » tant que ses cours ne sont pas ajoutés dans `src/lib/catalog.ts`.

## Différences avec la maquette

- **Connexion obligatoire pour soumettre un flag.** Sans compte, la page du défi affiche « Connecte-toi pour soumettre ». L’en-tête affiche « Connexion » à la place des points et de l’avatar.
- **Statut « En cours »** : un défi pour lequel le joueur a déjà soumis au moins un flag erroné.
- **Résolutions et points** : calculés à partir de la base, et non plus fixés à la main.
- **Classement** : à égalité de points, le premier arrivé à ce score passe devant.
- **Profil** : les défis résolus sont triés par date de résolution, et on peut se déconnecter depuis son propre profil.
# Plateforme-cyber-Esatic
