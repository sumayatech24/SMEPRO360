"""
Comprehensive seed data for SMEPRO360 - All modules
Run: python seed_data.py
"""
import sys, os, random, requests
sys.path.insert(0, os.path.dirname(__file__))
from datetime import datetime, timedelta

BASE = "http://localhost:8000/api/v1"

def rdate(lo=0, hi=365):
    return (datetime.now() - timedelta(days=random.randint(lo, hi))).strftime("%Y-%m-%d")

def fdate(days=30):
    return (datetime.now() + timedelta(days=random.randint(1, days))).strftime("%Y-%m-%d")

def login():
    r = requests.post(f"{BASE}/auth/login", json={"email": "admin@smepro360.com", "password": "Admin@123456"})
    if r.status_code != 200:
        print("LOGIN FAILED:", r.text); sys.exit(1)
    print("OK  Login successful")
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

def post(H, path, data):
    r = requests.post(f"{BASE}{path}", json=data, headers=H)
    if r.status_code == 200: return r.json()
    return None

def put(H, path, data):
    r = requests.put(f"{BASE}{path}", json=data, headers=H)
    return r.json() if r.status_code == 200 else None

# ─── Customers ────────────────────────────────────────────────────────────────
def seed_customers(H):
    rows = [
        ("Tata Consultancy Services","IT","Mumbai","Maharashtra","27AABCT1234A1ZB",2000000,30),
        ("Infosys Ltd","IT","Bengaluru","Karnataka","29AABCI5678B1ZC",1500000,45),
        ("Wipro Technologies","IT","Hyderabad","Telangana","36AABCW9012C1ZD",1000000,30),
        ("HCL Technologies","IT","Noida","Uttar Pradesh","09AABCH3456D1ZE",800000,30),
        ("Tech Mahindra","IT","Pune","Maharashtra","27AABCT7890E1ZF",500000,45),
        ("Reliance Industries","Manufacturing","Mumbai","Maharashtra","27AABCR2345F1ZG",5000000,60),
        ("HDFC Bank","Banking","Mumbai","Maharashtra","27AABCH6789G1ZH",3000000,30),
        ("ICICI Bank","Banking","Mumbai","Maharashtra","27AABCI0123H1ZI",2500000,30),
        ("Bajaj Auto","Manufacturing","Pune","Maharashtra","27AABCB4567I1ZJ",1200000,45),
        ("Hero MotoCorp","Manufacturing","Delhi","Delhi","07AABCH8901J1ZK",900000,45),
        ("Mahindra & Mahindra","Manufacturing","Mumbai","Maharashtra","27AABCM2345K1ZL",1800000,60),
        ("Larsen & Toubro","Construction","Mumbai","Maharashtra","27AABCL6789L1ZM",4000000,60),
        ("Sun Pharma","Pharma","Mumbai","Maharashtra","27AABCS0123M1ZN",700000,30),
        ("Asian Paints","Manufacturing","Mumbai","Maharashtra","27AABCA4567N1ZO",600000,30),
        ("ITC Limited","FMCG","Kolkata","West Bengal","19AABCI8901O1ZP",1100000,45),
    ]
    ids = []
    for (name, industry, city, state, gstin, credit, days) in rows:
        res = post(H, "/crm/customers", {
            "company_name": name, "industry": industry, "city": city, "state": state,
            "gstin": gstin, "credit_limit": credit, "credit_days": days,
            "customer_type": "corporate",
            "email": f"contact@{name.split()[0].lower()}.com",
            "phone": f"+91 9{random.randint(100000000,999999999)}",
        })
        if res: ids.append(res["id"])
    print(f"OK  Customers: {len(ids)} created")
    return ids

