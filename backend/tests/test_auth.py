import pytest
from app.core.auth import (
    create_access_token,
    get_password_hash,
    verify_password,
    decode_access_token,
)

def test_password_hashing_and_verification():
    raw = "MySecurePass123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPass", hashed) is False

def test_jwt_token_generation_and_decode():
    payload = {"sub": "engineer_demo", "role": "engineer"}
    token = create_access_token(payload)
    assert isinstance(token, str)
    
    decoded = decode_access_token(token)
    assert decoded["sub"] == "engineer_demo"
    assert decoded["role"] == "engineer"
    assert "exp" in decoded

def test_expired_or_invalid_jwt():
    with pytest.raises(Exception):
        decode_access_token("invalid.token.structure")
