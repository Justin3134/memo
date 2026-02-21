# Memo Family Wellness Hub (Frontend)

This repository contains the frontend for Memo built with React, TypeScript, Vite, and shadcn-style components.

## Run the app locally

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:8080` by default.

## What to know before backend work

Frontend functionality is already present across:

- Public landing and onboarding flows
- Dashboard and health signals
- Care guide and care finder screens
- Settings and shared layout
- Notification and shared UI primitives

When wiring your backend:

- Add API calls under `src/pages` and service helpers under `src/lib`.
- Keep API base URLs in environment variables (for example `.env.local`).
- Use `react-query` for request state and caching where needed.

## Technology stack

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn-style UI component set
