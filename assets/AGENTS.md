# AGENTS.md — ZeroSpoil AI Coding & Runtime Agent Specification

**Project:** ZeroSpoil (*Predict Smart. Stock Right. Waste Less.*)  
**Track:** AI Builders Congress Cloud Camp 2026 — FoodSphere Domain (Food Waste Zero Challenge)  
**Primary Blueprint:** `PROJECT_SPECIFICATION.md`  

---

## 1. Mission & Strict Domain Boundaries

ZeroSpoil is a B2B perishable food inventory and dispatch intelligence platform connecting **Food Suppliers / Distributors** to **Supermarkets** in **Dhaka, Bangladesh** (Shwapno Dhanmondi 27, Agora Gulshan 2, Meena Bazar Uttara, Unimart Banani) operating in **BDT (৳)**.

### Mandatory Scope Rules (DO NOT VIOLATE)
* **B2B Supplier-to-Supermarket Only:** All workflows, dashboards, and transactions are strictly distributor-to-supermarket.
* **Human-in-the-Loop (M-09):** AI agents only generate recommendations. A supplier must explicitly click **Approve** or **Reject** in the UI before any dispatch, dynamic discount, or inter-store transfer is finalized.
* **Strictly Out-of-Scope (NEVER BUILD):**
  * Consumer-facing grocery apps or shopping carts.
  * Restaurant, hotel, or household kitchen waste trackers.
  * Consumer food-donation marketplaces (e.g., Too Good To Go clones).
  * Unreviewed autonomous ordering without human sign-off.
  * Public user registration, email verification, or password-reset walls.

---

## 2. Environment, Ports & Stack Standards

* **Backend (FastAPI + Uvicorn):** Strictly serve on **Port `8000`** (`http://localhost:8000`, Swagger OpenAPI docs at `http://localhost:8000/docs`). **Never use Port `5000`** (avoids macOS AirPlay Receiver conflicts).
* **Frontend (React + Vite + Tailwind CSS + Recharts):** Strictly serve on **Port `5173`** (`http://localhost:5173`).
* **Database (PostgreSQL 16 + SQLAlchemy):** Managed via `DATABASE_URL` with `pool_pre_ping=True` (supports seamless switching between local PostgreSQL 16 and cloud Neon.tech). Core tables: `Product`, `Supermarket`, `Batch`, `Delivery`, `Sale`, `Return`, `WasteRecord`, `Transfer`, `SimulationRun`.
* **Single MCP Server (`zerospoil-inventory-mcp`):** Implemented in `backend/mcp_server.py` using Python `FastMCP`, mounted on FastAPI at `/mcp` (Streamable HTTP) and runnable via `stdio`.

---

## 3. Official Brand Logo & Cropped Emblem Favicon Assets

* **Full Horizontal Master Logo (`frontend/public/zerospoil-logo.png` & `assets/zerospoil_logo.jpg`):**
  * Render in the top navigation header, 2.0-second telemetry startup splash screen, 1-Click Demo Login card, and printable PDF driver dispatch manifests.
  * Features the circular green renewal-arrows + produce crate emblem on the left and dual-tone **"ZeroSpoil"** wordmark (`#14532D` / `#4D9E2A`) with tagline *"Predict Smart. Stock Right. Waste Less."* on the right.
* **Cropped Square Emblem Favicon (`frontend/public/favicon.png`, `frontend/public/favicon.ico`, `frontend/public/apple-touch-icon.png`):**
  * Crop **only the left circular renewal-arrows + produce crate emblem** (excluding the right-hand wordmark and tagline) onto a `1:1` square canvas so it stays crisp at `16×16` and `32×32` browser tab sizes.
  * Store directly inside `frontend/public/` (skipping Vite asset filename hashing) and declare `<link rel="icon" type="image/png" href="/favicon.png" />` and `<link rel="alternate icon" href="/favicon.ico" />` in `frontend/index.html`.

---

## 4. Multi-Agent Architecture (LangGraph + FastAPI)

All agent state transitions and handoffs must be logged chronologically and exposed via `GET /api/agents/audit-log`.

1. **Forecast Agent:** Predicts `Product × Supermarket × Day` demand using chronologically validated Ridge Regression and Exponential Moving Average baselines adjusted by live Dhaka weather from Open-Meteo (`23.81° N, 90.41° E`, with local cache fallback).
2. **Vision Inspection Agent:** Classifies produce ripeness from live device camera (`navigator.mediaDevices.getUserMedia` with `facingMode: environment`), image file upload, or 3 presentation presets (*Fresh Green*, *Ripe Yellow*, *Overripe Spotted*). Runs sub-10ms zero-token HTML5 canvas pixel colorimetry first, with Gemini Multimodal LLM fallback. Updates remaining batch shelf life in PostgreSQL and triggers markdown alerts if ripeness $\ge$ Stage 5.
3. **Pricing Agent:** Triggers progressive dynamic markdown recommendations (`20% -> 30% -> 40%`) when remaining batch shelf life $\le 48\text{h}$ and regular-price forecast demand is below current batch quantity.
4. **Rebalance Agent:** Recommends inter-store transfers only when `(Salvage Revenue Recovered - Logistics & Cold-Chain Transit Cost) > 0` and transit duration fits safely within remaining usable shelf life.
5. **Ask ZeroSpoil (Hybrid RAG):** Combines contextual + semantic chunking over `backend/data/foodkeeper_seed.json`, a lightweight `NetworkX` product-rule-store knowledge graph, and parameterized read-only SQL queries via `zerospoil-inventory-mcp`. Every answer must include explicit `[USDA FoodKeeper Guideline]` and `[PostgreSQL Store Query]` citations.

