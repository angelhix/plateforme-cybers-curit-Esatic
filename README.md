# Plateforme CTF — Section Cybersécurité ESATIC

Implémentation Next.js de la maquette `project/Plateforme CTF - ESATIC v4.dc.html` :
Accueil, Cours, Détail d’un cours, Défis, Détail d’un défi, Classement et Profil, avec en plus une page Connexion / Inscription.

## Démarrage et base de données

Prérequis : Node.js compatible avec Next.js 16, npm et PostgreSQL. Le schéma de la base est géré par Prisma. Les exemples ci-dessous utilisent le terminal du projet.

### Option A : PostgreSQL temporaire pour les tests

Cette option utilise Podman et un conteneur jetable sur le port `5433`. Elle ne touche pas à la base PostgreSQL locale sur `5432`. Le conteneur est supprimé à l’arrêt grâce à `--rm`.

1. Démarrer le conteneur :

```bash
podman run --rm -d --name plateforme-ctf-db-temp \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=ctf-check \
  -e POSTGRES_DB=ctf_check \
  -p 127.0.0.1:5433:5432 \
  docker.io/library/postgres:17
```

2. Dans un autre terminal, vérifier que PostgreSQL accepte les connexions :

```bash
pg_isready -h 127.0.0.1 -p 5433
```

3. Définir les paramètres de test dans le terminal du projet. Garder exactement le même `DATABASE_URL` et le même `FLAG_SECRET` pour les migrations, le seed et l’application :

```bash
export DATABASE_URL='postgresql://postgres:ctf-check@127.0.0.1:5433/ctf_check?schema=public'
export FLAG_SECRET="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
```

4. Installer les dépendances, appliquer les migrations et charger les données :

```bash
npm install
npx prisma migrate deploy
npm run db:seed -- --demo
```

`--demo` crée les défis et sept comptes joueurs de démonstration, tous avec le mot de passe `demo1234`. Pour provisionner également un administrateur, donne explicitement ses identifiants avant le seed :

```bash
ADMIN_HANDLE=admin ADMIN_PASSWORD='RemplacerParUnMotDePasseSolide' npm run db:seed -- --demo
```

Le pseudo doit contenir 3 à 20 caractères valides et le mot de passe au moins 8 caractères. Le seed crée ou met à jour ce compte avec le rôle `ADMIN`. Aucun compte admin ni mot de passe par défaut n’est créé automatiquement.

Pour créer un administrateur après l’installation, utilise la même commande depuis le répertoire du projet, avec `.env` configuré pour la base cible :

```bash
ADMIN_HANDLE=nom.admin ADMIN_PASSWORD='UnePhraseDePasseLongueEtUnique' npm run db:seed
```

Cette opération peut aussi promouvoir en `ADMIN` un compte qui porte déjà ce pseudo, et remplace son mot de passe par celui fourni. Ensuite, connecte-toi sur `/connexion` avec ce pseudo et ce mot de passe, puis va sur `/admin`. Ne partage pas le mot de passe, ne le mets pas dans le dépôt et ne lance pas cette commande contre la base de production sans vérifier `DATABASE_URL`.

5. Lancer l’application et ouvrir `http://localhost:3000` :

```bash
npm run dev
```

Pour arrêter le serveur, faire `Ctrl+C` dans son terminal. Puis arrêter et supprimer la base temporaire :

```bash
podman stop plateforme-ctf-db-temp
```

Les données de ce conteneur sont perdues à son arrêt. Pour repartir d’une base de test vierge, relancer la commande `podman run` ci-dessus.

### Option B : PostgreSQL local persistant

Cette option utilise le cluster PostgreSQL installé sur la machine, généralement au port `5432`. Sur Kali/Debian, vérifier son état puis le démarrer avec les droits administrateur :

```bash
pg_lsclusters
sudo pg_ctlcluster 18 main start
pg_isready -h 127.0.0.1 -p 5432
```

Adapte `18` au numéro de version affiché par `pg_lsclusters`. Pour arrêter le cluster, utiliser `sudo pg_ctlcluster 18 main stop`. Sur une autre distribution, utiliser le gestionnaire de services fourni par celle-ci.

Créer un rôle PostgreSQL et une base dédiés au projet (remplacer le mot de passe) :

```bash
sudo -u postgres psql
```

Dans l’invite `psql` :

```sql
CREATE USER ctf_backend WITH PASSWORD 'RemplacerParUnMotDePasseSolide';
CREATE DATABASE ctf_esatic OWNER ctf_backend;
\q
```

Copier `.env.example` vers `.env`, puis y renseigner `DATABASE_URL` et un `FLAG_SECRET` aléatoire. Encoder en URL les caractères spéciaux du mot de passe PostgreSQL dans l’URL :

