"""
Multi-tenant Client Onboarding API
Each client gets their own tenant with:
- Unique client ID
- Logo, company profile
- Isolated data
- Custom tax registrations per country
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import secrets, string

from app.db.base import get_db
from app.models.tenant import Tenant, Branch
from app.models.user import User
from app.models.company import CompanyProfile
from app.core.security import get_password_hash
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

def generate_client_id() -> str:
    """Generate unique 8-char alphanumeric client ID"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

class ClientCreate(BaseModel):
    # Client company
    company_name: str
    trade_name: Optional[str] = None
    company_type: Optional[str] = None
    industry: Optional[str] = None
    country: str = "India"
    country_code: str = "IN"
    # Address
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    # Contact
    phone: Optional[str] = None
    email: str
    website: Optional[str] = None
    # Tax
    tax_registrations: dict = {}
    currency: str = "INR"
    # Logo
    logo_url: Optional[str] = None
    brand_color: str = "#6366f1"
    # Admin user
    admin_name: str
    admin_email: str
    admin_password: str
    # Plan
    plan: str = "professional"

def client_dict(t: Tenant, cp: Optional[CompanyProfile] = None):
    return {
        "id": t.id, "client_id": getattr(t, 'client_id', None) or t.slug.upper(),
        "name": t.name, "slug": t.slug,
        "email": t.email, "phone": getattr(t,'phone',None),
        "country": t.country, "currency": t.currency,
        "plan": t.plan, "status": "active" if t.is_active else "suspended",
        "logo_url": cp.logo_url if cp else None,
        "brand_color": cp.brand_color if cp else "#6366f1",
        "tax_registrations": cp.tax_registrations if cp else {},
        "address": f"{cp.city}, {cp.state}, {cp.country}" if cp and cp.city else "",
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }

# ── List Clients ──────────────────────────────────────────────────────────────

