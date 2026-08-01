import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import ai_engine


def test_generate_contextual_response_is_direct_for_staff_management(monkeypatch):
    monkeypatch.setattr(ai_engine.random, "choice", lambda seq: seq[0])

    response = ai_engine.generate_contextual_response(
        "كيف أضيف موظف جديد؟",
        {"name": "سامي"},
        {"name": "إتقان"},
        [],
    )

    assert "إدارة الموظفين" in response
    assert "إضافة" in response
    assert "موظف" in response


def test_get_worked_hours_supports_checkout_time_fields():
    from server import get_worked_hours_from_log

    log = {"check_in_time": "09:00", "check_out_time": "17:30"}
    assert get_worked_hours_from_log(log) == 8.5

    log2 = {"check_time": "08:30", "checkout_time": "16:00"}
    assert get_worked_hours_from_log(log2) == 7.5
