---
name: ObjectId safety wrapper
description: Use safe_object_id() for all user-supplied ID strings in MongoDB queries to return 400 instead of crashing with 500.
---

The Itqan backend defines a helper at the top of server.py:

```python
def safe_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="معرّف غير صالح")
```

**Why:** Raw `ObjectId(user_input)` raises an unhandled exception if the input isn't a valid 24-char hex string, resulting in a 500 Internal Server Error leak. Using safe_object_id() gives a proper 400.

**How to apply:** Replace every `ObjectId(variable)` where `variable` comes from a path param, query param, or request body with `safe_object_id(variable)`. Internal IDs already confirmed as ObjectId (e.g. `user["_id"]`) don't need wrapping.

Also: cross-tenant guard — always include `company_id: user["company_id"]` in the query alongside `_id`, including in post-update fetch queries.
