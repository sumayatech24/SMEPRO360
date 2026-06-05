from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum

# ── Association tables ────────────────────────────────────────────────────────
user_roles = Table('user_roles', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'))
)

role_permissions = Table('role_permissions', Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE')),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'))
)

# ── Permission ────────────────────────────────────────────────────────────────
class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name        = Column(String(120), unique=True, nullable=False)   # e.g. "leads:create"
    module      = Column(String(60), nullable=False)                 # e.g. "leads"
    action      = Column(String(60), nullable=False)                 # e.g. "create"
    description = Column(String(255))
    # Confidentiality: public < internal < confidential < restricted
    confidentiality = Column(String(20), default='internal')         # public|internal|confidential|restricted
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

# ── Role ──────────────────────────────────────────────────────────────────────
class Role(Base):
    __tablename__ = "roles"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(150))
    description = Column(Text)
    is_system   = Column(Boolean, default=False)   # System roles cannot be deleted
    is_active   = Column(Boolean, default=True)
    color       = Column(String(20), default='#6366f1')  # UI badge color
    tenant_id   = Column(Integer, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    permissions = relationship("Permission", secondary=role_permissions, backref="roles", lazy='subquery')

# ── User ──────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    username        = Column(String(100), unique=True, index=True)
    full_name       = Column(String(255))
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=True)
    is_superuser    = Column(Boolean, default=False)
    tenant_id       = Column(Integer, ForeignKey('tenants.id'), nullable=True)
    branch_id       = Column(Integer, nullable=True)
    phone           = Column(String(20))
    avatar_url      = Column(String(500))
    department      = Column(String(100))
    job_title       = Column(String(150))
    employee_id     = Column(Integer, nullable=True)  # link to hr employee
    last_login      = Column(DateTime(timezone=True))
    password_changed_at = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    roles           = relationship("Role", secondary=user_roles, backref="users", lazy='subquery')
    tenant          = relationship("Tenant", back_populates="users")
