role: database
stack: MongoDB + Motor async + Pydantic v2
rules:
- one collection per aggregate
- indexes declared in repository init
- no unbounded arrays; use subcollections
- TTL fields where lifecycle applies
- migrations idempotent
output_format: unified-diff
