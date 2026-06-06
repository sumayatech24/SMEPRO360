"""Enrich employee data: skills, education, training, benefits, resource allocations.
Via ORM against Supabase (DATABASE_URL in .env)."""
import random
from datetime import date, timedelta
from app.db.base import SessionLocal
from app.models.hr import Employee
from app.models.project import Project
from app.models.skills import Skill, EmployeeSkill, EducationDetail
from app.models.hr_extended import TrainingCourse, TrainingEnrollment, BenefitPlan, EmployeeBenefit
from app.models.resource import ResourceAllocation

def main():
    db = SessionLocal()
    emps = db.query(Employee).all()
    skills = db.query(Skill).all()
    courses = db.query(TrainingCourse).all()
    plans = db.query(BenefitPlan).all()
    projects = db.query(Project).all()
    profs = ["beginner","intermediate","advanced","expert"]
    pscore = {"beginner":2,"intermediate":3,"advanced":4,"expert":5}
    degrees = [("B.Tech","Computer Science"),("MBA","Finance"),("B.Com","Accounting"),
               ("M.Tech","Software Engineering"),("BBA","Marketing"),("B.Sc","Statistics")]
    unis = ["IIT Bombay","Delhi University","Mumbai University","BITS Pilani","NIT Trichy","Pune University"]

    ns=ne=nt=nb=nr=0
    for emp in emps:
        # Skills
        if db.query(EmployeeSkill).filter(EmployeeSkill.employee_id==emp.id).count()==0:
            for sk in random.sample(skills, min(len(skills), random.randint(3,6))):
                pr=random.choice(profs)
                db.add(EmployeeSkill(employee_id=emp.id, skill_id=sk.id, proficiency=pr,
                    proficiency_score=pscore[pr], years_experience=random.randint(1,8),
                    last_used_year=2026, is_primary=random.random()>0.7)); ns+=1
        # Education
        if db.query(EducationDetail).filter(EducationDetail.employee_id==emp.id).count()==0:
            deg,spec=random.choice(degrees)
            db.add(EducationDetail(employee_id=emp.id, degree=deg, specialization=spec,
                institution=random.choice(unis), university=random.choice(unis),
                year_from=random.randint(2008,2016), year_to=random.randint(2017,2022),
                grade=f"{random.randint(65,95)}%", grade_value=random.randint(65,95),
                grade_type="percentage", is_highest=True, is_verified=True)); ne+=1
        # Training enrollments
        if courses and db.query(TrainingEnrollment).filter(TrainingEnrollment.employee_id==emp.id).count()==0:
            for c in random.sample(courses, min(len(courses), random.randint(2,4))):
                st=random.choice(["enrolled","in_progress","completed","completed"])
                db.add(TrainingEnrollment(employee_id=emp.id, course_id=c.id, status=st,
                    enrolled_date=date.today()-timedelta(days=random.randint(5,120)),
                    scheduled_date=date.today()+timedelta(days=random.randint(1,30)),
                    completion_date=date.today()-timedelta(days=random.randint(1,30)) if st=="completed" else None,
                    score=random.randint(70,98) if st=="completed" else None)); nt+=1
        # Benefits
        if plans and db.query(EmployeeBenefit).filter(EmployeeBenefit.employee_id==emp.id).count()==0:
            for p in random.sample(plans, min(len(plans), random.randint(2,4))):
                db.add(EmployeeBenefit(employee_id=emp.id, plan_id=p.id,
                    enrollment_date=date.today()-timedelta(days=random.randint(30,300)),
                    policy_number=f"POL{random.randint(100000,999999)}",
                    nominee_name="Spouse", nominee_relation="Spouse")); nb+=1
        # Resource allocation
        if projects and db.query(ResourceAllocation).filter(ResourceAllocation.employee_id==emp.id).count()==0:
            if random.random()>0.3:
                p=random.choice(projects)
                db.add(ResourceAllocation(project_id=p.id, employee_id=emp.id,
                    role=random.choice(["Lead Developer","QA Engineer","Backend Dev","Frontend Dev","Business Analyst","DevOps","Tech Lead"]),
                    allocation_percent=random.choice([50,75,100]), status="active",
                    start_date=date.today()-timedelta(days=30),
                    end_date=date.today()+timedelta(days=90))); nr+=1
    db.commit()
    print(f"Skills:{ns} Education:{ne} Training:{nt} Benefits:{nb} Allocations:{nr}")
    db.close()

if __name__=="__main__":
    main()
