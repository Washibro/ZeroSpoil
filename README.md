# ZeroSpoil

<p align="center">
  <img src="SS1.png" width="45%">
  <img src="SS2.png" width="45%">
</p>
<p align="center">
  <img src="SS3.png" width="45%">
  <img src="SS4.png" width="45%">
</p>

**AI-Powered B2B Perishable Supply-Chain & Food Waste Reduction Platform for Dhaka Supermarkets**  
*Smart FEFO Inventory Auditing, Dual-Layer Vision Ripeness Grading & Hybrid RAG Copilot*

---

## 📖 1. Executive Summary & Product Mission

Perishable food waste across urban retail supply chains in Dhaka—spanning dairy, leafy greens, tropical fruits, poultry, and fish—results from fragmented shelf-life visibility, delayed markdowns, cold-chain breaks, and manual stock reconciliation.

**ZeroSpoil** is an enterprise-ready B2B cold-chain operations platform built for Dhaka supermarket networks (**Shwapno Dhanmondi 27**, **Agora Gulshan 2**, **Meena Bazar Uttara**, and **Unimart Banani**). It unifies real-time PostgreSQL 16 inventory auditing, automated FEFO dispatch recommendations, optical ripeness inspection, and a citation-backed AI assistant to drive a measurable **30% food waste reduction benchmark**.

### Core Value Proposition

1. **Universal Inventory Reconciliation Ledger:** Continuously verifies opening stock, deliveries, inter-store transfers, sales, waste, and returns against physical closing stock to catch shrinkage or overstock discrepancies automatically.
2. **FEFO Batch Intelligence & Dynamic Markdowns:** Tracks perishable batches approaching the **48-hour critical expiry threshold**, quantifying BDT value at risk and queuing targeted clearance discounts or branch-to-branch rebalancing.
3. **Dual-Layer Vision Ripeness & Spoilage Scanner:** Combines sub-10ms zero-token offline HSV colorimetry with **`gemini-3.8-flash`** multimodal semantic inspection via live camera or photo upload, syncing updated shelf life directly back to PostgreSQL.
4. **Ask ZeroSpoil (Hybrid RAG + Read-Only MCP):** Answers operational queries in plain language by combining **USDA FoodKeeper** cold-chain rules with live PostgreSQL stock queries—complete with strict inline citations and zero hallucinated stock counts.
5. **Multi-Agent Coordination Audit Trail:** Logs every forecasting, dynamic pricing, inter-store rebalance, and vision inspection decision chronologically for full operational transparency.

### ⚖️ Critical Boundaries & Governance Guardrails

- **Human-in-the-Loop Sign-Off (M-09):** Autonomous agents never silently alter store prices or dispatch trucks. All markdowns and inter-store transfer proposals require explicit supplier **Approve / Reject** confirmation in the Smart Allocation Hub.
- **Strictly Read-Only MCP Layer:** The `zerospoil-inventory-mcp` server is restricted to `SELECT`-only database queries and static guideline lookups, ensuring the RAG copilot cannot mutate live inventory records.
- **Zero-Hallucination Citation Policy:** Every factual inventory or cold-chain answer preserves inline `[PostgreSQL Store Query]` and `[USDA FoodKeeper Guideline ...]` citations, falling back to verified deterministic telemetry if external LLM APIs are unavailable.

---

## ⚙️ 2. System Architecture & Technology Stack

- **Frontend:** React (Vite), Tailwind CSS, Recharts, HTML5 `<canvas>` (client-side colorimetry pre-check).
- **Backend:** Python 3, FastAPI, Uvicorn, Pydantic, JWT Authentication.
- **Database:** PostgreSQL 16 (Local PostgreSQL / Neon.tech Serverless Cloud).
- **AI, RAG & Vision:** LangGraph, Google GenAI SDK (`gemini-3.8-flash` $\rightarrow$ `gemini-3.5-flash-lite` fallback loop), Python FastMCP, Scikit-learn (TF-IDF), NetworkX, Pillow, NumPy.

### Core Backend Engines & Logic

1. **Universal Inventory Reconciliation Engine:**
   - Audits every Dhaka branch in real time using the Universal Inventory Reconciliation Rule:
     $$\text{Opening} + \text{Received} + \text{Transfers In} - \text{Sold} - \text{Waste} - \text{Returns} - \text{Transfers Out} = \text{Expected Closing}$$
   - Compares $\text{Expected Closing}$ against $\text{Physical Closing}$ to flag `RECONCILED` vs. `OVERSTOCK / AUDIT` or shrinkage alerts.

