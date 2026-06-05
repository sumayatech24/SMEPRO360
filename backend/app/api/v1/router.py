from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, tenants, leads, crm, sales, procurement,
    inventory, manufacturing, finance, hr, projects, helpdesk,
    assets, quality, documents, reports, dashboard, rbac, tax, resource,
    attendance_v2, approvals, project_mgmt, payroll_v2, clients, hr_extended, myspace,
    skills_appraisal
)

api_router = APIRouter()

api_router.include_router(auth.router,          prefix="/auth",          tags=["Authentication"])
api_router.include_router(users.router,         prefix="/users",         tags=["Users"])
api_router.include_router(rbac.router,          prefix="/admin/rbac",    tags=["Roles & Permissions"])
api_router.include_router(tax.router,           prefix="/tax",           tags=["Tax Module"])
api_router.include_router(resource.router,      prefix="/resource",      tags=["Resource Management"])
api_router.include_router(tenants.router,       prefix="/tenants",       tags=["Tenants & Branches"])
api_router.include_router(leads.router,         prefix="/leads",         tags=["Lead Management"])
api_router.include_router(crm.router,           prefix="/crm",           tags=["CRM"])
api_router.include_router(sales.router,         prefix="/sales",         tags=["Sales & Distribution"])
api_router.include_router(procurement.router,   prefix="/procurement",   tags=["Procurement"])
api_router.include_router(inventory.router,     prefix="/inventory",     tags=["Inventory"])
api_router.include_router(manufacturing.router, prefix="/manufacturing", tags=["Manufacturing"])
api_router.include_router(finance.router,       prefix="/finance",       tags=["Finance & Accounting"])
api_router.include_router(hr.router,            prefix="/hr",            tags=["Human Resources"])
api_router.include_router(projects.router,      prefix="/projects",      tags=["Project Management"])
api_router.include_router(helpdesk.router,      prefix="/helpdesk",      tags=["Helpdesk & Support"])
api_router.include_router(assets.router,        prefix="/assets",        tags=["Asset Management"])
api_router.include_router(quality.router,       prefix="/quality",       tags=["Quality Control"])
api_router.include_router(documents.router,     prefix="/documents",     tags=["Document Management"])
api_router.include_router(reports.router,       prefix="/reports",       tags=["Reports & Analytics"])
api_router.include_router(dashboard.router,     prefix="/dashboard",     tags=["Dashboard"])
api_router.include_router(attendance_v2.router, prefix="/attendance-v2",  tags=["Attendance & Leave"])
api_router.include_router(approvals.router,     prefix="/approvals",      tags=["Approval Workflows"])
api_router.include_router(project_mgmt.router,  prefix="/projects-v2",    tags=["Project Management"])
api_router.include_router(payroll_v2.router,    prefix="/payroll-v2",     tags=["Global Payroll"])
api_router.include_router(clients.router,       prefix="/clients",         tags=["Client Management"])
api_router.include_router(hr_extended.router,   prefix="/hr-v2",           tags=["HR Extended"])
api_router.include_router(myspace.router,       prefix="/my-space",         tags=["My Space"])
api_router.include_router(skills_appraisal.router, prefix="/hr-skills",      tags=["Skills & Appraisal"])
