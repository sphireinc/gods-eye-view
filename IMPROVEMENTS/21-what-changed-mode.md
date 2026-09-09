# What Changed Mode

## Feature

Add a first-class `WHAT CHANGED?` mode that compares a selected place, region,
or viewport across two time windows and produces an evidence-backed change
queue. It should answer “what is different?” rather than forcing users to
remember the prior state of every layer.

## Why it is useful

God's Eye View already has live layers, a proposed observation ledger, time
replay, conflict context, satellite imagery, public cameras, and environmental
data. Change detection is the interaction that turns those ingredients into a
daily-use observatory. It is useful for ordinary changes as well as crises:
weather shifts, traffic patterns, fires, floods, construction, changing camera
availability, altered air quality, new reports, or unusual connectivity.

## User experience

The user chooses a comparison window such as:

- Now versus one hour ago
- Today versus yesterday
- This week versus last week
- Current month versus the same month last year
- A custom ledger or satellite-image interval

The right rail shows ranked cards such as `NEW`, `REMOVED`, `INCREASED`,
`DECREASED`, `MOVED`, `RECLASSIFIED`, `SOURCE CHANGED`, and `UNKNOWN`. Every
card includes the affected layer, before/after values, source timestamps,
confidence, and an action to inspect the underlying observations.

The globe supports a difference mode: fading old observations, highlighting new
ones, animating movement, and showing a split-screen or swipe comparison for
imagery. Modeled or interpolated changes use a different visual treatment from
directly observed changes.

## Implementation

Create `src/change/changeDetector.js` with layer-specific comparators and a
common result schema. Comparators should include entity appearance/disappearance,
numeric delta, geometry displacement, density change, categorical transition,
source-health transition, and raster difference. Each result references ledger
observation IDs and includes an explanation rather than an opaque anomaly score.

Use the ledger's spatial index to compare only the selected area and time range.
Add hysteresis and minimum thresholds so telemetry jitter does not create a
constant stream of meaningless changes. Keep a clear distinction between “no
change observed,” “no observation available,” and “the source was unavailable.”

## Testing and definition of done

Test clock boundaries, stale records, out-of-order observations, antimeridian
geometry, duplicate events, sparse sampling, source outages, and provider
revisions. A user should be able to open a place, select two periods, see a
ranked and explainable list of changes, and trace every result to its sources.
