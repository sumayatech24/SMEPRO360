"""
Resource Management & Allocation Models
- Resource: People (employees) and Items allocated to projects
- ItemAllocation: Track consumable vs reusable items
- StockReturn: Return reusable items back to inventory
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Numeric, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class AllocationStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    issued = "issued"
    partially_returned = "partially_returned"
    fully_returned = "fully_returned"
    lost = "lost"


class ResourceAllocation(Base):
    """Allocate employees (people) to projects"""
    __tablename__ = "resource_allocations"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    role            = Column(String(100))               # e.g. "Lead Developer", "QA Engineer"
    allocation_percent = Column(Float, default=100)     # % of time allocated
    start_date      = Column(DateTime(timezone=True))
    end_date        = Column(DateTime(timezone=True))
    hourly_rate     = Column(Numeric(10,2), default=0)
    status          = Column(String(50), default="active")  # active | completed | on_hold
    notes           = Column(Text)
    allocated_by    = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ItemAllocation(Base):
    """Allocate inventory items to projects or employees"""
    __tablename__ = "item_allocations"
    id              = Column(Integer, primary_key=True, index=True)
    allocation_number = Column(String(50), unique=True)
    product_id      = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id    = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    # Allocate to project OR employee (or both)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=True)
    # Item type
    item_type       = Column(String(20), default="consumable")  # consumable | reusable
    quantity_allocated = Column(Float, nullable=False)
    quantity_returned  = Column(Float, default=0)
    quantity_consumed  = Column(Float, default=0)
    unit            = Column(String(50), default="pcs")
    # Dates
    allocation_date = Column(DateTime(timezone=True), server_default=func.now())
    expected_return_date = Column(DateTime(timezone=True), nullable=True)
    actual_return_date   = Column(DateTime(timezone=True), nullable=True)
    # Status
    status          = Column(String(50), default="issued")  # requested|approved|issued|partially_returned|fully_returned|lost
    purpose         = Column(Text)
    notes           = Column(Text)
    condition_out   = Column(String(50), default="good")    # condition when issued
    condition_in    = Column(String(50), nullable=True)     # condition when returned
    # Cost tracking
    unit_cost       = Column(Numeric(15,2), default=0)
    total_cost      = Column(Numeric(15,2), default=0)
    # Audit
    issued_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    # Relationships
    returns         = relationship("StockReturn", back_populates="allocation", cascade="all, delete-orphan")


class StockReturn(Base):
    """Track return of reusable items back to inventory"""
    __tablename__ = "stock_returns"
    id              = Column(Integer, primary_key=True, index=True)
    return_number   = Column(String(50), unique=True)
    allocation_id   = Column(Integer, ForeignKey("item_allocations.id"), nullable=False)
    product_id      = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id    = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    quantity_returned = Column(Float, nullable=False)
    condition       = Column(String(50), default="good")   # good | damaged | lost
    return_date     = Column(DateTime(timezone=True), server_default=func.now())
    notes           = Column(Text)
    received_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    allocation      = relationship("ItemAllocation", back_populates="returns")


class StockAlert(Base):
    """Configurable stock alerts per product/warehouse"""
    __tablename__ = "stock_alerts"
    id              = Column(Integer, primary_key=True, index=True)
    product_id      = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id    = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    alert_type      = Column(String(50), default="low_stock")  # low_stock | out_of_stock | overstock | expiry
    threshold       = Column(Float, default=0)   # trigger when quantity <= threshold
    is_active       = Column(Boolean, default=True)
    last_triggered  = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
