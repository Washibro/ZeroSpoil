import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, TypedDict

import networkx as nx
from langgraph.graph import END, StateGraph
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from backend.mcp_server import (
    get_fefo_expiring_batches_data,
    get_store_reconciliation_data,
    query_usda_foodkeeper_data,
)

FOODKEEPER_PATH = Path(__file__).resolve().parent / ".." / "data" / "foodkeeper_seed.json"

GREETING_PATTERNS = {
    "hi",
    "hello",
    "hey",
    "yo",
    "assalamu alaikum",
    "salam",
    "good morning",
    "good afternoon",
    "good evening",
    "help",
    "who are you",
    "what can you do",
}


class RAGState(TypedDict):
    question: str
    is_greeting: bool
    store_filter: str
    needs_foodkeeper: bool
    needs_fefo: bool
    needs_reconciliation: bool
    foodkeeper_chunks: List[Dict[str, Any]]
    graph_relations: List[str]
    sql_fefo_data: Dict[str, Any]
    sql_recon_data: Dict[str, Any]
    citations: List[str]
    tools_used: List[str]
    answer: str


class AskZeroSpoilEngine:
    def __init__(self) -> None:
        with open(FOODKEEPER_PATH, "r", encoding="utf-8") as f:
            self.records: List[Dict[str, Any]] = json.load(f)

        # 1. Contextual + Semantic Chunking over USDA FoodKeeper
        self.chunks: List[Dict[str, Any]] = []
        corpus: List[str] = []
        for rec in self.records:
            chunk_text = (
                f"{rec['name']} ({rec['category']}, {rec['brand']}) | "
                f"Guideline {rec['guideline_id']}: Refrigerated shelf life {rec['refrigerated_hours']}h, "
                f"pantry {rec['pantry_hours']}h, optimal temperature {rec['optimal_temp_c']}. "
                f"Spoilage signs: {rec['spoilage_indicators']} "
                f"Dhaka rule: {rec['dhaka_handling_rule']}"
            )
            self.chunks.append({"record": rec, "text": chunk_text})
            corpus.append(chunk_text)

        self.vectorizer = TfidfVectorizer(stop_words="english")
        self.matrix = self.vectorizer.fit_transform(corpus)

        # 2. Lightweight NetworkX Knowledge Graph (Product -> Category -> Guideline -> Temp)
        self.graph = nx.DiGraph()
        for rec in self.records:
            prod_node = rec["name"]
            cat_node = f"Category:{rec['category']}"
            ref_node = rec["guideline_id"]
            temp_node = f"Temp:{rec['optimal_temp_c']}"
            self.graph.add_edge(prod_node, cat_node, relation="BELONGS_TO")
            self.graph.add_edge(prod_node, ref_node, relation="GOVERNED_BY")
            self.graph.add_edge(ref_node, temp_node, relation="REQUIRES_COLD_CHAIN")

        self.workflow = self._build_graph()

    def _detect_store_filter(self, question: str) -> str:
        q = question.lower()
        for store in ("shwapno", "agora", "meena bazar", "unimart", "dhanmondi", "gulshan", "uttara", "banani"):
            if store in q:
                return store
        return ""

    def _route_node(self, state: RAGState) -> RAGState:
        raw_q = state["question"].strip()
        cleaned = re.sub(r"[^\w\s]", "", raw_q.lower()).strip()

        if cleaned in GREETING_PATTERNS or len(cleaned.split()) <= 2 and cleaned in GREETING_PATTERNS:
            state["is_greeting"] = True
            state["needs_foodkeeper"] = False
            state["needs_fefo"] = False
            state["needs_reconciliation"] = False
            return state

        state["is_greeting"] = False
        q = raw_q.lower()
        state["store_filter"] = self._detect_store_filter(q)

        has_recon = any(kw in q for kw in ("reconcil", "discrepanc", "missing", "closing", "audit", "mismatch"))
        has_storage = any(
            kw in q
            for kw in (
                "store", "storage", "temp", "temperature", "shelf", "guideline", "usda",
                "spoil", "milk", "tomato", "spinach", "banana", "mango", "chicken", "poultry", "fish", "egg",
            )
        )
        has_batch = any(
            kw in q
            for kw in ("batch", "expir", "fefo", "stock", "risk", "urgent", "critical", "markdown", "discount")
        ) or bool(state["store_filter"])

        # For general open questions, check both live batches and storage guidelines
        if not (has_recon or has_storage or has_batch):
            has_storage = True
            has_batch = True

        state["needs_reconciliation"] = has_recon
        state["needs_foodkeeper"] = has_storage
        state["needs_fefo"] = has_batch
        return state

    def _retrieve_vector_graph_node(self, state: RAGState) -> RAGState:
        if state["is_greeting"] or not state["needs_foodkeeper"]:
            return state

        q_vec = self.vectorizer.transform([state["question"]])
        sims = cosine_similarity(q_vec, self.matrix).flatten()
        top_indices = sims.argsort()[::-1][:2]

        matched_chunks = []
        graph_hops: List[str] = []
        citations = list(state["citations"])

        for idx in top_indices:
            if float(sims[idx]) <= 0.0 and matched_chunks:
                continue
            rec = self.records[int(idx)]
            matched_chunks.append(
                {
                    "guideline_id": rec["guideline_id"],
                    "product": rec["name"],
                    "category": rec["category"],
                    "optimal_temp_c": rec["optimal_temp_c"],
                    "refrigerated_hours": rec["refrigerated_hours"],
                    "spoilage_indicators": rec["spoilage_indicators"],
                    "dhaka_handling_rule": rec["dhaka_handling_rule"],
                    "similarity": round(float(sims[idx]), 3),
                }
            )
            citations.append(f"[USDA FoodKeeper Guideline {rec['guideline_id']}]")
            if rec["name"] in self.graph:
                for neighbor in self.graph.neighbors(rec["name"]):
                    edge_rel = self.graph.edges[rec["name"], neighbor]["relation"]
                    graph_hops.append(f"{rec['name']} --{edge_rel}--> {neighbor}")

        _ = query_usda_foodkeeper_data(state["question"])
        state["foodkeeper_chunks"] = matched_chunks
        state["graph_relations"] = graph_hops[:6]
        state["citations"] = list(dict.fromkeys(citations))
        state["tools_used"].append("zerospoil-inventory-mcp:query_usda_foodkeeper")
        return state

    def _query_mcp_sql_node(self, state: RAGState) -> RAGState:
        if state["is_greeting"]:
            return state

        citations = list(state["citations"])

        if state["needs_fefo"]:
            fefo = get_fefo_expiring_batches_data(max_hours=48.0, store_filter=state["store_filter"])
            state["sql_fefo_data"] = fefo
            state["tools_used"].append("zerospoil-inventory-mcp:get_fefo_expiring_batches")
            citations.append("[PostgreSQL Store Query]")

        if state["needs_reconciliation"]:
            recon = get_store_reconciliation_data(store_filter=state["store_filter"])
            state["sql_recon_data"] = recon
            state["tools_used"].append("zerospoil-inventory-mcp:get_store_reconciliation")
            citations.append("[PostgreSQL Store Query]")

        state["citations"] = list(dict.fromkeys(citations))
        return state

    def _synthesize_node(self, state: RAGState) -> RAGState:
        if state["is_greeting"]:
            state["answer"] = (
                "Hello Kabir. I am Ask ZeroSpoil, your B2B cold-chain and inventory assistant for "
                "Shwapno Dhanmondi 27, Agora Gulshan 2, Meena Bazar Uttara, and Unimart Banani.\n\n"
                "You can ask me about:\n"
                "- Expiring FEFO batches under 48 hours at any Dhaka branch\n"
                "- USDA FoodKeeper cold-chain temperature and shelf-life limits\n"
                "- Store inventory reconciliation discrepancies across deliveries, sales, and waste"
            )
            return state

        chunks = state["foodkeeper_chunks"]
        fefo = state["sql_fefo_data"]
        recon = state["sql_recon_data"]

        # Build verified ground-truth context from MCP tools
        context_blocks: List[str] = []

        if state["needs_foodkeeper"] and chunks:
            for rule in chunks:
                context_blocks.append(
                    f"USDA Guideline ({rule['guideline_id']}) for {rule['product']}: "
                    f"Optimal temp {rule['optimal_temp_c']}, refrigerated limit {rule['refrigerated_hours']}h. "
                    f"Dhaka rule: {rule['dhaka_handling_rule']} [USDA FoodKeeper Guideline {rule['guideline_id']}]."
                )

        if state["needs_fefo"] and fefo:
            if fefo.get("count", 0) > 0:
                top_b = fefo["batches"][:4]
                batch_summary = "; ".join(
                    f"{b['batch_code']} ({b['product']} at {b['store']}: {b['current_qty_kg']} kg, "
                    f"{b['remaining_hours']}h left, status {b['status']})"
                    for b in top_b
                )
                context_blocks.append(
                    f"Live PostgreSQL FEFO Query: {fefo['count']} batches expiring within 48h "
                    f"({fefo['total_at_risk_kg']} kg, BDT {fefo['total_at_risk_bdt']:,.0f} at risk). "
                    f"Top urgent batches: {batch_summary} [PostgreSQL Store Query]."
                )
            else:
                context_blocks.append(
                    "Live PostgreSQL FEFO Query: 0 batches expiring within 48h for the requested store [PostgreSQL Store Query]."
                )

        if state["needs_reconciliation"] and recon:
            flagged = [s for s in recon.get("stores", []) if s["status"] != "RECONCILED"]
            if flagged:
                f_txt = "; ".join(
                    f"{s['store_name']} (expected {s['expected_closing_kg']} kg vs physical {s['physical_closing_kg']} kg, "
                    f"discrepancy {s['discrepancy_kg']:+.1f} kg, status {s['status']})"
                    for s in flagged
                )
                context_blocks.append(f"Store Reconciliation Audit: {f_txt} [PostgreSQL Store Query].")
            else:
                context_blocks.append(
                    "Store Reconciliation Audit: All queried Dhaka stores balance cleanly [PostgreSQL Store Query]."
                )

        fallback_answer = "\n\n".join(context_blocks)

        # Synthesize a natural, direct answer with Gemini 3.8 Flash
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if api_key and not api_key.startswith("your_"):
            try:
                from google import genai

                client = genai.Client(api_key=api_key)
                prompt = (
                    "You are Ask ZeroSpoil, an intelligent B2B perishable supply-chain assistant for Dhaka supermarkets. "
                    "Answer the user's question directly and naturally using ONLY the verified facts below. "
                    "Do not dump irrelevant facts if the user asked something specific. Never invent numbers, "
                    "never use Unicode emojis, and preserve the exact citations [USDA FoodKeeper Guideline ...] "
                    "and [PostgreSQL Store Query] inline.\n\n"
                    f"User Question: {state['question']}\n\nVerified Context:\n{fallback_answer}"
                )
                primary_model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
                models_to_try = list(dict.fromkeys([primary_model, "gemini-3.8-flash", "gemini-3.5-flash-lite"]))
                for model_id in models_to_try:
                    try:
                        resp = client.models.generate_content(model=model_id, contents=prompt)
                        if resp and getattr(resp, "text", None):
                            state["answer"] = resp.text.strip()
                            return state
                    except Exception:
                        continue
            except Exception:
                pass

        state["answer"] = fallback_answer
        return state

    def _build_graph(self):
        builder = StateGraph(RAGState)
        builder.add_node("route", self._route_node)
        builder.add_node("retrieve_vector_graph", self._retrieve_vector_graph_node)
        builder.add_node("query_mcp_sql", self._query_mcp_sql_node)
        builder.add_node("synthesize", self._synthesize_node)

        builder.set_entry_point("route")
        builder.add_edge("route", "retrieve_vector_graph")
        builder.add_edge("retrieve_vector_graph", "query_mcp_sql")
        builder.add_edge("query_mcp_sql", "synthesize")
        builder.add_edge("synthesize", END)
        return builder.compile()

    def ask(self, question: str) -> Dict[str, Any]:
        initial: RAGState = {
            "question": question,
            "is_greeting": False,
            "store_filter": "",
            "needs_foodkeeper": False,
            "needs_fefo": False,
            "needs_reconciliation": False,
            "foodkeeper_chunks": [],
            "graph_relations": [],
            "sql_fefo_data": {},
            "sql_recon_data": {},
            "citations": [],
            "tools_used": [],
            "answer": "",
        }
        final_state = self.workflow.invoke(initial)
        return {
            "question": question,
            "answer": final_state["answer"],
            "citations": final_state["citations"],
            "mcp_tools_invoked": final_state["tools_used"],
            "knowledge_graph_hops": final_state["graph_relations"],
            "supporting_batches": final_state["sql_fefo_data"].get("batches", [])[:5],
            "supporting_guidelines": final_state["foodkeeper_chunks"],
        }


rag_engine = AskZeroSpoilEngine()