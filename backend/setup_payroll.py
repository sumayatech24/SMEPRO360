"""Seed company profile, salary structures"""
from app.db.base import engine, Base, SessionLocal
from app.models import *
from app.models.company import CompanyProfile, SalaryStructure, EmployeeSalaryDetail
from app.models.hr import Employee
from app.models.tenant import Tenant

Base.metadata.create_all(bind=engine)
print("Tables created")

db = SessionLocal()
tenant = db.query(Tenant).filter(Tenant.slug == "default").first()
tid = tenant.id if tenant else None

# ── Company Profile ────────────────────────────────────────────────────────────
cp = db.query(CompanyProfile).filter(CompanyProfile.tenant_id == tid).first()
if not cp:
    cp = CompanyProfile(
        tenant_id=tid,
        legal_name="SMEPRO360 Technologies Pvt Ltd",
        trade_name="SMEPRO360",
        company_type="pvt_ltd",
        industry="Information Technology",
        founded_year=2020,
        address_line1="701, Raheja Chambers, Nariman Point",
        address_line2="",
        city="Mumbai", state="Maharashtra",
        postal_code="400021", country="India", country_code="IN",
        phone="+91 22 4000 1000",
        email="accounts@smepro360.com",
        website="https://smepro360.com",
        logo_url="",
        brand_color="#6366f1",
        currency="INR", currency_symbol="₹",
        locale="en-IN", timezone="Asia/Kolkata",
        date_format="DD/MM/YYYY", fiscal_year_start="04-01",
        tax_registrations={
            "gstin": "27AABCS1234A1ZB",
            "pan":   "AABCS1234A",
            "tan":   "MUMA12345A",
            "cin":   "U72900MH2020PTC340567",
            "msme":  "UDYAM-MH-123456",
        },
        bank_name="HDFC Bank", bank_account="50200012345678",
        bank_ifsc="HDFC0001234", bank_branch="Nariman Point, Mumbai",
        invoice_prefix="INV", po_prefix="PO", so_prefix="SO",
        default_payment_terms="30 days",
        invoice_footer="Thank you for your business! Payment due within 30 days. Late payment attracts 18% p.a. interest.",
        terms_conditions="All disputes subject to Mumbai jurisdiction. Goods once sold will not be taken back.",
    )
    db.add(cp)
    print("Company profile created")

