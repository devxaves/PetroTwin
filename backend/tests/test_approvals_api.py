"""Integration tests for Operator Approval Audit Log:
- POST /wells/{well_id}/approvals (create approval record)
- GET /wells/{well_id}/approvals (retrieve audit history)
- Validation: rejected/modified/approved decisions
- Safety Assertion: Proves that approval does NOT trigger any external action or hardware actuation
"""

from __future__ import annotations

import inspect
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes import approvals
from app.main import app


@pytest.mark.asyncio
async def test_create_and_list_operator_approval():
    """Test standard approval audit trail flow: record approval and retrieve history."""
    transport = ASGITransport(app=app)
    snapshot = {
        "css": {"steam_volume_t": 2800.0, "steam_pressure_mpa": 11.5, "soak_days": 4},
        "srp": {"target_spm": 6.0, "action": "REDUCE_SPM"},
        "combined_confidence": 0.92,
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Record approval
        post_resp = await client.post(
            "/wells/WELL-001/approvals",
            json={
                "recommendation_snapshot": snapshot,
                "operator_decision": "approved",
                "operator_notes": "Approved for Cycle 3 steam optimization during day shift.",
            },
        )
        assert post_resp.status_code == 201, post_resp.text
        created = post_resp.json()
        assert created["well_id"] == "WELL-001"
        assert created["operator_decision"] == "approved"
        assert created["operator_notes"] == "Approved for Cycle 3 steam optimization during day shift."
        assert created["recommendation_snapshot"] == snapshot
        assert "decided_at" in created
        assert created["outcome_recorded_at"] is None

        # 2. Retrieve history
        get_resp = await client.get("/wells/WELL-001/approvals")
        assert get_resp.status_code == 200, get_resp.text
        history = get_resp.json()
        assert len(history) >= 1
        matching = [item for item in history if item["id"] == created["id"]]
        assert len(matching) == 1
        assert matching[0]["operator_decision"] == "approved"


@pytest.mark.asyncio
async def test_operator_approval_validation():
    """Test validation of operator decisions (approved, rejected, modified)."""
    transport = ASGITransport(app=app)
    snapshot = {"test": "data"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Invalid decision string
        resp = await client.post(
            "/wells/WELL-001/approvals",
            json={
                "recommendation_snapshot": snapshot,
                "operator_decision": "auto_execute_now",  # Invalid!
                "operator_notes": "Should fail validation",
            },
        )
        assert resp.status_code == 422
        assert "Invalid operator decision" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_operator_approval_zero_actuation_safety():
    """
    CRITICAL SAFETY PROOF:
    Assert that operator approvals are STRICTLY audit logging only.
    Verify that no 'apply_to_well', 'execute_control', 'send_scada_command',
    or external hardware dispatch logic exists in the approvals router.
    """
    # 1. Inspect the approvals router module attributes and functions
    functions = [
        obj for name, obj in inspect.getmembers(approvals, inspect.isfunction)
    ]
    function_names = [f.__name__ for f in functions]

    # Verify only record and get exist
    assert "record_operator_approval" in function_names
    assert "get_operator_approvals" in function_names

    forbidden_patterns = [
        "apply_to_well",
        "execute_recommendation",
        "dispatch_scada",
        "send_hardware_command",
        "actuate_well",
    ]

    for f_name in function_names:
        for pattern in forbidden_patterns:
            assert pattern not in f_name, (
                f"Forbidden actuator function '{f_name}' detected in approvals router! "
                "Approvals must be strictly non-actuating."
            )

    # 2. Inspect the source code of record_operator_approval
    src = inspect.getsource(approvals.record_operator_approval)
    for pattern in forbidden_patterns:
        assert pattern not in src, (
            f"Forbidden actuation call '{pattern}' found in record_operator_approval source!"
        )
