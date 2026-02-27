# Local Development Setup

## Terminal 1 — Frontend
```bash
npm install        # first time only
npm run dev        # http://localhost:5173
```

## Terminal 2 — FastAPI Backend (Neo4j + OpenAI + Tavily)
```bash
cd backend
pip install -r requirements.txt   # first time only
uvicorn main:app --reload          # http://localhost:8000
```

Health check: http://localhost:8000/health  
Neo4j check:  http://localhost:8000/health/neo4j

---

## Neo4j troubleshooting

The Aura free tier **pauses after 72h of inactivity**.

**If you see "Cannot resolve address" or connection errors:**
1. Go to https://console.neo4j.io
2. Click **Resume** on Instance02 (84adec56)
3. Wait 30–60 seconds
4. **Fully stop and restart** the backend — do NOT just reload:
   ```
   Ctrl+C  →  uvicorn main:app --reload
   ```
   (uvicorn --reload watches .py files, not .env. A full restart re-reads credentials.)

**If changing .env credentials:**
Always do a full stop + restart of uvicorn. `--reload` only picks up Python changes.

---

## Environment variables (.env)
```
NEO4J_URI=neo4j+s://84adec56.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=c6vdmahzBppgyaCXYR7jEcRE1dixYLPmTaYyoZbsJns
NEO4J_DATABASE=neo4j

TAVILY_API_KEY=tvly-dev-...
OPENAI_API_KEY=sk-proj-...
PIONEER_API_KEY=           ← get from gliner.pioneer.ai

VITE_BACKEND_URL=http://localhost:8000
VITE_CONVEX_URL=https://friendly-ostrich-184.convex.cloud
```

---

## Deploy to Render
Push to GitHub → connect repo at render.com → set env vars from above.
Backend deploys from `backend/` using `render.yaml`.
