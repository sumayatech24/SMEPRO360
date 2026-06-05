from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class QualityParameter(Base):
    __tablename__ = "quality_parameters"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    parameter_type = Column(String(50))  # numeric, boolean, text
    unit = Column(String(50))
    min_value = Column(Float)
    max_value = Column(Float)
    target_value = Column(Float)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    is_critical = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class QualityCheck(Base):
    __tablename__ = "quality_checks"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    check_number = Column(String(50), unique=True)
    check_type = Column(String(50))  # incoming, in_process, outgoing
    reference_type = Column(String(50))  # purchase_order, work_order, sales_order
    reference_id = Column(Integer)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    batch_number = Column(String(100))
    quantity_checked = Column(Float)
    quantity_passed = Column(Float)
    quantity_failed = Column(Float)
    status = Column(String(50), default="pending")  # pending, in_progress, passed, failed, conditional
    inspector_id = Column(Integer, ForeignKey('users.id'))
    check_date = Column(DateTime(timezone=True))
    notes = Column(Text)
    results = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class NonConformance(Base):
    __tablename__ = "non_conformances"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    nc_number = Column(String(50), unique=True)
    quality_check_id = Column(Integer, ForeignKey('quality_checks.id'), nullable=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    defect_type = Column(String(100))
    severity = Column(String(50))  # minor, major, critical
    description = Column(Text)
    root_cause = Column(Text)
    corrective_action = Column(Text)
    preventive_action = Column(Text)
    status = Column(String(50), default="open")
    raised_by = Column(Integer, ForeignKey('users.id'))
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)
    target_closure_date = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
