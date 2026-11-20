# ZeroSpoil

<p align="center">
  <img src="SS1.png" width="45%">
  <img src="SS2.png" width="45%">
</p>
<p align="center">
  <img src="SS3.png" width="45%">
  <img src="SS4.png" width="60%">
</p>

<h3 align="center">Cut food waste in Dhaka supermarkets with smarter stock tracking, AI produce scanning, and a helpful assistant.</h3>

<p align="center">
  FEFO inventory audits · Two-layer ripeness scanning · Citation-backed AI copilot
</p>

## Overview

Every day, a huge amount of fresh food, from leafy greens and tropical fruits to dairy, poultry, and fish, is wasted before it ever reaches someone's table. In many cases, the food is still perfectly usable. The problem is that suppliers and retailers often don't know which products are at risk, when to sell them, or when to offer discounts. Without timely information and proper inventory management, good food ends up going to waste.

ZeroSpoil, developed for the Food Waste Zero challenge, aims to change that. It's an AI-powered platform that helps suppliers and retailers make smarter decisions before food goes bad. By tracking shelf life, prioritizing products through FEFO (First-Expired, First-Out), recommending timely discounts, and using AI-powered ripeness detection, ZeroSpoil helps move products to the right place at the right time.

Our goal is simple: prevent food waste before it happens and achieve a target of at least 30% reduction in preventable food waste through smarter, data-driven decisions.

## What It Does

**Inventory reconciliation.** Every day, ZeroSpoil checks opening stock, deliveries, transfers, sales, waste, and returns against the real closing count. If the numbers do not match, it flags shrinkage or overstock right away.

**FEFO batch tracking and smart markdowns.** The platform watches batches that will expire within 48 hours, shows the value at risk in BDT, and suggests discounts or store-to-store transfers before the stock is lost.

**Two-layer produce scanner.** Point a camera at a crate or upload a photo. A fast offline color check runs first, then `gemini-3.8-flash` confirms what the item is and how ripe it is. The new shelf life is saved straight to the database.

**Ask ZeroSpoil.** Ask a question in plain language and get an answer built from USDA FoodKeeper rules and live PostgreSQL stock data, with a citation on every fact.

**Full audit trail.** Every forecast, price suggestion, transfer proposal, and vision check is logged in order, so teams can always see what happened and why.

## Built-In Safeguards

**People stay in control.** The system never changes prices or sends trucks on its own. Every markdown and transfer proposal needs a clear Approve or Reject from a supplier in the Smart Allocation Hub.

**The assistant is read-only.** The `zerospoil-inventory-mcp` server can only run `SELECT` queries and look up fixed guidelines. It cannot edit inventory.

**No made-up numbers.** Answers keep inline citations such as `[PostgreSQL Store Query]` and `[USDA FoodKeeper Guideline ...]`. If the external AI is unavailable, ZeroSpoil falls back to verified, rule-based data.

## Tech Stack

| Layer | Tools |
| :--- | :--- |
| Frontend | React (Vite), Tailwind CSS, Recharts, HTML5 canvas for the first color check |
| Backend | Python 3, FastAPI, Uvicorn, Pydantic, JWT authentication |
| Database | PostgreSQL 16 (local or Neon.tech serverless) |
| AI and retrieval | LangGraph, Google GenAI SDK (`gemini-3.8-flash` with `gemini-3.5-flash-lite` as backup), FastMCP, Scikit-learn (TF-IDF), NetworkX, Pillow, NumPy |

## How It Works

### Inventory reconciliation

Each branch is checked with one simple rule:

$$\text{Opening} + \text{Received} + \text{Transfers In} - \text{Sold} - \text{Waste} - \text{Returns} - \text{Transfers Out} = \text{Expected Closing}$$

The expected closing stock is then compared with the physical count. Each branch is marked `RECONCILED`, or flagged as `OVERSTOCK / AUDIT` when something is off.

### Vision inspection (`backend/services/agents.py`)

**Layer 1: Adaptive color check (under 10 ms, no tokens used).** Pillow and NumPy fix photo orientation, trim 8% off the borders, and ignore white tissue or table backgrounds. An 85th-percentile brightness baseline keeps dim rooms from causing false bruise alerts, while healthy red tomatoes and dark green produce are protected.

**Layer 2: Gemini review (`gemini-3.8-flash`).** The model checks whether real produce is in the photo, and rejects anything else as `NO PRODUCE DETECTED`. It names the item, grades ripeness from Stage 1 to Stage 7, updates the linked batch in PostgreSQL, and queues an urgent markdown for Stage 5 and above.

### Ask ZeroSpoil (`backend/services/rag_service.py`, `backend/mcp_server.py`)

