"""
Seed all ERP roles and permissions.
Called from init_db and from the /admin/rbac/seed endpoint.
"""
from sqlalchemy.orm import Session
from app.models.user import Role, Permission, User, role_permissions
import logging

logger = logging.getLogger(__name__)

# ── All modules and their available actions ───────────────────────────────────
# Format: (module, action, description, confidentiality)
ALL_PERMISSIONS = [
    # ── Dashboard ─────────────────────────────────────────────────────────────
    ("dashboard", "view",          "View dashboard KPIs and charts",                    "internal"),
    ("dashboard", "view_financial","View financial KPIs on dashboard",                  "confidential"),

    # ── Leads ─────────────────────────────────────────────────────────────────
    ("leads", "view",     "View leads list and details",           "internal"),
    ("leads", "create",   "Create new leads",                      "internal"),
    ("leads", "update",   "Edit existing leads",                   "internal"),
    ("leads", "delete",   "Delete (soft) leads",                   "confidential"),
    ("leads", "export",   "Export leads to Excel",                 "confidential"),
    ("leads", "assign",   "Assign leads to other users",           "internal"),
    ("leads", "convert",  "Convert lead to customer",              "internal"),
    ("leads", "view_all", "View all leads (not just assigned)",    "confidential"),

    # ── CRM / Customers ───────────────────────────────────────────────────────
    ("crm", "view",            "View customers and opportunities",   "internal"),
    ("crm", "create",          "Create customers",                   "internal"),
    ("crm", "update",          "Edit customers",                     "internal"),
    ("crm", "delete",          "Delete customers",                   "confidential"),
    ("crm", "export",          "Export customer data",               "confidential"),
    ("crm", "view_credit",     "View customer credit limits/terms",  "confidential"),
    ("crm", "update_credit",   "Update credit limits",               "restricted"),

    # ── Sales ─────────────────────────────────────────────────────────────────
    ("sales", "view",          "View sales orders and invoices",     "internal"),
    ("sales", "create_order",  "Create sales orders",                "internal"),
    ("sales", "approve_order", "Approve/confirm sales orders",       "confidential"),
    ("sales", "create_invoice","Raise invoices",                     "internal"),
    ("sales", "approve_invoice","Approve invoices",                  "confidential"),
    ("sales", "view_payments", "View payment records",               "confidential"),
    ("sales", "record_payment","Record customer payments",           "confidential"),
    ("sales", "export",        "Export sales data",                  "confidential"),
    ("sales", "delete",        "Cancel/delete orders",               "restricted"),
    ("sales", "view_pricing",  "View cost prices and margins",       "restricted"),

    # ── Procurement ───────────────────────────────────────────────────────────
    ("procurement", "view",           "View vendors and POs",                 "internal"),
    ("procurement", "create_vendor",  "Add new vendors",                      "internal"),
    ("procurement", "update_vendor",  "Edit vendor details",                  "internal"),
    ("procurement", "delete_vendor",  "Deactivate vendors",                   "confidential"),
    ("procurement", "create_po",      "Create purchase orders",               "internal"),
    ("procurement", "approve_po",     "Approve purchase orders",              "confidential"),
    ("procurement", "receive_goods",  "Mark goods as received (GRN)",         "internal"),
    ("procurement", "export",         "Export procurement data",              "confidential"),
    ("procurement", "view_pricing",   "View vendor pricing/negotiations",     "restricted"),

    # ── Inventory ─────────────────────────────────────────────────────────────
    ("inventory", "view",          "View products and stock",            "internal"),
    ("inventory", "create",        "Add new products",                   "internal"),
    ("inventory", "update",        "Edit product details",               "internal"),
    ("inventory", "delete",        "Deactivate products",                "confidential"),
    ("inventory", "adjust_stock",  "Perform stock adjustments",          "confidential"),
    ("inventory", "view_cost",     "View cost prices",                   "confidential"),
    ("inventory", "export",        "Export inventory data",              "confidential"),
    ("inventory", "manage_warehouse","Manage warehouses and locations",  "confidential"),

    # ── Manufacturing ─────────────────────────────────────────────────────────
    ("manufacturing", "view",         "View BOMs and work orders",        "internal"),
    ("manufacturing", "create_bom",   "Create bill of materials",         "internal"),
    ("manufacturing", "approve_bom",  "Approve BOMs",                     "confidential"),
    ("manufacturing", "create_wo",    "Create work orders",               "internal"),
    ("manufacturing", "update_wo",    "Update work order status",         "internal"),
    ("manufacturing", "export",       "Export manufacturing data",        "confidential"),

    # ── Finance ───────────────────────────────────────────────────────────────
    ("finance", "view_accounts",    "View chart of accounts",            "confidential"),
    ("finance", "manage_accounts",  "Create/edit accounts",              "restricted"),
    ("finance", "view_journals",    "View journal entries",              "confidential"),
    ("finance", "create_journal",   "Create journal entries",            "confidential"),
    ("finance", "post_journal",     "Post/approve journal entries",      "restricted"),
    ("finance", "view_expenses",    "View expense reports",              "internal"),
    ("finance", "create_expense",   "Submit expense claims",             "internal"),
    ("finance", "approve_expense",  "Approve/reject expenses",           "confidential"),
    ("finance", "view_reports",     "View P&L, Trial Balance, Balance Sheet","restricted"),
    ("finance", "export",           "Export financial data",             "restricted"),
    ("finance", "view_salary",      "View employee salary details",      "restricted"),

    # ── HR ────────────────────────────────────────────────────────────────────
    ("hr", "view_employees",   "View employee directory",              "internal"),
    ("hr", "create_employee",  "Add new employees",                    "confidential"),
    ("hr", "update_employee",  "Edit employee records",                "confidential"),
    ("hr", "delete_employee",  "Deactivate employees",                 "restricted"),
    ("hr", "view_salary",      "View salary/compensation details",     "restricted"),
    ("hr", "manage_salary",    "Update salary/compensation",           "restricted"),
    ("hr", "view_attendance",  "View attendance records",              "internal"),
    ("hr", "manage_attendance","Mark/edit attendance",                 "internal"),
    ("hr", "view_leaves",      "View leave applications",              "internal"),
    ("hr", "apply_leave",      "Apply for leave (own)",                "internal"),
    ("hr", "approve_leave",    "Approve/reject leave requests",        "confidential"),
    ("hr", "run_payroll",      "Generate and process payroll",         "restricted"),
    ("hr", "export",           "Export HR data",                       "restricted"),

    # ── Projects ──────────────────────────────────────────────────────────────
    ("projects", "view",         "View projects and tasks",           "internal"),
    ("projects", "create",       "Create new projects",               "internal"),
    ("projects", "update",       "Edit project details",              "internal"),
    ("projects", "delete",       "Delete/close projects",             "confidential"),
    ("projects", "manage_tasks", "Create and assign tasks",           "internal"),
    ("projects", "update_tasks", "Update task status/progress",       "internal"),
    ("projects", "view_budget",  "View project budget and costs",     "confidential"),
    ("projects", "manage_budget","Update project budget",             "restricted"),
    ("projects", "export",       "Export project data",               "confidential"),

    # ── Helpdesk ──────────────────────────────────────────────────────────────
    ("helpdesk", "view",          "View support tickets",             "internal"),
    ("helpdesk", "create",        "Raise support tickets",            "internal"),
    ("helpdesk", "update",        "Update ticket status/notes",       "internal"),
    ("helpdesk", "assign",        "Assign tickets to agents",         "internal"),
    ("helpdesk", "close",         "Close/resolve tickets",            "internal"),
    ("helpdesk", "delete",        "Delete tickets",                   "confidential"),
    ("helpdesk", "view_all",      "View all tickets (not just own)",  "internal"),
    ("helpdesk", "manage_kb",     "Create/edit knowledge base",       "internal"),

    # ── Assets ────────────────────────────────────────────────────────────────
    ("assets", "view",          "View asset register",               "internal"),
    ("assets", "create",        "Add assets to register",            "confidential"),
    ("assets", "update",        "Edit asset details",                "confidential"),
    ("assets", "delete",        "Dispose/delete assets",             "restricted"),
    ("assets", "export",        "Export asset register",             "confidential"),

    # ── Quality ───────────────────────────────────────────────────────────────
    ("quality", "view",         "View quality checks",               "internal"),
    ("quality", "create",       "Create quality checks",             "internal"),
    ("quality", "approve",      "Approve/fail quality checks",       "confidential"),
    ("quality", "export",       "Export quality data",               "confidential"),

    # ── Documents ─────────────────────────────────────────────────────────────
    ("documents", "view_public",  "View public documents",           "public"),
    ("documents", "view_internal","View internal documents",         "internal"),
    ("documents", "view_confidential","View confidential documents", "confidential"),
    ("documents", "create",       "Upload/create documents",         "internal"),
    ("documents", "update",       "Edit documents",                  "internal"),
    ("documents", "delete",       "Delete documents",                "confidential"),

    # ── Reports ───────────────────────────────────────────────────────────────
    ("reports", "view_sales",     "View sales reports",              "confidential"),
    ("reports", "view_hr",        "View HR reports",                 "confidential"),
    ("reports", "view_finance",   "View financial reports",          "restricted"),
    ("reports", "view_operations","View operations reports",         "confidential"),
    ("reports", "export",         "Export all reports",              "restricted"),

    # ── Admin ─────────────────────────────────────────────────────────────────
    ("admin", "view_users",     "View system users",                 "confidential"),
    ("admin", "create_user",    "Create new users",                  "restricted"),
    ("admin", "update_user",    "Edit user details/status",          "restricted"),
    ("admin", "manage_roles",   "Create/edit/assign roles",          "restricted"),
    ("admin", "manage_permissions","Manage permission definitions",  "restricted"),
    ("admin", "view_audit_log", "View system audit log",             "restricted"),
    ("admin", "system_settings","Access system configuration",       "restricted"),
]

