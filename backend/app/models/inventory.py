from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Category(Base):
    __tablename__ = "product_categories"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    parent_id = Column(Integer, ForeignKey('product_categories.id'), nullable=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    sku = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey('product_categories.id'), nullable=True)
    product_type = Column(String(50), default="finished")  # raw, semi, finished, service
    unit = Column(String(50), default="nos")
    hsn_code = Column(String(20))
    barcode = Column(String(100))
    image_url = Column(String(500))
    cost_price = Column(Numeric(15,2), default=0)
    selling_price = Column(Numeric(15,2), default=0)
    mrp = Column(Numeric(15,2), default=0)
    tax_percent = Column(Float, default=18)
    reorder_level = Column(Float, default=0)
    reorder_quantity = Column(Float, default=0)
    lead_time_days = Column(Integer, default=0)
    is_serialized = Column(Boolean, default=False)
    is_batch_tracked = Column(Boolean, default=False)
    weight = Column(Float)
    dimensions = Column(JSON)
    custom_fields = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    category = relationship("Category", back_populates="products")
    stock_levels = relationship("StockLevel", back_populates="product")

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    warehouse_type = Column(String(50), default="main")
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    capacity = Column(Float)
    manager_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    stock_levels = relationship("StockLevel", back_populates="warehouse")

class StockLevel(Base):
    __tablename__ = "stock_levels"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    warehouse_id = Column(Integer, ForeignKey('warehouses.id'), nullable=False)
    quantity_on_hand = Column(Float, default=0)
    quantity_reserved = Column(Float, default=0)
    quantity_available = Column(Float, default=0)
    quantity_on_order = Column(Float, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    product = relationship("Product", back_populates="stock_levels")
    warehouse = relationship("Warehouse", back_populates="stock_levels")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    movement_number = Column(String(50), unique=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    warehouse_id = Column(Integer, ForeignKey('warehouses.id'), nullable=False)
    movement_type = Column(String(50))  # in, out, transfer, adjustment
    reference_type = Column(String(50))  # purchase_order, sales_order, work_order, manual
    reference_id = Column(Integer)
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Numeric(15,2))
    total_cost = Column(Numeric(15,2))
    batch_number = Column(String(100))
    serial_number = Column(String(100))
    expiry_date = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
