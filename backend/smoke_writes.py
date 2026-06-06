"""
Write-operation smoke test — exercises the POST/PUT actions behind UI buttons
across every module. Reports each as OK / FAIL with the error, so we can fix
the genuinely broken features. Runs against :8000 (Supabase-backed).
"""
import requests, random
from datetime import datetime, timedelta
B = "http://localhost:8000/api/v1"
H = {"Authorization": "Bearer " + requests.post(B+"/auth/login", json={"email":"admin@smepro360.com","password":"Admin@123456"}).json()["access_token"]}
def d(days=10): return (datetime.now()+timedelta(days=days)).strftime("%Y-%m-%d")
results=[]
def t(label, method, path, payload=None):
    try:
        r = requests.request(method, B+path, json=payload, headers=H, timeout=25)
        ok = r.status_code in (200,201)
        results.append((ok, label, r.status_code, "" if ok else str(r.text)[:140]))
        return r.json() if ok and r.text else None
    except Exception as e:
        results.append((False, label, "EXC", str(e)[:140])); return None

# gather ids
cust = requests.get(B+"/crm/customers?limit=1",headers=H).json()["items"][0]["id"]
vend = requests.get(B+"/procurement/vendors?limit=1",headers=H).json()["items"][0]["id"]
prod = requests.get(B+"/inventory/products?limit=1",headers=H).json()["items"][0]["id"]
emp  = requests.get(B+"/hr/employees?limit=1",headers=H).json()["items"][0]["id"]
proj = requests.get(B+"/projects/?limit=1",headers=H).json()["items"][0]["id"]

# CRM
c = t("CRM create customer","POST","/crm/customers",{"company_name":"Smoke Co","industry":"IT","city":"Pune","state":"MH","customer_type":"corporate","email":"smoke@x.com"})
if c: t("CRM update customer","PUT",f"/crm/customers/{c['id']}",{"city":"Mumbai"})
t("CRM create contact","POST","/crm/contacts",{"customer_id":cust,"name":"John Smoke","email":"j@x.com","designation":"CTO","phone":"+91 90000 00000"})
t("CRM create opportunity","POST","/crm/opportunities",{"customer_id":cust,"name":"Big Deal","stage":"qualification","amount":500000,"probability":40})
# Leads
l = t("Lead create","POST","/leads/",{"company_name":"Smoke Lead","contact_name":"Lead Guy","email":"lead@x.com","phone":"+91 91111 11111","source":"website","status":"new","estimated_value":100000})
if l: t("Lead update status","PUT",f"/leads/{l['id']}",{"status":"qualified"})
# Sales
so = t("Sales order create","POST","/sales/orders",{"customer_id":cust,"delivery_date":d(15),"payment_terms":"30 days","items":[{"description":"Item","quantity":2,"unit":"pcs","unit_price":1000,"tax_percent":18}]})
if so: t("Sales order confirm","PUT",f"/sales/orders/{so['id']}",{"status":"confirmed"})
inv = t("Invoice create","POST","/sales/invoices",{"customer_id":cust,"due_date":d(30),"items":[{"description":"Svc","quantity":1,"unit":"nos","unit_price":50000,"tax_percent":18}]})
if inv:
    t("Invoice mark sent","PUT",f"/sales/invoices/{inv['id']}",{"status":"sent"})
    t("Payment create","POST","/sales/payments",{"invoice_id":inv["id"],"customer_id":cust,"amount":25000,"payment_mode":"neft","reference_number":"TXN123"})
