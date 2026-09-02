"""
JWT-based authentication.

Flow:
  POST /auth/register  -> creates user, returns a JWT
  POST /auth/login     -> verifies credentials, returns a JWT
  GET  /auth/me         -> returns the current user (useful for the frontend
                            to check "am I still logged in?")

Protect any route by adding:  current_user: dict = Depends(get_current_user)

Required env vars (see .env.example):
  JWT_SECRET_KEY    - long random string, keep secret
  JWT_EXPIRE_MINUTES - optional, defaults to 7 days
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, field_validator

from backend.ai.database import get_connection

JWT_ALGORITHM = "HS256"
DEFAULT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# auto_error=False so a missing token gives our own clean 401 message
# instead of FastAPI's default "Not authenticated" with no context.
security = HTTPBearer(auto_error=False)


def _secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Add it to your .env file. Generate one with:\n"
            '  python -c "import secrets; print(secrets.token_hex(32))"'
        )
    return secret


def _expire_minutes() -> int:
    return int(os.getenv("JWT_EXPIRE_MINUTES", DEFAULT_EXPIRE_MINUTES))


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


# ---------------------------------------------------------------------------
# Password + token helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed hash in the DB - treat as invalid rather than crashing.
        return False


def create_access_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=_expire_minutes())
    payload = {"sub": email, "exp": expire}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    return email


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Drop this into any route as `current_user: dict = Depends(get_current_user)`
    to require a valid, logged-in user."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated. Please sign in.")

    email = decode_access_token(credentials.credentials)

    conn = get_connection()
    try:
        row = conn.execute("SELECT id, email FROM users WHERE email = ?", (email,)).fetchone()
    finally:
        conn.close()

    if row is None:
        raise HTTPException(status_code=401, detail="User no longer exists.")

    return {"id": row["id"], "email": row["email"]}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest):
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (payload.email,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        password_hash = hash_password(payload.password)
        conn.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (payload.email, password_hash, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    finally:
        conn.close()

    token = create_access_token(payload.email)
    return TokenResponse(access_token=token, email=payload.email)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT email, password_hash FROM users WHERE email = ?", (payload.email,)
        ).fetchone()
    finally:
        conn.close()

    if row is None or not verify_password(payload.password, row["password_hash"]):
        # Same error for "no such user" and "wrong password" - don't leak
        # which one it was, that helps account enumeration attacks.
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token(row["email"])
    return TokenResponse(access_token=token, email=row["email"])


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user