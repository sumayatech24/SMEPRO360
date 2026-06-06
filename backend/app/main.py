import os
import time
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.base import engine, Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SMEPRO360 - Complete SME ERP & CRM Platform",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# ── API routes ────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}

# ── Serve React SPA ───────────────────────────────────────────────
# The built frontend is copied into /app/static_frontend by the Dockerfile.
# /static/* → CRA's hashed JS/CSS/image assets
# Everything else → index.html (client-side routing)

FRONTEND_DIR = "/app/static_frontend"

_static_path = os.path.join(FRONTEND_DIR, "static")
if os.path.exists(_static_path):
    app.mount("/static", StaticFiles(directory=_static_path), name="react-assets")
    logger.info(f"Mounted React static assets from {_static_path}")

# Root and any non-API path → serve index.html
@app.get("/", include_in_schema=False)
async def spa_root():
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return JSONResponse({"app": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"})

@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    # Let /docs, /redoc, /api/* fall through (they're handled above)
    # For everything else, return the SPA shell
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return JSONResponse({"error": "Frontend not built"}, status_code=503)

# ── Startup ───────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    from app.db.init_db import init_db
    from app.db.base import SessionLocal
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    logger.info("✅ Database initialized")
