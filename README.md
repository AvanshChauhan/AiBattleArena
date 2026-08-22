# ⚔️ AI Battle Arena (Aequitas AI)

A full-stack AI evaluation platform that pits two leading LLMs against each other in real-time. Ask any question, watch **Mistral** and **Cohere** generate competing answers (grounded with real-time web search via **Tavily**), and let **Gemini** act as a neutral AI judge that independently scores both solutions out of 10, provides detailed strengths and weaknesses, and delivers a comparative verdict.

Now featuring an **Apple (iOS / iPhone) inspired glassmorphic UI**, **MongoDB session persistence**, and a **secure dual-token JWT authentication system with `httpOnly` cookies**.

🌐 **Live Backend API**: `https://aibattlearena-j8lm.onrender.com`

---

## 📸 Features

- **Side-by-Side Model Arena**: Parallel execution of multiple LLMs on identical prompts.
- **AI Judge Scoring**: Gemini evaluates accuracy, completeness, and edge cases, providing strict 0–10 scores and a comparative verdict.
- **Live Web Grounding**: Integrated with Tavily web search to ground answers in current information.
- **Apple iOS Design System**:
  - Frosted glassmorphism (`backdrop-filter: blur(40px) saturate(190%)`)
  - Dynamic ambient wallpaper mesh
  - iOS Inset Grouped Table forms with SF Symbol style icons and hairline dividers
  - Tactile Apple Segmented Control with animated sliding pill
  - iOS password visibility toggles, clear buttons, and validation shake animation
  - Native iOS Light and Dark appearance themes
- **MongoDB & Dual-Token JWT Authentication**:
  - Short-lived Access Tokens (15 min) in memory
  - Long-lived Refresh Tokens (7 days) in MongoDB with automatic TTL expiry
  - `httpOnly`, `sameSite: "lax"` secure cookies
  - Seamless silent auto-refresh on token expiration
  - Safe password hashing using bcrypt

---

## 🏛️ Architecture

### 1. AI Pipeline (LangGraph StateGraph)
```
                          ┌──────────────┐
     User Question ─────► │  Express API │
                          │ POST /api/   │
                          │   compare    │
                          └──────┬───────┘
                                 │
                        ┌────────▼────────┐
                        │ Tavily Search   │
                        │ (Web Grounding) │
                        └────────┬────────┘
                                 │
                        ┌────────┴────────┐
                        ▼                 ▼
                 Mistral Large     Cohere Command
                  (Solution 1)      (Solution 2)
                        │                 │
                        └────────┬────────┘
                                 ▼
                         Gemini AI Judge
                     (Structured Evaluation)
                                 │
                                 ▼
                     Battle Result JSON Response
```

