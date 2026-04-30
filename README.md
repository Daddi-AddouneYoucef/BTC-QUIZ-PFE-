# QuizMaster

QuizMaster is a full-stack quiz platform with AI-generated explanations for incorrect answers.
It combines a React + TypeScript frontend with Supabase Edge Functions for API and data services.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Database](#database)
- [Security Notes](#security-notes)
- [Contributing](#contributing)
- [License](#license)

## Features

- Authentication with email/password
- Protected routes for authenticated users
- Quiz browsing and quiz-taking flow
- AI feedback and correction on wrong answers
- Leaderboard with user ranking
- Responsive UI for desktop and mobile

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS v4, React Router
- UI: shadcn/ui (Radix primitives)
- Backend: Supabase (PostgreSQL, Auth, Edge Functions)
- AI: Google Gemini API

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project
- Gemini API key

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

## Environment Variables

Configure these variables in Supabase Edge Functions:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

## AI Feedback Flow

When a user submits answers:

1. The backend calculates the score.
2. Incorrect answers are identified.
3. A prompt is sent to Gemini.
4. Feedback is saved and returned to the client.

Prompt logic can be adjusted in `supabase/functions/server/index.tsx`.

## API Overview

### Public Routes

- `GET /health`
- `POST /signup`
- `GET /quizzes`
- `GET /quizzes/:id`
- `GET /leaderboard`
- `POST /init-quizzes`

### Protected Routes

- `GET /profile`
- `PUT /profile`
- `POST /results`
- `GET /results`

## Project Structure

```text
src/
|- app/
|  |- components/
|  |- lib/
|  `- routes.tsx
|- styles/
`- main.tsx

supabase/
`- functions/
   `- server/
```

## Database

Main tables:

- `users`: profile and aggregate stats
- `quizzes`: quiz metadata
- `questions`: question content and answer options
- `quiz_attempts`: user answers, score, AI feedback

## Security Notes

Implemented:

- Supabase authentication
- Token-based protected API routes
- Frontend route protection

Recommended for production:

- Row Level Security policies
- Rate limiting for AI endpoints
- Email verification and stronger signup controls

## Contributing

Contributions are welcome. Follow the existing TypeScript and component conventions.

## License

Educational project.