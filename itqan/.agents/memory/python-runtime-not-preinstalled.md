---
name: Python runtime not preinstalled in this repl
description: This repl's Nix environment ships without python3/uvicorn available by default, even though backend/requirements.txt lists FastAPI deps.
---

The workspace's base Nix config only had `[nix] channel = "stable-25_05"` with no Python module — `python3` and `uvicorn` were both missing from PATH on a fresh environment/session, even though the backend code and requirements.txt assumed they existed and start.sh expects `uvicorn` on PATH.

**Why:** The project's `pyproject.toml` had empty dependencies and no Python language module was installed, so `bash start.sh` failed at the "uvicorn not found" step despite the codebase looking fully set up.

**How to apply:** If `Start application` workflow fails with "command not found" for python/uvicorn, install the Python 3.11 module and then install packages from `backend/requirements.txt` via the package-management tools before retrying the workflow restart.
