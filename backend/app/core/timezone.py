"""Timezone configuration for PetroTwin.

Standardized on Indian Standard Time (IST, UTC+05:30) for field operational
telemetry, digital twin joint state, simulation cycles, and immutable audit logs.
"""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

try:
    IST = ZoneInfo("Asia/Kolkata")
except Exception:  # Fallback for environments lacking tzdata package
    IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def now_ist() -> datetime:
    """Return current timezone-aware datetime in Indian Standard Time (IST)."""
    return datetime.now(IST)


def to_ist(dt: datetime) -> datetime:
    """Convert an existing datetime instance to Indian Standard Time (IST)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)
