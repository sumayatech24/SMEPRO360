"""
RBAC API — Roles, Permissions, User-Role assignment
All endpoints require admin-level access.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.base import get_db
from app.models.user import Role, Permission, User, user_roles, role_permissions
from app.api.v1.endpoints.auth import get_current_user
from app.core.rbac import require_permission, get_user_permissions, user_has_permission

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class PermissionOut(BaseModel):
    id: int
    name: str
    module: str
    action: str
    description: Optional[str]
    confidentiality: str

class RoleCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = ""
    color: Optional[str] = "#6366f1"

class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class AssignPermissionsIn(BaseModel):
    permission_ids: List[int]

class AssignRolesIn(BaseModel):
    role_ids: List[int]

# ── Helpers ───────────────────────────────────────────────────────────────────

def role_dict(role: Role):
    return {
        "id": role.id, "name": role.name, "display_name": role.display_name,
        "description": role.description, "color": role.color,
        "is_system": role.is_system, "is_active": role.is_active,
        "permission_count": len(role.permissions or []),
        "user_count": len(role.users or []),
        "permissions": [p.name for p in (role.permissions or [])],
    }

def perm_dict(p: Permission):
    return {
        "id": p.id, "name": p.name, "module": p.module,
        "action": p.action, "description": p.description,
        "confidentiality": p.confidentiality,
    }

# ── Permission endpoints ──────────────────────────────────────────────────────

@router.get("/permissions")
async def list_permissions(
    module: Optional[str] = None,
    confidentiality: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_permissions"))
):
    q = db.query(Permission)
    if module: q = q.filter(Permission.module == module)
    if confidentiality: q = q.filter(Permission.confidentiality == confidentiality)
    perms = q.order_by(Permission.module, Permission.action).all()
    return [perm_dict(p) for p in perms]

@router.get("/permissions/modules")
async def list_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_permissions"))
):
    """Return all unique modules with permission counts."""
    from sqlalchemy import func
    result = db.query(Permission.module, func.count(Permission.id)).group_by(Permission.module).all()
    return [{"module": m, "count": c} for m, c in result]

# ── Role endpoints ────────────────────────────────────────────────────────────

@router.get("/roles")
async def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_roles"))
):
    roles = db.query(Role).filter(Role.is_active == True).order_by(Role.name).all()
    return [role_dict(r) for r in roles]

@router.get("/roles/all")
async def list_all_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lightweight list for dropdowns (no permission details)."""
    roles = db.query(Role).filter(Role.is_active == True).order_by(Role.name).all()
    return [{"id": r.id, "name": r.name, "display_name": r.display_name, "color": r.color} for r in roles]

@router.get("/roles/{role_id}")
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_roles"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role: raise HTTPException(404, "Role not found")
    # Return full permission detail
    d = role_dict(role)
    d["permissions_detail"] = [perm_dict(p) for p in (role.permissions or [])]
    return d

@router.post("/roles")
async def create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_roles"))
):
    if db.query(Role).filter(Role.name == data.name).first():
        raise HTTPException(400, f"Role '{data.name}' already exists")
    role = Role(
        name=data.name.lower().replace(" ", "_"),
        display_name=data.display_name,
        description=data.description,
        color=data.color,
        is_system=False, is_active=True
    )
    db.add(role); db.commit(); db.refresh(role)
    return role_dict(role)

@router.put("/roles/{role_id}")
async def update_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_roles"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role: raise HTTPException(404, "Role not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(role, k, v)
    db.commit(); db.refresh(role)
    return role_dict(role)

@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_roles"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role: raise HTTPException(404, "Role not found")
    if role.is_system:
        raise HTTPException(400, "System roles cannot be deleted")
    role.is_active = False
    db.commit()
    return {"message": f"Role '{role.name}' deactivated"}

