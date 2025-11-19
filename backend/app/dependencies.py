from datetime import datetime
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from collections import defaultdict, deque

from .database import get_db
from .config import settings
from .models import User
from .security import verify_password, decode_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_rate_limiter_store: dict[str, deque] = defaultdict(deque)


def rate_limiter(request: Request):
    identifier = request.client.host if request.client else "global"
    window_seconds = settings.rate_limit_window_seconds
    limit = settings.rate_limit_requests
    now = datetime.utcnow().timestamp()

    window = _rate_limiter_store[identifier]
    while window and now - window[0] > window_seconds:
        window.popleft()
    if len(window) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de requisições excedido. Aguarde antes de tentar novamente.",
        )
    window.append(now)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    email = payload["sub"]
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
