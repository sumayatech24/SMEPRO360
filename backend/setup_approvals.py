"""Setup approval workflows, authorities, manager hierarchy, document categories"""
from app.db.base import engine, Base, SessionLocal
from app.models import *
from app.models.approval import (
    ApprovalWorkflow, ApprovalStep, ApprovalAuthority,
    ManagerHierarchy, DocumentCategory
)
from app.models.hr import Employee

Base.metadata.create_all(bind=engine)
print("Tables created")

db = SessionLocal()

# ── Standard Approval Workflows ────────────────────────────────────────────────
workflows = [
    {
        "name": "Leave Request Approval",
        "workflow_type": "leave_request",
        "description": "Employee leave requests go to direct manager, then HR Manager",
        "steps": [
            {"step_order": 1, "step_name": "Direct Manager Approval", "approver_type": "direct_manager", "is_mandatory": True, "auto_approve_days": 3},
            {"step_order": 2, "step_name": "HR Manager Approval", "approver_type": "hr_manager", "is_mandatory": True, "auto_approve_days": 2},
        ]
    },
    {
        "name": "Purchase Order Approval",
        "workflow_type": "purchase_order",
        "description": "POs go to dept head, then Finance Manager, then Director for high value",
        "steps": [
            {"step_order": 1, "step_name": "Department Head Approval", "approver_type": "department_head", "is_mandatory": True, "auto_approve_days": 2},
            {"step_order": 2, "step_name": "Finance Manager Approval", "approver_type": "finance_manager", "is_mandatory": True, "auto_approve_days": 2},
            {"step_order": 3, "step_name": "Director Final Approval", "approver_type": "role", "approver_role": "management", "is_mandatory": False, "can_skip": True, "auto_approve_days": 5},
        ]
    },
    {
        "name": "Expense Claim Approval",
        "workflow_type": "expense_claim",
        "description": "Expense claims reviewed by manager and finance",
        "steps": [
            {"step_order": 1, "step_name": "Reporting Manager Approval", "approver_type": "direct_manager", "is_mandatory": True, "auto_approve_days": 3},
            {"step_order": 2, "step_name": "Finance Team Approval", "approver_type": "finance_manager", "is_mandatory": True, "auto_approve_days": 2},
        ]
    },
    {
        "name": "Attendance Regularization",
        "workflow_type": "attendance_regularization",
        "description": "Attendance corrections approved by direct manager",
        "steps": [
            {"step_order": 1, "step_name": "Manager Approval", "approver_type": "direct_manager", "is_mandatory": True, "auto_approve_days": 2},
        ]
    },
    {
        "name": "Sales Order Approval",
        "workflow_type": "sales_order",
        "description": "Sales orders above threshold need manager approval",
        "steps": [
            {"step_order": 1, "step_name": "Sales Manager Approval", "approver_type": "role", "approver_role": "sales_manager", "is_mandatory": True, "auto_approve_days": 1},
        ]
    },
    {
        "name": "Invoice Approval",
        "workflow_type": "invoice",
        "description": "Invoices approved by Finance Manager before sending",
        "steps": [
            {"step_order": 1, "step_name": "Finance Manager Review", "approver_type": "finance_manager", "is_mandatory": True, "auto_approve_days": 2},
        ]
    },
    {
        "name": "Document / Policy Approval",
        "workflow_type": "document",
        "description": "Official documents need dept head and HR/Legal review",
        "steps": [
            {"step_order": 1, "step_name": "Department Head Review", "approver_type": "department_head", "is_mandatory": True, "auto_approve_days": 5},
            {"step_order": 2, "step_name": "HR / Legal Review", "approver_type": "hr_manager", "is_mandatory": True, "auto_approve_days": 5},
        ]
    },
    {
        "name": "Asset Disposal Approval",
        "workflow_type": "asset_disposal",
        "description": "Asset disposal needs IT and Finance approval",
        "steps": [
            {"step_order": 1, "step_name": "IT Manager Approval", "approver_type": "role", "approver_role": "inventory_manager", "is_mandatory": True},
            {"step_order": 2, "step_name": "Finance Approval", "approver_type": "finance_manager", "is_mandatory": True},
        ]
    },
]

n = 0
for wf_data in workflows:
    steps_data = wf_data.pop("steps")
    wf = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.workflow_type == wf_data["workflow_type"]).first()
    if not wf:
        wf = ApprovalWorkflow(**wf_data)
        db.add(wf)
        db.flush()
        for step_data in steps_data:
            step = ApprovalStep(workflow_id=wf.id, **step_data)
            db.add(step)
        n += 1
print(f"Workflows: {n} created ({db.query(ApprovalWorkflow).count()} total)")

