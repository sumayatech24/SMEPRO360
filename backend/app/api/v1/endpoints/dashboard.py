from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.db.base import get_db
from app.models.user import User
from app.models.lead import Lead
from app.models.crm import Customer, Opportunity
from app.models.sales import SalesOrder, Invoice
from app.models.procurement import Vendor, PurchaseOrder
from app.models.inventory import Product, StockLevel
from app.models.hr import Employee
from app.models.project import Project, ProjectTask
from app.models.helpdesk import Ticket
from app.models.finance import Expense
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/")
async def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0)

    # Counts
    total_leads = db.query(func.count(Lead.id)).filter(Lead.is_active == True).scalar() or 0
    new_leads_month = db.query(func.count(Lead.id)).filter(Lead.is_active == True, Lead.created_at >= month_start).scalar() or 0
    total_customers = db.query(func.count(Customer.id)).filter(Customer.is_active == True).scalar() or 0
    total_employees = db.query(func.count(Employee.id)).filter(Employee.is_active == True).scalar() or 0
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
    open_tickets = db.query(func.count(Ticket.id)).filter(Ticket.is_active == True, Ticket.status.in_(["open", "in_progress"])).scalar() or 0
    active_projects = db.query(func.count(Project.id)).filter(Project.is_active == True, Project.status == "active").scalar() or 0

    # Revenue
    monthly_revenue = db.query(func.sum(Invoice.total_amount)).filter(Invoice.is_active == True, Invoice.invoice_date >= month_start).scalar() or 0
    outstanding_invoices = db.query(func.sum(Invoice.balance_due)).filter(Invoice.is_active == True, Invoice.status.in_(["sent", "overdue"])).scalar() or 0

    # Pipeline
    pipeline_value = db.query(func.sum(Opportunity.expected_revenue)).filter(Opportunity.is_active == True).scalar() or 0

    # Recent orders
    recent_orders = db.query(SalesOrder).filter(SalesOrder.is_active == True).order_by(SalesOrder.created_at.desc()).limit(5).all()

    # Open tasks
    open_tasks = db.query(func.count(ProjectTask.id)).filter(ProjectTask.is_active == True, ProjectTask.status.in_(["todo", "in_progress"])).scalar() or 0

    # Lead status breakdown
    lead_by_status = dict(db.query(Lead.status, func.count(Lead.id)).filter(Lead.is_active == True).group_by(Lead.status).all())

    # Monthly revenue trend (last 6 months)
    revenue_trend = []
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30 * i)
        m_start = month_date.replace(day=1, hour=0, minute=0, second=0)
        if i > 0:
            next_month = month_date.replace(day=28) + timedelta(days=4)
            m_end = next_month.replace(day=1)
        else:
            m_end = now
        rev = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.is_active == True,
            Invoice.invoice_date >= m_start,
            Invoice.invoice_date < m_end
        ).scalar() or 0
        revenue_trend.append({"month": m_start.strftime("%b %Y"), "revenue": float(rev)})

    return {
        "summary": {
            "total_leads": total_leads,
            "new_leads_this_month": new_leads_month,
            "total_customers": total_customers,
            "total_employees": total_employees,
            "total_products": total_products,
            "open_tickets": open_tickets,
            "active_projects": active_projects,
            "open_tasks": open_tasks,
        },
        "financials": {
            "monthly_revenue": float(monthly_revenue),
            "outstanding_invoices": float(outstanding_invoices),
            "pipeline_value": float(pipeline_value),
        },
        "lead_by_status": lead_by_status,
        "revenue_trend": revenue_trend,
        "recent_orders": [
            {"id": o.id, "order_number": o.order_number, "customer_id": o.customer_id,
             "status": o.status, "total_amount": float(o.total_amount or 0),
             "created_at": o.created_at.isoformat() if o.created_at else None}
            for o in recent_orders
        ]
    }

@router.get("/kpis")
async def get_kpis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    curr_rev = float(db.query(func.sum(Invoice.total_amount)).filter(Invoice.invoice_date >= month_start).scalar() or 0)
    prev_rev = float(db.query(func.sum(Invoice.total_amount)).filter(Invoice.invoice_date >= prev_month_start, Invoice.invoice_date < month_start).scalar() or 0)
    rev_growth = ((curr_rev - prev_rev) / prev_rev * 100) if prev_rev else 0

    curr_leads = db.query(func.count(Lead.id)).filter(Lead.created_at >= month_start).scalar() or 0
    prev_leads = db.query(func.count(Lead.id)).filter(Lead.created_at >= prev_month_start, Lead.created_at < month_start).scalar() or 0
    lead_growth = ((curr_leads - prev_leads) / prev_leads * 100) if prev_leads else 0

    converted = db.query(func.count(Lead.id)).filter(Lead.status == "converted").scalar() or 0
    total_leads = db.query(func.count(Lead.id)).scalar() or 1
    conversion_rate = converted / total_leads * 100

    return {
        "monthly_revenue": curr_rev,
        "revenue_growth": round(rev_growth, 1),
        "new_leads": curr_leads,
        "lead_growth": round(lead_growth, 1),
        "conversion_rate": round(conversion_rate, 1),
    }