@router.get("/")
async def list_clients(search: Optional[str] = None, plan: Optional[str] = None,
                        skip: int = 0, limit: int = 50,
                        db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(403, "Only super admins can list clients")
    q = db.query(Tenant)
    if search: q = q.filter(Tenant.name.ilike(f"%{search}%") | Tenant.email.ilike(f"%{search}%"))
    if plan: q = q.filter(Tenant.plan == plan)
    total = q.count()
    tenants = q.order_by(Tenant.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for t in tenants:
        cp = db.query(CompanyProfile).filter(CompanyProfile.tenant_id == t.id).first()
        result.append(client_dict(t, cp))
    return {"total": total, "items": result}

# ── Get Client ────────────────────────────────────────────────────────────────

@router.get("/{client_id}")
async def get_client(client_id: str, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    t = db.query(Tenant).filter(
        (Tenant.slug == client_id.lower()) | (Tenant.id == int(client_id) if client_id.isdigit() else 0)
    ).first()
    if not t: raise HTTPException(404, "Client not found")
    cp = db.query(CompanyProfile).filter(CompanyProfile.tenant_id == t.id).first()
    # Get user count
    user_count = db.query(func.count(User.id)).filter(User.tenant_id == t.id).scalar()
    d = client_dict(t, cp)
    d["user_count"] = user_count
    if cp:
        d["full_profile"] = {k: getattr(cp, k) for k in [
            "legal_name","trade_name","company_type","industry","address_line1","address_line2",
            "city","state","postal_code","country","country_code","phone","email","website",
            "logo_url","brand_color","tax_registrations","bank_name","bank_account","bank_ifsc",
            "swift_code","invoice_footer","terms_conditions","default_payment_terms","currency","currency_symbol"
        ] if hasattr(cp, k)}
    return d

# ── Onboard New Client ────────────────────────────────────────────────────────

@router.post("/onboard")
async def onboard_client(data: ClientCreate, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    """Onboard a new client tenant with admin user"""
    if not current_user.is_superuser:
        raise HTTPException(403, "Only super admins can onboard clients")

    # Check email uniqueness
    if db.query(User).filter(User.email == data.admin_email).first():
        raise HTTPException(400, f"Admin email '{data.admin_email}' already exists")

    # Generate unique slug and client ID
    slug = data.trade_name or data.company_name
    slug = ''.join(c.lower() if c.isalnum() else '-' for c in slug)[:30].strip('-')
    base_slug = slug
    counter = 1
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base_slug}-{counter}"; counter += 1

    client_id = generate_client_id()
    while db.query(Tenant).filter(Tenant.slug == client_id.lower()).first():
        client_id = generate_client_id()

    # Create Tenant
    tenant = Tenant(
        name=data.company_name, slug=slug,
        email=data.email, phone=data.phone,
        country=data.country, currency=data.currency,
        plan=data.plan, is_active=True,
    )
    db.add(tenant); db.flush()
    # Store client_id via raw SQL since column may not be in model
    from sqlalchemy import text
    try:
        db.execute(text(f"UPDATE tenants SET client_id = '{client_id}' WHERE id = {tenant.id}"))
    except Exception:
        pass

    # Create Admin User for this tenant
    admin_user = User(
        email=data.admin_email,
        username=data.admin_email.split('@')[0],
        full_name=data.admin_name,
        hashed_password=get_password_hash(data.admin_password),
        is_superuser=False, is_active=True,
        tenant_id=tenant.id,
    )
    db.add(admin_user)

    # Create Company Profile
    cp = CompanyProfile(
        tenant_id=tenant.id,
        legal_name=data.company_name,
        trade_name=data.trade_name,
        company_type=data.company_type,
        industry=data.industry,
        country=data.country, country_code=data.country_code,
        address_line1=data.address_line1, city=data.city,
        state=data.state, postal_code=data.postal_code,
        phone=data.phone, email=data.email, website=data.website,
        tax_registrations=data.tax_registrations,
        currency=data.currency,
        logo_url=data.logo_url,
        brand_color=data.brand_color,
    )
    db.add(cp)

    # Create Head Office branch
    db.add(Branch(tenant_id=tenant.id, name="Head Office", code="HO",
                   is_head_office=True, city=data.city, state=data.state))

    db.commit()
    return {
        "message": "Client onboarded successfully",
        "client_id": client_id,
        "tenant_id": tenant.id,
        "slug": slug,
        "admin_email": data.admin_email,
        "login_url": f"/login?tenant={slug}",
    }

# ── Update Client ─────────────────────────────────────────────────────────────

@router.put("/{tenant_id}")
async def update_client(tenant_id: int, data: dict, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser and current_user.tenant_id != tenant_id:
        raise HTTPException(403, "Access denied")
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t: raise HTTPException(404, "Client not found")
    for k, v in data.items():
        if hasattr(t, k): setattr(t, k, v)
    cp = db.query(CompanyProfile).filter(CompanyProfile.tenant_id == tenant_id).first()
    if cp:
        for k, v in data.items():
            if hasattr(cp, k): setattr(cp, k, v)
    db.commit()
    return {"message": "Client updated", "tenant_id": tenant_id}

# ── Suspend / Activate Client ─────────────────────────────────────────────────

@router.put("/{tenant_id}/suspend")
async def suspend_client(tenant_id: int, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser: raise HTTPException(403, "Super admin only")
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t: raise HTTPException(404, "Not found")
    t.is_active = False; db.commit()
    return {"message": "Client suspended", "tenant_id": tenant_id}

@router.put("/{tenant_id}/activate")
async def activate_client(tenant_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser: raise HTTPException(403, "Super admin only")
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t: raise HTTPException(404, "Not found")
    t.is_active = True; db.commit()
    return {"message": "Client activated"}

# ── Client Stats ──────────────────────────────────────────────────────────────

@router.get("/stats/overview")
async def client_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.is_superuser: raise HTTPException(403, "Super admin only")
    total = db.query(func.count(Tenant.id)).scalar()
    active = db.query(func.count(Tenant.id)).filter(Tenant.is_active == True).scalar()
    by_plan = dict(db.query(Tenant.plan, func.count(Tenant.id)).group_by(Tenant.plan).all())
    by_country = dict(db.query(Tenant.country, func.count(Tenant.id)).group_by(Tenant.country).all())
    return {"total_clients": total, "active_clients": active, "by_plan": by_plan, "by_country": by_country}
