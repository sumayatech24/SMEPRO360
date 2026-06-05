"""Seed project management data"""
from app.db.base import engine, Base, SessionLocal
from app.models import *
from app.models.project_mgmt import ProjectPhase, WBSItem, ProjectMilestone, ProjectRisk, ProjectBudget, ProjectActivity
from app.models.project import Project
from app.models.hr import Employee
from datetime import date, timedelta
import random

Base.metadata.create_all(bind=engine)
print("Tables created")

db = SessionLocal()

projects = db.query(Project).filter(Project.is_active == True).all()
employees = db.query(Employee).filter(Employee.is_active == True).all()
emp_ids = [e.id for e in employees[:8]]

print(f"Seeding {len(projects)} projects...")

PHASE_TEMPLATES = {
    "it_services": [
        ("Initiation",            "INIT",   1, "#6366f1", 20),
        ("Planning",              "PLAN",   2, "#8b5cf6", 30),
        ("Design & Architecture", "DESIGN", 3, "#3b82f6", 25),
        ("Development",          "DEV",    4, "#0891b2", 60),
        ("Testing & QA",         "TEST",   5, "#10b981", 25),
        ("UAT & Go-Live",        "UAT",    6, "#f59e0b", 20),
        ("Closure",              "CLOSE",  7, "#64748b", 10),
    ],
    "manufacturing": [
        ("Design & Engineering", "DESIGN", 1, "#f59e0b", 30),
        ("Procurement",          "PROC",   2, "#ef4444", 25),
        ("Production",           "PROD",   3, "#3b82f6", 45),
        ("Quality Control",      "QA",     4, "#10b981", 15),
        ("Delivery",             "DEL",    5, "#64748b", 10),
    ],
}

WBS_TEMPLATES = {
    "INIT":   ["Project Charter", "Stakeholder Analysis", "Kickoff Meeting", "Feasibility Study"],
    "PLAN":   ["Requirements Gathering", "Resource Planning", "Schedule Baseline", "Budget Approval"],
    "DESIGN": ["System Architecture", "Database Design", "UI/UX Mockups", "Technical Spec"],
    "DEV":    ["Backend API Development", "Frontend Development", "Database Setup", "Third-party Integration", "Code Review"],
    "TEST":   ["Unit Testing", "Integration Testing", "Performance Testing", "Bug Fixing", "Test Sign-off"],
    "UAT":    ["UAT Test Cases", "UAT Execution", "Bug Rectification", "UAT Sign-off", "Go-Live"],
    "CLOSE":  ["Handover Documentation", "Training", "Post-Implementation Review", "Closure Report"],
    "PROC":   ["Vendor Selection", "Purchase Orders", "Material Delivery", "Inspection"],
    "PROD":   ["Production Planning", "Raw Material Processing", "Assembly Line", "Quality Inline"],
    "QA":     ["Final Quality Check", "Performance Test", "Defect Rectification", "Approval"],
    "DEL":    ["Packing & Dispatch", "Site Installation", "Commissioning", "Handover"],
}

n_phases = n_wbs = n_ms = n_risks = 0