**Smart routing.** LangGraph separates small talk like "hi" or "help" from real supply-chain questions, so greetings never trigger database queries.

**Two ways of finding facts.** TF-IDF similarity search is combined with a NetworkX knowledge graph (`Product -> Category -> USDA Guideline -> Optimal Temp`) built from `foodkeeper_seed.json`.

**Built to keep working.** Answers come from `gemini-3.8-flash`, then `gemini-3.5-flash-lite`, then a grounded template if the API is down or out of quota.

## Project Structure

```text
zerospoil/
├── README.md
├── SS1.png ... SS4.png                 # Screenshots
├── scripts/
│   └── verify_compliance.py            # Runs the M-01 to M-10 compliance checks
├── backend/
│   ├── requirements.txt
│   ├── .env                            # DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
│   ├── main.py                         # FastAPI app, CORS, table setup and seeding
│   ├── database.py                     # PostgreSQL engine, sessions, env loader
│   ├── mcp_server.py                   # Read-only FastMCP inventory tools
│   ├── data/
│   │   └── foodkeeper_seed.json        # USDA FoodKeeper rules and Dhaka handling notes
│   └── services/
│       ├── agents.py                   # Multi-agent logic and vision engine
│       └── rag_service.py              # Hybrid RAG, NetworkX, Gemini answers
└── frontend/
    ├── package.json
    ├── vercel.json                     # SPA rewrite rules for Vercel
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                     # Overview, Reconciliation, Smart Allocation, FEFO
        ├── lib/
        │   └── api.js                  # REST client (reads VITE_API_BASE_URL)
        └── components/
            ├── VisionScannerTab.jsx    # Camera, uploads, presets, color bars
            ├── AskZeroSpoilTab.jsx     # Chat with inline citations
            ├── GlossaryModal.jsx       # Helpful term tooltips
            └── Icons.jsx               # Custom icon set
```

## Data and Knowledge Base

The PostgreSQL 16 database holds live Dhaka supermarket data next to static USDA FoodKeeper records.

**Stores and reconciliation ledger.** Thirty days of calibrated stock flows for Shwapno Dhanmondi 27, Agora Gulshan 2, Meena Bazar Uttara, and Unimart Banani, including a few seeded mismatches you can use to test audits.

**FEFO batches.** Batch codes, categories, remaining shelf-life hours, quantity in kg, BDT value at risk, and markdown suggestions.

**Proposals and audit logs.** Pending, approved, and rejected supplier actions, plus a timeline of every agent decision.

**USDA FoodKeeper seed.** Fridge and pantry time limits, ideal cold-chain temperatures in Celsius, spoilage signs, and Dhaka-specific handling rules.

### Quick test scenarios

| Module | What to try | What you should see |
| :--- | :--- | :--- |
| Ask ZeroSpoil | Type `Hi` | A friendly greeting, with no database query and no unrelated data. |
| Ask ZeroSpoil | Ask "Which Dhaka supermarket has a reconciliation discrepancy right now?" | A `get_store_reconciliation` call through MCP, cited as `[PostgreSQL Store Query]`. |
| Vision Scanner | Upload a bruised or spotted fruit (offline mode) | Neutral backgrounds are masked, and the item is flagged **Stage 5/6 Spoilage Risk** with an accurate `brown_pct`. |
| Vision Scanner | Scan a non-food object (Gemini Assist on) | `gemini-3.8-flash` overrides the color check and returns **NO PRODUCE DETECTED**, and no database records are touched. |

## Local Setup

### What you need