# ─── Leads ────────────────────────────────────────────────────────────────────
def seed_leads(H):
    names = [("Rajesh","Kumar"),("Priya","Sharma"),("Amit","Singh"),("Deepa","Nair"),
             ("Suresh","Patel"),("Kavita","Mehta"),("Arun","Krishnan"),("Pooja","Gupta"),
             ("Vikram","Joshi"),("Nisha","Agarwal"),("Rahul","Verma"),("Sunita","Rao"),
             ("Ankit","Tiwari"),("Meena","Pandey"),("Rohan","Shah"),("Lakshmi","Reddy"),
             ("Manish","Garg"),("Divya","Malhotra"),("Sanjay","Yadav"),("Rekha","Iyer")]
    companies = ["StartupXYZ","MegaCorp India","InnovateTech","SmartSolutions","NextGen Systems",
                 "DigitalForge","CloudNine Services","DataDriven Co","AgriTech Ventures","EduPlus Online"]
    statuses = ["new","contacted","qualified","proposal","negotiation","won","lost"]
    sources = ["website","referral","linkedin","email","cold_call","event","advertisement"]
    industries = ["IT","Manufacturing","Healthcare","Education","Finance","Retail"]
    n = 0
    for (fn, ln) in names:
        res = post(H, "/leads/", {
            "first_name": fn, "last_name": ln,
            "email": f"{fn.lower()}.{ln.lower()}{random.randint(1,99)}@gmail.com",
            "phone": f"+91 9{random.randint(100000000,999999999)}",
            "company": random.choice(companies),
            "status": random.choice(statuses),
            "source": random.choice(sources),
            "industry": random.choice(industries),
            "priority": random.choice(["low","medium","high"]),
            "annual_revenue": random.choice([500000,1000000,2500000,5000000]),
            "city": random.choice(["Mumbai","Delhi","Bengaluru","Pune","Hyderabad"]),
            "description": f"Interested in ERP solution. Via {random.choice(sources)}.",
        })
        if res: n += 1
    print(f"OK  Leads: {n} created")

# ─── Products ─────────────────────────────────────────────────────────────────
def seed_products(H):
    rows = [
        ("Laptop Dell Inspiron 15","LAP001","Electronics",45000,52000,18,"pcs"),
        ("Office Chair Ergonomic","FUR001","Furniture",8500,12000,18,"pcs"),
        ("A4 Paper Ream","STA001","Stationery",250,350,12,"ream"),
        ("Canon Printer MF3010","ELE001","Electronics",9000,11500,18,"pcs"),
        ("Steel Almirah 2-door","FUR002","Furniture",6500,8500,18,"pcs"),
        ("Whiteboard 4x3ft","OFF001","Office Supplies",1800,2500,18,"pcs"),
        ("HP Ink Cartridge Black","STA002","Stationery",850,1200,12,"pcs"),
        ("UPS 650VA APC","ELE002","Electronics",3500,4500,18,"pcs"),
        ("Conference Table 8-seater","FUR003","Furniture",25000,35000,18,"pcs"),
        ("Industrial Fan 24inch","ELE003","Electronics",4200,5500,18,"pcs"),
        ("Safety Helmet ISI","SAF001","Safety Equipment",450,650,5,"pcs"),
        ("Fire Extinguisher 5kg","SAF002","Safety Equipment",1800,2400,5,"pcs"),
        ("Network Switch 24-port","NET001","Networking",12000,16000,18,"pcs"),
        ("IP Camera Outdoor","NET002","Networking",3200,4800,18,"pcs"),
        ("Annual Software License","SFT001","Software",50000,75000,18,"license"),
        ("Projector BenQ DX820","ELE004","Electronics",32000,42000,18,"pcs"),
        ("Standing Desk Electric","FUR004","Furniture",18000,25000,18,"pcs"),
        ("Barcode Scanner","ELE005","Electronics",2800,4200,18,"pcs"),
        ("Server Dell PowerEdge T40","SVR001","IT Hardware",85000,110000,18,"pcs"),
        ("Cloud Storage 1TB/year","SFT002","Software",8000,12000,18,"license"),
    ]
    ids = []
    for (name, sku, cat, cost, price, gst, unit) in rows:
        res = post(H, "/inventory/products", {
            "name": name, "sku": sku, "category": cat,
            "cost_price": cost, "selling_price": price,
            "gst_rate": gst, "unit": unit,
            "reorder_level": random.randint(5, 20),
            "current_stock": random.randint(10, 100),
        })
        if res: ids.append(res["id"])
    print(f"OK  Products: {len(ids)} created")
    return ids

