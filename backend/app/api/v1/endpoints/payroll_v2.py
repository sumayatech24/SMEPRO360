"""
Global Payroll API v2
- Country-agnostic salary structures
- India: PF, ESI, PT, TDS, Form 16
- Payslip generation
- Company profile with tax registrations
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date
import json

from app.db.base import get_db
from app.models.company import (
    CompanyProfile, SalaryStructure, EmployeeSalaryDetail,
    PayrollRun, Payslip, Form16
)
from app.models.hr import Employee
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# ── India Tax Slabs (FY 2025-26, New Regime) ──────────────────────────────────
INDIA_NEW_REGIME_SLABS = [
    (0,        300000,  0.00),
    (300001,   700000,  0.05),
    (700001,   1000000, 0.10),
    (1000001,  1200000, 0.15),
    (1200001,  1500000, 0.20),
    (1500001,  float('inf'), 0.30),
]

INDIA_OLD_REGIME_SLABS = [
    (0,        250000,  0.00),
    (250001,   500000,  0.05),
    (500001,   1000000, 0.20),
    (1000001,  float('inf'), 0.30),
]

def calc_india_tax(taxable_income: float, regime: str = "new") -> dict:
    """Calculate Indian income tax"""
    slabs = INDIA_NEW_REGIME_SLABS if regime == "new" else INDIA_OLD_REGIME_SLABS
    tax = 0.0
    breakdown = []
    for lo, hi, rate in slabs:
        if taxable_income <= lo: break
        slab_income = min(taxable_income, hi) - lo
        slab_tax = slab_income * rate
        tax += slab_tax
        if slab_tax > 0:
            breakdown.append({"slab": f"₹{lo:,}-{hi:,}", "rate": f"{int(rate*100)}%", "tax": round(slab_tax, 2)})
    # Rebate u/s 87A (new regime: income ≤ 7L → full rebate)
    rebate = 0.0
    if regime == "new" and taxable_income <= 700000:
        rebate = min(tax, 25000)
    elif regime == "old" and taxable_income <= 500000:
        rebate = min(tax, 12500)
    tax = max(0, tax - rebate)
    # Surcharge
    surcharge = 0.0
    if taxable_income > 5000000: surcharge = tax * 0.10
    if taxable_income > 10000000: surcharge = tax * 0.15
    if taxable_income > 20000000: surcharge = tax * 0.25
    if taxable_income > 50000000: surcharge = tax * 0.37
    # Health & Education Cess 4%
    cess = (tax + surcharge) * 0.04
    total = round(tax + surcharge + cess, 2)
    monthly = round(total / 12, 2)
    return {
        "taxable_income": round(taxable_income, 2),
        "tax_before_rebate": round(tax + rebate, 2),
        "rebate_87a": round(rebate, 2),
        "income_tax": round(tax, 2),
        "surcharge": round(surcharge, 2),
        "cess_4pct": round(cess, 2),
        "total_annual_tax": total,
        "monthly_tds": monthly,
        "regime": regime,
        "breakdown": breakdown,
    }

def calc_professional_tax_india(monthly_gross: float, state: str = "Maharashtra") -> float:
    """State-wise professional tax"""
    # Maharashtra
    if state in ["Maharashtra", "MH"]:
        if monthly_gross <= 7500: return 0
        elif monthly_gross <= 10000: return 175
        else: return 200
    # Karnataka
    elif state in ["Karnataka", "KA"]:
        if monthly_gross <= 15000: return 0
        elif monthly_gross <= 25000: return 150
        else: return 200
    # West Bengal
    elif state in ["West Bengal", "WB"]:
        if monthly_gross <= 8500: return 0
        elif monthly_gross <= 10000: return 90
        elif monthly_gross <= 15000: return 110
        elif monthly_gross <= 25000: return 130
        elif monthly_gross <= 40000: return 150
        else: return 200
    # Andhra Pradesh / Telangana
    elif state in ["Andhra Pradesh", "Telangana", "AP", "TS"]:
        if monthly_gross <= 15000: return 0
        elif monthly_gross <= 20000: return 150
        else: return 200
    # Tamil Nadu
    elif state in ["Tamil Nadu", "TN"]:
        if monthly_gross <= 21000: return 0
        else: return 208.33
    else:
        return 0  # States without PT

# ─────────────────────────────────────────────────────────────────────────────
# COMPANY PROFILE
# ─────────────────────────────────────────────────────────────────────────────

class CompanyProfileIn(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    company_type: Optional[str] = None
    industry: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "India"
    country_code: str = "IN"
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    brand_color: str = "#6366f1"
    currency: str = "INR"
    currency_symbol: str = "₹"
    locale: str = "en-IN"
    timezone: str = "Asia/Kolkata"
    date_format: str = "DD/MM/YYYY"
    fiscal_year_start: str = "04-01"
    tax_registrations: dict = {}
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    swift_code: Optional[str] = None
    invoice_prefix: str = "INV"
    po_prefix: str = "PO"
    so_prefix: str = "SO"
    invoice_footer: Optional[str] = None
    terms_conditions: Optional[str] = None
    default_payment_terms: str = "30 days"

def cp_dict(c: CompanyProfile):
    return {k: getattr(c, k) for k in [
        "id","tenant_id","legal_name","trade_name","company_type","industry",
        "address_line1","address_line2","city","state","postal_code","country","country_code",
        "phone","email","website","logo_url","brand_color","currency","currency_symbol",
        "locale","timezone","date_format","fiscal_year_start","tax_registrations",
        "bank_name","bank_account","bank_ifsc","bank_branch","swift_code","iban",
        "invoice_prefix","po_prefix","so_prefix","quotation_prefix",
        "invoice_footer","terms_conditions","default_payment_terms","is_active",
        "founded_year","fax",
    ] if hasattr(c, k)}

@router.get("/company-profile")
async def get_company_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cp = db.query(CompanyProfile).filter(CompanyProfile.tenant_id == current_user.tenant_id).first()
    if not cp:
        return {"message": "No company profile. Please set it up.", "configured": False}
    return {**cp_dict(cp), "configured": True}

@router.post("/company-profile")
async def create_or_update_company_profile(data: CompanyProfileIn, db: Session = Depends(get_db),
                                            current_user: User = Depends(get_current_user)):
    cp = db.query(CompanyProfile).filter(CompanyProfile.tenant_id == current_user.tenant_id).first()
    if cp:
        for k, v in data.dict().items():
            if hasattr(cp, k): setattr(cp, k, v)
    else:
        cp = CompanyProfile(tenant_id=current_user.tenant_id, **data.dict())
        db.add(cp)
    db.commit(); db.refresh(cp)
    return cp_dict(cp)

# ─────────────────────────────────────────────────────────────────────────────
# SALARY STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/salary-structures")
async def list_structures(country: Optional[str] = None, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    q = db.query(SalaryStructure).filter(SalaryStructure.is_active == True)
    if country: q = q.filter(SalaryStructure.country == country)
    return [{"id": s.id, "name": s.name, "country": s.country, "currency": s.currency,
             "is_default": s.is_default, "earnings_count": len(s.earnings or []),
             "deductions_count": len(s.deductions or [])} for s in q.all()]

@router.get("/salary-structures/{sid}")
async def get_structure(sid: int, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    s = db.query(SalaryStructure).filter(SalaryStructure.id == sid).first()
    if not s: raise HTTPException(404, "Not found")
    return {"id": s.id, "name": s.name, "country": s.country, "currency": s.currency,
            "earnings": s.earnings, "deductions": s.deductions,
            "employer_contributions": s.employer_contributions, "tax_config": s.tax_config,
            "is_default": s.is_default}

@router.post("/salary-structures")
async def create_structure(data: dict, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    s = SalaryStructure(name=data.get("name"), country=data.get("country","India"),
                         currency=data.get("currency","INR"), earnings=data.get("earnings",[]),
                         deductions=data.get("deductions",[]),
                         employer_contributions=data.get("employer_contributions",[]),
                         tax_config=data.get("tax_config",{}), is_default=data.get("is_default",False))
    db.add(s); db.commit(); db.refresh(s)
    return {"id": s.id, "name": s.name}

@router.put("/salary-structures/{sid}")
async def update_structure(sid: int, data: dict, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    s = db.query(SalaryStructure).filter(SalaryStructure.id == sid).first()
    if not s: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(s, k): setattr(s, k, v)
    db.commit(); return {"id": s.id, "name": s.name}

# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE SALARY DETAILS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/employee-salary/{emp_id}")
async def get_employee_salary(emp_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    sd = db.query(EmployeeSalaryDetail).filter(EmployeeSalaryDetail.employee_id == emp_id).first()
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp: raise HTTPException(404, "Employee not found")
    if not sd:
        return {"employee_id": emp_id, "configured": False,
                "basic_salary": float(emp.basic_salary or 0),
                "hra": float(emp.hra or 0),
                "other_allowances": float(emp.other_allowances or 0)}
    return {"id": sd.id, "employee_id": sd.employee_id, "structure_id": sd.structure_id,
            "ctc_annual": float(sd.ctc_annual or 0), "ctc_monthly": float(sd.ctc_monthly or 0),
            "component_values": sd.component_values, "pf_account": sd.pf_account,
            "uan_number": sd.uan_number, "esi_number": sd.esi_number,
            "pan_number": sd.pan_number, "tax_regime": sd.tax_regime, "configured": True}

@router.post("/employee-salary/{emp_id}")
async def set_employee_salary(emp_id: int, data: dict, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    sd = db.query(EmployeeSalaryDetail).filter(EmployeeSalaryDetail.employee_id == emp_id).first()
    if sd:
        for k, v in data.items():
            if hasattr(sd, k): setattr(sd, k, v)
    else:
        sd = EmployeeSalaryDetail(employee_id=emp_id, **{k:v for k,v in data.items() if hasattr(EmployeeSalaryDetail,k)})
        db.add(sd)
    # Also update employee basic fields
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if emp and data.get("component_values"):
        cv = data["component_values"]
        if "BASIC" in cv: emp.basic_salary = cv["BASIC"]
        if "HRA" in cv: emp.hra = cv["HRA"]
    db.commit(); db.refresh(sd)
    return {"id": sd.id, "employee_id": sd.employee_id}

# ─────────────────────────────────────────────────────────────────────────────
# PAYROLL RUN & PAYSLIP GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def compute_payslip(emp: Employee, sd: Optional[EmployeeSalaryDetail],
                    struct: Optional[SalaryStructure], month: int, year: int,
                    lop_days: float = 0, total_days: int = 26) -> dict:
    """Compute payslip for one employee"""
    paid_days = max(0, total_days - lop_days)
    ratio = paid_days / total_days if total_days > 0 else 1

    # Build earnings
    earnings = {}
    if struct and struct.earnings:
        for comp in struct.earnings:
            code = comp.get("code", "")
            calc = comp.get("calc_type", "fixed")
            val  = float(comp.get("value", 0))
            # Get override if exists
            override = (sd.component_values or {}).get(code) if sd else None
            if override is not None:
                amount = float(override)
            elif calc == "fixed":
                amount = val
            elif calc == "percent_basic":
                basic = float((sd.component_values or {}).get("BASIC", emp.basic_salary or 0)) if sd else float(emp.basic_salary or 0)
                amount = basic * val / 100
            elif calc == "percent_gross":
                amount = 0  # will recalc after gross
            else:
                amount = val
            earnings[code] = round(amount * ratio, 2)
    else:
        # Fallback to employee basic fields
        basic = float(emp.basic_salary or 0)
        hra   = float(getattr(emp, "hra", 0) or basic * 0.4)
        other = float(getattr(emp, "other_allowances", 0) or 0)
        earnings = {"BASIC": round(basic * ratio, 2),
                    "HRA":   round(hra * ratio, 2),
                    "SPECIAL_ALLOWANCE": round(other * ratio, 2)}

    gross = round(sum(earnings.values()), 2)

    # Recalc percent_gross components
    if struct and struct.earnings:
        for comp in struct.earnings:
            if comp.get("calc_type") == "percent_gross":
                code = comp["code"]
                earnings[code] = round(gross * float(comp["value"]) / 100 * ratio, 2)
        gross = round(sum(earnings.values()), 2)

    # Deductions
    deductions = {}
    employer_pf = 0.0; employer_esi = 0.0
    basic = earnings.get("BASIC", gross * 0.5)

    if struct and struct.deductions:
        for d in struct.deductions:
            code = d.get("code","")
            calc = d.get("calc_type","fixed")
            val  = float(d.get("value", 0))
            limit_salary = d.get("limit_salary", 0)
            if limit_salary and gross > limit_salary:
                deductions[code] = 0
                continue
            if calc == "percent_basic":
                amount = basic * val / 100
            elif calc == "percent_gross":
                amount = gross * val / 100
            elif calc == "fixed":
                amount = val
            else:
                amount = val
            deductions[code] = round(amount * ratio, 2)
            # Employer PF
            if "PF" in code.upper() and d.get("employer_contrib"):
                employer_pf = round(basic * float(d["employer_contrib"]) / 100 * ratio, 2)
    else:
        # India defaults
        if gross <= 15000:
            deductions["PF_EMP"] = round(min(basic, 15000) * 0.12 * ratio, 2)
            employer_pf = deductions["PF_EMP"]
        if gross <= 21000:
            deductions["ESI_EMP"] = round(gross * 0.0075 * ratio, 2)
            employer_esi = round(gross * 0.0325 * ratio, 2)

    # Professional Tax (India)
    state = getattr(emp, "state", "Maharashtra") or "Maharashtra"
    pt = calc_professional_tax_india(gross, state)
    if pt > 0:
        deductions["PROFESSIONAL_TAX"] = round(pt, 2)

    total_deductions_before_tax = round(sum(deductions.values()), 2)

    # TDS / Income Tax
    # Annualize gross, subtract standard deduction & 80C
    annual_gross = gross * 12
    std_deduction = 50000  # India new regime
    pf_annual = (deductions.get("PF_EMP", 0)) * 12
    taxable = max(0, annual_gross - std_deduction - pf_annual)
    regime = (sd.tax_regime if sd else "new") or "new"
    tax_info = calc_india_tax(taxable, regime)
    monthly_tds = tax_info["monthly_tds"]
    deductions["TDS"] = round(monthly_tds * ratio, 2)

    total_deductions = round(sum(deductions.values()), 2)
    net = round(gross - total_deductions, 2)

    return {
        "earnings": earnings, "gross_salary": gross,
        "deductions": deductions, "total_deductions": total_deductions,
        "tax_deducted": round(monthly_tds * ratio, 2),
        "professional_tax": round(pt * ratio, 2),
        "net_salary": net, "paid_days": paid_days, "lop_days": lop_days,
        "employer_pf": employer_pf, "employer_esi": employer_esi,
        "tax_info": tax_info,
    }

@router.post("/payroll-run")
async def run_payroll(data: dict, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    """Generate payroll for all employees for a month"""
    month = data.get("month", datetime.now().month)
    year  = data.get("year",  datetime.now().year)
    department_id = data.get("department_id")

    # Check if already exists
    existing = db.query(PayrollRun).filter(PayrollRun.month == month, PayrollRun.year == year).first()
    if existing and existing.status not in ["draft"]:
        raise HTTPException(400, f"Payroll for {month}/{year} already {existing.status}")

    period_label = f"{['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]} {year}"
    run_count = db.query(func.count(PayrollRun.id)).scalar()

    if not existing:
        run = PayrollRun(
            run_number=f"PR-{year}{month:02d}-{(run_count or 0)+1:04d}",
            month=month, year=year, period_label=period_label, status="processing"
        )
        db.add(run); db.flush()
    else:
        run = existing
        run.status = "processing"
        db.query(Payslip).filter(Payslip.run_id == run.id).delete()
        db.flush()

    # Get employees
    q = db.query(Employee).filter(Employee.is_active == True, Employee.status == "active")
    if department_id: q = q.filter(Employee.department_id == department_id)
    employees = q.all()

    total_gross = total_net = total_ded = 0
    payslips_created = 0

    for emp in employees:
        sd = db.query(EmployeeSalaryDetail).filter(EmployeeSalaryDetail.employee_id == emp.id).first()
        struct = db.query(SalaryStructure).filter(SalaryStructure.id == sd.structure_id).first() if sd and sd.structure_id else None
        lop = data.get("lop_overrides", {}).get(str(emp.id), 0)

        computed = compute_payslip(emp, sd, struct, month, year, lop_days=float(lop))

        payslip = Payslip(
            run_id=run.id, employee_id=emp.id, month=month, year=year,
            working_days=26, paid_days=computed["paid_days"], lop_days=computed["lop_days"],
            earnings=computed["earnings"], gross_salary=computed["gross_salary"],
            deductions=computed["deductions"], total_deductions=computed["total_deductions"],
            tax_deducted=computed["tax_deducted"], professional_tax=computed["professional_tax"],
            net_salary=computed["net_salary"],
            employer_pf=computed["employer_pf"], employer_esi=computed["employer_esi"],
            status="generated",
        )
        db.add(payslip)
        total_gross += computed["gross_salary"]
        total_net   += computed["net_salary"]
        total_ded   += computed["total_deductions"]
        payslips_created += 1

    run.total_employees = payslips_created
    run.total_gross = round(total_gross, 2)
    run.total_net   = round(total_net, 2)
    run.total_deductions = round(total_ded, 2)
    run.processed_at = datetime.now()
    run.status = "draft"
    db.commit()

    return {"run_id": run.id, "run_number": run.run_number, "period": period_label,
            "employees_processed": payslips_created, "total_gross": round(total_gross, 2),
            "total_net": round(total_net, 2), "status": "draft"}

@router.get("/payroll-run")
async def list_payroll_runs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    runs = db.query(PayrollRun).order_by(PayrollRun.year.desc(), PayrollRun.month.desc()).limit(24).all()
    return [{"id": r.id, "run_number": r.run_number, "period_label": r.period_label,
             "month": r.month, "year": r.year, "status": r.status,
             "total_employees": r.total_employees,
             "total_gross": float(r.total_gross or 0), "total_net": float(r.total_net or 0),
             "processed_at": r.processed_at.isoformat() if r.processed_at else None} for r in runs]

@router.put("/payroll-run/{run_id}/approve")
async def approve_payroll_run(run_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run: raise HTTPException(404, "Not found")
    run.status = "approved"; run.approved_by = current_user.id; run.approved_at = datetime.now()
    db.query(Payslip).filter(Payslip.run_id == run_id).update({"status": "approved"})
    db.commit(); return {"message": "Payroll approved", "run_number": run.run_number}

@router.put("/payroll-run/{run_id}/mark-paid")
async def mark_payroll_paid(run_id: int, data: dict = {}, db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run: raise HTTPException(404, "Not found")
    now = datetime.now()
    run.status = "paid"; run.paid_at = now
    db.query(Payslip).filter(Payslip.run_id == run_id).update({"status": "paid", "payment_date": now, "payment_ref": data.get("payment_ref", f"NEFT/{now.strftime('%Y%m%d')}")})
    db.commit(); return {"message": "Payroll marked as paid"}

@router.get("/payslips/{run_id}")
async def list_payslips(run_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payslips = db.query(Payslip).filter(Payslip.run_id == run_id).all()
    employees = {e.id: e for e in db.query(Employee).all()}
    result = []
    for p in payslips:
        emp = employees.get(p.employee_id)
        result.append({
            "id": p.id, "employee_id": p.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name or ''}" if emp else f"EMP-{p.employee_id}",
            "employee_number": emp.employee_number if emp else "",
            "department_id": emp.department_id if emp else None,
            "month": p.month, "year": p.year, "paid_days": float(p.paid_days or 0),
            "lop_days": float(p.lop_days or 0),
            "earnings": p.earnings or {}, "gross_salary": float(p.gross_salary or 0),
            "deductions": p.deductions or {}, "total_deductions": float(p.total_deductions or 0),
            "tax_deducted": float(p.tax_deducted or 0), "net_salary": float(p.net_salary or 0),
            "employer_pf": float(p.employer_pf or 0),
            "status": p.status, "payment_date": p.payment_date.isoformat() if p.payment_date else None,
        })
    return result

@router.get("/payslip/{payslip_id}")
async def get_payslip(payslip_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    """Full payslip detail for printing"""
    p = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    if not p: raise HTTPException(404, "Not found")
    emp = db.query(Employee).filter(Employee.id == p.employee_id).first()
    run = db.query(PayrollRun).filter(PayrollRun.id == p.run_id).first()
    cp = db.query(CompanyProfile).first()

    return {
        "payslip_id": p.id, "run_number": run.run_number if run else "",
        "period": run.period_label if run else f"{p.month}/{p.year}",
        "month": p.month, "year": p.year,
        "employee": {
            "id": emp.id if emp else None,
            "number": emp.employee_number if emp else "",
            "name": f"{emp.first_name} {emp.last_name or ''}" if emp else "",
            "designation": getattr(emp, "designation", "") or "",
            "department_id": emp.department_id if emp else None,
            "date_of_joining": str(emp.date_of_joining) if emp and emp.date_of_joining else "",
            "pan": getattr(emp, "pan_number", "") or "",
            "uan": "",
            "bank_account": getattr(emp, "bank_account", "") or "",
            "bank_name": getattr(emp, "bank_name", "") or "",
        },
        "company": cp_dict(cp) if cp else {},
        "working_days": int(p.working_days or 26),
        "paid_days": float(p.paid_days or 0),
        "lop_days": float(p.lop_days or 0),
        "earnings": p.earnings or {},
        "gross_salary": float(p.gross_salary or 0),
        "deductions": p.deductions or {},
        "total_deductions": float(p.total_deductions or 0),
        "tax_deducted": float(p.tax_deducted or 0),
        "professional_tax": float(p.professional_tax or 0),
        "net_salary": float(p.net_salary or 0),
        "employer_pf": float(p.employer_pf or 0),
        "employer_esi": float(p.employer_esi or 0),
        "status": p.status,
        "payment_date": p.payment_date.isoformat() if p.payment_date else None,
        "payment_ref": p.payment_ref,
    }

@router.get("/payslip/employee/{emp_id}")
async def get_employee_payslips(emp_id: int, year: Optional[int] = None,
                                 db: Session = Depends(get_db),
                                 current_user: User = Depends(get_current_user)):
    q = db.query(Payslip).filter(Payslip.employee_id == emp_id)
    if year: q = q.filter(Payslip.year == year)
    return [{"id": p.id, "month": p.month, "year": p.year, "run_id": p.run_id,
             "gross_salary": float(p.gross_salary or 0), "net_salary": float(p.net_salary or 0),
             "tax_deducted": float(p.tax_deducted or 0), "status": p.status,
             "payment_date": p.payment_date.isoformat() if p.payment_date else None}
            for p in q.order_by(Payslip.year.desc(), Payslip.month.desc()).all()]

# ── Tax Calculator ────────────────────────────────────────────────────────────

@router.post("/tax-calculator")
async def tax_calculator(data: dict, current_user: User = Depends(get_current_user)):
    """Calculate tax for any country"""
    country = data.get("country", "India")
    annual_income = float(data.get("annual_income", 0))

    if country == "India":
        regime = data.get("regime", "new")
        deductions_80c = float(data.get("deductions_80c", 0))
        deductions_80d = float(data.get("deductions_80d", 0))
        std_deduction = 50000 if regime == "new" else 50000
        taxable = max(0, annual_income - std_deduction - deductions_80c - deductions_80d)
        result = calc_india_tax(taxable, regime)
        result["country"] = "India"
        result["deductions_applied"] = {"standard": std_deduction, "80C": deductions_80c, "80D": deductions_80d}
        return result

    elif country == "UAE":
        return {"country":"UAE","annual_income":annual_income,"income_tax":0,"total_annual_tax":0,"monthly_tds":0,"note":"UAE has no personal income tax"}

    elif country == "USA":
        # Simplified federal tax brackets 2024 (single filer)
        brackets = [(0,11600,0.10),(11601,47150,0.12),(47151,100525,0.22),(100526,191950,0.24),(191951,243725,0.32),(243726,609350,0.35),(609351,float('inf'),0.37)]
        tax = 0
        state_tax = annual_income * 0.05  # approximate 5% state
        for lo,hi,rate in brackets:
            if annual_income <= lo: break
            tax += (min(annual_income,hi)-lo) * rate
        fica = min(annual_income, 168600) * 0.0765
        total = round(tax + state_tax + fica, 2)
        return {"country":"USA","annual_income":annual_income,"federal_tax":round(tax,2),"state_tax":round(state_tax,2),"fica_social_security_medicare":round(fica,2),"total_annual_tax":total,"monthly_tds":round(total/12,2)}

    elif country == "UK":
        # UK Income Tax 2024-25
        personal_allowance = 12570
        taxable = max(0, annual_income - personal_allowance)
        tax = 0
        if taxable > 0: tax += min(taxable, 37700) * 0.20
        if taxable > 37700: tax += min(taxable-37700, 87440) * 0.40
        if taxable > 125140: tax += (taxable-125140) * 0.45
        ni = min(annual_income, 50270) * 0.08 + max(0, annual_income-50270) * 0.02
        total = round(tax + ni, 2)
        return {"country":"UK","annual_income":annual_income,"income_tax":round(tax,2),"national_insurance":round(ni,2),"total_annual_tax":total,"monthly_tds":round(total/12,2)}

    else:
        return {"country":country,"note":"Tax calculation not configured. Add your country's tax brackets.","annual_income":annual_income}

# ── Form 16 ───────────────────────────────────────────────────────────────────

@router.post("/form16/generate/{emp_id}")
async def generate_form16(emp_id: int, data: dict, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    year = data.get("year", datetime.now().year)
    fy = f"{year-1}-{str(year)[2:]}"
    ay = f"{year}-{str(year+1)[2:]}"

    # Gather all payslips for the FY (Apr to Mar)
    payslips = db.query(Payslip).filter(
        Payslip.employee_id == emp_id,
        Payslip.year.in_([year-1, year])
    ).all()
    # Filter Apr-Mar
    fy_payslips = [p for p in payslips if (p.year == year-1 and p.month >= 4) or (p.year == year and p.month <= 3)]

    gross = sum(float(p.gross_salary or 0) for p in fy_payslips)
    tds = sum(float(p.tax_deducted or 0) for p in fy_payslips)
    pt = sum(float(p.professional_tax or 0) for p in fy_payslips)
    pf = sum(float((p.deductions or {}).get("PF_EMP", 0)) for p in fy_payslips)

    std_deduction = 50000
    regime = data.get("regime", "new")
    dc_80c = float(data.get("deductions_80c", pf))
    dc_80d = float(data.get("deductions_80d", 0))
    taxable = max(0, gross - std_deduction - dc_80c - dc_80d)
    tax_info = calc_india_tax(taxable, regime)

    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    cp = db.query(CompanyProfile).first()

    form16 = db.query(Form16).filter(Form16.employee_id == emp_id, Form16.financial_year == fy).first()
    if not form16:
        form16 = Form16(employee_id=emp_id)
        db.add(form16)
    form16.financial_year = fy; form16.assessment_year = ay
    form16.tan_of_employer = (cp.tax_registrations or {}).get("tan", "") if cp else ""
    form16.pan_of_employee = getattr(emp, "pan_number", "") or ""
    form16.total_tax_deducted = tds; form16.gross_salary = gross
    form16.standard_deduction = std_deduction; form16.deductions_80c = dc_80c; form16.deductions_80d = dc_80d
    form16.taxable_income = taxable
    form16.tax_on_income = tax_info["income_tax"]
    form16.surcharge = tax_info["surcharge"]
    form16.health_education_cess = tax_info["cess_4pct"]
    form16.total_tax_payable = tax_info["total_annual_tax"]
    form16.tax_regime = regime; form16.is_generated = True; form16.generated_at = datetime.now()
    db.commit()

    return {
        "form16_id": form16.id, "financial_year": fy, "assessment_year": ay,
        "employee": {"name": f"{emp.first_name} {emp.last_name or ''}" if emp else "", "pan": getattr(emp,"pan_number","") or ""},
        "employer": {"name": cp.legal_name if cp else "", "tan": form16.tan_of_employer},
        "part_a": {"total_tax_deducted": tds},
        "part_b": {
            "gross_salary": gross, "standard_deduction": std_deduction,
            "deductions_80c": dc_80c, "deductions_80d": dc_80d,
            "taxable_income": taxable, "tax_on_income": tax_info["income_tax"],
            "surcharge": tax_info["surcharge"], "cess": tax_info["cess_4pct"],
            "total_tax_payable": tax_info["total_annual_tax"],
            "tax_deducted_by_employer": tds,
        },
        "regime": regime,
    }
