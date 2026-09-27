import pytest
from fastapi import HTTPException

from app.core.auth import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing_and_verification():
    raw_pass = "TestPassword123!"
    hashed = get_password_hash(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_generation_and_validation():
    payload = {"sub": "engineer_demo", "role": "engineer"}
    token = create_access_token(payload)
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded["sub"] == "engineer_demo"
    assert decoded["role"] == "engineer"
    assert "exp" in decoded


def test_expired_or_invalid_jwt():
    with pytest.raises(HTTPException):
        decode_access_token("invalid.token.structure")