### 2. Authentication & Session Lifecycle
```
[ Client / Browser ]                                  [ Server & MongoDB ]
        │                                                      │
        │─── POST /auth/register or /auth/login ──────────────>│ Hash password (bcrypt)
        │<── Access Token (15m) + httpOnly Cookie (7d) ────────│ Save User & RefreshToken to MongoDB
        │                                                      │
        │─── POST /api/compare (Authorization: Bearer <token>)─>│ Verify Access Token (requireAuth)
        │<── 200 OK Battle Result ─────────────────────────────│
        │                                                      │
        │ [When Access Token Expires]                          │
        │─── POST /auth/refresh (httpOnly cookie auto-sent) ───>│ Validate & Rotate RefreshToken in DB
        │<── New Access Token (15m) + Rotated Cookie (7d) ─────│
        │                                                      │
        │─── POST /auth/logout ────────────────────────────────>│ Delete RefreshToken from MongoDB
        │<── Clear httpOnly Cookie ────────────────────────────│
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, Vanilla CSS (Apple iOS Design System), Lucide/SVG Icons |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | MongoDB, Mongoose ODM (with TTL Indexes) |
| **AI Framework** | `@langchain/langgraph`, `@langchain/google-genai`, `@langchain/mistralai`, `@langchain/cohere` |
| **Search & Tools** | Tavily Web Search API |
| **Security** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser`, CORS |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or higher
- **MongoDB**: Local instance running at `mongodb://localhost:27017` or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI
- API Keys:
  - [Google AI Studio](https://aistudio.google.com/apikey) (Gemini)
  - [Mistral AI](https://console.mistral.ai/)
  - [Cohere](https://dashboard.cohere.com/)
  - [Tavily](https://app.tavily.com/) (Web Search)

---

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (or copy from `.env.example`):

```env
# AI Model Provider Keys
GOOGLE_GEMINI_AI_BATTLE_ARENA_API_KEY=your_gemini_api_key
MISTRAL_AI_BATTLE_ARENA_API_KEY=your_mistral_api_key
COHERE_AI_BATTLE_ARENA_API_KEY=your_cohere_api_key

# Web Search
TAVILY_API_KEY=your_tavily_api_key

# Database
MONGODB_URI=mongodb://localhost:27017/aequitas

# JWT Secrets
JWT_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
```

Start the backend development server:

```bash
npm run dev
```

The API will run at `http://localhost:3000`.

---

### 2. Frontend Setup

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The Vite dev server automatically proxies `/api` and `/auth` requests to port 3000.

---

## 📡 API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `POST` | `/auth/register` | Create a new user, returns access token + sets `httpOnly` refresh cookie | No |
| `POST` | `/auth/login` | Authenticate user, returns access token + sets `httpOnly` refresh cookie | No |
| `POST` | `/auth/refresh` | Silently issue new access token using refresh cookie | Yes (via cookie) |
| `POST` | `/auth/logout` | Revoke current device refresh token from DB and clear cookie | Yes (via cookie) |
| `POST` | `/auth/logout-all` | Revoke all active sessions across devices for the user | Yes (via cookie) |

### Battle Arena Endpoints

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/` | Health check endpoint | No |
| `POST` | `/api/compare` | Run a parallel model battle and AI judge evaluation | **Yes** (`Bearer <token>`) |

#### Example `POST /api/compare` Request:
```json
{
  "problem": "Compare Python vs Rust for building high-performance CLI tools."
}
```

#### Example Response:
```json
{
  "problem_statement": "Compare Python vs Rust for building high-performance CLI tools.",
  "web_search_context": "...Tavily live search results...",
  "solution_1": "...Mistral's response...",
  "solution_2": "...Cohere's response...",
  "judge": {
    "solution_1_score": 8,
    "solution_2_score": 9,
    "solution_1_reasoning": "Detailed breakdown of strengths and weaknesses for Solution 1...",
    "solution_2_reasoning": "Detailed breakdown of strengths and weaknesses for Solution 2...",
    "comparative_verdict": "Rust provides superior memory safety and execution speed for CLI tools..."
  }
}
```

---

## 📂 Project Structure

```
ai-battle-arena/
├── backend/
│   ├── src/
│   │   ├── ai/
│   │   │   ├── graph.ai.ts       # LangGraph StateGraph orchestration pipeline
│   │   │   ├── models.ai.ts      # Gemini, Mistral & Cohere model initializations
│   │   │   └── search.ai.ts      # Tavily web search integration
│   │   ├── auth/
│   │   │   ├── auth.middleware.ts# requireAuth JWT verification middleware
│   │   │   └── auth.routes.ts    # Register, login, refresh, and logout routes
│   │   ├── config/
│   │   │   └── config.ts         # Environment variable configuration
│   │   ├── db/
│   │   │   └── connect.ts        # Mongoose MongoDB connection handler
│   │   ├── models/
│   │   │   ├── User.model.ts     # User schema & model
│   │   │   └── RefreshToken.model.ts # RefreshToken schema with TTL index
│   │   └── app.ts                # Express application configuration & routes
│   ├── server.ts                 # HTTP server bootstrap
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.jsx           # Main battle arena feed & navbar
│   │   │   ├── App.css           # Battle arena design system & themes
│   │   │   ├── AuthPage.jsx      # Apple (iOS) login & registration component
│   │   │   └── AuthPage.css      # iOS glassmorphic design system styles
│   │   └── main.jsx              # React DOM entry point
│   ├── vite.config.js            # Vite config with backend proxy setup
│   └── package.json
│
└── README.md
```

---

## 📜 Available Scripts

### Backend (`/backend`)
- `npm run dev` — Start dev server with hot reload (`tsx watch`)
- `npm run typecheck` — Run TypeScript type checking
- `npm run build` — Compile TypeScript to `dist/`
- `npm run start` — Run compiled production server

### Frontend (`/frontend`)
- `npm run dev` — Start Vite development server
- `npm run build` — Build production bundle
- `npm run preview` — Preview production build

---

## 🔒 Security Best Practices

- **Never commit `.env` files**: All secret keys and database strings are excluded via `.gitignore`.
- **httpOnly Cookies**: Refresh tokens cannot be accessed by client-side JavaScript, mitigating XSS risks.
- **Token Rotation**: Refresh tokens are invalidated and replaced upon every `/auth/refresh` request.
- **Constant-Time Passwords**: Password comparisons use bcrypt with dummy hash fallbacks to guard against timing attacks.
