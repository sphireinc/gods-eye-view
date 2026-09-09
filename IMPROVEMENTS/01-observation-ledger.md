# Observation Ledger and Provenance Timeline

## Feature

Add a local-first observation ledger that records every accepted external
observation with its source, acquisition time, source timestamp, freshness,
transformations, uncertainty, and lifecycle state. The ledger would power a
timeline drawer, per-entity provenance panels, and truthful “last seen” labels
across flights, vessels, satellites, fires, earthquakes, CCTV, traffic, and
mapped context.

## Why it is valuable

The globe currently combines live, cached, modeled, bundled, and inferred data.
The UI already works hard to distinguish `LOADING`, `STALE`, `FALLBACK`, and
`UNKNOWN`; a durable ledger would make that distinction inspectable instead of
leaving it only in transient chips. It would answer the questions a curious
user immediately has: “When was this position observed?”, “Did this come from
OpenSky or a fallback?”, “Was this route inferred?”, and “What changed while I
was looking away?” It also creates the foundation for history, export, replay,
and reproducible bug reports.

## Implementation

Create `src/observations/` with a schema version, normalizers, an append-only
writer, retention policy, and query helpers. A normalized record should contain
`observationId`, `entityKey`, `entityType`, `sourceId`, `sourceVersion`,
`observedAt`, `receivedAt`, `validUntil`, `geometry`, `properties`,
`derivation[]`, `uncertainty`, `quality`, and `status`. `derivation` must name
operations such as “adsb.lol regional fallback”, “route estimated from callsign”,
or “CCTV pose calibrated by operator”; it must never imply certainty the source
does not provide.

Adapt the manager and each layer at its ingestion boundary rather than logging
Cesium primitives. The layer remains responsible for source-specific parsing;
the ledger receives the canonical record after validation and before rendering.
Use IndexedDB, not `localStorage`, with object stores for observations, source
metadata, spatial buckets, and schema migrations. Keep a bounded default such as
24 hours or 250 MB, expose retention controls, and discard raw provider payloads
unless the user explicitly enables diagnostic capture.

Add a `PROVENANCE` action to entity cards and tracked readouts. The panel should
show source, source time, receive time, age, cache/fallback state, and a compact
confidence explanation. A timeline scrubber should query ledger records without
pretending that missing observations mean no activity. “No observation in this
window” must remain visibly different from “observed absent.”

## Testing and rollout

Unit-test schema migration, clock skew, duplicate observation IDs, out-of-order
updates, retention, quota exhaustion, and every source-to-provenance mapping.
Add contract tests asserting that stale cached OpenSky data, modeled traffic,
bundled infrastructure, and inferred CCTV projections receive distinct labels.
Use a feature flag for writes first, then enable the drawer, then make selected
entity provenance visible. Add a synthetic fixture mode so QA can inspect a
complete timeline without network access.

## Definition of done

An entity can be selected, its provenance can be read, and its observation age
survives a reload. A source outage preserves the last known record with a clear
stale state. Exported records contain enough source and transformation metadata
for another user to understand what the app knew and when, while no private
credentials or raw provider secrets enter the ledger.
