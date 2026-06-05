from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.db.base import get_db
from app.models.document import Document, DocumentFolder, DocumentVersion
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/folders")
async def list_folders(parent_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(DocumentFolder).filter(DocumentFolder.is_active == True)
    if parent_id is not None: q = q.filter(DocumentFolder.parent_id == parent_id)
    else: q = q.filter(DocumentFolder.parent_id == None)
    folders = q.all()
    return [{"id": f.id, "name": f.name, "parent_id": f.parent_id, "description": f.description} for f in folders]

@router.post("/folders")
async def create_folder(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = DocumentFolder(name=data.get("name"), parent_id=data.get("parent_id"),
                        description=data.get("description"), created_by=current_user.id)
    db.add(f); db.commit(); db.refresh(f)
    return {"id": f.id, "name": f.name}

@router.get("/")
async def list_documents(folder_id: Optional[int] = None, entity_type: Optional[str] = None,
                          entity_id: Optional[int] = None, skip: int = 0, limit: int = 50,
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Document).filter(Document.is_active == True)
    if folder_id is not None: q = q.filter(Document.folder_id == folder_id)
    if entity_type: q = q.filter(Document.entity_type == entity_type)
    if entity_id: q = q.filter(Document.entity_id == entity_id)
    total = q.count()
    items = q.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [{"id": d.id, "doc_number": d.doc_number, "title": d.title,
            "document_type": d.document_type, "folder_id": d.folder_id, "file_url": d.file_url,
            "file_name": d.file_name, "file_size": d.file_size, "version": d.version,
            "tags": d.tags, "status": d.status,
            "created_at": d.created_at.isoformat() if d.created_at else None} for d in items]}

@router.post("/")
async def create_document(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(func.count(Document.id)).scalar()
    doc = Document(doc_number=f"DOC-{(count or 0) + 1:05d}", title=data.get("title"),
                    description=data.get("description"), folder_id=data.get("folder_id"),
                    document_type=data.get("document_type"), file_url=data.get("file_url"),
                    file_name=data.get("file_name"), file_size=data.get("file_size"),
                    mime_type=data.get("mime_type"), tags=data.get("tags", []),
                    entity_type=data.get("entity_type"), entity_id=data.get("entity_id"),
                    created_by=current_user.id)
    db.add(doc); db.commit(); db.refresh(doc)
    return {"id": doc.id, "doc_number": doc.doc_number}

@router.get("/{doc_id}")
async def get_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d: raise HTTPException(404, "Not found")
    return {"id": d.id, "doc_number": d.doc_number, "title": d.title, "description": d.description,
            "document_type": d.document_type, "file_url": d.file_url, "file_name": d.file_name,
            "file_size": d.file_size, "version": d.version, "tags": d.tags, "status": d.status,
            "versions": [{"id": v.id, "version": v.version, "created_at": v.created_at.isoformat()} for v in d.versions]}

@router.put("/{doc_id}")
async def update_document(doc_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(d, k): setattr(d, k, v)
    db.commit(); return {"id": d.id, "title": d.title}

@router.delete("/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d: raise HTTPException(404, "Not found")
    d.is_active = False; db.commit(); return {"message": "Deleted"}
