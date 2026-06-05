from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.base import get_db
from app.models.tenant import Tenant, Branch
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

class TenantCreate(BaseModel):
    name: str
    slug: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    currency: str = "INR"

@router.get("/")
async def list_tenants(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(403, "Forbidden")
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    return [{"id": t.id, "name": t.name, "slug": t.slug, "email": t.email, "plan": t.plan, "is_active": t.is_active} for t in tenants]

@router.post("/")
async def create_tenant(data: TenantCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser: raise HTTPException(403, "Forbidden")
    t = Tenant(**data.dict())
    db.add(t); db.commit(); db.refresh(t)
    return {"id": t.id, "name": t.name, "slug": t.slug}

@router.get("/{tenant_id}")
async def get_tenant(tenant_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t: raise HTTPException(404, "Not found")
    return {"id": t.id, "name": t.name, "slug": t.slug, "email": t.email, "phone": t.phone,
            "gstin": t.gstin, "city": t.city, "state": t.state, "currency": t.currency, "plan": t.plan}

# ─── Branches ─────────────────────────────────────────────────────────────────

@router.get("/branches/list")
async def list_branches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    branches = db.query(Branch).filter(Branch.is_active == True)
    if current_user.tenant_id:
        branches = branches.filter(Branch.tenant_id == current_user.tenant_id)
    return [{"id": b.id, "name": b.name, "code": b.code, "city": b.city, "is_head_office": b.is_head_office} for b in branches.all()]

@router.post("/branches")
async def create_branch(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    b = Branch(tenant_id=current_user.tenant_id or data.get("tenant_id"), **{k: v for k, v in data.items() if hasattr(Branch, k) and k != "tenant_id"})
    if current_user.tenant_id: b.tenant_id = current_user.tenant_id
    db.add(b); db.commit(); db.refresh(b)
    return {"id": b.id, "name": b.name}
