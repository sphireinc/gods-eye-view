# Camera Weather and Visibility Nowcast

## Feature

Use openly published weather and scenic cameras as a visual conditions layer.
The feature would estimate broad scene conditions—clear, cloudy, foggy, snowy,
night, glare, rain-obscured, or stale—from camera metadata and optional public
weather observations, then show that state on the globe and in camera cards.

## Why it is valuable

It is a creative use of public cameras that does not require inspecting people:
users can see where it is daylight, where visibility is poor, where snow is
falling, or which coastal views are currently stormy. It complements the
existing weather effects and cockpit briefing while remaining explicitly
non-operational and approximate.

## Implementation

Create `src/data/cameraConditions.js` with a conservative condition vocabulary
and evidence model. Evidence can include camera-provided weather tags, nearby
public weather station readings, image timestamp, solar position, and optionally
an on-device lightweight image classifier restricted to scene-level categories.
Do not infer identity, demographics, activity, or individual behavior.

Every condition must include `observedAt`, `sourceIds`, `confidenceBand`, and
`method`. A stale frame may still show `LAST OBSERVED: SNOW`, but it must not
contribute to a “current” world condition map. Conflicting evidence should
produce `MIXED` rather than selecting a confident-looking answer.

Add a weather/visibility filter to the camera atlas and a global “conditions
ring” that clusters counts by broad category. Selecting a category flies to a
representative camera only after showing that it is a sampled example, not a
guarantee for the whole region. In Cockpit, a camera-derived condition can be
shown as contextual public imagery beside actual weather observations, never as
flight guidance.

For privacy and cost, prefer provider metadata and local feature extraction.
If a server-side classifier is ever offered, frames must be opt-in, transient,
redacted from logs, and processed only for the allowed category set.

## Testing and rollout

Test solar day/night boundaries, stale images, conflicting station readings,
missing EXIF, camera timezone conversion, low-confidence classification, and
category leakage. Use synthetic frames and metadata fixtures rather than
shipping real people's images in tests.

## Definition of done

Users can browse broad, source-backed public scene conditions around the world
and see exactly when and how each condition was determined. The feature never
claims operational weather certainty and never analyzes people.