# ─── Departments ──────────────────────────────────────────────────────────────
def seed_departments(H):
    depts = ["Engineering","Sales","HR","Finance","Operations","IT","Marketing","Warehouse","Legal","Admin"]
    ids = {}
    for name in depts:
        res = post(H, "/hr/departments", {"name": name, "code": name[:3].upper()})
        if res: ids[name] = res["id"]
    print(f"OK  Departments: {len(ids)} created")
    return ids

# ─── Employees ────────────────────────────────────────────────────────────────
def seed_employees(H, dept_ids):
    rows = [
        ("Ramesh","Kumar Gupta","Engineering",85000),("Priya","Venkat Nair","Engineering",55000),
        ("Sunil","Sharma","Sales",45000),("Anjali","Krishnamurthy","HR",70000),
        ("Deepak","Raj Verma","Finance",60000),("Meena","Sundar Rao","Operations",90000),
        ("Kiran","Patel Mehta","IT",50000),("Shalini","Agarwal","Marketing",48000),
        ("Vijay","Mohan Reddy","Engineering",95000),("Geeta","Balakrishnan","Finance",75000),
        ("Harish","Chandra Nath","Sales",80000),("Pooja","Singh Rawat","HR",42000),
        ("Mukesh","Lal Gupta","Warehouse",52000),("Ananya","Bose Dutta","Marketing",46000),
        ("Rajiv","Kumar Joshi","Operations",62000),
    ]
    ids = []
    for i, (fn, ln, dept, sal) in enumerate(rows):
        d_id = dept_ids.get(dept)
        res = post(H, "/hr/employees", {
            "first_name": fn, "last_name": ln,
            "email": f"emp{i+1:03d}@smepro360.com",
            "phone": f"+91 9{random.randint(100000000,999999999)}",
            "department_id": d_id,
            "employment_type": "full_time",
            "date_of_joining": rdate(30, 1000),
            "basic_salary": sal,
            "hra": int(sal * 0.4),
            "other_allowances": int(sal * 0.1),
            "pan_number": f"ABCDE{i+1000}F",
            "bank_name": random.choice(["HDFC Bank","SBI","ICICI Bank","Axis Bank"]),
            "bank_account": f"{random.randint(1000000000,9999999999)}",
            "bank_ifsc": f"HDFC{random.randint(1000,9999):04d}",
        })
        if res: ids.append(res["id"])
    print(f"OK  Employees: {len(ids)} created")
    return ids

# ─── Attendance ───────────────────────────────────────────────────────────────
def seed_attendance(H, emp_ids):
    n = 0
    for emp_id in emp_ids[:8]:
        for d in range(30):
            dt = (datetime.now() - timedelta(days=d)).strftime("%Y-%m-%d")
            status = random.choices(["present","present","present","absent","half_day"], k=1)[0]
            res = post(H, "/hr/attendance", {
                "employee_id": emp_id, "date": dt, "status": status,
                "check_in": f"09:{random.randint(0,30):02d}" if status != "absent" else None,
                "check_out": f"18:{random.randint(0,30):02d}" if status == "present" else None,
            })
            if res: n += 1
    print(f"OK  Attendance: {n} records")

# ─── Leaves ───────────────────────────────────────────────────────────────────
def seed_leaves(H, emp_ids):
    n = 0
    for emp_id in emp_ids:
        for _ in range(random.randint(1, 3)):
            start = datetime.now() - timedelta(days=random.randint(5, 90))
            days = random.randint(1, 5)
            res = post(H, "/hr/leaves", {
                "employee_id": emp_id,
                "leave_type": random.choice(["annual","sick","casual","emergency"]),
                "start_date": start.strftime("%Y-%m-%d"),
                "end_date": (start + timedelta(days=days)).strftime("%Y-%m-%d"),
                "days_count": days,
                "reason": random.choice(["Medical","Family function","Personal","Vacation"]),
                "status": random.choice(["approved","approved","pending","rejected"]),
            })
            if res: n += 1
    print(f"OK  Leaves: {n} records")

