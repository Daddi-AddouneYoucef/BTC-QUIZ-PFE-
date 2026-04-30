# Mémoire de Projet : QuizMaster
### Plateforme de quiz interactive avec correction pédagogique par intelligence artificielle

---

**Auteur :** Daddi-Addoune Youcef  
**Projet :** QuizMaster  
**Technologie principale :** React · TypeScript · Supabase · Google Gemini AI  
**Type de projet :** Application web full-stack à vocation éducative  

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Contexte et problématique](#2-contexte-et-problématique)
3. [Objectifs du projet](#3-objectifs-du-projet)
4. [Architecture générale](#4-architecture-générale)
5. [Choix technologiques](#5-choix-technologiques)
6. [Modèle de données](#6-modèle-de-données)
7. [Fonctionnalités implémentées](#7-fonctionnalités-implémentées)
8. [Implémentation côté frontend](#8-implémentation-côté-frontend)
9. [Implémentation côté backend](#9-implémentation-côté-backend)
10. [Intégration de l'intelligence artificielle](#10-intégration-de-lintelligence-artificielle)
11. [Sécurité](#11-sécurité)
12. [Difficultés rencontrées et solutions apportées](#12-difficultés-rencontrées-et-solutions-apportées)
13. [Perspectives d'évolution](#13-perspectives-dévolution)
14. [Conclusion](#14-conclusion)

---

## 1. Introduction

Ce mémoire présente **QuizMaster**, une application web full-stack conçue comme un projet à vocation pédagogique. L'objectif principal de cette plateforme est de permettre à des apprenants de tester leurs connaissances en informatique et développement web à travers des quiz interactifs, puis d'obtenir une **correction personnalisée générée par intelligence artificielle** pour chaque réponse incorrecte.

Le projet couvre l'intégralité du cycle de développement d'une application moderne : conception de l'architecture, choix des technologies, implémentation frontend et backend, intégration d'une API d'IA générative, gestion de la base de données et considérations de sécurité.

---

## 2. Contexte et problématique

### 2.1 Contexte éducatif

L'apprentissage en ligne a considérablement évolué ces dernières années. Les plateformes traditionnelles proposent souvent des quiz à correction binaire (juste/faux) sans aucune explication pédagogique sur l'origine des erreurs. Cette lacune réduit la valeur formative de l'exercice : l'apprenant sait qu'il s'est trompé, mais ne comprend pas *pourquoi*.

### 2.2 Problématique

> *Comment concevoir une plateforme de quiz qui va au-delà de la simple notation et qui accompagne réellement l'apprenant dans la compréhension de ses erreurs, tout en restant simple à utiliser et économiquement viable ?*

### 2.3 Approche retenue

La solution adoptée consiste à coupler un moteur de quiz standard avec un modèle de langage à grande échelle (LLM). Après chaque tentative, les réponses incorrectes sont envoyées à l'API Google Gemini, qui génère :

- Une **explication détaillée** de la réponse correcte,
- L'identification du **malentendu probable** de l'apprenant,
- Un **conseil pratique** pour maîtriser le concept concerné,
- Un **message d'encouragement** global et une **recommandation de révision** ciblée.

---

## 3. Objectifs du projet

### Objectifs fonctionnels

| N° | Objectif |
|----|----------|
| F1 | Permettre la création de comptes utilisateurs et l'authentification sécurisée |
| F2 | Proposer un catalogue de quiz classés par catégorie et difficulté |
| F3 | Implémenter une interface de quiz interactive avec minuteur |
| F4 | Calculer et enregistrer les scores des apprenants |
| F5 | Générer une correction pédagogique par IA pour les erreurs commises |
| F6 | Afficher un classement global des utilisateurs |
| F7 | Offrir une page de profil avec l'historique des résultats |
| F8 | Fournir un panneau d'administration pour gérer le contenu |

### Objectifs techniques

| N° | Objectif |
|----|----------|
| T1 | Concevoir une architecture découplée frontend/backend |
| T2 | Utiliser des technologies modernes et maintenables |
| T3 | Garantir la sécurité des données et des routes |
| T4 | Assurer la réactivité de l'interface sur tous les écrans |
| T5 | Concevoir un système d'appel IA robuste avec gestion des erreurs et des quotas |

---

## 4. Architecture générale

QuizMaster suit une architecture **client-serveur découplée** organisée en trois couches :

```
┌─────────────────────────────────────────────┐
│              NAVIGATEUR (Client)            │
│   React 18 + TypeScript + Tailwind CSS      │
│   Vite (bundler) — React Router (SPA)       │
└───────────────────┬─────────────────────────┘
                    │ HTTPS / REST
┌───────────────────▼─────────────────────────┐
│          SUPABASE EDGE FUNCTIONS            │
│   Runtime : Deno — Framework : Hono         │
│   Endpoints REST + Logique métier           │
│   Service IA (appels Gemini)                │
└───────────────────┬─────────────────────────┘
                    │ SDK Supabase
┌───────────────────▼─────────────────────────┐
│          SUPABASE (Backend-as-a-Service)    │
│   PostgreSQL — Auth — Storage               │
│   RPC (fonctions SQL stockées)              │
└─────────────────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────┐
│         GOOGLE GEMINI API (externe)         │
│   Modèle : gemini-2.0-flash                 │
│   Rôle : génération de feedback pédagogique │
└─────────────────────────────────────────────┘
```

### 4.1 Flux de données principal

1. L'utilisateur s'authentifie via Supabase Auth (email/mot de passe).
2. Le frontend récupère la liste des quiz et les questions directement depuis Supabase.
3. À la soumission du quiz, les réponses sont envoyées à l'Edge Function `/server/results` pour enregistrement.
4. En parallèle, l'Edge Function `/server/ai-feedback` est appelée pour générer la correction IA via Gemini.
5. La correction structurée est renvoyée au client et affichée question par question.
6. Le classement est mis à jour via une fonction RPC PostgreSQL.

---

## 5. Choix technologiques

### 5.1 Frontend

#### React 18 avec TypeScript

React a été retenu pour sa popularité, son écosystème mature et son modèle de développement par composants. TypeScript renforce la robustesse du code en apportant un typage statique, ce qui réduit les erreurs à l'exécution et facilite la maintenance.

#### Vite

Vite remplace Webpack/CRA en offrant un démarrage à froid quasi-instantané grâce à l'exploitation des modules ES natifs. La compilation HMR (Hot Module Replacement) rend le développement très fluide.

#### React Router v7

La dernière version majeure de React Router apporte une API simplifiée et compatible avec les patterns modernes de React. Elle permet la définition déclarative des routes et la protection des pages authentifiées.

#### Tailwind CSS v4

Tailwind CSS adopte une approche « utility-first » qui évite la prolifération de fichiers CSS séparés. La version 4 apporte une configuration entièrement basée sur CSS et des performances améliorées.

#### shadcn/ui (Radix UI)

Les composants shadcn/ui, basés sur les primitives accessibles de Radix UI, permettent de construire une interface soignée sans sacrifier l'accessibilité (ARIA) ni le contrôle sur le style.

#### Recharts

La bibliothèque Recharts est utilisée pour les visualisations graphiques de l'historique des performances (page résultats). Elle s'intègre naturellement dans l'écosystème React.

### 5.2 Backend

#### Supabase

Supabase est une plateforme Backend-as-a-Service (BaaS) open-source construite sur PostgreSQL. Elle fournit :
- **Auth** : gestion complète des utilisateurs (inscription, connexion, tokens JWT).
- **Database** : PostgreSQL avec accès via SDK JavaScript et fonctions RPC.
- **Edge Functions** : fonctions serverless Deno pour la logique métier sensible côté serveur.

#### Hono

Hono est un framework web ultra-léger compatible avec Deno et les environnements Edge. Son API minimaliste (similaire à Express) permet de définir rapidement des routes REST sans overhead.

#### Deno

Le runtime Deno est utilisé nativement par les Supabase Edge Functions. Il offre une sécurité par défaut (permissions explicites) et un support natif de TypeScript sans compilation préalable.

### 5.3 Intelligence artificielle

#### Google Gemini API (gemini-2.0-flash)

Le modèle `gemini-2.0-flash` a été sélectionné pour son excellent rapport performance/coût et sa rapidité de réponse. Il est sollicité uniquement lorsque l'apprenant commet des erreurs, ce qui limite la consommation de tokens. La génération est contrainte par un prompt structuré imposant une réponse en JSON valide, ce qui facilite l'intégration côté serveur.

---

## 6. Modèle de données

La base de données PostgreSQL (hébergée sur Supabase) est structurée autour de quatre tables principales :

### 6.1 Table `users`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique (lié à Supabase Auth) |
| `email` | TEXT | Adresse email de l'utilisateur |
| `name` | TEXT | Nom affiché |
| `quizzes_taken` | INTEGER | Nombre de quiz effectués (compteur agrégé) |
| `total_score` | INTEGER | Score cumulé total |
| `created_at` | TIMESTAMPTZ | Date de création du compte |
| `updated_at` | TIMESTAMPTZ | Date de dernière modification |

### 6.2 Table `quizzes`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT (PK) | Identifiant slug (ex : `javascript-basics`) |
| `title` | TEXT | Titre du quiz |
| `description` | TEXT | Description courte |
| `category` | TEXT | Catégorie thématique |
| `difficulty` | TEXT | Niveau (Beginner, Intermediate, Advanced) |
| `created_at` | TIMESTAMPTZ | Date de création |

### 6.3 Table `questions`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `quiz_id` | TEXT (FK) | Référence vers `quizzes.id` |
| `question_text` | TEXT | Énoncé de la question |
| `options` | JSONB | Tableau des options de réponse |
| `correct_answer` | INTEGER | Index de la bonne réponse dans `options` |
| `order_index` | INTEGER | Ordre d'affichage dans le quiz |

### 6.4 Table `quiz_attempts`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant de la tentative |
| `user_id` | UUID (FK) | Référence vers `users.id` |
| `quiz_id` | TEXT (FK) | Référence vers `quizzes.id` |
| `score` | INTEGER | Score obtenu |
| `total_questions` | INTEGER | Nombre total de questions |
| `answers` | JSONB | Tableau des réponses soumises par l'utilisateur |
| `ai_feedback` | JSONB | Feedback IA généré (peut être null) |
| `created_at` | TIMESTAMPTZ | Date de la tentative |

### 6.5 Table `kv_store_e422e440`

Table de stockage clé/valeur générique utilisée pour des besoins de persistance légère côté Edge Functions (cache, configuration dynamique).

### 6.6 Diagramme relationnel simplifié

```
users ──────────── quiz_attempts ──────── quizzes
  │  (1,N)               │ (N,1)            │ (1,N)
  └──────────────────────┘          questions
                                        └── (N,1) → quizzes
```

---

## 7. Fonctionnalités implémentées

### 7.1 Authentification

L'authentification repose entièrement sur **Supabase Auth**. Le flux implémenté est le suivant :

- **Inscription** : l'utilisateur soumet un email, un mot de passe et un nom. Le backend crée le compte dans Supabase Auth et insère simultanément une ligne dans la table `users` avec des compteurs initialisés à zéro.
- **Connexion** : authentification par email/mot de passe. Un JWT est stocké dans la session Supabase côté client.
- **Protection des routes** : le composant `Root` vérifie la présence d'une session valide avant de rendre les pages protégées. En l'absence d'authentification, l'utilisateur est redirigé vers `/login`.
- **Déconnexion** : révocation de la session via `supabase.auth.signOut()`.

### 7.2 Catalogue de quiz

La page `/quizzes` affiche l'ensemble des quiz disponibles, récupérés directement depuis la table Supabase. Chaque carte affiche le titre, la catégorie, la difficulté et une description courte. Des filtres permettent de naviguer par catégorie ou niveau.

### 7.3 Prise de quiz

La page `/quiz/:id` implémente le flux complet de prise de quiz :

1. **Chargement** : récupération asynchrone du quiz et de ses questions.
2. **Navigation** : l'utilisateur progresse question par question via des boutons « Précédent » / « Suivant » ou les raccourcis clavier (1–4 pour sélectionner une option, Entrée pour valider).
3. **Minuteur** : un compte à rebours de 60 secondes par question est affiché. À l'expiration, la question est automatiquement soumise sans réponse.
4. **Soumission** : à la fin du quiz, les réponses sont envoyées simultanément à l'endpoint `/server/results` (enregistrement) et à `/server/ai-feedback` (génération IA).
5. **Résultats** : le score est calculé côté client et affiché immédiatement. La correction IA apparaît progressivement (état skeleton → résultat).

### 7.4 Correction pédagogique par IA

La correction est structurée et présentée dans le composant `AiCorrection`. Pour chaque question incorrecte :

- **Explication** : description complète de la réponse correcte avec contexte.
- **Malentendu fréquent** : identification de la confusion probable de l'apprenant.
- **Conseil pratique** : recommandation concrète pour consolider le concept.

En cas de score parfait, un message de félicitations est retourné sans appel à l'API Gemini (optimisation).

Les états d'erreur sont gérés proprement :
- `quota_exceeded` : message spécifique avec instructions pour l'utilisateur.
- `error` : message générique avec bouton « Réessayer ».
- `loading` : skeleton animé pendant l'appel IA.

### 7.5 Classement (Leaderboard)

La page `/leaderboard` affiche les dix meilleurs joueurs, classés par score total. Elle comporte :

- Un **podium visuel** pour les trois premiers (avec icônes différenciées : couronne, médaille, trophée).
- Un **tableau complet** avec rang, nom, nombre de quiz effectués, score moyen et score total.
- Une **barre de progression relative** pour chaque joueur.
- La mise en valeur de la ligne de l'utilisateur connecté (badge « You »).

Le classement est obtenu via une **fonction RPC PostgreSQL** (`get_leaderboard`), avec un fallback sur une requête directe à la table `users` en cas d'indisponibilité.

### 7.6 Profil utilisateur

La page `/profile` présente les statistiques de l'utilisateur (nombre de quiz effectués, score total, score moyen, meilleur score) et l'historique de ses tentatives sous forme de graphique d'évolution. L'utilisateur peut modifier son nom d'affichage.

### 7.7 Panneau d'administration

La route `/admin` est réservée aux administrateurs. Elle permet d'initialiser la base de données avec les données de démonstration (appel à l'endpoint `/server/init-quizzes`), d'inspecter les quiz existants et de réaliser des opérations de maintenance.

---

## 8. Implémentation côté frontend

### 8.1 Structure des composants

```
src/
├── main.tsx              # Point d'entrée — monte <App /> dans le DOM
├── styles/               # Styles globaux (Tailwind)
└── app/
    ├── App.tsx           # RouterProvider (point d'entrée React)
    ├── routes.tsx        # Définition des routes React Router
    ├── lib/
    │   └── supabase-client.ts   # Singleton du client Supabase
    └── components/
        ├── Root.tsx             # Layout global + protection des routes
        ├── AuthContext.tsx      # Context React pour l'authentification
        ├── Home.tsx             # Page d'accueil marketing
        ├── Login.tsx            # Formulaire de connexion
        ├── Signup.tsx           # Formulaire d'inscription
        ├── QuizList.tsx         # Catalogue des quiz
        ├── QuizTake.tsx         # Interface de prise de quiz
        ├── Results.tsx          # Historique des résultats
        ├── Profile.tsx          # Page de profil
        ├── Leaderboard.tsx      # Classement global
        ├── AiCorrection.tsx     # Composants de correction IA
        ├── AdminPanel.tsx       # Panneau d'administration
        ├── NotFound.tsx         # Page 404
        └── ui/                  # Composants shadcn/ui (Button, Badge…)
```

### 8.2 Gestion de l'état

L'état global d'authentification est géré via un **Context React** (`AuthContext`). Ce contexte expose :

- `user` : l'utilisateur connecté (ou `null`).
- `accessToken` : le JWT Supabase pour les appels API authentifiés.
- `signIn`, `signUp`, `signOut` : les actions d'authentification.
- `loading` : indicateur d'initialisation (évite le flash de contenu non authentifié).

L'état local des composants est géré avec `useState` et `useEffect` de React. Aucune bibliothèque de gestion d'état externe (Redux, Zustand) n'a été jugée nécessaire pour ce périmètre fonctionnel.

### 8.3 Appels API et accès aux données

Deux modes d'accès aux données coexistent :

1. **Accès direct Supabase** (via le SDK `@supabase/supabase-js`) : utilisé pour les lectures simples (quiz, questions, classement fallback) afin de minimiser la latence.
2. **Edge Functions REST** : utilisées pour les opérations métier complexes ou sensibles (création de compte, soumission de résultats, génération IA) qui nécessitent une logique serveur sécurisée.

### 8.4 Raccourcis clavier

L'interface de quiz implémente une accessibilité clavier complète :
- Touches `1` à `4` pour sélectionner une option de réponse.
- `Entrée` pour confirmer et passer à la question suivante.
- `←` / `→` pour naviguer entre les questions.
- Un panneau d'aide (`?`) liste les raccourcis disponibles.

---

## 9. Implémentation côté backend

### 9.1 Architecture des Edge Functions

Le backend est implémenté sous forme d'une **unique Edge Function** (`/server`) organisée avec le framework **Hono**. Toutes les routes sont définies dans `supabase/functions/server/index.ts`.

Le client Supabase côté serveur utilise la **clé de service** (`SUPABASE_SERVICE_ROLE_KEY`), ce qui lui confère les permissions administrateur nécessaires pour créer des utilisateurs et accéder à toutes les données.

### 9.2 Routes API

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/server/health` | Public | Vérification de disponibilité |
| POST | `/server/signup` | Public | Création de compte utilisateur |
| GET | `/server/quizzes` | Public | Liste de tous les quiz |
| GET | `/server/quizzes/:id` | Public | Détail d'un quiz avec ses questions |
| GET | `/server/leaderboard` | Public | Top 10 du classement |
| POST | `/server/init-quizzes` | Public | Initialisation des données de démonstration |
| GET | `/server/profile` | Authentifié | Récupération du profil |
| PUT | `/server/profile` | Authentifié | Mise à jour du profil |
| POST | `/server/results` | Authentifié | Enregistrement d'une tentative |
| GET | `/server/results` | Authentifié | Historique des tentatives |
| POST | `/server/ai-feedback` | Public* | Génération de la correction IA |

*La route `/ai-feedback` n'exige pas d'authentification pour faciliter les tests, mais son usage est limité par le quota de l'API Gemini.

### 9.3 Middleware

Deux middlewares globaux sont appliqués à toutes les routes :

- **CORS** : autorise toutes les origines (`*`) avec les méthodes GET, POST, PUT, DELETE, OPTIONS et les headers `Content-Type` et `Authorization`.
- **Logger** : journalise chaque requête entrante (méthode, path, durée) via `console.log`.

### 9.4 Gestion de l'état de persistance légère

Le fichier `kv_store.ts` expose des fonctions utilitaires (set, get, del, mset, mget, getByPrefix) pour interagir avec la table `kv_store_e422e440`. Ce mécanisme permet aux Edge Functions de persister des données arbitraires sans modifier le schéma principal.

---

## 10. Intégration de l'intelligence artificielle

### 10.1 Principe de fonctionnement

L'intégration IA est centralisée dans le module `supabase/functions/server/ai-service.ts`. Voici le flux détaillé :

```
Frontend          Edge Function          Gemini API
   │                   │                     │
   │── POST /ai-feedback ──────────────────► │
   │         (questions, answers, score)     │
   │                   │                     │
   │                   ├─ Identifier les     │
   │                   │  erreurs            │
   │                   │                     │
   │                   ├─ Si score parfait : │
   │                   │  réponse directe    │
   │                   │  (pas d'appel IA)   │
   │                   │                     │
   │                   ├─ Construire le      │
   │                   │  prompt structuré   │
   │                   │                     │
   │                   │── POST generateContent ──►
   │                   │◄── JSON structuré ───────
   │                   │                     │
   │                   ├─ Parser et enrichir │
   │                   │  le feedback        │
   │                   │                     │
   │◄── PedagogicalFeedback ────────────────►│
```

### 10.2 Conception du prompt

Le prompt est entièrement écrit en français et suit une structure précise pour forcer une réponse JSON valide :

```
Tu es un professeur pédagogue expert. Analyse les erreurs
d'un étudiant et fournis des corrections détaillées en français.

Quiz : "[titre]" — Score : X/Y (Z %)

Réponses incorrectes :
Question 1 (index 0) :
  - Énoncé : ...
  - Réponse de l'étudiant : ...
  - Réponse correcte : ...

Réponds UNIQUEMENT avec un JSON valide respectant ce format exact :
{
  "overallMessage": "...",
  "studyRecommendation": "...",
  "analyses": [
    {
      "questionIndex": 0,
      "explanation": "...",
      "misconception": "...",
      "tip": "..."
    }
  ]
}
```

Plusieurs contraintes ont été ajoutées pour fiabiliser la génération :
- Instruction explicite de ne répondre qu'en JSON, sans markdown ni texte additionnel.
- `temperature: 0.4` pour limiter la créativité et rester factuel.
- `maxOutputTokens: 2048` pour éviter les réponses tronquées.

### 10.3 Robustesse et gestion des erreurs

| Situation | Traitement |
|-----------|------------|
| Score parfait | Réponse immédiate sans appel API |
| Erreur 429 (rate limit) avec délai ≤ 15 s | Attente automatique et une nouvelle tentative |
| Erreur 429 avec délai > 15 s | Retour d'un statut `quotaExceeded` avec le délai |
| Erreur HTTP autre | Retour de l'erreur brute avec le code HTTP |
| Réponse Gemini vide | Erreur explicite avec le contenu complet de la réponse |
| JSON mal formé | Erreur avec les 300 premiers caractères du texte brut |
| Exception inattendue | Capture globale avec message d'erreur descriptif |

La fonction `extractJson()` strip les balises markdown code fence (````json ... ````), permettant de traiter les rares cas où Gemini ignore l'instruction « sans markdown ».

### 10.4 Structure de la réponse IA

```typescript
interface PedagogicalFeedback {
  overallMessage: string;         // Message d'encouragement global
  studyRecommendation: string;    // Ce que l'apprenant devrait réviser
  analyses: QuestionAnalysis[];   // Une entrée par réponse incorrecte
}

interface QuestionAnalysis {
  questionIndex: number;    // Index original de la question
  question: string;         // Texte de la question (enrichi côté serveur)
  userAnswer: string;       // Réponse donnée par l'apprenant
  correctAnswer: string;    // Bonne réponse
  isCorrect: boolean;       // Toujours false ici
  explanation: string;      // Explication pédagogique
  misconception: string;    // Malentendu probable
  tip: string;              // Conseil pratique
}
```

---

## 11. Sécurité

### 11.1 Mesures implémentées

#### Authentification et autorisation

- **JWT Supabase** : chaque requête authentifiée inclut un token JWT vérifié côté serveur via `supabase.auth.getUser(token)`. Ce mécanisme garantit que seuls les utilisateurs légitimes accèdent aux données protégées.
- **Clé de service isolée** : la `SUPABASE_SERVICE_ROLE_KEY` n'est jamais exposée au client ; elle n'est accessible que depuis les Edge Functions via les variables d'environnement Deno.
- **Variables d'environnement** : toutes les clés sensibles (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) sont stockées comme secrets dans Supabase et jamais committées dans le dépôt de code.

#### Protection des routes frontend

Le composant `Root` vérifie l'état d'authentification avant de rendre les pages sensibles. Pendant l'initialisation de la session (`loading: true`), un indicateur de chargement est affiché pour éviter un flash de contenu non autorisé.

#### CORS

Le middleware CORS est configuré pour autoriser toutes les origines (`*`) dans ce contexte éducatif. Pour un déploiement en production, il serait restreint aux domaines autorisés.

### 11.2 Recommandations pour la production

Les points suivants ont été identifiés comme améliorations à apporter avant un déploiement en production :

1. **Row Level Security (RLS)** : activer les politiques RLS sur PostgreSQL pour que chaque utilisateur ne puisse accéder qu'à ses propres données (tentatives, profil).
2. **Rate limiting** : limiter le nombre d'appels à `/server/ai-feedback` par utilisateur et par unité de temps pour éviter l'abus du quota Gemini.
3. **Vérification d'email** : exiger la confirmation de l'adresse email à l'inscription pour réduire les comptes fantômes.
4. **Restriction CORS** : n'autoriser que les origines légitimes dans la configuration CORS.
5. **Monitoring** : mettre en place une solution de surveillance des erreurs (Sentry, LogTail) pour détecter les anomalies en temps réel.

---

## 12. Difficultés rencontrées et solutions apportées

### 12.1 Fiabilisation de la réponse JSON de Gemini

**Problème** : Malgré l'instruction explicite dans le prompt, l'API Gemini retourne parfois la réponse JSON encapsulée dans des blocs markdown (````json ... ````), ou précédée de texte introductif.

**Solution** : Implémentation de la fonction `extractJson()` qui, dans l'ordre :
1. Recherche un bloc markdown code fence et en extrait le contenu.
2. À défaut, localise le premier `{` et le dernier `}` dans la chaîne brute.
3. Retourne le résultat trimmé.

### 12.2 Gestion du quota API Gemini

**Problème** : Le plan gratuit de l'API Gemini impose des limites de requêtes par minute. En situation d'usage simultané, des erreurs 429 peuvent survenir.

**Solution** :
- Pour les délais courts (≤ 15 s) : attente automatique et nouvelle tentative.
- Pour les délais longs : renvoi d'un statut `quotaExceeded` spécifique avec le délai suggéré.
- Côté client : affichage d'un composant `AiCorrectionQuotaError` avec instructions claires pour l'utilisateur et bouton « Réessayer ».

### 12.3 Synchronisation du profil utilisateur

**Problème** : La table `users` et Supabase Auth sont deux systèmes distincts. En cas d'erreur lors de la création du profil après inscription, l'utilisateur peut se trouver en état incohérent (authentifié mais sans profil).

**Solution** : Logique de création de profil défensive dans deux endroits :
- À l'inscription : tentative de création du profil, erreur non bloquante.
- À la connexion : vérification de l'existence du profil et création automatique si absent.
- Lors de la récupération du profil via l'API : création à la volée si manquant.

### 12.4 Expérience utilisateur pendant l'attente IA

**Problème** : La génération IA peut prendre plusieurs secondes. Un écran vide pendant cette attente dégraderait l'expérience.

**Solution** : Implémentation d'un composant `AiCorrectionSkeleton` avec animation `pulse` simulant la structure du composant de résultats. La transition skeleton → résultat est perceptuellement immédiate.

---

## 13. Perspectives d'évolution

### Court terme

- **Éditeur de quiz** : permettre aux administrateurs de créer et modifier des quiz via une interface graphique, sans passer par l'initialisation par défaut.
- **Système de tags** : ajouter des tags sur les questions pour grouper les axes de révision dans le feedback IA.
- **Mode révision** : permettre à l'utilisateur de reprendre uniquement les questions ratées lors d'une tentative précédente.

### Moyen terme

- **Internationalisation (i18n)** : le cœur de l'application est en anglais mais les messages IA en français. Une internationalisation complète améliorerait la cohérence.
- **Notifications** : alerter l'utilisateur par email ou notification push lorsqu'un nouveau quiz est disponible dans sa catégorie préférée.
- **Quiz collaboratifs** : permettre à des groupes d'utilisateurs de participer simultanément au même quiz (mode compétitif en temps réel via Supabase Realtime).
- **Génération de quiz par IA** : utiliser Gemini non plus seulement pour les corrections, mais aussi pour générer automatiquement de nouveaux quiz à partir d'un thème donné.

### Long terme

- **Parcours d'apprentissage adaptatif** : utiliser l'historique des erreurs pour proposer automatiquement les quiz les plus pertinents pour chaque utilisateur.
- **Intégration LMS** : exposer une API compatible SCORM/xAPI pour s'intégrer dans des Learning Management Systems existants.
- **Application mobile** : packager l'application en app mobile via Capacitor ou React Native.

---

## 14. Conclusion

QuizMaster est une application web full-stack complète qui illustre comment les technologies modernes du développement web peuvent être combinées avec l'intelligence artificielle générative pour créer une expérience pédagogique enrichie.

Sur le plan **technique**, le projet démontre la maîtrise des éléments suivants :
- Architecture découplée frontend/backend avec React et Supabase Edge Functions.
- Typage fort de bout en bout grâce à TypeScript.
- Design de composants accessibles et responsifs avec Tailwind CSS et Radix UI.
- Intégration robuste d'une API LLM (Gemini) avec gestion complète des cas d'erreur.
- Modélisation relationnelle efficace sur PostgreSQL.

Sur le plan **fonctionnel**, l'application offre un cycle complet d'apprentissage :
1. L'apprenant choisit un quiz adapté à son niveau.
2. Il répond aux questions dans un contexte gamifié (minuteur, progression).
3. Il reçoit immédiatement un score et une correction personnalisée par IA.
4. Il peut se comparer aux autres utilisateurs via le classement.
5. Il suit son évolution dans le temps via son profil.

Ce projet constitue une base solide pour une plateforme d'apprentissage en ligne, extensible vers des fonctionnalités plus avancées (génération de contenu par IA, parcours adaptatifs, mode collaboratif) grâce à l'architecture modulaire choisie.

---

*Mémoire rédigé dans le cadre du projet QuizMaster — projet éducatif open-source.*
