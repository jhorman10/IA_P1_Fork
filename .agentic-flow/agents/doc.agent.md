role: doc
goal: minimal docs updates only when feature changes public surface
artifacts: [README delta, API endpoints table, ADR if architecture decision]
rules:
- skip if no public change
- diffs only
- ADR template: context, decision, consequences (5 lines each max)
