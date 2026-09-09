# Optional Local Edge Cache and Resilient Sync Queue

## Feature

Add an opt-in cache service for self-hosters that stores normalized public data
and proxy responses with explicit freshness, bounded disk use, and source-aware
retention. The browser should remain fully functional without it; the cache is a
resilience and multi-tab optimization, not a silent server requirement.

## Why it is valuable

The current Vite middleware already uses carefully bounded caches, stale-last-
good behavior, request coalescing, mirror rotation, and source-specific retry
logic. A small cache service would extend those strengths across browser reloads,
multiple tabs, and short upstream outages. It could also support the observation
ledger and time-machine features without forcing every layer to reinvent disk
storage.

## Implementation

Create an optional `scripts/cache-server.mjs` or Vite plugin backed by SQLite or
a similarly small local store. Records need source ID, normalized request key,
payload hash, acquired time, source time, expiry, stale-until, byte size, and
license class. Store normalized payloads by default; retain raw responses only
for sources whose terms permit it and only when diagnostics are enabled.

Expose `/api/cache/status`, `/api/cache/export`, and source-scoped invalidation.
Keep the current in-process behavior as the default and make the edge cache
explicit in setup. The client should receive cache headers and use the same
truthful `FRESH`, `STALE`, `DEGRADED`, and `UNAVAILABLE` vocabulary. A stale
response can preserve continuity, but it must never be presented as current.

Use request coalescing across tabs with a small lease/lock record, bounded
concurrency, response-size caps, and per-source policies. For WebSocket AIS,
store a compact last-seen snapshot and track history only when the user opts in;
do not pretend a snapshot is a continuous track. Add a sync queue for ledger
records and exports, not for mutating third-party providers.

## Security and testing

Bind to localhost by default, require an explicit shared-host setting, and reuse
the existing SSRF, allowlist, rate-limit, and redaction rules. Test disk full,
corrupt records, lock expiry, process restart, cache poisoning via keys, source
license retention, and two simultaneous browser tabs. Verify invalid upstream
payloads are never admitted merely because an old cache entry exists.

## Definition of done

With the optional cache enabled, a reload and a second local tab reuse bounded,
source-labeled data; short outages preserve last-good context; invalid or
over-age data stays visibly stale; cache status and deletion are inspectable;
and the app's safe localhost default remains unchanged when the feature is off.
