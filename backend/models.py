from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from backend.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Supermarket(Base):
    __tablename__ = "supermarkets"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    zone = Column(String(64), nullable=False)
    route_corridor = Column(String(120), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    daily_footfall_index = Column(Float, default=1.0)
    data_tag = Column(String(24), default="[SYNTHETIC]")

    batches = relationship("Batch", back_populates="supermarket")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(40), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    category = Column(String(48), nullable=False)  # Dairy, Vegetables, Fruits, Poultry, Fish, Eggs
    brand = Column(String(64), nullable=False)
    packaging = Column(String(64), nullable=False)
    unit = Column(String(24), default="kg")
    unit_price_bdt = Column(Float, nullable=False)
    shelf_life_hours = Column(Integer, nullable=False)
    optimal_temp_c = Column(String(32), nullable=False)
    foodkeeper_ref = Column(String(64), nullable=False)
    co2e_factor_per_kg = Column(Float, nullable=False)

    batches = relationship("Batch", back_populates="product")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(48), unique=True, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    received_at = Column(DateTime(timezone=True), default=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    remaining_hours = Column(Float, nullable=False)
    initial_qty_kg = Column(Float, nullable=False)
    current_qty_kg = Column(Float, nullable=False)
    ripeness_stage = Column(Integer, default=2)  # 1 (Fresh Green) to 7 (Spoiled)
    markdown_pct = Column(Integer, default=0)  # 0, 20, 30, 40
    status = Column(String(32), default="OPTIMAL")  # OPTIMAL, CAUTION, CRITICAL, MARKDOWN_ACTIVE
    data_tag = Column(String(24), default="[SYNTHETIC]")

    product = relationship("Product", back_populates="batches")
    supermarket = relationship("Supermarket", back_populates="batches")


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    delivery_code = Column(String(48), unique=True, nullable=False)
    supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    dispatched_date = Column(DateTime(timezone=True), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    truck_id = Column(String(32), nullable=False)
    driver_name = Column(String(80), nullable=False)
    route_corridor = Column(String(120), nullable=False)
    dispatch_status = Column(String(32), default="DELIVERED")  # PENDING, APPROVED, REJECTED, DELIVERED
    data_tag = Column(String(24), default="[SYNTHETIC]")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    sale_date = Column(DateTime(timezone=True), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    revenue_bdt = Column(Float, nullable=False)
    discount_applied_pct = Column(Integer, default=0)
    data_tag = Column(String(24), default="[SYNTHETIC]")


class Return(Base):
    __tablename__ = "returns"

    id = Column(Integer, primary_key=True, index=True)
    supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    return_date = Column(DateTime(timezone=True), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    reason = Column(String(120), nullable=False)
    data_tag = Column(String(24), default="[SYNTHETIC]")


class WasteRecord(Base):
    __tablename__ = "waste_records"

    id = Column(Integer, primary_key=True, index=True)
    supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    recorded_date = Column(DateTime(timezone=True), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    financial_loss_bdt = Column(Float, nullable=False)
    co2e_kg = Column(Float, nullable=False)
    cause = Column(String(120), nullable=False)
    data_tag = Column(String(24), default="[SYNTHETIC]")


class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    from_supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    to_supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    transfer_date = Column(DateTime(timezone=True), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    salvage_value_bdt = Column(Float, nullable=False)
    transit_cost_bdt = Column(Float, nullable=False)
    net_gain_bdt = Column(Float, nullable=False)
    transit_minutes = Column(Integer, nullable=False)
    status = Column(String(32), default="COMPLETED")
    data_tag = Column(String(24), default="[SYNTHETIC]")


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    policy_name = Column(String(64), unique=True, nullable=False)
    horizon_days = Column(Integer, default=30)
    total_dispatched_kg = Column(Float, nullable=False)
    measured_waste_kg = Column(Float, nullable=False)
    waste_rate_pct = Column(Float, nullable=False)
    financial_loss_bdt = Column(Float, nullable=False)
    carbon_footprint_tonnes = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class ActionProposal(Base):
    """Human-in-the-Loop (M-09) approval queue for AI agent recommendations."""
    __tablename__ = "action_proposals"

    id = Column(Integer, primary_key=True, index=True)
    proposal_code = Column(String(48), unique=True, nullable=False)
    agent_name = Column(String(64), nullable=False)  # Forecast Agent, Pricing Agent, Rebalance Agent
    action_type = Column(String(40), nullable=False)  # DISPATCH, MARKDOWN, TRANSFER
    supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    target_supermarket_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_code = Column(String(48), nullable=True)
    recommended_qty_kg = Column(Float, default=0.0)
    discount_pct = Column(Integer, default=0)
    projected_savings_bdt = Column(Float, default=0.0)
    projected_waste_avoided_kg = Column(Float, default=0.0)
    truck_id = Column(String(32), nullable=True)
    driver_name = Column(String(80), nullable=True)
    route_corridor = Column(String(120), nullable=True)
    explanation = Column(Text, nullable=False)
    constraints_checked = Column(Text, nullable=False)
    status = Column(String(24), default="PENDING")  # PENDING, APPROVED, REJECTED
    decided_by = Column(String(80), nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    data_tag = Column(String(24), default="[SYNTHETIC]")


class AgentAuditLog(Base):
    """Chronological multi-agent coordination and MCP tool invocation trace."""
    __tablename__ = "agent_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)
    agent_name = Column(String(64), nullable=False)
    event_type = Column(String(48), nullable=False)
    summary = Column(Text, nullable=False)
    citation = Column(String(120), nullable=True)