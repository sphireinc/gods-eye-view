# Provider Health, Quota, and Cost Center

## Feature

Add a local diagnostics center that unifies provider health, cache age, fallback
reason, request counts, approximate model/tiles usage, and configured app-level
rate limits. It should explain capability loss and help users avoid accidental
quota spend without pretending to be a billing system.

## Why it is valuable

The project already has many careful proxy safeguards, source-specific statuses,
OpenSky cache headers, TomTom budgets, optional OpenAI rate limits, and Provider
Settings. Those signals are distributed across chips, logs, and environment
variables. A single health center would make setup and troubleshooting much less
opaque, especially for self-hosters sharing a local instance.

## Implementation

Define a server `/api/health/providers` endpoint that returns sanitized,
non-secret telemetry: configured/not configured, last attempt, last success,
cache status, stale age, retry-after, request counts, limiter state, and safe
error categories. Never return keys, upstream URLs containing credentials, raw
provider response bodies, or unrestricted log paths. Add process-local counters
with bounded retention and reset-on-restart semantics explicitly shown in the
UI.

Create a client `ProviderHealthStore` that polls slowly, merges layer
`getStats()` data, and distinguishes source health from capability configuration.
Add a panel with sections for maps, live data, media, voice, and optional keys.
Each row should link to the responsible layer or setup instruction. Include
“pause expensive sources,” “clear cache,” and “copy sanitized diagnostics,” with
confirmation for actions that change behavior.

For OpenAI and paid tile routes, show an estimate based on locally counted
requests and configured model pricing metadata, clearly labeled approximate and
not a provider invoice. Keep pricing in a versioned registry so drift is visible.
Expose the existing daily TomTom budget and per-minute app throttles without
calling them hard billing caps.

## Testing and rollout

Unit-test redaction, counter rollover, stale transitions, provider failure
classification, and privacy of copied diagnostics. Add middleware contract tests
for every endpoint. Test with all keys absent, one key invalid, a stale cache,
and a shared-host configuration. Verify the panel itself never fetches a
provider directly.

## Definition of done

From one panel, a user can tell what is configured, what last succeeded, what is
cached or degraded, and what the app estimates it has spent. The information is
useful without exposing secrets and clearly distinguishes application telemetry
from provider billing truth.

## Implementation status

Completed on `improvements/10-provider-health-cost-center`. The branch now
includes a versioned provider catalog and pricing registry, recursive diagnostic
redaction, configuration/cost helpers, a local-only `/api/health/providers`
endpoint, and a provider-health panel. The panel labels keyless and ready
providers, shows process-local attempts and approximate spend, supports
reversible pause/resume hooks, and copies only sanitized diagnostics. The
endpoint deliberately reports no credentials, response bodies, or unrestricted
paths; production preview returns no health data.