---

## 5. Single-Server MCP Governance (`backend/mcp_server.py`)

* **Server Name:** `zerospoil-inventory-mcp`
* **Transports:** Streamable HTTP (`/mcp`) and `stdio`
* **Exposed Tools (3):**
  1. `get_fefo_expiring_batches` — Queries PostgreSQL 16 for perishable batches with $\le 48\text{h}$ remaining usable shelf life across Shwapno, Agora, Meena Bazar, and Unimart.
  2. `query_usda_foodkeeper` — Retrieves verified shelf-life thresholds and cold-chain storage temperatures from `backend/data/foodkeeper_seed.json`.
  3. `get_store_reconciliation` — Runs the Universal Inventory Reconciliation formula across Dhaka stores to flag stock discrepancies.
* **Security Constraint:** Strictly **read-only** (`SELECT` queries and JSON reads only). Zero write, delete, or dispatch-approval permissions (preserving M-09 Human-in-the-Loop governance).

---

## 6. Mathematical & Data Integrity Rules

* **Universal Inventory Reconciliation Rule:**
  $$\text{Opening Stock} + \text{Received} + \text{Transfers In} - \text{Sold} - \text{Recorded Waste} - \text{Returns} - \text{Transfers Out} = \text{Closing Stock}$$
  Always surface discrepancies rather than silently treating missing logs as zero waste.
* **30-Day Simulation Benchmark (M-07):** Policy B (ZeroSpoil AI) vs. Policy A (Baseline) must achieve $\ge 30.0\%$ food waste reduction (calibrated target: **38.89%**, **770 kg** saved, **৳ 486,200** recovered, **1.92 Tonnes $\text{CO}_2\text{e}$** avoided using UN FAOSTAT factors via `backend/emissions.py` and `GET /api/emissions/summary`).
* **Synthetic Data Tagging (M-04):** Every simulated POS, batch, delivery, return, transfer, and disposal record must be explicitly tagged `[SYNTHETIC]` in database rows and UI tables.
* **Manifest Exports:** Provide `GET /api/dispatch/export/excel` (`.xlsx` / UTF-8 BOM CSV) and `GET /api/dispatch/export/pdf` (printable driver route manifest stamped with the ZeroSpoil logo).

---

## 7. Strict UI/UX Guardrails ("Fresh Harvest & Food-Centric UX")

* **ZERO UNICODE EMOJIS:** Never output Unicode emojis anywhere in the UI, seed strings, or alerts. Use minimalist SVG line icons and high-contrast caution triangle `<svg>` icons on critical alerts (`CRITICAL EXPIRY ALERT`, `OVERSTOCK ALERT`).
* **Typography:** `Fraunces` for headings, brand mark, and hero metrics; `DM Sans` for body text, tables, forms, and navigation; `font-variant-numeric: tabular-nums` on all numeric/currency cells.
* **Color System:** Light canvas default (`#FAF8F5`) with dark mode toggle (`#0F0E0D`), truffle charcoal text (`#1C1917`), frosted glass surfaces (`backdrop-filter: blur(18px)`), and semantic ripeness states:
  * Peak Freshness: `#16A34A`
  * Active Markdown: `#EA580C`
  * Caution (24–48h): `#D97706`
  * Critical Spoilage (<24h): `#E11D48`
  * Cold-Chain / Weather: `#0284C7`
* **Strict CSS Units:** `rem` for all typography, `%` for container/column/grid widths, `100vw` and `min-height: 100vh` for full-screen canvas, and `1px solid` hairline borders.
* **Clickable Marquee Ticker:** Continuously scrolling alert bar below the header that pauses on hover and jumps to the relevant batch action or modal on click.
* **Auth & Onboarding:** 2.0-second 4-phase animated telemetry loader featuring the ZeroSpoil logo fading into a 1-Click Demo Login (*Kabir Hossain, Head of Fresh Supply Chain & Supermarket Dispatch, Pran Logistics Hub*) plus a Google OAuth 2.0 slot.
* **Plain-Language `(i)` Glossary Modals:** Attach clickable `(i)` pills to key supply-chain terms (`FEFO Batches`, `Dynamic Markdown`, `30% Benchmark`, `Inter-Store Rebalancing`, `CO2e Avoided`, `Vision Scanner`, `Ask ZeroSpoil`) opening a modal with *"In Easy Words"* and *"How ZeroSpoil Uses This in Dhaka"*.

---

## 8. Pre-Submission Verification Gates (M-01 to M-10)

Before considering any build complete, verify:
- [ ] **M-01** Supplier-centric command center for managing multiple supermarkets.
- [ ] **M-02** Strictly distributor-to-supermarket B2B transactions in Dhaka (BDT).
- [ ] **M-03** Verified USDA FoodKeeper guidelines ingested (`backend/data/foodkeeper_seed.json`).
- [ ] **M-04** Synthetic records explicitly tagged `[SYNTHETIC]`.
- [ ] **M-05** Ask ZeroSpoil hybrid RAG cites `[USDA FoodKeeper Guideline]` and `[PostgreSQL Store Query]`.
- [ ] **M-06** FastAPI Swagger docs live at `/docs` + live Open-Meteo Dhaka weather feed.
- [ ] **M-07** 30-day simulation proves $\ge 30\%$ waste reduction (`38.89%`).
- [ ] **M-08** Explainable plain-language reasoning on every recommendation.
- [ ] **M-09** Human-in-the-loop Approve/Reject controls on all agent proposals.
- [ ] **M-10** Working full-stack app (React + FastAPI + PostgreSQL 16 + FastMCP).