# ─── Vendors ──────────────────────────────────────────────────────────────────
def seed_vendors(H):
    rows = [
        ("Reliance Retail Ltd","Mumbai","Maharashtra","27AABCR1234A1ZB"),
        ("Amazon Seller Services","Bengaluru","Karnataka","29AABCA9999Z1Z9"),
        ("Flipkart Internet Pvt","Bengaluru","Karnataka","29AABCF5555B1ZA"),
        ("Havells India Ltd","Noida","Uttar Pradesh","09AABCH7777C1Z1"),
        ("Dixon Technologies","Noida","Uttar Pradesh","09AABCD8888D1ZC"),
        ("Marico Industries","Mumbai","Maharashtra","27AABCM4444E1ZD"),
        ("Bosch India","Bengaluru","Karnataka","29AABCB2222F1ZE"),
        ("Godrej & Boyce","Mumbai","Maharashtra","27AABCG6666H1ZG"),
        ("Siemens India","Mumbai","Maharashtra","27AABCS3333I1ZH"),
        ("Honeywell India","Pune","Maharashtra","27AABCH1111J1ZI"),
    ]
    ids = []
    for (name, city, state, gstin) in rows:
        res = post(H, "/procurement/vendors", {
            "company_name": name, "city": city, "state": state,
            "gstin": gstin, "credit_days": random.choice([15, 30, 45, 60]),
            "email": f"procurement@{name.split()[0].lower()}.com",
            "phone": f"+91 2{random.randint(100000000,999999999)}",
            "bank_name": random.choice(["HDFC Bank","ICICI Bank","SBI"]),
            "bank_account": f"{random.randint(1000000000,9999999999)}",
            "bank_ifsc": f"HDFC{random.randint(1000,9999):04d}",
        })
        if res: ids.append(res["id"])
    print(f"OK  Vendors: {len(ids)} created")
    return ids

# ─── Sales Orders ─────────────────────────────────────────────────────────────
def seed_sales_orders(H, cust_ids, prod_ids):
    ids = []; n = 0
    descs = ["Laptop Supply","Office Furniture","IT Equipment","Software License","Support Contract","Maintenance Services","Hardware Upgrade"]
    for _ in range(20):
        items = [{"description": random.choice(descs), "quantity": random.randint(1,10),
                  "unit": "pcs", "unit_price": random.choice([5000,10000,25000,45000,8500]),
                  "discount_percent": random.choice([0,5,10]), "tax_percent": 18}
                 for _ in range(random.randint(1, 3))]
        res = post(H, "/sales/orders", {
            "customer_id": random.choice(cust_ids),
            "delivery_date": fdate(30), "payment_terms": random.choice(["30 days","45 days"]),
            "notes": "Standard terms apply.", "items": items,
        })
        if res:
            n += 1; ids.append(res["id"])
            if random.random() > 0.4:
                put(H, f"/sales/orders/{res['id']}", {"status": "confirmed"})
    print(f"OK  Sales Orders: {n} created")
    return ids

# ─── Invoices ─────────────────────────────────────────────────────────────────
def seed_invoices(H, cust_ids):
    inv_ids = []; n = 0
    svc = ["Consulting Services","Software License","Annual Maintenance","Training Services","Cloud Hosting","IT Support"]
    for cust_id in cust_ids:
        for _ in range(random.randint(1, 3)):
            items = [{"description": random.choice(svc), "quantity": random.randint(1,5),
                      "unit": "nos", "unit_price": random.choice([10000,25000,50000,75000,100000]),
                      "discount_percent": random.choice([0,5,10]), "tax_percent": 18}]
            res = post(H, "/sales/invoices", {
                "customer_id": cust_id,
                "due_date": fdate(60), "notes": "Payment as per agreed terms.", "items": items,
            })
            if res:
                n += 1
                inv_ids.append((res["id"], cust_id, res.get("total_amount", 50000)))
                if random.random() > 0.5:
                    put(H, f"/sales/invoices/{res['id']}", {"status": "sent"})
    print(f"OK  Invoices: {n} created")
    return inv_ids

