# Product & Engineering Overview

## Core Architecture
Needletail's AI call agent is built on a speech-to-text -> LLM reasoning -> text-to-speech pipeline, with a PMS integration layer that supports Dentrix, Eaglesoft, and Open Dental via API/RPA hybrid connectors.

## Current Roadmap (Next Quarter)
1. Expand PMS integrations to Curve Dental.
2. Launch outbound recall campaign automation (proactive patient re-booking).
3. Improve escalation model to reduce false-positive escalations by 15%.
4. Build self-serve onboarding flow for Starter tier (reduce dependency on onboarding specialist).

## Known Limitations
- AI agent currently struggles with multi-patient household calls (e.g. parent booking for 3 kids in one call) — workaround is auto-escalation.
- Real-time PMS sync has ~30 second lag for Eaglesoft due to API rate limits.

## Engineering On-call
On-call rotation is weekly, covering the call-handling pipeline and PMS integrations. Incidents are logged in the incident channel with severity levels (SEV1-3). SEV1 (agent totally down) requires page + response within 10 minutes.