# ── Salary Structures ─────────────────────────────────────────────────────────
structures = [
    {
        "name": "India Standard (New Regime)",
        "country": "India", "currency": "INR", "is_default": True,
        "earnings": [
            {"name":"Basic Salary","code":"BASIC","calc_type":"percent_ctc","value":40,"is_taxable":True},
            {"name":"HRA","code":"HRA","calc_type":"percent_basic","value":40,"is_taxable":False,"hra_exemption":True},
            {"name":"Special Allowance","code":"SPECIAL","calc_type":"balance","value":0,"is_taxable":True},
            {"name":"LTA","code":"LTA","calc_type":"fixed","value":0,"is_taxable":False},
            {"name":"Medical Allowance","code":"MEDICAL","calc_type":"fixed","value":1250,"is_taxable":False},
            {"name":"Telephone Allowance","code":"PHONE","calc_type":"fixed","value":1000,"is_taxable":False},
        ],
        "deductions": [
            {"name":"PF Employee (12%)","code":"PF_EMP","calc_type":"percent_basic","value":12,"employer_contrib":12,"limit_basic":15000},
            {"name":"ESI Employee (0.75%)","code":"ESI_EMP","calc_type":"percent_gross","value":0.75,"limit_salary":21000,"employer_contrib":3.25},
            {"name":"Professional Tax","code":"PT","calc_type":"slab_state","value":0},
            {"name":"TDS (Monthly)","code":"TDS","calc_type":"tax_computed","value":0},
        ],
        "employer_contributions": [
            {"name":"PF Employer (12%)","code":"PF_EMPLOYER","calc_type":"percent_basic","value":12},
            {"name":"ESI Employer (3.25%)","code":"ESI_EMPLOYER","calc_type":"percent_gross","value":3.25,"limit_salary":21000},
            {"name":"Gratuity (4.81%)","code":"GRATUITY","calc_type":"percent_basic","value":4.81},
        ],
        "tax_config": {"regime":"new","standard_deduction":50000,"cess_percent":4,"surcharge_threshold":5000000}
    },
    {
        "name": "India Standard (Old Regime)",
        "country": "India", "currency": "INR", "is_default": False,
        "earnings": [
            {"name":"Basic Salary","code":"BASIC","calc_type":"percent_ctc","value":40,"is_taxable":True},
            {"name":"HRA","code":"HRA","calc_type":"percent_basic","value":40,"is_taxable":False},
            {"name":"Special Allowance","code":"SPECIAL","calc_type":"balance","value":0,"is_taxable":True},
            {"name":"LTA","code":"LTA","calc_type":"fixed","value":0,"is_taxable":False},
        ],
        "deductions": [
            {"name":"PF Employee (12%)","code":"PF_EMP","calc_type":"percent_basic","value":12},
            {"name":"ESI Employee (0.75%)","code":"ESI_EMP","calc_type":"percent_gross","value":0.75,"limit_salary":21000},
            {"name":"TDS","code":"TDS","calc_type":"tax_computed","value":0},
        ],
        "employer_contributions": [
            {"name":"PF Employer","code":"PF_EMPLOYER","calc_type":"percent_basic","value":12},
            {"name":"Gratuity","code":"GRATUITY","calc_type":"percent_basic","value":4.81},
        ],
        "tax_config": {"regime":"old","standard_deduction":50000,"cess_percent":4}
    },
    {
        "name": "UAE Expat Structure",
        "country": "UAE", "currency": "AED", "is_default": False,
        "earnings": [
            {"name":"Basic Salary","code":"BASIC","calc_type":"percent_ctc","value":60},
            {"name":"Housing Allowance","code":"HOUSING","calc_type":"percent_basic","value":25},
            {"name":"Transport Allowance","code":"TRANSPORT","calc_type":"fixed","value":1500},
            {"name":"Other Allowances","code":"OTHER","calc_type":"fixed","value":0},
        ],
        "deductions": [],
        "employer_contributions": [
            {"name":"GPSSA (UAE Nationals 12.5%)","code":"GPSSA","calc_type":"percent_basic","value":12.5,"note":"Only for UAE nationals"},
        ],
        "tax_config": {"no_income_tax":True,"vat_rate":5}
    },
    {
        "name": "USA W-2 Employee",
        "country": "USA", "currency": "USD", "is_default": False,
        "earnings": [
            {"name":"Base Salary","code":"BASE","calc_type":"fixed","value":0},
            {"name":"Bonus","code":"BONUS","calc_type":"fixed","value":0},
        ],
        "deductions": [
            {"name":"Federal Income Tax","code":"FED_TAX","calc_type":"tax_computed","value":0},
            {"name":"State Income Tax","code":"STATE_TAX","calc_type":"percent_gross","value":5},
            {"name":"Social Security (6.2%)","code":"SS","calc_type":"percent_gross","value":6.2,"limit_salary":168600},
            {"name":"Medicare (1.45%)","code":"MEDICARE","calc_type":"percent_gross","value":1.45},
            {"name":"401k Employee","code":"401K","calc_type":"percent_gross","value":6},
        ],
        "employer_contributions": [
            {"name":"Social Security Employer","code":"SS_ER","calc_type":"percent_gross","value":6.2},
            {"name":"Medicare Employer","code":"MEDICARE_ER","calc_type":"percent_gross","value":1.45},
            {"name":"401k Employer Match","code":"401K_ER","calc_type":"percent_gross","value":3},
        ],
        "tax_config": {"country":"USA","currency":"USD"}
    },
    {
        "name": "UK PAYE Employee",
        "country": "UK", "currency": "GBP", "is_default": False,
        "earnings": [
            {"name":"Basic Salary","code":"BASIC","calc_type":"fixed","value":0},
            {"name":"Bonus","code":"BONUS","calc_type":"fixed","value":0},
        ],
        "deductions": [
            {"name":"Income Tax (PAYE)","code":"PAYE","calc_type":"tax_computed","value":0},
            {"name":"National Insurance (8%)","code":"NI","calc_type":"percent_gross","value":8,"threshold":12570},
            {"name":"Pension (5%)","code":"PENSION","calc_type":"percent_gross","value":5},
        ],
        "employer_contributions": [
            {"name":"Employer NI (13.8%)","code":"NI_ER","calc_type":"percent_gross","value":13.8},
            {"name":"Employer Pension (3%)","code":"PENSION_ER","calc_type":"percent_gross","value":3},
        ],
        "tax_config": {"country":"UK","currency":"GBP","personal_allowance":12570}
    },
]

ns = 0
for s_data in structures:
    existing = db.query(SalaryStructure).filter(SalaryStructure.name == s_data["name"]).first()
    if not existing:
        db.add(SalaryStructure(**s_data))
        ns += 1

db.flush()
print(f"Salary structures: {ns} created ({db.query(SalaryStructure).count()} total)")

# ── Employee Salary Details ────────────────────────────────────────────────────
india_struct = db.query(SalaryStructure).filter(SalaryStructure.name.contains("New Regime")).first()
employees = db.query(Employee).filter(Employee.is_active == True).all()
ne = 0
for emp in employees:
    existing = db.query(EmployeeSalaryDetail).filter(EmployeeSalaryDetail.employee_id == emp.id).first()
    if not existing and emp.basic_salary:
        basic = float(emp.basic_salary or 50000)
        hra = float(getattr(emp, "hra", 0) or basic * 0.4)
        other = float(getattr(emp, "other_allowances", 0) or 0)
        gross = basic + hra + other
        db.add(EmployeeSalaryDetail(
            employee_id=emp.id,
            structure_id=india_struct.id if india_struct else None,
            ctc_monthly=round(gross * 1.17, 2),  # add employer contrib ~17%
            ctc_annual=round(gross * 1.17 * 12, 2),
            component_values={"BASIC":basic,"HRA":hra,"SPECIAL":other},
            pan_number=getattr(emp,"pan_number","") or f"ABCDE{emp.id:04d}F",
            tax_regime="new",
        ))
        ne += 1

db.commit()
print(f"Employee salary details: {ne} created")
print("Setup complete!")
db.close()
