# Uncertainty Literacy Mode

## Feature

Add an educational mode that explains how public data works while users explore
the globe. It should turn source age, missing data, modeled values, spatial
uncertainty, source disagreement, and confidence bands into understandable
interactive lessons.

## Why it is useful

The project's visual language can make uncertain data look authoritative. A
layperson may interpret a glowing marker as a precise fact even when it is a
cached estimate or a coarse model. Teaching users how to read the evidence is a
core part of making this a responsible public observatory.

## Implementation

Create short contextual explainers for concepts such as:

- Observation time versus publication time
- Stale data versus no data
- Modeled traffic versus observed traffic
- Interpolated tracks versus measured positions
- Media volume versus event severity
- Source outage versus quiet conditions
- Spatial precision and aggregation
- Forecast versus retrospective record
- Corroboration versus repeated reporting

Add a `WHY THIS?` button to selected cards and a global “evidence labels” mode
that expands compact chips into plain-language explanations. Include a guided
tutorial using synthetic data so users can see how a false all-clear appears
when a source fails, and how the correct UI preserves `UNKNOWN`.

The mode should be available in simple language, with keyboard and screen-reader
support. It must never turn caveats into a wall of technical text; use one-line
explanations with expandable detail.

## Testing and definition of done

Test every visible source-state label for a plain-language explanation, reduced
motion, translation fallback, and no color-only meaning. A first-time user
should understand why an empty layer does not automatically mean an empty world.

## Implementation status

Completed on `improvements/26-uncertainty-literacy-mode`. The literacy model
now explains observed, modeled, inferred, stale, unknown, unavailable,
forecast, source-outage, repeated-reporting, and spatial-precision states in
plain language. It validates optional timestamps before displaying them and
includes synthetic lessons demonstrating why provider silence must remain
`UNKNOWN` and why repeated articles are not independent corroboration.
