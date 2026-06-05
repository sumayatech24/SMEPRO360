from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    asset_number = Column(String(50), unique=True)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(100))
    category = Column(String(100))
    make = Column(String(100))
    model = Column(String(100))
    serial_number = Column(String(100))
    purchase_date = Column(Date)
    purchase_price = Column(Numeric(15,2))
    vendor_id = Column(Integer, ForeignKey('vendors.id'), nullable=True)
    warranty_expiry = Column(Date)
    location = Column(String(255))
    assigned_to = Column(Integer, ForeignKey('employees.id'), nullable=True)
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    condition = Column(String(50), default="good")
    status = Column(String(50), default="active")
    depreciation_method = Column(String(50), default="straight_line")
    useful_life_years = Column(Integer)
    salvage_value = Column(Numeric(15,2), default=0)
    book_value = Column(Numeric(15,2))
    image_url = Column(String(500))
    barcode = Column(String(100))
    qr_code = Column(String(500))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    maintenances = relationship("AssetMaintenance", back_populates="asset")
    depreciations = relationship("AssetDepreciation", back_populates="asset")

class AssetMaintenance(Base):
    __tablename__ = "asset_maintenances"
    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey('assets.id'), nullable=False)
    maintenance_type = Column(String(50))  # preventive, corrective, emergency
    scheduled_date = Column(Date)
    completed_date = Column(Date)
    cost = Column(Numeric(15,2))
    vendor_id = Column(Integer, ForeignKey('vendors.id'), nullable=True)
    technician = Column(String(100))
    description = Column(Text)
    next_maintenance_date = Column(Date)
    status = Column(String(50), default="scheduled")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    asset = relationship("Asset", back_populates="maintenances")

class AssetDepreciation(Base):
    __tablename__ = "asset_depreciations"
    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey('assets.id'), nullable=False)
    period = Column(String(20))
    depreciation_amount = Column(Numeric(15,2))
    accumulated_depreciation = Column(Numeric(15,2))
    book_value = Column(Numeric(15,2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    asset = relationship("Asset", back_populates="depreciations")
