"""
Corrective seeder — fills the entities seed_data.py missed (wrong payloads).
Runs against whatever backend is on :8000 (which is pointed at Supabase).
All data created via the real API.
"""
import sys, random, requests
from datetime import datetime, timedelta

B = "http://localhost:8000/api/v1"

def login():
    r = requests.post(f"{B}/auth/login", json={"email":"admin@smepro360.com","password":"Admin@123456"})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

def post(H, path, data, label=""):
    r = requests.post(f"{B}{path}", json=data, headers=H)
    if r.status_code == 200: return r.json()
    print(f"  FAIL {label or path} [{r.status_code}] {str(r.text)[:160]}")
    return None

def put(H, path, data):
    requests.put(f"{B}{path}", json=data, headers=H)

def rdate(lo, hi): return (datetime.now()-timedelta(days=random.randint(lo,hi))).strftime("%Y-%m-%d")
def fdate(d):      return (datetime.now()+timedelta(days=random.randint(1,d))).strftime("%Y-%m-%d")

def main():
    H = login()
    emps = requests.get(f"{B}/hr/employees?limit=100", headers=H).json()["items"]
    emp_ids = [e["id"] for e in emps]
    custs = requests.get(f"{B}/crm/customers?limit=100", headers=H).json()["items"]
    cust_ids = [c["id"] for c in custs]
    vends = requests.get(f"{B}/procurement/vendors?limit=100", headers=H).json()["items"]
    vend_ids = [v["id"] for v in vends]
    prods = requests.get(f"{B}/inventory/products?limit=100", headers=H).json()["items"]
    prod_ids = [p["id"] for p in prods]

    # ── Leaves (correct field names) ──
    n = 0
    for emp_id in emp_ids:
        for _ in range(random.randint(1,3)):
            start = datetime.now()-timedelta(days=random.randint(5,90))
            days = random.randint(1,5)
            res = post(H, "/hr/leaves", {
                "employee_id": emp_id,
                "leave_type": random.choice(["annual","sick","casual","emergency"]),
                "from_date": start.strftime("%Y-%m-%d"),
                "to_date": (start+timedelta(days=days)).strftime("%Y-%m-%d"),
                "reason": random.choice(["Medical","Family function","Personal","Vacation"]),
            }, "leave")
            if res: n += 1
    print(f"OK  Leaves: {n}")

    # ── Payroll (run for recent months) ──
    pn = 0
    for (m, y) in [(3,2026),(4,2026),(5,2026)]:
        r = requests.post(f"{B}/hr/payroll/run?month={m}&year={y}", headers=H)
        if r.status_code == 200: pn += 1
        else: print(f"  FAIL payroll {m}/{y} [{r.status_code}] {r.text[:120]}")
    print(f"OK  Payroll runs: {pn}")

    # ── Projects (industry-agnostic) ──
    proj_rows = [
        ("ERP Implementation - TCS","Full ERP rollout","in_progress","erp_crm",1000000),
        ("CRM Customization","Custom CRM module","planning","it_services",500000),
        ("Mobile App Development","React Native app","in_progress","it_services",750000),
        ("Plant Expansion - Pune","New production line","in_progress","manufacturing",3000000),
        ("Office Tower Construction","12-storey commercial","planning","construction",8000000),
        ("Cloud Migration","AWS cloud migration","planning","it_services",800000),
        ("HR Portal Development","Self-service HR portal","completed","it_services",250000),
        ("BI Dashboard","Business intelligence","in_progress","it_services",600000),
    ]
    proj_ids = []
    for (name, desc, status, ptype, budget) in proj_rows:
        res = post(H, "/projects/", {
            "name": name, "description": desc, "project_type": ptype,
            "customer_id": random.choice(cust_ids) if cust_ids else None,
            "status": status, "priority": random.choice(["high","medium","low"]),
            "start_date": rdate(30,180), "end_date": fdate(180),
            "budget": budget,
            "project_manager_id": random.choice(emp_ids) if emp_ids else None,
        }, "project")
        if res: proj_ids.append(res["id"])
    print(f"OK  Projects: {len(proj_ids)}")

    # ── Tasks ──
    task_titles = ["Requirement Analysis","System Design","Development Sprint 1","Development Sprint 2",
                   "Integration Testing","UAT","Deployment","Documentation","Code Review","Bug Fixes"]
    tn = 0
    for pid in proj_ids:
        for _ in range(random.randint(3,6)):
            res = post(H, "/projects/tasks", {
                "project_id": pid, "title": random.choice(task_titles),
                "description": "Auto-seeded task",
                "status": random.choice(["todo","in_progress","done","review"]),
                "priority": random.choice(["high","medium","low"]),
                "assigned_to": random.choice(emp_ids),
                "due_date": fdate(60), "estimated_hours": random.choice([8,16,24,40]),
            }, "task")
            if res: tn += 1
    print(f"OK  Tasks: {tn}")

    # ── Purchase Orders ──
    pon = 0
    for _ in range(15):
        items = [{"description": random.choice(["Raw Steel","Components","Packaging","Electronics","Tools"]),
                  "quantity": random.randint(5,50), "unit": "pcs",
                  "unit_price": random.choice([500,1000,2500,5000]), "tax_percent": 18}
                 for _ in range(random.randint(1,3))]
        res = post(H, "/procurement/orders", {
            "vendor_id": random.choice(vend_ids),
            "expected_delivery": fdate(30), "notes": "Standard PO terms",
            "items": items,
        }, "PO")
        if res: pon += 1
    print(f"OK  Purchase Orders: {pon}")

    # ── BOMs ──
    bom_ids = []
    for pid in prod_ids[:8]:
        comp = [pp for pp in prod_ids if pp != pid]
        items = [{"product_id": random.choice(comp), "quantity": random.randint(1,5),
                  "unit": "nos", "scrap_percent": random.choice([0,2,5])}
                 for _ in range(random.randint(2,4))] if comp else []
        res = post(H, "/manufacturing/boms", {
            "name": f"BOM for product {pid}", "product_id": pid,
            "quantity": 1, "unit": "nos", "version": "1.0", "items": items,
        }, "BOM")
        if res: bom_ids.append(res["id"])
    print(f"OK  BOMs: {len(bom_ids)}")

    # ── Work Orders ──
    won = 0
    for _ in range(10):
        pid = random.choice(prod_ids)
        res = post(H, "/manufacturing/workorders", {
            "product_id": pid, "bom_id": random.choice(bom_ids) if bom_ids else None,
            "planned_quantity": random.randint(50,500),
            "priority": random.choice(["high","normal","low"]),
            "planned_start": rdate(1,30), "planned_end": fdate(30),
        }, "WO")
        if res: won += 1
    print(f"OK  Work Orders: {won}")

    # ── Assets ──
    asset_rows = [
        ("Dell Latitude 5540","IT Equipment",85000),("MacBook Pro 14","IT Equipment",185000),
        ("HP LaserJet Pro","Office Equipment",35000),("Conference TV 65in","Office Equipment",95000),
        ("Toyota Innova","Vehicle",2200000),("Forklift Toyota","Machinery",1800000),
        ("Air Conditioner 2T","Facility",65000),("Server Dell R750","IT Equipment",450000),
        ("Office Desk Set","Furniture",25000),("CNC Machine","Machinery",3500000),
    ]
    an = 0
    for i,(name,cat,price) in enumerate(asset_rows):
        res = post(H, "/assets/", {
            "name": name, "asset_code": f"AST-{i+1:04d}", "category": cat,
            "purchase_price": price, "purchase_date": rdate(30,720),
            "status": "active", "location": random.choice(["HO Mumbai","Pune Plant","Bengaluru Office"]),
        }, "asset")
        if res: an += 1
    print(f"OK  Assets: {an}")

    # ── Tickets ──
    tk_rows = [
        ("Cannot login to portal","Password reset not working","high","technical"),
        ("Invoice PDF not generating","Error on download","medium","billing"),
        ("Request new laptop","Hardware upgrade needed","low","hardware"),
        ("Email not syncing","Outlook issues","medium","technical"),
        ("Add new user access","Onboarding new joinee","medium","access"),
        ("Payroll discrepancy","TDS calculation query","high","payroll"),
        ("VPN connection drops","Remote access unstable","high","network"),
        ("Printer offline","3rd floor printer","low","hardware"),
        ("Software license renewal","Adobe expiring","medium","procurement"),
        ("Data export request","Need Q1 sales report","low","reports"),
    ]
    tkn = 0
    for (subj, desc, pri, cat) in tk_rows:
        res = post(H, "/helpdesk/tickets", {
            "subject": subj, "description": desc, "priority": pri,
            "category": cat, "status": random.choice(["open","in_progress","resolved"]),
        }, "ticket")
        if res: tkn += 1
    print(f"OK  Tickets: {tkn}")

    print("\n=== GAP SEED COMPLETE ===")

if __name__ == "__main__":
    main()
