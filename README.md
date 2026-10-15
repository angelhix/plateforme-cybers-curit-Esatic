# Plateforme Cyber ESATIC

Plateforme web de type CTF (Capture The Flag) dédiée à la cybersécurité, développée avec Next.js et Prisma. Elle permet de proposer des cours, des défis techniques, un système de validation de flags, un classement et un espace d'administration pour gérer le contenu et les utilisateurs.

## Sommaire
- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture du projet](#architecture-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration des variables d'environnement](#configuration-des-variables-denvironnement)
- [Base de données](#base-de-données)
- [Scripts disponibles](#scripts-disponibles)
- [Déploiement](#déploiement)
- [Sécurité](#sécurité)
- [Contribuer](#contribuer)
- [Licence](#licence)
- [Contact](#contact)

## Présentation

Cette plateforme a pour objectif d'offrir une expérience pédagogique et ludique pour l'apprentissage de la cybersécurité. L'application permet :

- d'accéder à des ressources pédagogiques et des cours,
- de consulter des défis classés par catégorie et niveau,
- de soumettre des flags à partir d'un accès utilisateur,
- de visualiser le classement des participants,
- de gérer les contenus et les comptes via une interface d'administration.

Le projet est conçu pour être simple à déployer, extensible et compatible avec un environnement de développement moderne basé sur JavaScript/TypeScript.

## Fonctionnalités

- Catalogue de défis avec niveaux, catégories et scores
- Système d'authentification utilisateur
- Vérification des flags côté serveur
- Tableau de bord / leaderboard
- Gestion des contenus de cours et documents publics
- Zone administration pour gérer défis et contenus
- Architecture orientée Next.js App Router
- Base de données gérée via Prisma

## Stack technique

- Langage principal : TypeScript
- Framework : Next.js
- Interface utilisateur : React
- Base de données : PostgreSQL via Prisma
- Authentification : sessions sécurisées côté serveur
- Gestion des secrets : variables d'environnement
- Sécurité : hachage des mots de passe et validation des flags côté serveur

## Architecture du projet

```text
.
├── src/
│   ├── app/                 # Routes et pages Next.js
│   │   ├── admin/           # Espace d'administration
│   │   ├── connexion/       # Authentification
│   │   ├── cours/           # Cours et ressources
│   │   ├── defis/           # Gestion des défis
│   │   ├── profil/          # Profil utilisateur
│   │   ├── globals.css      # Styles globaux
│   │   ├── layout.tsx       # Layout principal
│   │   ├── page.tsx         # Page d'accueil
│   │   └── actions.ts       # Actions serveur
│   ├── components/          # Composants réutilisables
│   └── lib/                 # Logique applicative et utilitaires
│       ├── admin.ts
│       ├── auth.ts
│       ├── catalog.ts
│       ├── crypto.ts
│       ├── data.ts
│       ├── prisma-client.ts
│       └── prisma.ts
├── prisma/
│   ├── migrations/          # Migrations Prisma
│   └── schema.prisma        # Modèle de données
├── public/
│   └── docs/                # Documents de cours publics
├── scripts/
│   └── seed.ts              # Script de chargement des données
├── data/                    # Données auxiliaires du projet
├── .env.example             # Exemple de configuration
├── next.config.ts           # Configuration Next.js
├── package.json             # Dépendances et scripts
├── tsconfig.json            # Configuration TypeScript
├── .gitignore               # Fichiers ignorés par Git
├── README.md                # Documentation du projet
└── package-lock.json        # Lockfile npm
```

## Prérequis

Avant de démarrer le projet, assurez-vous d'avoir les éléments suivants :

- Node.js compatible avec la version supportée par le projet
- npm
- Une base de données PostgreSQL
- Un terminal Unix/Linux ou PowerShell compatible

## Installation

1. Clonez le dépôt :

```bash
git clone https://github.com/essaie1-test/Plateforme-cyber-Esatic.git
cd Plateforme-cyber-Esatic
```

2. Installez les dépendances :

```bash
npm install
```

3. Configurez les variables d'environnement (voir section suivante).

4. Générez le client Prisma :

```bash
npx prisma generate
```

5. Lancez le projet en mode développement :

```bash
npm run dev
```

Puis ouvrez votre navigateur sur :

```text
http://localhost:3000
```

## Configuration des variables d'environnement

Le projet utilise un fichier `.env` local pour stocker les variables sensibles. Vous pouvez partir du modèle fourni dans `.env.example`.

Exemple de configuration :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nom_base?schema=public"
FLAG_SECRET="une_clé_secrète_longue_et_aléatoire"
NEXT_PUBLIC_DOCS_BASE="/docs"
```

Important :
- Ne jamais committer de valeurs réelles dans le dépôt.
- Garder `FLAG_SECRET` stable car il est utilisé pour valider les flags.
- Changer cette clé invalide les flags déjà générés ou stockés.

## Base de données

Le schéma de données est défini dans :

```text
prisma/schema.prisma
```

Les migrations sont stockées dans :

```text
prisma/migrations/
```

Pour appliquer les migrations :

```bash
npx prisma migrate deploy
```

Pour synchroniser le schéma localement :

```bash
npx prisma db push
```

Pour initialiser les données de démonstration ou les contenus de base, utilisez le script de seed :

```bash
npm run db:seed
```

## Scripts disponibles

Le fichier `package.json` expose les scripts suivants :

```bash
npm run dev      # démarrage du projet en mode développement
npm run build    # compilation de production
npm run start    # démarrage de la version buildée
npm run lint     # vérification TypeScript
npm run db:seed  # chargement des données initiales
```

## Déploiement

Pour déployer l'application en production :

1. Définir les variables d'environnement du serveur.
2. Configurer la base de données PostgreSQL.
3. Exécuter la génération Prisma.
4. Lancer la build :

```bash
npm run build
```

5. Démarrer l'application :

```bash
npm run start
```

Selon votre environnement d'hébergement, vous pouvez également déployer via des solutions telles que VPS, Docker, Vercel ou d'autres services compatibles Next.js.

## Sécurité

Le projet inclut plusieurs bonnes pratiques de sécurité, notamment :

- stockage des secrets dans des variables d'environnement,
- validation des actions sensibles côté serveur,
- hachage des mots de passe,
- protection de la session utilisateur,
- contrôle des accès pour les zones d'administration,
- validation de données et traitement côté serveur.

Important : cette application ne remplace pas une revue de sécurité complète. Avant une mise en production publique, il est recommandé de réaliser :

- un audit des accès et des permissions,
- une validation des flux de soumission et d'authentification,
- une configuration de sécurisation du serveur et des cookies,
- des sauvegardes régulières de la base de données.

## Contribuer

Les contributions sont les bienvenues.

Processus recommandé :

1. Fork du dépôt
2. Création d'une branche dédiée
3. Développement de la fonctionnalité ou correction
4. Vérification locale : build et lint
5. Soumission d'une pull request claire et documentée

Exemple :

```bash
git checkout -b feature/nom-fonctionnalite
npm run lint
npm run build
```

## Licence

Aucune licence spécifique n'est documentée dans ce dépôt pour le moment. Il est recommandé d'ajouter un fichier `LICENSE` pour formaliser les droits d'utilisation et de distribution du projet.

## Contact

Pour toute demande liée au projet, merci de passer par l'issue GitHub associée au dépôt ou de contacter le responsable du projet via les canaux officiels de votre organisation.

---

Ce README a été préparé avec une approche professionnelle et sans informations sensibles, secrets ou identifiants internes.