# ─── Payments ─────────────────────────────────────────────────────────────────
def seed_payments(H, inv_ids):
    n = 0
    for (inv_id, cust_id, total) in inv_ids:
        if random.random() > 0.4:
            amt = float(total) * random.choice([0.5, 1.0])
            res = post(H, "/sales/payments", {
                "invoice_id": inv_id, "customer_id": cust_id, "amount": amt,
                "payment_mode": random.choice(["bank_transfer","upi","neft","rtgs","cheque"]),
                "reference_number": f"TXN{random.randint(100000,999999)}",
            })
            if res: n += 1
    print(f"OK  Payments: {n} created")

# ─── Finance Accounts ─────────────────────────────────────────────────────────
def seed_accounts(H):
    rows = [
        ("1001","Cash in Hand","asset","Current Assets",5000),
        ("1002","Bank - HDFC","asset","Current Assets",250000),
        ("1003","Bank - ICICI","asset","Current Assets",180000),
        ("1101","Accounts Receivable","asset","Current Assets",500000),
        ("1201","Inventory","asset","Current Assets",300000),
        ("1501","Furniture & Fixtures","asset","Fixed Assets",800000),
        ("1502","IT Equipment","asset","Fixed Assets",600000),
        ("2001","Accounts Payable","liability","Current Liabilities",200000),
        ("2002","GST Payable","liability","Current Liabilities",45000),
        ("2003","TDS Payable","liability","Current Liabilities",15000),
        ("2101","Bank Loan","liability","Long Term",1000000),
        ("3001","Share Capital","equity","Equity",2000000),
        ("3002","Retained Earnings","equity","Equity",500000),
        ("4001","Product Sales","revenue","Revenue",0),
        ("4002","Service Revenue","revenue","Revenue",0),
        ("5001","Cost of Goods Sold","expense","Direct",0),
        ("5002","Salaries & Wages","expense","Indirect",0),
        ("5003","Rent & Utilities","expense","Indirect",0),
        ("5004","Marketing","expense","Indirect",0),
        ("5005","Travel","expense","Indirect",0),
        ("5006","Professional Fees","expense","Indirect",0),
        ("5007","Office Supplies","expense","Indirect",0),
    ]
    ids = {}
    for (code, name, atype, group, bal) in rows:
        res = post(H, "/finance/accounts", {
            "account_code": code, "account_name": name,
            "account_type": atype, "account_group": group,
            "opening_balance": bal, "is_group": False,
        })
        if res: ids[code] = res["id"]
    print(f"OK  Accounts: {len(ids)} created")
    return ids

# ─── Journal Entries ──────────────────────────────────────────────────────────
def seed_journals(H, acc):
    n = 0
    entries = [
        ("Office rent payment", [("5003",50000,0),("1002",0,50000)]),
        ("Salary disbursement", [("5002",500000,0),("1002",0,500000)]),
        ("Sales revenue booking", [("1101",118000,0),("4001",0,100000),("2002",0,18000)]),
        ("Purchase of equipment", [("1502",85000,0),("1002",0,85000)]),
        ("Marketing spend", [("5004",25000,0),("1002",0,25000)]),
        ("Professional fees", [("5006",30000,0),("1002",0,30000)]),
        ("Travel reimbursement", [("5005",8500,0),("1001",0,8500)]),
        ("Office supplies", [("5007",5000,0),("1001",0,5000)]),
    ]
    for (desc, lines) in entries:
        line_data = [{"account_id": acc[code], "description": desc, "debit_amount": dr, "credit_amount": cr}
                     for (code, dr, cr) in lines if code in acc]
        if len(line_data) == len(lines):
            res = post(H, "/finance/journals", {
                "entry_date": rdate(0, 60), "description": desc,
                "entry_type": "manual", "reference": f"REF{random.randint(1000,9999)}",
                "lines": line_data,
            })
            if res: n += 1
    print(f"OK  Journal Entries: {n} created")

