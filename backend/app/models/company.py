"""
Company / Tenant Profile
- Full company details (multi-country)
- Logo, address, tax registrations
- Salary structure config per country
- Payslip templates
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class CompanyProfile(Base):
    """Extended company profile per tenant"""
    __tablename__ = "company_profiles"
    id              = Column(Integer, primary_key=True, index=True)
    tenant_id       = Column(Integer, ForeignKey("tenants.id"), unique=True)
    # Identity
    legal_name      = Column(String(300), nullable=False)
    trade_name      = Column(String(300))
    company_type    = Column(String(50))        # pvt_ltd|llp|partnership|sole_prop|public|ngo
    industry        = Column(String(100))
    founded_year    = Column(Integer)
    # Logo
    logo_url        = Column(String(500))
    favicon_url     = Column(String(500))
    brand_color     = Column(String(20), default="#6366f1")
    # Address
    address_line1   = Column(String(300))
    address_line2   = Column(String(300))
    city            = Column(String(100))
    state           = Column(String(100))
    postal_code     = Column(String(20))
    country         = Column(String(50), default="India")
    country_code    = Column(String(5), default="IN")
    # Contact
    phone           = Column(String(30))
    fax             = Column(String(30))
    email           = Column(String(200))
    website         = Column(String(300))
    # Tax Registrations (stored as JSON for multi-country flexibility)
    # India: {"gstin":"27AABCT1234A1ZB","pan":"AABCT1234A","tan":"MUMA12345A","cin":"U72900MH2020PTC123456"}
    # USA: {"ein":"12-3456789","state_tax_id":"CA-123456"}
    # UK: {"vat":"GB123456789","company_number":"12345678","utr":"1234567890"}
    tax_registrations = Column(JSON, default={})
    # Currency & Locale
    currency        = Column(String(10), default="INR")
    currency_symbol = Column(String(5), default="₹")
    locale          = Column(String(10), default="en-IN")
    timezone        = Column(String(50), default="Asia/Kolkata")
    date_format     = Column(String(20), default="DD/MM/YYYY")
    fiscal_year_start = Column(String(5), default="04-01")   # MM-DD
    # Bank Details (for invoices/payments)
    bank_name       = Column(String(200))
    bank_account    = Column(String(50))
    bank_ifsc       = Column(String(20))
    bank_branch     = Column(String(200))
    swift_code      = Column(String(20))
    iban            = Column(String(50))
    # Document settings
    invoice_prefix  = Column(String(10), default="INV")
    po_prefix       = Column(String(10), default="PO")
    so_prefix       = Column(String(10), default="SO")
    quotation_prefix = Column(String(10), default="QT")
    # Terms
    default_payment_terms = Column(String(100), default="30 days")
    invoice_footer  = Column(Text)
    terms_conditions = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SalaryStructure(Base):
    """Country-agnostic salary structure template"""
    __tablename__ = "salary_structures"
    id              = Column(Integer, primary_key=True, index=True)
    tenant_id       = Column(Integer, nullable=True)
    name            = Column(String(100), nullable=False)   # e.g. "Standard India", "UAE Expat"
    country         = Column(String(50), default="India")
    currency        = Column(String(10), default="INR")
    # Earnings components (stored as JSON list)
    # [{"name":"Basic","code":"BASIC","calc_type":"fixed","value":0,"is_taxable":true},
    #  {"name":"HRA","code":"HRA","calc_type":"percent_basic","value":40,"is_taxable":false},...]
    earnings        = Column(JSON, default=[])
    # Deduction components
    # [{"name":"PF Employee","code":"PF_EMP","calc_type":"percent_basic","value":12,"employer_contrib":12},
    #  {"name":"ESI","code":"ESI_EMP","calc_type":"percent_gross","value":0.75,"limit_salary":21000},...]
    deductions      = Column(JSON, default=[])
    # Employer contributions (shown on CTC but not deducted from employee)
    employer_contributions = Column(JSON, default=[])
    # Tax config per country
    tax_config      = Column(JSON, default={})
    # India: {"regime":"new","surcharge_threshold":5000000,"cess_percent":4}
    # UAE: {"no_income_tax":true}
    # USA: {"federal_brackets":[...],"state":"CA"}
    is_default      = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class EmployeeSalaryDetail(Base):
    """Per-employee salary breakdown"""
    __tablename__ = "employee_salary_details"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False, unique=True)
    structure_id    = Column(Integer, ForeignKey("salary_structures.id"), nullable=True)
    ctc_annual      = Column(Numeric(15,2), default=0)
    ctc_monthly     = Column(Numeric(15,2), default=0)
    # Component values (overrides from structure)
    # {"BASIC":50000,"HRA":20000,"SPECIAL_ALLOWANCE":10000,...}
    component_values = Column(JSON, default={})
    # Fixed deductions
    pf_account      = Column(String(30))
    uan_number      = Column(String(20))    # India UAN
    esi_number      = Column(String(20))    # India ESI
    pan_number      = Column(String(20))    # India PAN
    tax_regime      = Column(String(20), default="new")  # India: new|old
    effective_from  = Column(DateTime(timezone=True))
    is_active       = Column(Boolean, default=True)
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PayrollRun(Base):
    """Monthly payroll run"""
    __tablename__ = "payroll_runs"
    id              = Column(Integer, primary_key=True, index=True)
    run_number      = Column(String(30), unique=True)
    tenant_id       = Column(Integer, nullable=True)
    month           = Column(Integer)
    year            = Column(Integer)
    period_label    = Column(String(20))    # e.g. "June 2026"
    status          = Column(String(20), default="draft")  # draft|processing|approved|paid|locked
    total_employees = Column(Integer, default=0)
    total_gross     = Column(Numeric(15,2), default=0)
    total_deductions = Column(Numeric(15,2), default=0)
    total_net       = Column(Numeric(15,2), default=0)
    total_employer_contrib = Column(Numeric(15,2), default=0)
    processed_at    = Column(DateTime(timezone=True))
    approved_by     = Column(Integer, nullable=True)
    approved_at     = Column(DateTime(timezone=True))
    paid_at         = Column(DateTime(timezone=True))
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    payslips        = relationship("Payslip", back_populates="run", cascade="all, delete-orphan")


class Payslip(Base):
    """Individual payslip per employee per month"""
    __tablename__ = "payslips"
    id              = Column(Integer, primary_key=True, index=True)
    run_id          = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    month           = Column(Integer)
    year            = Column(Integer)
    # Working days
    total_days      = Column(Integer, default=30)
    working_days    = Column(Integer, default=26)
    paid_days       = Column(Numeric(5,2), default=26)
    lop_days        = Column(Numeric(5,2), default=0)   # Loss of Pay
    # Earnings
    earnings        = Column(JSON, default={})   # {"BASIC":50000,"HRA":20000,...}
    gross_salary    = Column(Numeric(12,2), default=0)
    # Deductions
    deductions      = Column(JSON, default={})   # {"PF_EMP":6000,"ESI_EMP":375,...}
    total_deductions = Column(Numeric(12,2), default=0)
    # Tax
    tax_deducted    = Column(Numeric(12,2), default=0)   # TDS/Income Tax
    professional_tax = Column(Numeric(8,2), default=0)
    # Net
    net_salary      = Column(Numeric(12,2), default=0)
    # Employer contributions (CTC components)
    employer_pf     = Column(Numeric(10,2), default=0)
    employer_esi    = Column(Numeric(10,2), default=0)
    employer_gratuity = Column(Numeric(10,2), default=0)
    # Reimbursements / Arrears
    reimbursements  = Column(Numeric(10,2), default=0)
    arrears         = Column(Numeric(10,2), default=0)
    bonus           = Column(Numeric(10,2), default=0)
    # YTD (Year-to-date cumulative)
    ytd_gross       = Column(Numeric(15,2), default=0)
    ytd_tax         = Column(Numeric(15,2), default=0)
    ytd_net         = Column(Numeric(15,2), default=0)
    # Status
    status          = Column(String(20), default="generated")  # generated|approved|paid
    payment_date    = Column(DateTime(timezone=True))
    payment_ref     = Column(String(100))
    bank_account    = Column(String(50))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    run             = relationship("PayrollRun", back_populates="payslips")


class Form16(Base):
    """India Form 16 / Annual Tax Certificate"""
    __tablename__ = "form_16"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    financial_year  = Column(String(10), nullable=False)    # e.g. "2025-26"
    assessment_year = Column(String(10), nullable=False)    # e.g. "2026-27"
    # Part A — TDS details
    tan_of_employer = Column(String(20))
    pan_of_employee = Column(String(20))
    total_tax_deducted = Column(Numeric(12,2), default=0)
    # Part B — Salary breakdown
    gross_salary    = Column(Numeric(15,2), default=0)
    exemptions      = Column(JSON, default={})   # HRA exemption, LTA, etc.
    deductions_80c  = Column(Numeric(12,2), default=0)   # PF, LIC, ELSS etc.
    deductions_80d  = Column(Numeric(12,2), default=0)   # Medical insurance
    deductions_other = Column(JSON, default={})
    standard_deduction = Column(Numeric(10,2), default=50000)
    taxable_income  = Column(Numeric(15,2), default=0)
    tax_on_income   = Column(Numeric(12,2), default=0)
    surcharge       = Column(Numeric(10,2), default=0)
    health_education_cess = Column(Numeric(10,2), default=0)
    total_tax_payable = Column(Numeric(12,2), default=0)
    tax_regime      = Column(String(10), default="new")
    is_generated    = Column(Boolean, default=False)
    generated_at    = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
