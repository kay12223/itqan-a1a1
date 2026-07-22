---
name: FastAPI Depends() forward-reference ordering
description: A module-level `def f(x = Depends(g))` crashes at import time with NameError if g is defined later in the file, even though it's a default-arg expression evaluated once.
---

Python evaluates default argument expressions (including `Depends(g)`) at function-definition time, not call time. If a dependency function like `get_current_user` is defined further down the file, any earlier `async def other(user = Depends(get_current_user))` raises `NameError: name 'get_current_user' is not defined` and crashes the whole app on startup (uvicorn worker exits immediately).

**Why:** The Itqan project's `server.py` had `require_subscription` (using `Depends(get_current_user)`) defined ~50 lines before `get_current_user` itself, silently breaking every app boot after a fresh import.

**How to apply:** When debugging a FastAPI app that fails to boot with `NameError` pointing at a `Depends(...)` default argument, move the dependent function below the function it depends on (or reorder so dependencies are always defined first). This is a distinct issue from the `include_router` ordering problem — that one causes silent 404s, this one crashes startup entirely.