# ─── Expenses ─────────────────────────────────────────────────────────────────
def seed_expenses(H, emp_ids):
    categories = ["Travel","Office Supplies","Marketing","Software","Meals","Training","Repairs","Utilities","Rent"]
    vendors = ["IRCTC","Ola Business","Amazon Business","Microsoft","Google","Adobe","Local Vendor","Swiggy"]
    n = 0
    for _ in range(30):
        res = post(H, "/finance/expenses", {
            "expense_date": rdate(0, 90),
            "category": random.choice(categories),
            "description": f"{random.choice(categories)} for office operations",
            "amount": random.choice([500,1000,2500,5000,10000,15000,25000]),
            "currency": "INR",
            "payment_mode": random.choice(["credit_card","cash","bank_transfer","upi"]),
            "vendor_name": random.choice(vendors),
            "employee_id": random.choice(emp_ids) if emp_ids else None,
        })
        if res: n += 1
    print(f"OK  Expenses: {n} created")

# ─── Projects ─────────────────────────────────────────────────────────────────
def seed_projects(H, cust_ids, emp_ids):
    rows = [
        ("ERP Implementation - TCS","Full ERP rollout","in_progress",1000000),
        ("CRM Customization","Custom CRM module","planning",500000),
        ("Mobile App Development","React Native app","in_progress",750000),
        ("Data Migration - Wipro","Legacy data migration","completed",300000),
        ("API Integration - HDFC","Banking API integration","in_progress",400000),
        ("Cloud Migration","AWS cloud migration","planning",800000),
        ("HR Portal Development","Self-service HR portal","completed",250000),
        ("BI Dashboard","Business intelligence","in_progress",600000),
    ]
    ids = []
    for (name, desc, status, budget) in rows:
        res = post(H, "/projects/", {
            "name": name, "description": desc,
            "customer_id": random.choice(cust_ids) if cust_ids else None,
            "status": status,
            "start_date": rdate(30, 180),
            "end_date": fdate(180),
            "budget": budget,
            "project_manager_id": random.choice(emp_ids) if emp_ids else None,
        })
        if res: ids.append(res["id"])
    print(f"OK  Projects: {len(ids)} created")
    return ids

# ─── Tasks ────────────────────────────────────────────────────────────────────
def seed_tasks(H, proj_ids, emp_ids):
    task_names = ["Requirements Gathering","System Design","Frontend Development","Backend Development",
                  "Testing & QA","Deployment","User Training","Go Live Support","Data Migration","Documentation"]
    n = 0
    for proj_id in proj_ids:
        for name in random.sample(task_names, random.randint(3, 6)):
            res = post(H, "/projects/tasks", {
                "project_id": proj_id, "title": name,
                "description": f"Complete {name} for the project",
                "status": random.choice(["todo","in_progress","done","review"]),
                "priority": random.choice(["low","medium","high"]),
                "assigned_to": random.choice(emp_ids) if emp_ids else None,
                "due_date": fdate(60),
                "estimated_hours": random.choice([8,16,24,40,80]),
            })
            if res: n += 1
    print(f"OK  Tasks: {n} created")

# ─── Helpdesk Tickets ─────────────────────────────────────────────────────────
def seed_tickets(H):
    rows = [
        ("Cannot login to the system","Login not responding on Chrome.","high"),
        ("Invoice download not working","PDF download fails silently.","medium"),
        ("Payroll calculation wrong","ESI deduction incorrect for salary > 21000.","critical"),
        ("Need new user access","Create login for new accountant.","low"),
        ("Dashboard not loading","Spinner shows indefinitely.","high"),
        ("Export to Excel failing","Export gives 500 error with 1000+ records.","medium"),
        ("Mobile app crash on Android","Crashes on attendance screen Android 14.","high"),
        ("Password reset not working","Reset email not received.","medium"),
        ("Report date filter broken","Date range filter shows wrong data.","medium"),
        ("GST calculation mismatch","IGST vs CGST split incorrect for interstate.","high"),
        ("Bulk import failing","CSV import stops at row 50.","medium"),
        ("Notification emails not sent","PO approval notifications not reaching vendor.","medium"),
        ("Slow loading on mobile","App very slow on 4G.","low"),
        ("Currency rounding issue","Small rounding errors in totals.","low"),
        ("Session timeout too short","Logged out after 15 minutes of inactivity.","low"),
    ]
    n = 0
    for (title, desc, priority) in rows:
        res = post(H, "/helpdesk/tickets", {
            "title": title, "description": desc, "priority": priority,
            "status": random.choice(["open","in_progress","resolved","closed"]),
            "category": random.choice(["bug","support","access","billing","feature_request"]),
        })
        if res: n += 1
    print(f"OK  Tickets: {n} created")

