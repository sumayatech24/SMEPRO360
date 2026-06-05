from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    domain = Column(String(255), unique=True, nullable=True)
    logo_url = Column(String(500))
    primary_color = Column(String(20), default="#6366f1")
    secondary_color = Column(String(20), default="#8b5cf6")
    gstin = Column(String(20))
    pan = Column(String(15))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="India")
    pincode = Column(String(10))
    phone = Column(String(20))
    email = Column(String(255))
    currency = Column(String(10), default="INR")
    fiscal_year_start = Column(String(10), default="04-01")
    plan = Column(String(50), default="starter")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    settings = Column(JSON, default={})
    users = relationship("User", back_populates="tenant")
    branches = relationship("Branch", back_populates="tenant")

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(20))
    gstin = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    phone = Column(String(20))
    email = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_head_office = Column(Boolean, default=False)
    parent_branch_id = Column(Integer, ForeignKey('branches.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tenant = relationship("Tenant", back_populates="branches")
