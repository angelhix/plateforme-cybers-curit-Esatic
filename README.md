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

<<<<<<< HEAD
```bash
npm run start
=======
## Limitation des tentatives

Les limites sont stockées dans PostgreSQL, partagé entre les instances. Chaque compteur est incrémenté par un unique `INSERT ... ON CONFLICT DO UPDATE`, afin que les requêtes concurrentes ne puissent pas toutes lire le même ancien compteur.

| Action | Limite | Fenêtre / comportement |
|---|---:|---|
| Connexion, par pseudo et par source réseau | 5 / 300 | 15 minutes, puis délai progressif de 1 seconde à 15 minutes |
| Inscription, par source réseau | 20 | 1 heure |
| Inscription, globale à la plateforme | 500 | 1 heure |
| Soumission de flag, par joueur | 10 | 1 minute, en plus du contrôle transactionnel existant |
| Soumission de flag, par source réseau | 60 | 1 minute |
| Soumission de flag, par défi | 600 | 1 minute |

Les compteurs ne contiennent ni mot de passe ni flag. Le pseudo, la source réseau et l’identifiant du défi sont transformés en clés HMAC avec `RATE_LIMIT_SECRET`. Si PostgreSQL, la table de limite ou la configuration d’identité réseau manque, les actions concernées échouent fermées : connexion/inscription renvoient un message générique d’indisponibilité, et la soumission affiche une indisponibilité. Les messages de connexion restent identiques pour pseudo inconnu, mot de passe erroné et limite atteinte.

### IP derrière un proxy

En production, l’application **ne lit pas** `X-Forwarded-For` ni `X-Real-IP`. Elle exige `x-ctf-client-ip` accompagné de `x-ctf-client-ip-signature`. Le reverse proxy de confiance doit :

1. N’accepter le trafic de l’application que depuis le proxy/load balancer attendu ; bloquer l’accès direct au serveur Next.js.
2. Déterminer l’IP cliente depuis le pair réseau ou une chaîne de proxies explicitement configurée, dont chaque saut est de confiance.
3. Supprimer toute valeur entrante des deux en-têtes `x-ctf-client-ip` et `x-ctf-client-ip-signature`, puis les réécrire lui-même.
4. Calculer `x-ctf-client-ip-signature` comme HMAC-SHA256 hexadécimal de la valeur exacte de `x-ctf-client-ip`, avec `RATE_LIMIT_SECRET`.

Configurer `RATE_LIMIT_SECRET` avec au moins 32 caractères aléatoires dans l’application **et** dans le proxy de confiance. Ne pas le mettre dans le dépôt, les journaux ou les réponses HTTP. Les adresses IPv6 d’un même `/64` partagent un quota ; les adresses IPv4 sont comptées individuellement. Si l’hébergeur ne permet pas de signer un en-tête ou d’isoler l’origine, il faut intégrer son mécanisme d’identité client vérifié avant le déploiement ; ne pas activer une confiance aveugle dans `X-Forwarded-For`. En développement local, les actions partagent une identité de source locale.

### Migration et tests

Le limiteur requiert la migration `20261015120000_add_rate_limit_buckets`, qui ajoute uniquement la table des compteurs et son index. Elle n’a pas été appliquée lors de l’ajout du code. Avant tout déploiement, examiner puis autoriser l’application des migrations selon la procédure de sauvegarde habituelle. Tant qu’elle n’est pas appliquée, les actions protégées refusent de continuer au lieu de contourner le limiteur.

Lancer les tests unitaires non destructifs :

```bash
npm run test:security
```

Le test concurrent PostgreSQL est ignoré par défaut. Pour le lancer, configurer `RATE_LIMIT_TEST_DATABASE_URL` vers une **base de test isolée** où cette migration est déjà appliquée : il crée et supprime uniquement des buckets préfixés par un identifiant de test aléatoire. Ne pas pointer cette variable vers la base de production ou une base contenant des données à préserver.

Les lignes de limite peuvent être purgées après expiration par une tâche de maintenance dédiée ; conserver une rétention couvrant au moins les fenêtres et délais configurés, puis surveiller la taille de cette table.

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
>>>>>>> 4242da2 (security: add PostgreSQL-backed rate limiting)
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