# ─── Purchase Orders ──────────────────────────────────────────────────────────
def seed_purchase_orders(H, vendor_ids, prod_ids):
    n = 0
    descs = ["Office Supplies","IT Equipment","Furniture","Stationery","Electronics","Safety Equipment"]
    for _ in range(15):
        items = [{"description": random.choice(descs), "quantity": random.randint(1,20),
                  "unit": "pcs", "unit_price": random.choice([500,1000,5000,10000,25000]),
                  "tax_percent": 18} for _ in range(random.randint(1,3))]
        res = post(H, "/procurement/orders", {
            "vendor_id": random.choice(vendor_ids),
            "expected_date": fdate(30),
            "payment_terms": random.choice([15,30,45]),
            "notes": "Standard purchase order",
            "items": items,
        })
        if res:
            n += 1
            if random.random() > 0.4:
                put(H, f"/procurement/orders/{res['id']}", {"status": "approved"})
    print(f"OK  Purchase Orders: {n} created")

# ─── Assets ───────────────────────────────────────────────────────────────────
def seed_assets(H):
    rows = [
        ("Dell PowerEdge Server","Server","IT Equipment","SVR001","IT"),
        ("MacBook Pro 16-inch","Laptop","IT Equipment","LAP001","Engineering"),
        ("HP LaserJet Printer","Printer","IT Equipment","PRT001","Operations"),
        ("Conference Room Table","Furniture","Furniture","FUR001","Admin"),
        ("Reception Sofa Set","Furniture","Furniture","FUR002","Admin"),
        ("Security Camera System","Camera","IT Equipment","CAM001","Security"),
        ("Air Conditioning Unit","AC","HVAC","AC001","Admin"),
        ("Industrial UPS 20KVA","UPS","IT Equipment","UPS001","IT"),
        ("Projector + Screen","Projector","IT Equipment","PRJ001","Admin"),
        ("Office Generator 25KVA","Generator","Electrical","GEN001","Operations"),
    ]
    n = 0
    for (name, atype, cat, tag, dept) in rows:
        res = post(H, "/assets/", {
            "asset_name": name, "asset_type": atype, "category": cat,
            "asset_tag": tag, "department": dept,
            "purchase_date": rdate(30, 1000),
            "purchase_cost": random.choice([10000,25000,50000,85000,100000,200000]),
            "current_value": random.choice([5000,15000,35000,60000,75000,150000]),
            "status": random.choice(["active","active","under_maintenance"]),
            "warranty_expiry": fdate(730),
            "location": random.choice(["Head Office","Branch Office","Server Room","Warehouse"]),
        })
        if res: n += 1
    print(f"OK  Assets: {n} created")

# ─── Documents ────────────────────────────────────────────────────────────────
def seed_documents(H):
    rows = [
        ("Employee Handbook 2024","policy","HR"),
        ("IT Security Policy","policy","IT"),
        ("Financial Procedures Manual","procedure","Finance"),
        ("Sales Process Guide","procedure","Sales"),
        ("Purchase Order Template","template","Procurement"),
        ("Invoice Template GST","template","Finance"),
        ("NDA Template","legal","Legal"),
        ("Service Agreement Template","legal","Legal"),
        ("Company Profile Presentation","marketing","Marketing"),
        ("Product Brochure 2024","marketing","Marketing"),
    ]
    n = 0
    for (title, dtype, dept) in rows:
        res = post(H, "/documents/", {
            "title": title, "document_type": dtype, "department": dept,
            "version": "1.0", "description": f"Official {title}",
            "tags": [dept.lower(), dtype], "is_public": random.choice([True, False]),
        })
        if res: n += 1
    print(f"OK  Documents: {n} created")

