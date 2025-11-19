from contextlib import asynccontextmanager
from datetime import datetime
import pytz
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, engine, get_db
from .models import User
from .security import get_password_hash
from .dependencies import rate_limiter
from .routers import auth, printers, filaments, jobs, settings as settings_router, moonraker, timeline


def seed_admin(db: Session):
    admin = db.query(User).filter(User.email == settings.admin_email).first()
    if not admin:
        admin = User(email=settings.admin_email, hashed_password=get_password_hash(settings.admin_password))
        db.add(admin)
        db.commit()


@asynccontextmanager
def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with next(get_db()) as db:
        seed_admin(db)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_rate_limiting(request: Request, call_next):
    rate_limiter(request)
    return await call_next(request)


@app.get("/health")
async def health():
    tz = pytz.timezone(settings.timezone)
    return {"status": "ok", "time": datetime.now(tz).isoformat()}


app.include_router(auth.router)
app.include_router(printers.router)
app.include_router(filaments.router)
app.include_router(jobs.router)
app.include_router(settings_router.router)
app.include_router(moonraker.router)
app.include_router(timeline.router)
