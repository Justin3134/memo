# Local Run (Frontend + Backend)

From repo root:

1) Install deps (first run)
- npm install

2) Start everything (frontend + all backend services)
- npm run dev:stack

This runs:
- Frontend: http://localhost:5173
- Webhook service: http://localhost:3001/vapi-webhook
- Consent service: http://localhost:3002/plivo-consent
- Scheduler: background cron process (runs every minute)

Environment values expected in .env:
- CONVEX_DEPLOYMENT or VITE_CONVEX_DEPLOYMENT
- VITE_CONVEX_URL
- VAPI_API_KEY
- VAPI_PHONE_NUMBER_ID
- MINIMAX_API_KEY
- PLIVO_AUTH_ID
- PLIVO_AUTH_TOKEN
- PLIVO_NUMBER (used for outbound alerts)

Notes:
- `npm run dev:stack` starts backend processes in the same terminal. Use Ctrl+C to stop all.
- If you only need frontend only, run `npm run dev`.
- If you only need webhook server, run `npm run backend:webhook`.
