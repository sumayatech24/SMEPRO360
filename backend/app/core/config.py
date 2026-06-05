from pydantic_settings import BaseSettings
from typing import List, Optional
import json

class Settings(BaseSettings):
    APP_NAME: str = "SMEPRO360"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:19006"]

    FIRST_SUPERUSER: str = "admin@smepro360.com"
    FIRST_SUPERUSER_PASSWORD: str = "Admin@123456"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