@router.put("/roles/{role_id}/permissions")
async def set_role_permissions(
    role_id: int,
    data: AssignPermissionsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_permissions"))
):
    """Replace all permissions for a role."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role: raise HTTPException(404, "Role not found")
    perms = db.query(Permission).filter(Permission.id.in_(data.permission_ids)).all()
    role.permissions = perms
    db.commit(); db.refresh(role)
    return {"message": f"Assigned {len(perms)} permissions to '{role.name}'", "role": role_dict(role)}

@router.post("/roles/{role_id}/permissions/add")
async def add_permission_to_role(
    role_id: int,
    data: AssignPermissionsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_permissions"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role: raise HTTPException(404, "Role not found")
    existing_ids = {p.id for p in role.permissions}
    new_perms = db.query(Permission).filter(
        Permission.id.in_(data.permission_ids),
        ~Permission.id.in_(existing_ids)
    ).all()
    role.permissions.extend(new_perms)
    db.commit()
    return {"message": f"Added {len(new_perms)} permissions", "total": len(role.permissions)}

@router.post("/roles/{role_id}/permissions/remove")
async def remove_permission_from_role(
    role_id: int,
    data: AssignPermissionsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_permissions"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role: raise HTTPException(404, "Role not found")
    to_remove = {p for p in role.permissions if p.id in set(data.permission_ids)}
    for p in to_remove:
        role.permissions.remove(p)
    db.commit()
    return {"message": f"Removed {len(to_remove)} permissions"}

# ── User-Role endpoints ────────────────────────────────────────────────────────

@router.get("/users/{user_id}/roles")
async def get_user_roles(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_roles"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "roles": [{"id": r.id, "name": r.name, "display_name": r.display_name, "color": r.color}
                  for r in user.roles],
        "permissions": sorted(list(get_user_permissions(user))),
    }

@router.put("/users/{user_id}/roles")
async def set_user_roles(
    user_id: int,
    data: AssignRolesIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_roles"))
):
    """Replace all roles for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    roles = db.query(Role).filter(Role.id.in_(data.role_ids), Role.is_active == True).all()
    user.roles = roles
    db.commit()
    return {"message": f"Assigned {len(roles)} roles to {user.email}"}

@router.get("/users/with-roles")
async def list_users_with_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "view_users"))
):
    """List all users with their assigned roles."""
    users = db.query(User).filter(User.is_active == True).order_by(User.full_name).all()
    return [{
        "id": u.id, "email": u.email, "full_name": u.full_name,
        "is_superuser": u.is_superuser, "is_active": u.is_active,
        "department": u.department, "job_title": u.job_title,
        "roles": [{"id": r.id, "name": r.name, "display_name": r.display_name, "color": r.color}
                  for r in u.roles],
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]

# ── My permissions (for frontend UI decisions) ────────────────────────────────

@router.get("/my-permissions")
async def my_permissions(current_user: User = Depends(get_current_user)):
    """Returns the current user's permission set for frontend route/button guards."""
    return {
        "user_id": current_user.id,
        "is_superuser": current_user.is_superuser,
        "roles": [r.name for r in current_user.roles],
        "permissions": sorted(list(get_user_permissions(current_user))),
        "can": lambda module, action: user_has_permission(current_user, module, action),
    }

# ── Seed endpoint ─────────────────────────────────────────────────────────────

@router.post("/seed")
async def seed_rbac_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "system_settings"))
):
    """Re-seed all roles and permissions (idempotent)."""
    from app.core.rbac_seed import seed_rbac
    seed_rbac(db)
    total_perms = db.query(Permission).count()
    total_roles = db.query(Role).count()
    return {"message": "RBAC seeded", "permissions": total_perms, "roles": total_roles}

# ── Permission matrix ─────────────────────────────────────────────────────────

@router.get("/matrix")
async def permission_matrix(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("admin", "manage_roles"))
):
    """Returns a module × role permission matrix for the UI grid."""
    roles = db.query(Role).filter(Role.is_active == True).order_by(Role.name).all()
    from sqlalchemy import func
    modules = [m for (m,) in db.query(Permission.module).distinct().order_by(Permission.module).all()]

    matrix = {}
    for module in modules:
        matrix[module] = {}
        module_perms = db.query(Permission).filter(Permission.module == module).all()
        for role in roles:
            role_perm_names = {p.name for p in role.permissions}
            matrix[module][role.name] = {
                p.action: p.name in role_perm_names
                for p in module_perms
            }

    return {
        "roles": [{"name": r.name, "display_name": r.display_name, "color": r.color} for r in roles],
        "modules": modules,
        "matrix": matrix,
    }