2. **Dual-Layer Vision Inspection Pipeline (`backend/services/agents.py`):**
   - **Layer 1 — Adaptive HSV Colorimetry (`<10ms`, Zero-Token):** Uses Pillow & NumPy with EXIF orientation correction, 8% border trimming, foreground saturation masking (ignoring white tissue/table backgrounds), and an **85th-percentile adaptive brightness baseline** so dim room lighting does not trigger false bruising alerts while protecting healthy red/crimson tomatoes and dark green produce.
   - **Layer 2 — Multimodal Semantic Override (`gemini-3.8-flash`):** Inspects the image semantically to verify whether actual produce is present (rejecting non-food objects as `NO PRODUCE DETECTED`), identifies the item, grades ripeness (`Stage 1–7`), updates the linked PostgreSQL batch, and queues urgent markdowns for Stage 5+ spoilage risk.

3. **Ask ZeroSpoil Hybrid RAG & Read-Only MCP (`backend/services/rag_service.py`, `backend/mcp_server.py`):**
   - **Smart LangGraph Routing:** Separates casual greetings (`"hi"`, `"hello"`, `"help"`) from supply-chain queries so greetings never trigger unnecessary SQL lookups.
   - **Vector + Knowledge Graph Retrieval:** Combines **Scikit-learn TF-IDF** cosine similarity with a **NetworkX Directed Graph** (`Product -> Category -> USDA Guideline -> Optimal Temp`) built over `foodkeeper_seed.json`.
   - **Dual-Model Resilience:** Synthesizes responses using `gemini-3.8-flash` with automatic fallback to `gemini-3.5-flash-lite` and a deterministic grounded template if API quota or connectivity drops.

---

## 📂 3. Project Directory Structure

```text
zerospoil/
├── README.md                           # Full project documentation & setup guide
├── SS1.png ... SS4.png                 # Platform preview screenshots
├── scripts/
│   └── verify_compliance.py            # Automated M-01 to M-10 compliance verifier
├── backend/
│   ├── requirements.txt                # FastAPI, LangGraph, FastMCP, Pillow, NumPy, GenAI
│   ├── .env                            # DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
│   ├── main.py                         # FastAPI app, CORS, startup table init & seeding
│   ├── database.py                     # PostgreSQL 16 engine, session & env loader
│   ├── mcp_server.py                   # Single-server read-only FastMCP inventory tools
│   ├── data/
│   │   └── foodkeeper_seed.json        # USDA FoodKeeper cold-chain & Dhaka handling rules
│   └── services/
│       ├── agents.py                   # Multi-agent orchestration & dual-layer vision engine
│       └── rag_service.py              # LangGraph Hybrid RAG + NetworkX + Gemini synthesis
└── frontend/
    ├── package.json
    ├── vercel.json                     # SPA rewrite rules for Vercel deployment
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                     # Executive Overview, Reconciliation, Smart Allocation & FEFO
        ├── lib/
        │   └── api.js                  # REST API client (VITE_API_BASE_URL aware)
        └── components/
            ├── VisionScannerTab.jsx    # Live camera, photo upload, presets & colorimetry bars
            ├── AskZeroSpoilTab.jsx     # Conversational RAG chat with inline citations
            ├── GlossaryModal.jsx       # Interactive operational info tooltips
            └── Icons.jsx               # Custom UI icon set
```

---

## 🗄️ 4. Database Architecture, USDA Knowledge Base & Calibrated Telemetry

The PostgreSQL 16 database manages live B2B Dhaka supermarket telemetry alongside static **USDA FoodKeeper** reference records:

- **Stores & Reconciliation Ledger:** Tracks 30-day calibrated operational flows across **Shwapno Dhanmondi 27**, **Agora Gulshan 2**, **Meena Bazar Uttara**, and **Unimart Banani** (including seeded audit discrepancies for live verification).
- **FEFO Perishable Batches:** Tracks batch codes, product categories, remaining shelf-life hours, quantities (kg), BDT value at risk, and dynamic markdown recommendations.
- **Smart Allocation Proposals & Audit Logs:** Stores pending/approved/rejected M-09 supplier actions and chronological multi-agent execution logs.
- **USDA FoodKeeper Seed (`foodkeeper_seed.json`):** Encodes refrigerated/pantry hour ceilings, optimal Celsius cold-chain ranges, spoilage indicators, and Dhaka-specific handling rules.