# ── Manager Hierarchy ─────────────────────────────────────────────────────────
employees = db.query(Employee).filter(Employee.is_active == True).all()
print(f"Setting up hierarchy for {len(employees)} employees")

if employees:
    emp_list = employees
    # First employee becomes a manager of others
    # Set up a realistic hierarchy
    managers = emp_list[:5]  # First 5 are managers
    staff = emp_list[5:]

    m = 0
    for i, emp in enumerate(managers):
        h = db.query(ManagerHierarchy).filter(ManagerHierarchy.employee_id == emp.id).first()
        if not h:
            h = ManagerHierarchy(
                employee_id=emp.id,
                reporting_manager_id=managers[0].id if i > 0 else None,  # All report to first
                is_department_head=(i < 3),
                is_hr_manager=(i == 3),
                is_finance_approver=(i == 4),
                approval_limit=500000 if i == 0 else (200000 if i < 3 else 100000),
            )
            db.add(h); m += 1

    for i, emp in enumerate(staff):
        h = db.query(ManagerHierarchy).filter(ManagerHierarchy.employee_id == emp.id).first()
        if not h:
            manager = managers[i % len(managers)]
            h = ManagerHierarchy(
                employee_id=emp.id,
                reporting_manager_id=manager.id,
                is_department_head=False,
                approval_limit=0,
            )
            db.add(h); m += 1
    print(f"Manager Hierarchy: {m} entries created")

# ── Approval Authorities (grant to admin user) ─────────────────────────────────
from app.models.user import User as UserModel
admin = db.query(UserModel).filter(UserModel.is_superuser == True).first()
if admin:
    workflow_types = ["leave_request","purchase_order","expense_claim","sales_order",
                      "invoice","document","attendance_regularization","asset_disposal","policy_review"]
    auth_n = 0
    for wt in workflow_types:
        existing = db.query(ApprovalAuthority).filter(
            ApprovalAuthority.user_id == admin.id,
            ApprovalAuthority.workflow_type == wt
        ).first()
        if not existing:
            db.add(ApprovalAuthority(
                user_id=admin.id, workflow_type=wt, scope="all",
                max_amount=0, can_approve=True, can_reject=True, can_delegate=True,
                granted_by=admin.id
            ))
            auth_n += 1
    print(f"Authorities: {auth_n} granted to admin")

# ── Document Categories ────────────────────────────────────────────────────────
doc_categories = [
    ("HR Policies",           "HR-POL",  None, "HR",           True,  7, True),
    ("HR Templates",          "HR-TMPL", None, "HR",           False, 3, False),
    ("Employee Contracts",    "HR-CON",  None, "HR",           True,  10, True),
    ("Payroll Documents",     "FIN-PAY", None, "Finance",      True,  7,  True),
    ("Financial Statements",  "FIN-STM", None, "Finance",      True,  10, True),
    ("Tax Documents",         "FIN-TAX", None, "Finance",      True,  8,  True),
    ("Invoices & Receipts",   "FIN-INV", None, "Finance",      False, 7,  False),
    ("Sales Contracts",       "SLS-CON", None, "Sales",        True,  7,  True),
    ("Purchase Agreements",   "PRO-AGR", None, "Procurement",  True,  7,  True),
    ("NDA & Legal",           "LGL-NDA", None, "Legal",        True,  10, True),
    ("Service Agreements",    "LGL-SVC", None, "Legal",        True,  7,  True),
    ("IT Security Policies",  "IT-SEC",  None, "IT",           True,  5,  True),
    ("IT Procedures",         "IT-PROC", None, "IT",           False, 3,  False),
    ("Project Documents",     "PRJ-DOC", None, "Operations",   False, 5,  False),
    ("Meeting Minutes",       "OPS-MIN", None, "Operations",   False, 3,  False),
    ("Marketing Materials",   "MKT-MAT", None, "Marketing",    False, 3,  False),
    ("Training Materials",    "TRN-MAT", None, "HR",           False, 3,  False),
    ("Quality Manuals",       "QA-MAN",  None, "Quality",      True,  5,  False),
    ("SOPs",                  "OPS-SOP", None, "Operations",   True,  5,  False),
    ("Audit Reports",         "AUD-REP", None, "Finance",      True,  7,  True),
]
cn = 0
for (name, code, parent_id, dept, req_approval, retention, confidential) in doc_categories:
    if not db.query(DocumentCategory).filter(DocumentCategory.code == code).first():
        db.add(DocumentCategory(
            name=name, code=code, parent_id=parent_id, department=dept,
            requires_approval=req_approval, retention_years=retention, is_confidential=confidential
        ))
        cn += 1
print(f"Document Categories: {cn} created")

db.commit()
print("Setup complete!")
db.close()
