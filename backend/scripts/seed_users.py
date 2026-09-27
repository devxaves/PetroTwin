"""Seed demo accounts for PetroTwin.

DEMO CREDENTIALS — rotate before any real production deployment!
- engineer_demo / EngineerPass2026!  (Role: engineer)
- approver_demo / ApproverPass2026!  (Role: approver)
"""

import asyncio
import sys
from pathlib import Path

# Ensure the backend root is importable when this script is run directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.auth import User, get_password_hash
from app.db.session import async_session_factory

DEMO_USERS = [
    {
        "username": "engineer_demo",
        "password": "EngineerPass2026!",
        "role": "engineer",
    },
    {
        "username": "approver_demo",
        "password": "ApproverPass2026!",
        "role": "approver",
    },
]


async def seed_users():
    async with async_session_factory() as session:
        for u in DEMO_USERS:
            stmt = select(User).where(User.username == u["username"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                new_user = User(
                    username=u["username"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                    is_active=True,
                )
                session.add(new_user)
                print(f"Created demo user: {u['username']} ({u['role']})")
            else:
                print(f"Demo user already exists: {u['username']}")
        await session.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed_users())
