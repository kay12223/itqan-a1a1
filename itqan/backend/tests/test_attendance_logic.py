import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import calculate_total_hours, normalize_attendance_date_range


def test_calculate_total_hours_rounds_to_two_decimals():
    assert calculate_total_hours("09:00", "17:30") == 8.5
    assert calculate_total_hours("09:15", "17:45") == 8.5
    assert calculate_total_hours("09:00", None) is None


def test_normalize_attendance_date_range_rejects_invalid_dates():
    assert normalize_attendance_date_range("2024-01-01", "2024-01-31") == ("2024-01-01", "2024-01-31")
    assert normalize_attendance_date_range(None, None) == (None, None)

    with pytest.raises(ValueError):
        normalize_attendance_date_range("2024/01/01", None)
