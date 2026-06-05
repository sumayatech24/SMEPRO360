from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app.db.base import get_db
from app.models.user import User, Role
from app.api.v1.endpoints.auth import get_current_user
from app.core.security import get_password_hash

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    full_name: str
    username: Optional[str] = None
    password: str
    is_superuser: bool = False
    tenant_id: Optional[int] = None
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/")
async def list_users(
    skip: int = 0, limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User)
    if search:
        query = query.filter(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [{"id": u.id, "email": u.email, "full_name": u.full_name, "username": u.username,
                   "is_active": u.is_active, "is_superuser": u.is_superuser, "phone": u.phone,
                   "tenant_id": u.tenant_id, "created_at": u.created_at} for u in users]
    }

@router.post("/")
async def create_user(data: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        full_name=data.full_name,
        username=data.username or data.email.split("@")[0],
        hashed_password=get_password_hash(data.password),
        is_superuser=data.is_superuser,
        tenant_id=data.tenant_id,
        phone=data.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "full_name": user.full_name}

@router.get("/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "username": user.username,
            "is_active": user.is_active, "is_superuser": user.is_superuser, "phone": user.phone}

@router.put("/{user_id}")
async def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    return {"message": "Updated"}

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "Deactivated"}