### Quick-Test Verification Scenarios

| Module | Test Action | Expected Outcome |
| :--- | :--- | :--- |
| **Ask ZeroSpoil** | Type `"Hi"` | Returns a clean greeting without querying PostgreSQL or dumping unrelated data. |
| **Ask ZeroSpoil** | Ask *"Which Dhaka supermarket has a reconciliation discrepancy right now?"* | Queries `get_store_reconciliation` via MCP and cites `[PostgreSQL Store Query]`. |
| **Vision Scanner** | Upload bruised/spotted fruit (Offline Mode) | Adaptive HSV masks neutral backgrounds and flags **Stage 5/6 Spoilage Risk** with accurate `brown_pct`. |
| **Vision Scanner** | Scan a non-food object (Gemini Assist ON) | `gemini-3.8-flash` overrides colorimetry, returns **`NO PRODUCE DETECTED`**, and protects DB records. |

---

## 🚀 5. Complete Local Setup Guide (PostgreSQL, Windows & macOS)

### Prerequisites

1. **Python (v3.10+ recommended):** Download from [https://www.python.org/downloads/](https://www.python.org/downloads/).
2. **Node.js (v18+ LTS recommended):** Download from [https://nodejs.org](https://nodejs.org).
3. **PostgreSQL 16:** Download from [https://www.postgresql.org/download/](https://www.postgresql.org/download/).
4. **Google AI Studio API Key:** Create a free key at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

### Step 1: Create the `zerospoil` PostgreSQL Database

#### 🪟 Option A: Windows Users
1. Install PostgreSQL 16 (keep port **`5432`** and note your `postgres` password).
2. Open **pgAdmin 4** (or **SQL Shell `psql`**) and create a database named **`zerospoil`**:
   ```sql
   CREATE DATABASE zerospoil;
   ```

#### 🍎 Option B: macOS Users
1. Install and start PostgreSQL 16 via Homebrew or Postgres.app:
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```
2. Create the database:
   ```bash
   psql -U postgres -c "CREATE DATABASE zerospoil;"
   ```

---

### Step 2: Backend Configuration & FastAPI Launch

1. **Clone the repository and open Terminal 1 in the `zerospoil` root folder:**
   ```bash
   git clone [https://github.com/Washibro/zerospoil.git](https://github.com/Washibro/zerospoil.git)
   cd zerospoil
   ```

2. **Create and activate a Python virtual environment:**
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```

3. **Install backend dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Configure `backend/.env`:**
   Create `backend/.env` with your PostgreSQL credentials and Gemini API key:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/zerospoil
   GEMINI_API_KEY=your_google_ai_studio_key
   GEMINI_MODEL=gemini-3.8-flash
   JWT_SECRET=zerospoil-dhaka-b2b-secret-key-2026
   FRONTEND_ORIGIN=http://localhost:5173
   ```

5. **Start the FastAPI Backend Server (Port `8000`):**
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   *(Tables and calibrated Dhaka supermarket seed data initialize automatically on first boot. Verify at `http://127.0.0.1:8000/api/health`.)*

---

### Step 3: Frontend Setup & Launch

1. **Open Terminal 2** and navigate to the `frontend` folder:
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Vite Development Server:**
   ```bash
   npm run dev
   ```

3. **Open the Application in Your Browser:**
   Visit [**http://localhost:5173**](http://localhost:5173).

---

## 🌐 6. Cloud & Production Deployment Guide

### 1. Managed PostgreSQL 16 Database (Neon.tech)
1. Create a project named **`zerospoil-db`** on [Neon.tech](https://neon.tech) and copy the connection string (`postgresql://...?sslmode=require`).

### 2. Backend API Deployment (Render.com)
1. Connect **`Washibro/zerospoil`** (branch: `master`) as a **Web Service** on [Render.com](https://render.com).
2. **Root Directory:** *(leave blank)*
3. **Build Command:** `pip install -r backend/requirements.txt`
4. **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables:** `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, `JWT_SECRET`, and `FRONTEND_ORIGIN` (set to your live Vercel URL once deployed).

### 3. Frontend Deployment (Vercel.com)
1. Import **`Washibro/zerospoil`** on [Vercel.com](https://vercel.com).
2. **Root Directory:** `frontend` | **Framework Preset:** `Vite` | **Build Command:** `npm run build` | **Output Directory:** `dist`
3. **Environment Variable:** `VITE_API_BASE_URL=https://your-render-service.onrender.com` *(no trailing slash)*.
4. Update `FRONTEND_ORIGIN` on Render with your live `https://*.vercel.app` URL to enable production CORS and HTTPS live camera access on desktop and mobile browsers.

---

## 🔌 7. REST API & MCP Tool Reference

### Core FastAPI Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Verifies API health, database connectivity, and service status. |
| `GET` | `/api/dashboard` | Returns Executive Overview KPIs, reconciliation ledger, FEFO batches, proposals, and audit trail. |
| `POST` | `/api/vision/inspect` | Runs dual-layer produce grading (adaptive HSV colorimetry + optional `gemini-3.8-flash` override) and syncs shelf life. |
| `POST` | `/api/rag/ask` | Executes the LangGraph Hybrid RAG + Read-Only MCP pipeline for Ask ZeroSpoil queries. |
| `POST` | `/api/proposals/{id}/decision` | Records M-09 Human-in-the-Loop supplier Approve/Reject actions. |

### Read-Only MCP Tools (`zerospoil-inventory-mcp`)

| MCP Tool Name | Permission | Description |
| :--- | :--- | :--- |
| `get_fefo_expiring_batches` | `READ-ONLY SELECT` | Queries PostgreSQL 16 for batches expiring within $\le 48\text{h}$ with optional Dhaka store filters. |
| `get_store_reconciliation` | `READ-ONLY SELECT` | Runs the Universal Inventory Reconciliation audit across Shwapno, Agora, Meena Bazar, and Unimart. |
| `query_usda_foodkeeper` | `READ-ONLY` | Retrieves USDA FoodKeeper shelf-life ceilings, temperature limits, and Dhaka handling rules. |

---

## 🛠️ 8. Troubleshooting FAQ (Windows & macOS)

| Issue / Error Message | Cause | Exact Solution |
| :--- | :--- | :--- |
| **Live camera blocked on mobile LAN IP (`http://192.168...`)** | Mobile browsers restrict `getUserMedia` to HTTPS or `localhost`. | Use **Upload Shelf / Crate Photo** over local HTTP, or deploy to **Vercel (`https://`)** for native live camera streaming. |
| **Camera permission denied or busy** | Browser camera permission is blocked or another tab/app holds the webcam. | Allow Camera in browser site settings and OS Privacy settings, and close other apps using the camera. |
| **Ask ZeroSpoil falls back to rigid context text** | `GEMINI_API_KEY` is missing from `backend/.env` or `uvicorn` was not restarted after editing `.env`. | Add your key to `backend/.env` and restart `uvicorn backend.main:app --reload --port 8000`. |
| **Non-food green object graded as fresh** | **Gemini Multimodal Assist** was unchecked, falling back to object-blind pixel colorimetry. | Enable **Gemini Multimodal Assist** so `gemini-3.8-flash` performs semantic produce verification. |
| **`Connection refused` on port `5432`** | Local PostgreSQL 16 service is not running. | **Windows:** Start `postgresql-x64-16` in `services.msc`.<br>**macOS:** Run `brew services start postgresql@16`. |

---

## 📜 9. License & Data Disclosure

**ZeroSpoil** is an AI supply-chain engineering prototype developed for the **Food Waste Zero** challenge under the **FoodSphere** track. Store inventory figures, batch codes, and 30-day sales/waste histories are **calibrated synthetic Dhaka retail telemetry** paired with authentic **USDA FoodKeeper** storage and temperature guidelines. Production deployment requires integrating live supermarket ERP/POS feeds and verified cold-chain IoT sensors.

---

## 🤖 10. Project Development and AI Assistance Acknowledgements

The development of **ZeroSpoil** involved the effective integration of Artificial Intelligence (AI) and modern technologies across the project lifecycle, including system architecture, database modeling, vision pipeline engineering, Hybrid RAG orchestration, and full-stack implementation.

- **Primary AI Architect and Coding Assistant:** **Gemini** was primarily used for core code generation, multi-agent and Hybrid RAG architecture design, adaptive HSV colorimetry tuning, and full-stack debugging throughout the project.
- **Research and Development (R&D):** **Antigravity** and **ChatGPT** were used as R&D assistants for concept ideation, perishable supply-chain workflow analysis, and technical documentation research.