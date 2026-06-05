"""
RBAC — Role-Based Access Control
Usage in endpoints:
    from app.core.rbac import require_permission
    current_user: User = Depends(require_permission("leads", "create"))
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models.user import User, Permission
from app.api.v1.endpoints.auth import get_current_user
from typing import Optional
import functools

# ── Confidentiality levels (ordered) ─────────────────────────────────────────
CONFIDENTIALITY_LEVEL = {
    "public": 0,
    "internal": 1,
    "confidential": 2,
    "restricted": 3,
}

# ── Permission resolver ───────────────────────────────────────────────────────
def get_user_permissions(user: User) -> set:
    """Return set of permission names the user holds via their roles."""
    perms = set()
    for role in (user.roles or []):
        for perm in (role.permissions or []):
            perms.add(perm.name)
    return perms

def user_has_permission(user: User, module: str, action: str) -> bool:
    """Check if user has a specific module:action permission."""
    if user.is_superuser:
        return True
    perm_name = f"{module}:{action}"
    return perm_name in get_user_permissions(user)

def user_max_confidentiality(user: User) -> int:
    """Return the highest confidentiality level the user's roles can access."""
    if user.is_superuser:
        return CONFIDENTIALITY_LEVEL["restricted"]
    max_level = CONFIDENTIALITY_LEVEL["public"]
    for role in (user.roles or []):
        for perm in (role.permissions or []):
            lvl = CONFIDENTIALITY_LEVEL.get(perm.confidentiality or "internal", 1)
            if lvl > max_level:
                max_level = lvl
    return max_level

# ── FastAPI dependency factory ────────────────────────────────────────────────
def require_permission(module: str, action: str):
    """
    FastAPI dependency — raises 403 if user lacks module:action permission.
    Superusers always pass.
    Usage:
        @router.post("/")
        async def create(current_user: User = Depends(require_permission("leads", "create"))):
    """
    def _check(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not current_user.is_active:
            raise HTTPException(status_code=403, detail="Account is inactive")
        if current_user.is_superuser:
            return current_user
        if not user_has_permission(current_user, module, action):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {module}:{action}"
            )
        return current_user
    return _check

def require_confidentiality(level: str):
    """Reject users whose roles don't reach the required confidentiality level."""
    required = CONFIDENTIALITY_LEVEL.get(level, 1)
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        user_level = user_max_confidentiality(current_user)
        if user_level < required:
            raise HTTPException(
                status_code=403,
                detail=f"This resource requires '{level}' confidentiality access"
            )
        return current_user
    return _check