for proj in projects:
    db.query(ProjectPhase).filter(ProjectPhase.project_id == proj.id).delete()
    db.flush()

    ptype = proj.project_type or "it_services"
    templates = PHASE_TEMPLATES.get(ptype, PHASE_TEMPLATES["it_services"])
    start = proj.start_date or (date.today() - timedelta(days=90))
    phase_start = start
    today = date.today()

    for (pname, pcode, porder, pcolor, dur) in templates:
        phase_end = phase_start + timedelta(days=dur)
        if phase_end < today:
            pstatus = "completed"; progress = 100.0
        elif phase_start <= today:
            elapsed = (today - phase_start).days
            progress = round(min(95, elapsed / dur * 100), 1)
            pstatus = "in_progress"
        else:
            pstatus = "not_started"; progress = 0.0

        phase = ProjectPhase(
            project_id=proj.id, phase_name=pname, phase_code=pcode,
            phase_order=porder, color=pcolor,
            planned_start=phase_start, planned_end=phase_end,
            start_date=phase_start if pstatus != "not_started" else None,
            end_date=phase_end if pstatus == "completed" else None,
            status=pstatus, progress_percent=progress
        )
        db.add(phase); db.flush()
        n_phases += 1

        task_names = WBS_TEMPLATES.get(pcode, [f"{pname} Task {i}" for i in range(1, 4)])
        task_start = phase_start
        for idx, tname in enumerate(task_names):
            tdur = random.randint(3, 12)
            tend = task_start + timedelta(days=tdur)
            t_complete = 100.0 if pstatus == "completed" else (round(random.uniform(20, 90), 0) if pstatus == "in_progress" and idx <= 1 else 0.0)
            t_status = "completed" if t_complete == 100 else ("in_progress" if t_complete > 0 else "not_started")

            db.add(WBSItem(
                project_id=proj.id, phase_id=phase.id,
                wbs_code=f"{porder}.{idx + 1}", task_name=tname,
                task_type="task", planned_start=task_start, planned_end=tend,
                duration_days=tdur,
                assigned_to=random.choice(emp_ids) if emp_ids else None,
                percent_complete=t_complete, status=t_status,
                priority=random.choice(["low", "medium", "high"]),
                estimated_hours=tdur * 8, actual_hours=tdur * 8 * t_complete / 100,
                sort_order=idx, level=2,
                predecessors=f"{porder}.{idx}" if idx > 0 else None
            ))
            task_start = tend
            n_wbs += 1

        ms_status = "achieved" if pstatus == "completed" else ("at_risk" if pstatus == "in_progress" and phase_end < today else ("pending"))
        db.add(ProjectMilestone(
            project_id=proj.id, phase_id=phase.id,
            milestone_name=f"{pname} Complete",
            milestone_type="delivery",
            planned_date=phase_end,
            actual_date=phase_end if pstatus == "completed" else None,
            status=ms_status,
            deliverable=f"{pname} deliverables completed and signed off"
        ))
        n_ms += 1
        phase_start = phase_end + timedelta(days=1)

    existing = db.query(ProjectBudget).filter(ProjectBudget.project_id == proj.id).first()
    if not existing:
        bv = float(proj.budget or 500000)
        db.add(ProjectBudget(
            project_id=proj.id,
            approved_budget=bv, contingency=bv * 0.1, total_budget=bv * 1.1,
            labour_cost_planned=bv * 0.4, material_cost_planned=bv * 0.3,
            equipment_cost_planned=bv * 0.15, overhead_planned=bv * 0.15,
            labour_cost_actual=bv * 0.35, material_cost_actual=bv * 0.2,
            total_actual=float(proj.actual_cost or bv * 0.55),
            spi=round(random.uniform(0.85, 1.05), 2), cpi=round(random.uniform(0.88, 1.08), 2)
        ))

    for i, (title, cat, prob, imp, desc) in enumerate([
        ("Resource shortage risk", "resource", "medium", "high", "Key team availability"),
        ("Scope creep", "technical", "low", "high", "Client change requests"),
        ("Budget overrun", "cost", "medium", "medium", "Cost escalation risk"),
    ][:2]):
        score = {"low": 1, "medium": 2, "high": 3}[prob] * {"low": 1, "medium": 2, "high": 3}[imp]
        level = "critical" if score >= 9 else "high" if score >= 6 else "medium" if score >= 3 else "low"
        db.add(ProjectRisk(
            project_id=proj.id, risk_id_code=f"R{n_risks + 1:03d}",
            title=title, description=desc, category=cat,
            probability=prob, impact=imp, risk_score=score, risk_level=level,
            status="open", mitigation_plan="Monitor and escalate if threshold reached",
            identified_date=date.today() - timedelta(days=random.randint(10, 60))
        ))
        n_risks += 1

db.commit()
print(f"Done! Phases:{n_phases} WBS:{n_wbs} Milestones:{n_ms} Risks:{n_risks}")
db.close()
