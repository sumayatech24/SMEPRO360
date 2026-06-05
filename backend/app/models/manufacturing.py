from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class BOM(Base):
    __tablename__ = "boms"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    bom_number = Column(String(50), unique=True)
    name = Column(String(255), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity = Column(Float, default=1)
    unit = Column(String(50))
    version = Column(String(20), default="1.0")
    status = Column(String(50), default="active")
    routing_id = Column(Integer, nullable=True)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    items = relationship("BOMItem", back_populates="bom", cascade="all, delete-orphan")

class BOMItem(Base):
    __tablename__ = "bom_items"
    id = Column(Integer, primary_key=True)
    bom_id = Column(Integer, ForeignKey('boms.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50))
    scrap_percent = Column(Float, default=0)
    notes = Column(Text)
    bom = relationship("BOM", back_populates="items")

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    wo_number = Column(String(50), unique=True, nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    bom_id = Column(Integer, ForeignKey('boms.id'), nullable=True)
    planned_quantity = Column(Float, nullable=False)
    produced_quantity = Column(Float, default=0)
    rejected_quantity = Column(Float, default=0)
    status = Column(String(50), default="draft")  # draft, released, in_progress, completed, cancelled
    priority = Column(String(20), default="normal")
    planned_start = Column(DateTime(timezone=True))
    planned_end = Column(DateTime(timezone=True))
    actual_start = Column(DateTime(timezone=True))
    actual_end = Column(DateTime(timezone=True))
    warehouse_id = Column(Integer, ForeignKey('warehouses.id'), nullable=True)
    sales_order_id = Column(Integer, nullable=True)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    operations = relationship("WorkOrderOperation", back_populates="work_order", cascade="all, delete-orphan")

class WorkOrderOperation(Base):
    __tablename__ = "work_order_operations"
    id = Column(Integer, primary_key=True)
    work_order_id = Column(Integer, ForeignKey('work_orders.id'), nullable=False)
    operation_name = Column(String(255))
    work_center = Column(String(100))
    sequence = Column(Integer)
    planned_hours = Column(Float)
    actual_hours = Column(Float, default=0)
    status = Column(String(50), default="pending")
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)
    notes = Column(Text)
    work_order = relationship("WorkOrder", back_populates="operations")

class ProductionEntry(Base):
    __tablename__ = "production_entries"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    work_order_id = Column(Integer, ForeignKey('work_orders.id'), nullable=False)
    entry_date = Column(DateTime(timezone=True), server_default=func.now())
    quantity_produced = Column(Float, default=0)
    quantity_rejected = Column(Float, default=0)
    rejection_reason = Column(String(255))
    operator_id = Column(Integer, ForeignKey('users.id'))
    shift = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