1. Python 3.10 or newer: [python.org/downloads](https://www.python.org/downloads/)
2. Node.js 18 LTS or newer: [nodejs.org](https://nodejs.org)
3. PostgreSQL 16: [postgresql.org/download](https://www.postgresql.org/download/)
4. A free Google AI Studio API key: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### Step 1: Create the database

**Windows**

1. Install PostgreSQL 16. Keep port `5432` and remember your `postgres` password.
2. Open pgAdmin 4 or `psql` and run:
   ```sql
   CREATE DATABASE zerospoil;
   ```

**macOS**

1. Install and start PostgreSQL 16:
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```
2. Create the database:
   ```bash
   psql -U postgres -c "CREATE DATABASE zerospoil;"
   ```

### Step 2: Start the backend

1. Clone the project:
   ```bash
   git clone https://github.com/Washibro/zerospoil.git
   cd zerospoil
   ```

2. Create and activate a virtual environment.

   macOS / Linux:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
   Windows (PowerShell):
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install the dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Create `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/zerospoil
   GEMINI_API_KEY=your_google_ai_studio_key
   GEMINI_MODEL=gemini-3.8-flash
   JWT_SECRET=zerospoil-dhaka-b2b-secret-key-2026
   FRONTEND_ORIGIN=http://localhost:5173
   ```

5. Run the server on port 8000:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   Tables and sample Dhaka data are created on first launch. To confirm it works, open `http://127.0.0.1:8000/api/health`.

### Step 3: Start the frontend

1. In a second terminal:
   ```bash
   cd frontend
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment

### 1. Database on Neon.tech

Create a project called `zerospoil-db` on [Neon.tech](https://neon.tech) and copy the connection string (`postgresql://...?sslmode=require`).

### 2. Backend on Render

1. Connect `Washibro/zerospoil` (branch `master`) as a Web Service on [Render](https://render.com).
2. Leave **Root Directory** blank.
3. **Build Command:** `pip install -r backend/requirements.txt`
4. **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Add these environment variables: `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, `JWT_SECRET`, and `FRONTEND_ORIGIN` (use your Vercel URL once it is live).

### 3. Frontend on Vercel

1. Import `Washibro/zerospoil` on [Vercel](https://vercel.com).
2. Use these settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add the environment variable `VITE_API_BASE_URL=https://your-render-service.onrender.com` (no trailing slash).
4. Go back to Render and set `FRONTEND_ORIGIN` to your live `https://*.vercel.app` URL. This turns on production CORS and lets the live camera work over HTTPS on desktop and mobile.

## API Reference

### FastAPI endpoints

| Method | Endpoint | What it does |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Checks API status and database connection. |
| `GET` | `/api/dashboard` | Returns overview KPIs, the reconciliation ledger, FEFO batches, proposals, and the audit trail. |
| `POST` | `/api/vision/inspect` | Grades produce with the color check and optional Gemini review, then updates shelf life. |
| `POST` | `/api/rag/ask` | Runs the Hybrid RAG and read-only MCP pipeline for Ask ZeroSpoil. |
| `POST` | `/api/proposals/{id}/decision` | Saves a supplier's Approve or Reject choice (M-09). |

### Read-only MCP tools (`zerospoil-inventory-mcp`)

| Tool | Access | What it does |
| :--- | :--- | :--- |
| `get_fefo_expiring_batches` | Read-only `SELECT` | Finds batches expiring within 48 hours, with optional store filters. |
| `get_store_reconciliation` | Read-only `SELECT` | Runs the reconciliation audit across Shwapno, Agora, Meena Bazar, and Unimart. |
| `query_usda_foodkeeper` | Read-only | Looks up shelf-life limits, temperature ranges, and Dhaka handling rules. |

## Troubleshooting

| Problem | Why it happens | How to fix it |
| :--- | :--- | :--- |
| Live camera is blocked on a phone using a LAN address (`http://192.168...`) | Mobile browsers only allow camera access on HTTPS or `localhost`. | Use **Upload Shelf / Crate Photo** over HTTP, or deploy to Vercel (`https://`) for live camera. |
| Camera permission denied or busy | The browser blocked the camera, or another app or tab is using it. | Allow the camera in your browser and OS privacy settings, and close other apps that use it. |
| Ask ZeroSpoil gives plain, rigid answers | `GEMINI_API_KEY` is missing, or `uvicorn` was not restarted after editing `.env`. | Add the key to `backend/.env`, then restart `uvicorn backend.main:app --reload --port 8000`. |
| A green non-food object is graded as fresh | **Gemini Multimodal Assist** is off, so only pixel colors are checked. | Turn on **Gemini Multimodal Assist** so `gemini-3.8-flash` can confirm the item is real produce. |
| `Connection refused` on port 5432 | PostgreSQL 16 is not running. | **Windows:** start `postgresql-x64-16` in `services.msc`. **macOS:** run `brew services start postgresql@16`. |

## License and Data Notice

ZeroSpoil is an AI supply-chain prototype built for the **Food Waste Zero** challenge in the **FoodSphere** track. Store inventory, batch codes, and 30-day sales and waste history are calibrated synthetic Dhaka retail data, paired with real USDA FoodKeeper storage and temperature guidelines. A production rollout would need live supermarket ERP and POS feeds and verified cold-chain IoT sensors.

## Acknowledgements

ZeroSpoil was built with the help of AI tools across the whole project, including system design, database modeling, the vision pipeline, Hybrid RAG, and full-stack development.

**Gemini** was the main AI coding partner. It helped with core code, the multi-agent and Hybrid RAG design, color-check tuning, and debugging.

**Claude** helped refine the project documentation, including the README's structure, wording, and overall polish.

**Antigravity** and **ChatGPT** supported research, from early ideas and supply-chain workflow analysis to technical documentation.
