---
name: FastAPI include_router placement
description: app.include_router(api) must be called AFTER all @api.* route definitions or routes are silently dropped.
---

In FastAPI/Starlette, `app.include_router(router)` iterates over `router.routes` at call time and copies them into the app. Routes added to the router AFTER include_router was called are never registered with the app.

**Why:** The Itqan project had `app.include_router(api)` in the middle of server.py; performance routes, activity-log, and many other endpoints defined below it were silently unreachable (404).

**How to apply:** Always place `app.include_router(api)` as the very last router operation, after all `@api.get/post/put/delete` decorators. A comment marker like `# MUST come after all @api.* route definitions` helps future editors.