# ── Standard ERP Roles ────────────────────────────────────────────────────────
# Format: (name, display_name, description, color, is_system, [permission_names])
STANDARD_ROLES = [
    (
        "super_admin",
        "Super Administrator",
        "Full unrestricted access to all modules, settings, and user management. Cannot be deleted.",
        "#dc2626",  True,
        ["*"]  # all permissions
    ),
    (
        "admin",
        "Administrator",
        "Full access to all business modules. Cannot manage system-level settings.",
        "#6366f1", True,
        [
            "dashboard:view", "dashboard:view_financial",
            "leads:*", "crm:*", "sales:*",
            "procurement:*", "inventory:*",
            "manufacturing:*", "finance:*",
            "hr:*", "projects:*", "helpdesk:*",
            "assets:*", "quality:*", "documents:*",
            "reports:*", "admin:view_users", "admin:create_user",
            "admin:update_user", "admin:manage_roles",
        ]
    ),
    (
        "sales_manager",
        "Sales Manager",
        "Full access to leads, CRM, sales orders, invoices and customer data. Can view reports.",
        "#7c3aed", True,
        [
            "dashboard:view",
            "leads:view", "leads:create", "leads:update", "leads:delete",
            "leads:export", "leads:assign", "leads:convert", "leads:view_all",
            "crm:view", "crm:create", "crm:update", "crm:export", "crm:view_credit",
            "sales:view", "sales:create_order", "sales:approve_order",
            "sales:create_invoice", "sales:approve_invoice",
            "sales:view_payments", "sales:record_payment", "sales:export",
            "reports:view_sales",
            "helpdesk:view", "helpdesk:create",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "sales_executive",
        "Sales Executive",
        "Can manage own leads and customers. Cannot approve orders or view financial data.",
        "#2563eb", True,
        [
            "dashboard:view",
            "leads:view", "leads:create", "leads:update", "leads:assign", "leads:convert",
            "crm:view", "crm:create", "crm:update",
            "sales:view", "sales:create_order",
            "helpdesk:view", "helpdesk:create",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "purchase_manager",
        "Purchase Manager",
        "Full control of vendor management, purchase orders and goods receipt.",
        "#0891b2", True,
        [
            "dashboard:view",
            "procurement:view", "procurement:create_vendor", "procurement:update_vendor",
            "procurement:delete_vendor", "procurement:create_po", "procurement:approve_po",
            "procurement:receive_goods", "procurement:export", "procurement:view_pricing",
            "inventory:view", "inventory:create", "inventory:update", "inventory:view_cost",
            "quality:view", "quality:create", "quality:approve",
            "finance:view_expenses", "finance:create_expense",
            "reports:view_operations",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "purchase_executive",
        "Purchase Executive",
        "Can create and track purchase orders. Cannot approve POs or see pricing negotiations.",
        "#0284c7", True,
        [
            "dashboard:view",
            "procurement:view", "procurement:create_po", "procurement:receive_goods",
            "inventory:view",
            "finance:view_expenses", "finance:create_expense",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "finance_manager",
        "Finance Manager",
        "Full access to financial data — accounts, journals, invoices, payments, P&L reports.",
        "#059669", True,
        [
            "dashboard:view", "dashboard:view_financial",
            "finance:view_accounts", "finance:manage_accounts",
            "finance:view_journals", "finance:create_journal", "finance:post_journal",
            "finance:view_expenses", "finance:create_expense", "finance:approve_expense",
            "finance:view_reports", "finance:export", "finance:view_salary",
            "sales:view", "sales:view_payments", "sales:record_payment", "sales:export",
            "procurement:view",
            "hr:view_salary",
            "reports:view_sales", "reports:view_finance", "reports:view_hr", "reports:export",
            "documents:view_public", "documents:view_internal", "documents:view_confidential",
        ]
    ),
    (
        "accountant",
        "Accountant",
        "Can create invoices, record payments, post expenses. Cannot approve journals or view salaries.",
        "#10b981", True,
        [
            "dashboard:view", "dashboard:view_financial",
            "finance:view_accounts",
            "finance:view_journals", "finance:create_journal",
            "finance:view_expenses", "finance:create_expense",
            "sales:view", "sales:create_invoice", "sales:view_payments", "sales:record_payment",
            "procurement:view",
            "reports:view_sales", "reports:view_finance",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "hr_manager",
        "HR Manager",
        "Full access to employee records, attendance, leaves, payroll. Manages HR policies.",
        "#db2777", True,
        [
            "dashboard:view",
            "hr:view_employees", "hr:create_employee", "hr:update_employee",
            "hr:delete_employee", "hr:view_salary", "hr:manage_salary",
            "hr:view_attendance", "hr:manage_attendance",
            "hr:view_leaves", "hr:apply_leave", "hr:approve_leave",
            "hr:run_payroll", "hr:export",
            "reports:view_hr",
            "finance:view_expenses",
            "documents:view_public", "documents:view_internal", "documents:view_confidential",
        ]
    ),
    (
        "hr_executive",
        "HR Executive",
        "Can manage attendance, process leaves, view employee info. Cannot access salary or payroll.",
        "#ec4899", True,
        [
            "dashboard:view",
            "hr:view_employees",
            "hr:view_attendance", "hr:manage_attendance",
            "hr:view_leaves", "hr:apply_leave", "hr:approve_leave",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "employee",
        "Employee",
        "Basic employee access — view own profile, apply leaves, mark own attendance.",
        "#64748b", True,
        [
            "dashboard:view",
            "hr:view_attendance",
            "hr:apply_leave",
            "hr:view_leaves",
            "helpdesk:view", "helpdesk:create",
            "documents:view_public",
        ]
    ),
    (
        "project_manager",
        "Project Manager",
        "Full control over projects and tasks. Can view budgets and team assignments.",
        "#7c3aed", True,
        [
            "dashboard:view",
            "projects:view", "projects:create", "projects:update",
            "projects:manage_tasks", "projects:update_tasks",
            "projects:view_budget", "projects:export",
            "hr:view_employees",
            "helpdesk:view",
            "reports:view_operations",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "team_member",
        "Team Member / Developer",
        "Can view assigned projects and update task status. No financial or HR access.",
        "#8b5cf6", True,
        [
            "dashboard:view",
            "projects:view", "projects:update_tasks",
            "helpdesk:view", "helpdesk:create",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "inventory_manager",
        "Inventory Manager",
        "Full control over products, stock levels, warehouses and quality checks.",
        "#0891b2", True,
        [
            "dashboard:view",
            "inventory:view", "inventory:create", "inventory:update",
            "inventory:adjust_stock", "inventory:view_cost", "inventory:export",
            "inventory:manage_warehouse",
            "quality:view", "quality:create", "quality:approve", "quality:export",
            "manufacturing:view",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "warehouse_keeper",
        "Warehouse / Store Keeper",
        "Can view products, update stock levels. Cannot see cost prices or financial data.",
        "#0ea5e9", True,
        [
            "dashboard:view",
            "inventory:view", "inventory:adjust_stock",
            "quality:view", "quality:create",
            "documents:view_public",
        ]
    ),
    (
        "support_agent",
        "Support Agent",
        "Full access to helpdesk tickets, knowledge base. Cannot access financial or HR modules.",
        "#f59e0b", True,
        [
            "dashboard:view",
            "helpdesk:view", "helpdesk:create", "helpdesk:update",
            "helpdesk:assign", "helpdesk:close", "helpdesk:view_all", "helpdesk:manage_kb",
            "crm:view",
            "documents:view_public", "documents:view_internal",
        ]
    ),
    (
        "auditor",
        "Auditor",
        "Read-only access across all modules for compliance and audit purposes. Cannot modify anything.",
        "#78716c", True,
        [
            "dashboard:view", "dashboard:view_financial",
            "leads:view", "crm:view", "sales:view", "sales:view_payments",
            "procurement:view",
            "inventory:view", "inventory:view_cost",
            "manufacturing:view",
            "finance:view_accounts", "finance:view_journals",
            "finance:view_expenses", "finance:view_reports",
            "hr:view_employees", "hr:view_salary", "hr:view_attendance", "hr:view_leaves",
            "projects:view", "helpdesk:view",
            "assets:view", "quality:view",
            "documents:view_public", "documents:view_internal", "documents:view_confidential",
            "reports:view_sales", "reports:view_hr", "reports:view_finance",
            "reports:view_operations",
            "admin:view_audit_log",
        ]
    ),
    (
        "management",
        "Management / Director",
        "View-only access to all modules including financial reports. For executive oversight.",
        "#1e293b", True,
        [
            "dashboard:view", "dashboard:view_financial",
            "leads:view", "leads:view_all",
            "crm:view", "crm:view_credit",
            "sales:view", "sales:view_payments", "sales:view_pricing",
            "procurement:view", "procurement:view_pricing",
            "inventory:view", "inventory:view_cost",
            "manufacturing:view",
            "finance:view_accounts", "finance:view_journals",
            "finance:view_expenses", "finance:view_reports",
            "finance:view_salary",
            "hr:view_employees", "hr:view_salary",
            "hr:view_attendance", "hr:view_leaves",
            "projects:view", "projects:view_budget",
            "helpdesk:view", "assets:view", "quality:view",
            "documents:view_public", "documents:view_internal", "documents:view_confidential",
            "reports:view_sales", "reports:view_hr", "reports:view_finance",
            "reports:view_operations",
        ]
    ),
]


def seed_permissions(db: Session) -> dict:
    """Create all permissions, return name→id mapping."""
    perm_map = {}
    for (module, action, description, confidentiality) in ALL_PERMISSIONS:
        name = f"{module}:{action}"
        perm = db.query(Permission).filter(Permission.name == name).first()
        if not perm:
            perm = Permission(
                name=name, module=module, action=action,
                description=description, confidentiality=confidentiality
            )
            db.add(perm)
    db.flush()
    # Reload all
    for p in db.query(Permission).all():
        perm_map[p.name] = p
    return perm_map


def seed_roles(db: Session, perm_map: dict) -> None:
    """Create all standard roles and assign permissions."""
    all_perms = list(perm_map.values())

    for (name, display_name, description, color, is_system, perm_patterns) in STANDARD_ROLES:
        role = db.query(Role).filter(Role.name == name).first()
        if not role:
            role = Role(
                name=name, display_name=display_name,
                description=description, color=color,
                is_system=is_system, is_active=True
            )
            db.add(role)
            db.flush()

        # Resolve permission patterns
        assigned = []
        for pattern in perm_patterns:
            if pattern == "*":
                assigned = all_perms
                break
            elif pattern.endswith(":*"):
                module = pattern[:-2]
                assigned += [p for p in all_perms if p.module == module]
            elif pattern in perm_map:
                assigned.append(perm_map[pattern])

        # Deduplicate
        seen = set()
        unique = []
        for p in assigned:
            if p.id not in seen:
                seen.add(p.id)
                unique.append(p)

        role.permissions = unique
        logger.info(f"Role '{name}': {len(unique)} permissions assigned")

    db.commit()


def assign_superuser_role(db: Session) -> None:
    """Ensure the admin@smepro360.com user has the super_admin role."""
    from app.core.config import settings
    user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    role = db.query(Role).filter(Role.name == "super_admin").first()
    if user and role and role not in user.roles:
        user.roles.append(role)
        db.commit()
        logger.info(f"Assigned super_admin role to {user.email}")


def seed_rbac(db: Session) -> None:
    """Main entry — seed all permissions and roles."""
    logger.info("Seeding RBAC permissions and roles...")
    perm_map = seed_permissions(db)
    seed_roles(db, perm_map)
    assign_superuser_role(db)
    logger.info(f"RBAC seed complete: {len(ALL_PERMISSIONS)} permissions, {len(STANDARD_ROLES)} roles")
