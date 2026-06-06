"""
Create a login User for every Employee (email-linked), assign the 'employee' role,
set employees.user_id, and (re)seed project tasks assigned to real users.
Runs via ORM against whatever DATABASE_URL .env points to (Supabase).
All employees get password: Welcome@123
"""
import random
from app.db.base import SessionLocal
from app.models.user import User, Role
from app.models.hr import Employee
from app.models.project import Project, ProjectTask
from app.core.security import get_password_hash
from datetime import date, timedelta

def main():
    db = SessionLocal()
    emp_role = db.query(Role).filter(Role.name == "employee").first()
    mgr_role = db.query(Role).filter(Role.name == "project_manager").first()
    pw = get_password_hash("Welcome@123")

    employees = db.query(Employee).all()
    created = linked = 0
    emp_user_ids = []
    for i, emp in enumerate(employees):
        if not emp.email:
            continue
        user = db.query(User).filter(User.email == emp.email).first()
        if not user:
            user = User(
                email=emp.email,
                full_name=f"{emp.first_name} {emp.last_name or ''}".strip(),
                username=emp.email.split("@")[0],
                hashed_password=pw,
                is_superuser=False, is_active=True,
                tenant_id=emp.tenant_id if hasattr(emp, "tenant_id") else None,
                phone=emp.phone,
            )
            # assign role
            role = mgr_role if (i % 6 == 0 and mgr_role) else emp_role
            if role and hasattr(user, "roles"):
                try: user.roles.append(role)
                except Exception: pass
            db.add(user); db.flush()
            created += 1
        if emp.user_id != user.id:
            emp.user_id = user.id; linked += 1
        emp_user_ids.append(user.id)
    db.commit()
    print(f"Users created: {created}, employees linked: {linked}, total mapped: {len(emp_user_ids)}")

    # Make a few project managers real users
    projects = db.query(Project).all()
    for p in projects:
        if emp_user_ids:
            p.project_manager_id = random.choice(emp_user_ids)
    db.commit()
    print(f"Updated {len(projects)} project managers")

    # Seed tasks assigned to real users (clear nothing; just add where projects have few)
    titles = ["Requirement Analysis","System Design","Development","Integration Testing",
              "UAT","Deployment","Documentation","Code Review","Bug Fixes","Sprint Planning"]
    tn = 0
    for p in projects:
        existing = db.query(ProjectTask).filter(ProjectTask.project_id == p.id).count()
        for _ in range(max(0, random.randint(4,7) - existing)):
            t = ProjectTask(
                project_id=p.id, title=random.choice(titles), description="Auto-seeded task",
                status=random.choice(["todo","in_progress","done","review"]),
                priority=random.choice(["high","medium","low"]),
                assigned_to=random.choice(emp_user_ids) if emp_user_ids else None,
                due_date=date.today()+timedelta(days=random.randint(5,60)),
                estimated_hours=random.choice([8,16,24,40]),
                progress_percent=random.choice([0,25,50,75,100]),
            )
            db.add(t); tn += 1
    db.commit()
    print(f"Tasks created: {tn}")
    db.close()

if __name__ == "__main__":
    main()
