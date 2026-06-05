from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class DocumentFolder(Base):
    __tablename__ = "document_folders"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey('document_folders.id'), nullable=True)
    description = Column(Text)
    is_public = Column(Boolean, default=False)
    access_roles = Column(JSON, default=[])
    created_by = Column(Integer, ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    documents = relationship("Document", back_populates="folder")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    doc_number = Column(String(50), unique=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    folder_id = Column(Integer, ForeignKey('document_folders.id'), nullable=True)
    document_type = Column(String(100))
    file_url = Column(String(500))
    file_name = Column(String(255))
    file_size = Column(Float)
    mime_type = Column(String(100))
    tags = Column(JSON, default=[])
    entity_type = Column(String(50))  # customer, vendor, employee, project
    entity_id = Column(Integer)
    expiry_date = Column(DateTime(timezone=True))
    is_confidential = Column(Boolean, default=False)
    access_roles = Column(JSON, default=[])
    version = Column(String(20), default="1.0")
    status = Column(String(50), default="active")
    created_by = Column(Integer, ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    folder = relationship("DocumentFolder", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    version = Column(String(20))
    file_url = Column(String(500))
    file_size = Column(Float)
    change_notes = Column(Text)
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    document = relationship("Document", back_populates="versions")
