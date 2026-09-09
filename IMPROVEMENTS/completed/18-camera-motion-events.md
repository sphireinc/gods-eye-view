# Privacy-Preserving Camera Motion Events

## Feature

Add an optional scene-level motion-events layer that reports broad public-camera
changes such as `ROADWAY BUSY`, `WATER LEVEL CHANGED`, `SNOW ACCUMULATION`,
`VISIBILITY REDUCED`, or `FRAME STATIC`. It should compare frames or provider
metadata without identifying, counting, or following people.

## Why it is valuable

Users often need to know whether a public camera is changing before opening a
feed. Scene-level events could help find active storms, traffic disruptions,
harbor conditions, or dead feeds across a global atlas. This adds utility while
remaining much safer than object-level surveillance.

## Implementation

Create `src/data/cameraMotionEvents.js` with a fixed, reviewed taxonomy of
scene-level events. Compute simple features such as perceptual frame difference,
sky/ground color distribution, waterline movement, snow/visibility changes, and
camera freeze detection. Run processing locally where practical and retain only
the event type, score band, source frame timestamps, and short expiry—not raw
frames or crops.

The event engine must include a privacy guard that rejects face, body, plate,
weapon, identity, and individual-track outputs. It should not expose generic
“objects detected” counts, because those are easily repurposed for people
tracking. Camera packs can opt out entirely or restrict which event classes are
allowed.

Add event badges to camera clusters and a filter such as `SHOW ACTIVE WEATHER
CHANGES`. Cards should say `SCENE CHANGE ESTIMATE`, show the comparison times,
method, and confidence band, and link to the public source. Events should expire
quickly and never be presented as an incident or emergency determination.

For operators with their own feeds, offer a local-only mode that never sends
frames to the project server. For catalog feeds, do not bypass a source's
caching or transformation permissions; a camera that permits link-only display
cannot participate in frame comparison.

## Testing and rollout

Test static feeds, camera exposure changes, time-of-day transitions, rain,
compression noise, reconnects, duplicate frames, and false positives. Add a
privacy review test that inspects serialized event payloads for forbidden fields.
Keep the taxonomy small until human QA shows that labels are understandable and
not overconfident.

## Definition of done

Users can discover broad, temporary changes in lawful public scenes without the
system producing person-level detections, identity claims, or retained video.
Every event is time-bounded, source-linked, and clearly labeled as an estimate.
