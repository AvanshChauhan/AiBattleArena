# AI Battle Arena

A full-stack app that pits two AI models against each other. Ask a question, watch **Mistral** and **Cohere** generate competing answers, and let **Gemini** act as an unbiased judge that scores both responses and declares a winner.

Built on a LangGraph pipeline orchestrated by an Express API, with a polished React frontend.

## How it works

```
                        ┌────────────┐
   user question ─────► │   API      │
                        │ POST /api  │
                        │ /compare   │
                        └─────┬──────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
              Mistral (Solution 1)  Cohere (Solution 2)
                     │                 │
                     └────────┬────────┘
                              ▼
                    Gemini — AI Judge
              (scores + reasoning + verdict)
                              │
                              ▼
                     JSON response ───► React UI
```

- **Solution nodes** run Mistral and Cohere in parallel on the same problem.
- **Judge node** (Gemini) evaluates each answer independently, assigns a score out of 10, explains its reasoning, and gives a comparative verdict.
- The whole flow is a compiled `StateGraph` from `@langchain/langgraph`.

## Tech stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Frontend  | React 19, Vite 7, plain CSS (light & dark themes) |
| Backend   | Node.js, Express 5, TypeScript                    |
| AI        | LangChain, LangGraph, Mistral, Cohere, Gemini     |

## Getting started

### Prerequisites

- Node.js 20+
- API keys for the three providers:
  - [Google Gemini](https://aistudio.google.com/apikey)
  - [Mistral](https://console.mistral.ai/)
  - [Cohere](https://dashboard.cohere.com/)

### 1. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
GOOGLE_GEMINI_AI_BATTLE_ARENA_API_KEY=your_gemini_key
COHERE_AI_BATTLE_ARENA_API_KEY=your_cohere_key
MISTRAL_AI_BATTLE_ARENA_API_KEY=your_mistral_key
```

Start the API:

```bash
npm run dev
```

Server runs at `http://localhost:3000`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to the backend, so no extra CORS setup is needed.

## API

### `POST /api/compare`

Run a battle for a given problem.

**Request body:**

```json
{ "problem": "What is the capital of Japan?" }
```

**Response:**

```json
{
  "problem_statement": "What is the capital of Japan?",
  "solution_1": "…Mistral's answer…",
  "solution_2": "…Cohere's answer…",
  "judge": {
    "solution_1_score": 10,
    "solution_2_score": 10,
    "solution_1_reasoning": "…",
    "solution_2_reasoning": "…",
    "comparative_verdict": "…"
  }
}
```

Returns `400` if `problem` is missing/empty, and `500` if a model call fails.

## Scripts

### Backend

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start dev server (tsx watch)      |
| `npm run build`   | Compile TypeScript to `dist/`     |
| `npm run start`   | Run compiled server               |
| `npm run typecheck` | Type-check without emitting     |

### Frontend

| Command         | Description                    |
| --------------- | ------------------------------ |
| `npm run dev`   | Start Vite dev server          |
| `npm run build` | Production build to `dist/`    |
| `npm run lint`  | Run ESLint                     |
| `npm run preview` | Preview the production build |

## Project structure

```
backend/
  server.ts               # Express bootstrap
  src/
    app.ts                # API routes (POST /api/compare)
    config/config.ts      # Loads .env API keys
    ai/
      models.ai.ts        # Mistral, Cohere, Gemini model instances
      graph.ai.ts         # LangGraph StateGraph pipeline
frontend/
  src/
    app/App.jsx           # Main UI (chat, battle results, judge card)
    app/App.css           # Design system + themes
    main.jsx              # React entry
  public/logoOrg.png      # Brand logo & favicon
  vite.config.js          # Dev proxy /api → localhost:3000
```

## Security note

API keys live only in `backend/.env` (git-ignored). Never commit them.
