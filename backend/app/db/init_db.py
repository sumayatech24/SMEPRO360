from sqlalchemy.orm import Session
from app.models.user import User
from app.models.tenant import Tenant, Branch
from app.models.hr import Department
from app.core.security import get_password_hash
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def init_db(db: Session) -> None:
    # Create default tenant
    tenant = db.query(Tenant).filter(Tenant.slug == "default").first()
    if not tenant:
        tenant = Tenant(
            name="SMEPRO360 Default Company",
            slug="default",
            email="admin@smepro360.com",
            phone="+91-9999999999",
            currency="INR",
            country="India",
            plan="enterprise"
        )
        db.add(tenant)
        db.flush()
        logger.info("Created default tenant")

        # Create head office branch
        branch = Branch(
            tenant_id=tenant.id, name="Head Office", code="HO",
            is_head_office=True, city="Mumbai", state="Maharashtra"
        )
        db.add(branch)

    # Create superuser
    user = db.query(User).filter(User.email == settings.FIRST_SUPERUSER).first()
    if not user:
        user = User(
            email=settings.FIRST_SUPERUSER,
            username="admin",
            full_name="System Administrator",
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            is_superuser=True,
            is_active=True,
            tenant_id=tenant.id if tenant else None
        )
        db.add(user)
        logger.info(f"Created superuser: {settings.FIRST_SUPERUSER}")

    # Create default departments
    dept_names = ["Sales","Marketing","Finance","HR","IT","Operations",
                  "Manufacturing","Quality","Procurement","Logistics"]
    for dept_name in dept_names:
        dept = db.query(Department).filter(Department.name == dept_name).first()
        if not dept:
            dept = Department(name=dept_name, code=dept_name[:3].upper())
            db.add(dept)

    db.commit()

    # Seed RBAC roles and permissions
    try:
        from app.core.rbac_seed import seed_rbac
        seed_rbac(db)
    except Exception as e:
        logger.warning(f"RBAC seed skipped: {e}")

    logger.info("Database initialization complete")