# ─── Quality Checks ───────────────────────────────────────────────────────────
def seed_quality(H, prod_ids):
    n = 0
    for pid in (prod_ids[:8] if prod_ids else []):
        res = post(H, "/quality/checks", {
            "product_id": pid,
            "check_type": random.choice(["incoming","in_process","outgoing"]),
            "reference_type": "purchase_order", "reference_id": random.randint(1, 10),
            "inspector": random.choice(["QA Team","Internal Audit","Third Party"]),
            "result": random.choice(["pass","pass","fail","conditional_pass"]),
            "remarks": random.choice(["All params within spec","Minor deviation","Passed all checks"]),
            "check_date": rdate(0, 30),
        })
        if res: n += 1
    print(f"OK  Quality Checks: {n} created")

# ─── Manufacturing BOMs ───────────────────────────────────────────────────────
def seed_boms(H, prod_ids):
    n = 0
    if len(prod_ids) < 5: return
    for i in range(3):
        fin = prod_ids[i]
        comps = [{"component_id": prod_ids[-(j+1)], "quantity": random.randint(1,5),
                  "unit": "pcs", "wastage_percent": random.choice([0,2,5])}
                 for j in range(min(3, len(prod_ids)-1))]
        res = post(H, "/manufacturing/boms", {
            "product_id": fin, "version": "1.0",
            "description": "Standard BOM", "components": comps,
        })
        if res: n += 1
    print(f"OK  BOMs: {n} created")

# ─── Work Orders ──────────────────────────────────────────────────────────────
def seed_workorders(H, prod_ids):
    n = 0
    for pid in (prod_ids[:5] if prod_ids else []):
        res = post(H, "/manufacturing/workorders", {
            "product_id": pid,
            "quantity": random.randint(10, 100),
            "planned_start": rdate(0, 30),
            "planned_end": fdate(30),
            "status": random.choice(["draft","in_progress","completed"]),
            "priority": random.choice(["low","medium","high"]),
        })
        if res: n += 1
    print(f"OK  Work Orders: {n} created")

# ─── Payroll ──────────────────────────────────────────────────────────────────
def seed_payroll(H, emp_ids):
    n = 0
    for emp_id in emp_ids[:10]:
        for month in range(1, 4):
            res = post(H, "/hr/payroll", {
                "employee_id": emp_id,
                "month": month, "year": 2025,
                "basic_salary": random.choice([45000,55000,60000,70000,85000,95000]),
                "hra": random.choice([18000,22000,24000,28000,34000,38000]),
                "other_allowances": random.choice([4500,5500,6000,7000,8500,9500]),
                "pf_deduction": random.choice([5400,6600,7200,8400,10200,11400]),
                "esi_deduction": random.choice([0,0,0,750,1000]),
                "tds_deduction": random.choice([0,0,2000,3000,5000]),
                "status": random.choice(["paid","paid","pending"]),
            })
            if res: n += 1
    print(f"OK  Payroll: {n} records")

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("\n=== Seeding SMEPRO360 with full demo data ===\n")
    H = login()

    cust_ids = seed_customers(H)
    seed_leads(H)
    prod_ids = seed_products(H)
    dept_ids = seed_departments(H)
    emp_ids = seed_employees(H, dept_ids)
    vendor_ids = seed_vendors(H)

    seed_attendance(H, emp_ids)
    seed_leaves(H, emp_ids)
    seed_payroll(H, emp_ids)
    seed_expenses(H, emp_ids)

    seed_sales_orders(H, cust_ids, prod_ids)
    inv_ids = seed_invoices(H, cust_ids)
    seed_payments(H, inv_ids)

    acc_ids = seed_accounts(H)
    seed_journals(H, acc_ids)

    proj_ids = seed_projects(H, cust_ids, emp_ids)
    seed_tasks(H, proj_ids, emp_ids)

    seed_purchase_orders(H, vendor_ids, prod_ids)
    seed_boms(H, prod_ids)
    seed_workorders(H, prod_ids)
    seed_quality(H, prod_ids)
    seed_assets(H)
    seed_documents(H)
    seed_tickets(H)

    print("\n=== Seeding COMPLETE! ===")
    print("Frontend:  http://localhost:3000")
    print("API Docs:  http://localhost:8000/docs")
    print("Login:     admin@smepro360.com / Admin@123456\n")

if __name__ == "__main__":
    main()
