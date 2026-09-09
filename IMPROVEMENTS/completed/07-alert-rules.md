# Local Alert Rules and Change Detection

## Feature

Add local, user-defined alerts over public entities and layer health: a vessel
enters a radius, a tracked aircraft changes altitude regime, a fire appears in a
saved area, a camera goes stale, or a provider switches to fallback. Alerts
should be event-oriented and bounded, not person-oriented surveillance.

## Why it is valuable

Live data is useful even when the user is not staring at the globe. Alerts make
the project a monitoring instrument while preserving its public-data boundary.
They also expose the value of honest source states: “no aircraft observed” and
“aircraft feed unavailable” must not trigger the same rule.

## Implementation

Create `src/alerts/` with a declarative rule schema: `id`, `name`, `enabled`,
`entityTypes`, `area`, `predicate`, `debounce`, `cooldown`, `severity`, and
`delivery`. Predicates should include enter/exit, property threshold, change,
appearance/disappearance, source health, and freshness. Require a bounded area,
bounded entity type, and maximum evaluation rate. Explicitly reject person
identifiers, face or biometric fields, and unconstrained global high-frequency
rules.

Evaluate rules against normalized ledger updates, not rendered primitives. Keep
per-rule state in IndexedDB so reloads do not create duplicate “entered” alerts.
Use a transition table with `UNKNOWN` as a first-class state: an unavailable
source suspends an alert and produces a health notice instead of an exit event.
Expose event evidence with the source observation IDs and the before/after
values that caused the match.

Add an Alerts drawer with rule creation from the current viewport or selected
entity, a test-preview button, mute/cooldown controls, and an event history.
Use browser notifications only after permission; default to in-app toasts and
an accessible alert region. Optional webhooks should be an explicit advanced
feature with URL validation, timeout, redaction, and a local-only default.

## Testing and rollout

Test enter/exit hysteresis, antimeridian areas, stale-source suspension,
duplicate updates, clock skew, reload persistence, cooldowns, notification
permission denial, and malicious webhook URLs. Include a privacy review and
test that no alert payload contains provider secrets or hidden raw records.

## Definition of done

Users can create a bounded public-data alert, receive one honest event with
auditable evidence, survive a reload without duplicates, and understand whether
silence means “nothing matched” or “the source could not answer.”

## Implemented surfaces

- `src/alerts/rules.js` validates bounded declarative predicates, antimeridian
  areas, public non-person entity types, restricted fields, cooldowns, and
  evaluation rates.
- The engine models `UNKNOWN`, `ABSENT`, and `PRESENT` separately; unavailable
  sources suspend rules rather than synthesizing exits, and emitted events carry
  observation IDs plus before/after values.
- `DataLayerManager.consumeObservation()` is the normalized update seam for
  alert evaluation, while `src/alerts/alertPanel.js` provides a local in-app
  history drawer with explicit uncertainty language.
- IndexedDB state persistence and redaction-safe history APIs are exposed for
  reload-safe integration; browser notification/webhook delivery remains opt-in
  and outside the default local-only path.
