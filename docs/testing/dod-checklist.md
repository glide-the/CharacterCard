# P6 DoD Checklist (2026-02-19)

## Required
- Unit tests for parser/join/DSL/version routing: MET (vitest)
- Integration test: package directory -> `evaluation-pack.v1.json`: MET (convertGameEnginePackage test)
- Regression test: golden diff for `symbol_engine_20260218_v2.0.json`: MET (goldenDiff.test.ts)
- Runtime smoke test: complete one round with rule trigger + attribute update: MET (orchestratorSmoke.test.ts)
- Source trace coverage for target fields: MET (`extensions.traceMap` persisted; trace coverage test added)

## Completed This Run
- Test run (`npm test`): MET
- Regression golden diff test (evaluation-pack): MET
- Runtime smoke test (orchestrateTurn mocked tasks): MET
- Source trace coverage verification: COMPLETED (recursive scan on `evaluation-pack.v1.json`)
- Trace map persisted in unified pack (`extensions.traceMap`)
- Trace coverage test added to automated suite

## Blockers
- No active blockers in P6 DoD checklist (previous "trace not verified" blocker is closed)

## Next Actions
- None
