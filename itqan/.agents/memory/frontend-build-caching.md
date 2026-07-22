---
name: Frontend is a prebuilt static bundle, not dev server
description: start.sh only rebuilds frontend/build if the folder is missing — edits to frontend/src won't appear until you rebuild manually.
---

`start.sh` checks `if [ ! -d "frontend/build" ]` before running `npm run build`; if the build folder already exists, it skips building entirely and just serves the stale bundle via FastAPI/uvicorn.

**Why:** After editing any file under `frontend/src`, restarting the workflow alone does NOT pick up the change — the old `main.<hash>.js` keeps being served (confirmed via 304/matching hash in logs), giving false confidence that changes are live.

**How to apply:** After any frontend edit, run `cd frontend && npm run build` (or `rm -rf build` first) before restarting the workflow, then verify the served JS/CSS hash changed in the workflow log.
