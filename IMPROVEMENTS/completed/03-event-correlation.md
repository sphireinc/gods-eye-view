# Explainable Event Correlation Board

## Feature

Add a user-authored correlation workspace that groups related public signals
around a place and time: for example, a launch window with satellite passes,
nearby aircraft, a reported earthquake, or a fire detection near a road closure.
The board should present hypotheses and evidence, never declare intelligence
judgments as facts.

## Why it is valuable

The app already places many signals on one globe, but the user must mentally
remember relationships. A correlation board turns that visual fusion into a
repeatable investigation artifact while respecting the project's public-data
and responsible-use boundary. It is useful for education, journalism,
geospatial exploration, and debugging source disagreement.

## Implementation

Create `src/correlation/` with a typed `CorrelationWorkspace`, `EvidenceRef`,
and `Hypothesis` model. Evidence references should point to ledger observation
IDs, not copy mutable layer objects. A workspace contains an area geometry,
time interval, selected entity IDs, user notes, and optional rules such as
“within 25 km” or “within 30 minutes.”

Add a right-rail mode with an evidence table, a map highlight group, a compact
timeline, and a note editor. Selecting a row should focus the globe without
changing the underlying layer visibility. Each evidence row shows source,
freshness, and uncertainty. A generated summary, if voice/AI is enabled, must
be constrained to the evidence payload and use wording such as “may be related”
or “co-occurs in this window.” It must never identify a person or infer intent.

Implement deterministic local correlation functions first: spatial distance,
temporal overlap, heading similarity, source agreement, and shared route or
location identifiers. Keep an explicit `explanation[]` with each match so the
UI can say why two records were grouped. Later, a server-side or model-assisted
ranker may suggest candidates, but suggestions must remain unaccepted until the
user pins them as evidence.

Support JSON and Markdown export with a source manifest, UTC timestamps, map
center, and a “limitations” section. Persist workspaces in IndexedDB and add a
share-link mode only for explicitly exported, bounded workspaces; never expose
API keys or private notes by default.

## Testing and rollout

Test geodesic edge cases near the antimeridian and poles, time-window
boundaries, stale evidence, deleted ledger records, duplicate entities, and
the rule that people are not a searchable entity type. Add visual tests for
highlight coexistence with tracking, detection overlays, cockpit mode, and
Context isolation. Start with a read-only “group these selected records” flow
before adding saved hypotheses.

## Definition of done

Users can create a workspace from visible public observations, see every match's
mathematical explanation and source age, annotate it locally, and export a
portable artifact that another person can audit without trusting an opaque
score.
