"""
Fernet-based encryption utilities for OAuth token storage.

Tokens are encrypted at rest in the database (PRD §7: Security).
"""

from cryptography.fernet import Fernet

from app.config import settings

# Initialize Fernet cipher with the key from .env
_fernet = Fernet(settings.FERNET_KEY.encode())


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token string → base64 ciphertext for DB storage."""
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a base64 ciphertext from DB → original token string."""
    return _fernet.decrypt(ciphertext.encode()).decode()