# Procurement
po = t("PO create","POST","/procurement/orders",{"vendor_id":vend,"expected_delivery":d(20),"items":[{"description":"Raw","quantity":10,"unit":"pcs","unit_price":500,"tax_percent":18}]})
# Inventory
p = t("Product create","POST","/inventory/products",{"name":"Smoke Product","sku":f"SKU-{random.randint(1000,9999)}","category":"General","unit_price":1200,"cost_price":800,"unit":"pcs"})
t("Stock adjust","POST","/inventory/stock/adjust",{"product_id":prod,"quantity":50,"movement_type":"in","notes":"smoke"})
# Manufacturing
bom = t("BOM create","POST","/manufacturing/boms",{"name":"Smoke BOM","product_id":prod,"quantity":1,"unit":"nos","items":[]})
t("Work order create","POST","/manufacturing/workorders",{"product_id":prod,"planned_quantity":100,"priority":"normal","planned_start":d(1),"planned_end":d(10)})
# Finance
acc = t("Account create","POST","/finance/accounts",{"account_code":f"99{random.randint(10,99)}","account_name":"Smoke Acct","account_type":"asset","account_group":"Current Assets"})
t("Expense create","POST","/finance/expenses",{"category":"travel","amount":5000,"description":"Smoke expense","expense_date":d(-2),"payment_mode":"cash"})
# HR
t("Leave apply","POST","/hr/leaves",{"employee_id":emp,"leave_type":"casual","from_date":d(2),"to_date":d(4),"reason":"smoke"})
t("Attendance mark","POST","/hr/attendance",{"employee_id":emp,"date":d(0),"status":"present","check_in":"09:30","check_out":"18:30"})
# Projects
pr = t("Project create","POST","/projects/",{"name":"Smoke Project","project_type":"it_services","status":"planning","priority":"medium","start_date":d(-10),"end_date":d(60),"budget":100000,"project_manager_id":1})
if pr:
    t("Task create","POST","/projects/tasks",{"project_id":pr["id"],"title":"Smoke Task","status":"todo","priority":"medium","assigned_to":1,"due_date":d(10)})
    t("Timesheet log","POST","/projects/timesheets",{"project_id":pr["id"],"hours":4,"description":"smoke","billable":True,"date":d(0)})
# Helpdesk
tk = t("Ticket create","POST","/helpdesk/tickets",{"subject":"Smoke ticket","description":"x","priority":"medium","category":"technical","status":"open"})
# Assets
t("Asset create","POST","/assets/",{"name":"Smoke Asset","asset_code":f"AST-{random.randint(1000,9999)}","category":"IT Equipment","purchase_price":50000,"purchase_date":d(-30),"status":"active"})
# Tax
tt = t("Tax type create","POST","/tax/types",{"name":"SmokeTax","code":f"ST{random.randint(10,99)}","tax_category":"indirect"})
# Approvals
t("Approval workflow create","POST","/approvals/workflows",{"name":"Smoke WF","workflow_type":"expense","levels":2,"description":"x"})
# Payroll v2
t("Global payroll run","POST","/payroll-v2/payroll-run",{"month":5,"year":2026})
# Skills / appraisal
sk = t("Skill add to employee","POST",f"/hr-skills/employee/{emp}/skills",{"skill_name":"SmokeSkill","proficiency":"advanced","years_experience":3})
t("Education add","POST",f"/hr-skills/employee/{emp}/education",{"degree":"B.Tech","specialization":"CS","institution":"IIT","year_from":2010,"year_to":2014,"grade":"80%"})
ac = t("Appraisal cycle create","POST","/hr-skills/appraisal/cycles",{"name":"Q2 2026","cycle_type":"quarterly","financial_year":"2026-27","period_label":"Q2 2026"})
if ac: t("KRA add","POST",f"/hr-skills/appraisal/cycles/{ac['id']}/kras",{"kra_name":"Delivery","weightage":30,"target_value":"95%","kpi_type":"quantitative"})
# My space
t("MySpace check-in","POST","/my-space/attendance/checkin",{})
t("MySpace apply leave","POST","/my-space/leaves/apply",{"leave_type":"casual","from_date":d(5),"to_date":d(6),"reason":"smoke"})
# HR v2
t("Onboarding start","POST",f"/hr-v2/onboarding/start/{emp}",{})
t("Training course create","POST","/hr-v2/training/courses",{"title":"Smoke Course","code":f"SC{random.randint(100,999)}","category":"technical","duration_hours":4})
# Clients
t("Client onboard","POST","/clients/onboard",{"company_name":"Smoke Client Ltd","trade_name":"SmokeC","country":"India","country_code":"IN","currency":"INR","email":f"sc{random.randint(100,999)}@x.com","admin_name":"Admin","admin_email":f"adm{random.randint(1000,9999)}@x.com","admin_password":"Smoke@12345","plan":"professional"})

# Report
okc = sum(1 for r in results if r[0]); bad=[r for r in results if not r[0]]
print(f"\n{'='*60}\nWRITE SMOKE TEST: {okc}/{len(results)} OK\n{'='*60}")
for ok,label,code,err in results:
    if not ok: print(f"FAIL [{code}] {label}\n      {err}")
print(f"\n{len(bad)} broken write action(s)" if bad else "\nALL WRITE ACTIONS WORKING")
