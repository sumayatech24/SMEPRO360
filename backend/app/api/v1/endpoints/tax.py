"""
Tax Module API — Tax Types, Slabs, HSN/SAC Codes, Order Templates
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from app.db.base import get_db
from app.models.tax import TaxType, TaxSlab, HSNCode, SalesOrderTemplate, SalesOrderTemplateItem
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class TaxTypeCreate(BaseModel):
    name: str
    code: str
    tax_category: str = "indirect"
    description: Optional[str] = None

class TaxSlabCreate(BaseModel):
    tax_type_id: int
    name: str
    rate: float
    cgst_rate: float = 0
    sgst_rate: float = 0
    igst_rate: float = 0
    cess_rate: float = 0
    is_inclusive: bool = False

class HSNCreate(BaseModel):
    code: str
    description: str
    code_type: str = "HSN"
    default_slab_id: Optional[int] = None
    chapter: Optional[str] = None

class TemplateItemIn(BaseModel):
    product_id: Optional[int] = None
    description: str
    item_type: str = "product"
    quantity: float = 1
    unit: str = "nos"
    unit_price: float = 0
    discount_percent: float = 0
    tax_slab_id: Optional[int] = None
    tax_percent: float = 18
    hsn_code: Optional[str] = None

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    items: List[TemplateItemIn] = []

# ── Tax Types ─────────────────────────────────────────────────────────────────

@router.get("/types")
async def list_tax_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    types = db.query(TaxType).filter(TaxType.is_active == True).order_by(TaxType.name).all()
    return [{"id": t.id, "name": t.name, "code": t.code, "tax_category": t.tax_category,
             "description": t.description, "slab_count": len(t.slabs)} for t in types]

@router.post("/types")
async def create_tax_type(data: TaxTypeCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    if db.query(TaxType).filter(TaxType.code == data.code).first():
        raise HTTPException(400, f"Tax type '{data.code}' already exists")
    t = TaxType(**data.dict())
    db.add(t); db.commit(); db.refresh(t)
    return {"id": t.id, "name": t.name, "code": t.code}

@router.put("/types/{type_id}")
async def update_tax_type(type_id: int, data: dict, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    t = db.query(TaxType).filter(TaxType.id == type_id).first()
    if not t: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(t, k): setattr(t, k, v)
    db.commit(); return {"id": t.id, "name": t.name}

@router.delete("/types/{type_id}")
async def delete_tax_type(type_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    t = db.query(TaxType).filter(TaxType.id == type_id).first()
    if not t: raise HTTPException(404, "Not found")
    t.is_active = False; db.commit()
    return {"message": "Deactivated"}

# ── Tax Slabs ─────────────────────────────────────────────────────────────────

@router.get("/slabs")
async def list_tax_slabs(tax_type_id: Optional[int] = None, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    q = db.query(TaxSlab).filter(TaxSlab.is_active == True)
    if tax_type_id: q = q.filter(TaxSlab.tax_type_id == tax_type_id)
    slabs = q.order_by(TaxSlab.rate).all()
    return [{"id": s.id, "name": s.name, "rate": s.rate, "tax_type_id": s.tax_type_id,
             "cgst_rate": s.cgst_rate, "sgst_rate": s.sgst_rate, "igst_rate": s.igst_rate,
             "cess_rate": s.cess_rate, "is_inclusive": s.is_inclusive,
             "tax_type_name": s.tax_type.name if s.tax_type else None} for s in slabs]

@router.post("/slabs")
async def create_tax_slab(data: TaxSlabCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    s = TaxSlab(**data.dict())
    db.add(s); db.commit(); db.refresh(s)
    return {"id": s.id, "name": s.name, "rate": s.rate}

@router.put("/slabs/{slab_id}")
async def update_tax_slab(slab_id: int, data: dict, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    s = db.query(TaxSlab).filter(TaxSlab.id == slab_id).first()
    if not s: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(s, k): setattr(s, k, v)
    db.commit(); return {"id": s.id, "name": s.name}

@router.delete("/slabs/{slab_id}")
async def delete_tax_slab(slab_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    s = db.query(TaxSlab).filter(TaxSlab.id == slab_id).first()
    if not s: raise HTTPException(404, "Not found")
    s.is_active = False; db.commit()
    return {"message": "Deactivated"}

# ── HSN/SAC Codes ─────────────────────────────────────────────────────────────

@router.get("/hsn")
async def list_hsn_codes(search: Optional[str] = None, code_type: Optional[str] = None,
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(HSNCode).filter(HSNCode.is_active == True)
    if search: q = q.filter(HSNCode.code.ilike(f"%{search}%") | HSNCode.description.ilike(f"%{search}%"))
    if code_type: q = q.filter(HSNCode.code_type == code_type)
    codes = q.order_by(HSNCode.code).limit(100).all()
    return [{"id": c.id, "code": c.code, "description": c.description, "code_type": c.code_type,
             "chapter": c.chapter, "default_slab_id": c.default_slab_id,
             "default_rate": c.default_slab.rate if c.default_slab else None} for c in codes]

@router.post("/hsn")
async def create_hsn_code(data: HSNCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    if db.query(HSNCode).filter(HSNCode.code == data.code).first():
        raise HTTPException(400, f"HSN/SAC code '{data.code}' already exists")
    c = HSNCode(**data.dict())
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "code": c.code, "description": c.description}

# ── Tax Calculator ────────────────────────────────────────────────────────────

@router.post("/calculate")
async def calculate_tax(data: dict, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    """Calculate taxes for given amount and slab"""
    amount = float(data.get("amount", 0))
    slab_id = data.get("slab_id")
    is_interstate = data.get("is_interstate", False)

    if not slab_id:
        rate = float(data.get("rate", 18))
        cgst = sgst = igst = amount * rate / 100 / 2 if not is_interstate else 0
        if is_interstate: igst = amount * rate / 100
        return {"subtotal": amount, "cgst": cgst, "sgst": sgst, "igst": igst,
                "total_tax": cgst + sgst + igst, "total": amount + cgst + sgst + igst}

    slab = db.query(TaxSlab).filter(TaxSlab.id == slab_id).first()
    if not slab: raise HTTPException(404, "Tax slab not found")

    if is_interstate:
        igst = amount * slab.igst_rate / 100 if slab.igst_rate else amount * slab.rate / 100
        cgst = sgst = 0
    else:
        cgst = amount * (slab.cgst_rate or slab.rate / 2) / 100
        sgst = amount * (slab.sgst_rate or slab.rate / 2) / 100
        igst = 0

    cess = amount * slab.cess_rate / 100
    total_tax = cgst + sgst + igst + cess
    return {
        "subtotal": amount, "cgst": round(cgst, 2), "sgst": round(sgst, 2),
        "igst": round(igst, 2), "cess": round(cess, 2),
        "total_tax": round(total_tax, 2), "total": round(amount + total_tax, 2),
        "slab": {"id": slab.id, "name": slab.name, "rate": slab.rate}
    }

# ── Order Templates ───────────────────────────────────────────────────────────

def tmpl_dict(t: SalesOrderTemplate):
    return {
        "id": t.id, "name": t.name, "description": t.description,
        "category": t.category, "payment_terms": t.payment_terms,
        "notes": t.notes, "is_active": t.is_active,
        "item_count": len(t.items),
        "items": [{"id": i.id, "product_id": i.product_id, "description": i.description,
                   "item_type": i.item_type, "quantity": i.quantity, "unit": i.unit,
                   "unit_price": float(i.unit_price or 0), "discount_percent": i.discount_percent,
                   "tax_percent": i.tax_percent, "hsn_code": i.hsn_code,
                   "tax_slab_id": i.tax_slab_id, "sort_order": i.sort_order}
                  for i in sorted(t.items, key=lambda x: x.sort_order)],
    }

@router.get("/templates")
async def list_templates(category: Optional[str] = None, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    q = db.query(SalesOrderTemplate).filter(SalesOrderTemplate.is_active == True)
    if category: q = q.filter(SalesOrderTemplate.category == category)
    return [tmpl_dict(t) for t in q.order_by(SalesOrderTemplate.name).all()]

@router.get("/templates/{tmpl_id}")
async def get_template(tmpl_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    t = db.query(SalesOrderTemplate).filter(SalesOrderTemplate.id == tmpl_id).first()
    if not t: raise HTTPException(404, "Template not found")
    return tmpl_dict(t)

@router.post("/templates")
async def create_template(data: TemplateCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    t = SalesOrderTemplate(
        name=data.name, description=data.description, category=data.category,
        payment_terms=data.payment_terms, notes=data.notes, created_by=current_user.id
    )
    for idx, item_data in enumerate(data.items):
        item = SalesOrderTemplateItem(
            **{k: v for k, v in item_data.dict().items()}, sort_order=idx
        )
        t.items.append(item)
    db.add(t); db.commit(); db.refresh(t)
    return tmpl_dict(t)

@router.put("/templates/{tmpl_id}")
async def update_template(tmpl_id: int, data: TemplateCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    t = db.query(SalesOrderTemplate).filter(SalesOrderTemplate.id == tmpl_id).first()
    if not t: raise HTTPException(404, "Template not found")
    t.name = data.name; t.description = data.description
    t.category = data.category; t.payment_terms = data.payment_terms; t.notes = data.notes
    # Replace items
    t.items = []
    for idx, item_data in enumerate(data.items):
        item = SalesOrderTemplateItem(**{k: v for k, v in item_data.dict().items()}, sort_order=idx)
        t.items.append(item)
    db.commit(); db.refresh(t)
    return tmpl_dict(t)

@router.delete("/templates/{tmpl_id}")
async def delete_template(tmpl_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    t = db.query(SalesOrderTemplate).filter(SalesOrderTemplate.id == tmpl_id).first()
    if not t: raise HTTPException(404, "Template not found")
    t.is_active = False; db.commit()
    return {"message": "Template deleted"}
