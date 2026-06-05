"""
Tax Module Models
- TaxType: GST, TDS, TCS, VAT, Service Tax
- TaxSlab: 0%, 5%, 12%, 18%, 28%
- HSN/SAC codes
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class TaxType(Base):
    """Tax category: GST, TDS, TCS, etc."""
    __tablename__ = "tax_types"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False, unique=True)   # e.g. "GST", "TDS"
    code        = Column(String(20), nullable=False, unique=True)    # e.g. "GST", "TDS_194C"
    tax_category= Column(String(50), default="indirect")            # indirect | direct | withholding
    description = Column(Text)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    slabs       = relationship("TaxSlab", back_populates="tax_type", cascade="all, delete-orphan")


class TaxSlab(Base):
    """Tax rate slabs under a tax type"""
    __tablename__ = "tax_slabs"
    id           = Column(Integer, primary_key=True, index=True)
    tax_type_id  = Column(Integer, ForeignKey("tax_types.id"), nullable=False)
    name         = Column(String(100), nullable=False)   # e.g. "GST 18%"
    rate         = Column(Float, nullable=False)         # e.g. 18.0
    # For GST: component rates
    cgst_rate    = Column(Float, default=0)
    sgst_rate    = Column(Float, default=0)
    igst_rate    = Column(Float, default=0)
    cess_rate    = Column(Float, default=0)
    is_inclusive = Column(Boolean, default=False)        # tax included in price?
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    tax_type     = relationship("TaxType", back_populates="slabs")
    hsn_codes    = relationship("HSNCode", back_populates="default_slab")


class HSNCode(Base):
    """HSN (Goods) and SAC (Services) codes with default tax slab"""
    __tablename__ = "hsn_codes"
    id            = Column(Integer, primary_key=True, index=True)
    code          = Column(String(20), nullable=False, unique=True)
    description   = Column(String(500))
    code_type     = Column(String(10), default="HSN")    # HSN | SAC
    default_slab_id = Column(Integer, ForeignKey("tax_slabs.id"), nullable=True)
    chapter       = Column(String(10))                   # 2-digit chapter code
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    default_slab  = relationship("TaxSlab", back_populates="hsn_codes")


class SalesOrderTemplate(Base):
    """Reusable sales order templates"""
    __tablename__ = "sales_order_templates"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(200), nullable=False)
    description = Column(Text)
    category    = Column(String(100))        # e.g. "IT Services", "Hardware Supply"
    payment_terms = Column(String(100))
    notes       = Column(Text)
    is_active   = Column(Boolean, default=True)
    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    items       = relationship("SalesOrderTemplateItem", back_populates="template", cascade="all, delete-orphan")


class SalesOrderTemplateItem(Base):
    """Line items in a template"""
    __tablename__ = "sales_order_template_items"
    id           = Column(Integer, primary_key=True, index=True)
    template_id  = Column(Integer, ForeignKey("sales_order_templates.id"), nullable=False)
    product_id   = Column(Integer, ForeignKey("products.id"), nullable=True)
    description  = Column(String(500), nullable=False)
    item_type    = Column(String(20), default="product")  # product | service | expense
    quantity     = Column(Float, default=1)
    unit         = Column(String(50), default="nos")
    unit_price   = Column(Numeric(15,2), default=0)
    discount_percent = Column(Float, default=0)
    tax_slab_id  = Column(Integer, ForeignKey("tax_slabs.id"), nullable=True)
    tax_percent  = Column(Float, default=18)
    hsn_code     = Column(String(20))
    sort_order   = Column(Integer, default=0)
    template     = relationship("SalesOrderTemplate", back_populates="items")