```dotenv
DATABASE_URL="postgresql://ctf_backend:mot-de-passe-url-encode@127.0.0.1:5432/ctf_esatic?schema=public"
FLAG_SECRET="secret-aleatoire-long-et-stable"
```

Appliquer les migrations et charger les défis. Pour créer les comptes de démonstration, ajouter `--demo`. Pour provisionner l’admin au même moment, fournir ses identifiants :

```bash
npm install
npx prisma migrate deploy
ADMIN_HANDLE=admin ADMIN_PASSWORD='RemplacerParUnMotDePasseSolide' npm run db:seed -- --demo
npm run dev
```

Le compte `admin` pourra ensuite se connecter sur `/connexion`, puis ouvrir `/admin`. Les comptes joueurs de démo utilisent `demo1234` ; ne pas conserver ces mots de passe sur une instance accessible publiquement.

Pour un lancement de production local, garder PostgreSQL démarré et les variables de `.env` configurées, puis lancer :

```bash
npm run build
npm start
```

L’application utilise le même `DATABASE_URL` et le même `FLAG_SECRET` que lors du seed. Changer `FLAG_SECRET` rend les flags déjà chargés impossibles à vérifier : garder ce secret stable et confidentiel.

## Sécurité et limites connues

Les pages `/admin` sont protégées par une session et par une vérification du rôle `ADMIN` côté serveur ; chaque action d’écriture admin vérifie aussi ce rôle. Connaître l’URL ne donne donc pas accès aux fonctions admin. Les URL ne sont toutefois pas « indétectables » : elles peuvent être découvertes et doivent rester protégées par l’autorisation, pas par le secret de leur chemin. Un compte admin dédié avec un mot de passe unique et long est recommandé.

La plateforme utilise des requêtes Prisma paramétrées, échappe le texte rendu par React, stocke des mots de passe hachés par scrypt, protège les cookies de session (`httpOnly`, `SameSite=Lax`, `Secure` en production), et ne transmet pas les flags ni les réponses correctes de quiz au navigateur. Les Server Actions Next.js valident l’origine des requêtes. Des en-têtes HTTP de base contre le clickjacking, le MIME sniffing et les fuites de référent sont configurés ; HSTS n’est activé qu’en production.

Cela ne constitue pas une certification OWASP Top 10 ni une garantie d’absence de vulnérabilité. Avant une mise en production publique, il faut encore configurer un limiteur de tentatives de connexion partagé entre instances (et correctement alimenté par l’IP depuis un proxy de confiance), une politique CSP stricte compatible avec le déploiement, TLS et les en-têtes du proxy, ainsi que sauvegardes et permissions minimales pour PostgreSQL. Les comptes de démonstration sont réservés au développement. Faire également les mises à jour de dépendances et un audit de sécurité du déploiement réel.

## Architecture

| Élément | Choix |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Base de données | PostgreSQL via Prisma |
| Authentification | Pseudo + mot de passe (scrypt), session par cookie `httpOnly` (jeton stocké haché en base) |
| Flags | Jamais envoyés au navigateur. Stockés en **HMAC-SHA256** (clé `FLAG_SECRET`), comparés en temps constant |
| Anti-bruteforce | 10 soumissions de flag max par minute et par joueur |
| Icônes / polices | Phosphor (paquet npm, servi localement) · Space Grotesk / IBM Plex Sans / JetBrains Mono (Google Fonts) |

```
src/
  app/                    pages (une route par écran) + actions.ts (flag, connexion, inscription, déconnexion)
  components/             Header, NavLinks, ChallengeCard, FlagForm, AuthForm
  lib/catalog.ts          niveaux, catégories, cours, liens des documents (sans secret, importable côté client)
  lib/prisma-client.ts    instance Prisma partagée
  lib/data.ts             requêtes PostgreSQL : défis, classement, profil
  lib/crypto.ts           hachage des flags et des mots de passe
scripts/seed.ts           chargement des défis (et des comptes de démo)
data/                     challenges.example.json (versionné) · challenges.json (ignoré par git)
```

## Ajouter ou modifier des défis

1. Copier `data/challenges.example.json` en `data/challenges.json` (ce fichier n’est **pas versionné** : il contient les vrais flags).
2. Éditer les défis : `id`, `title`, `category` (`SYS`/`REC`/`WEB`/`EXP`), `level` (1–3), `points`, `description`, `goal`, `cmd`, `output`, `flag`, et `published: false` pour masquer un défi.
3. `npm run db:seed` : les catégories et défis sont créés ou mis à jour dans PostgreSQL sans supprimer les résolutions existantes.

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
