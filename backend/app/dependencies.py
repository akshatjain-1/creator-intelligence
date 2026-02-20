"""
FastAPI dependencies — Firebase JWT verification & user resolution.

Every protected endpoint uses:
    current_user: User = Depends(get_current_user)
"""

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

# ── Firebase Admin SDK init (once at module load) ───

_cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(_cred)

# ── Security scheme ─────────────────────────────────

bearer_scheme = HTTPBearer()


# ── Dependency ──────────────────────────────────────

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    1. Extract Bearer token from Authorization header.
    2. Verify via Firebase Admin SDK → get firebase_uid.
    3. Fetch or create User row in our DB.
    4. Return User ORM object.
    """
    token = creds.credentials
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
        )

    firebase_uid: str = decoded["uid"]
    email: str = decoded.get("email", "")

    # Fetch or create
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        user = User(firebase_uid=firebase_uid, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
