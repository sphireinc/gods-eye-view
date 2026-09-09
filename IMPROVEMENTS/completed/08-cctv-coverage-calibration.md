# Multi-Camera Coverage and Calibration Workspace

## Feature

Turn the existing CCTV frames, camera poses, calibration gizmo, and viewsheds
into a coverage workspace that compares cameras, tracks calibration confidence,
and shows blind spots without implying that an estimated frustum is verified
surveillance coverage.

## Why it is valuable

The project already projects public camera imagery into 3D and exposes estimated
viewsheds. The next useful step is to make the uncertainty and relationships
first-class: compare feeds covering the same intersection, see when a pose was
last calibrated, and understand whether a gap is a camera blind spot, terrain
occlusion, or simply missing imagery.

## Implementation

Extend the CCTV source schema with calibration version, pose source, horizontal
and vertical field-of-view ranges, heading confidence, elevation datum,
calibration sample points, and frame freshness. Store operator calibration in a
versioned local record, never overwrite the source catalog. Compute coverage as
an estimated volume with a confidence band and terrain-occlusion status.

Create `src/data/cctvCoverage.js` for spatial indexing, overlap calculations,
and a bounded coverage query. Add a “coverage” panel listing cameras in the
current area, freshness, provider, calibration confidence, overlap count, and
blind-spot reasons. Selecting two cameras can show synchronized thumbnails or
the latest available frame side by side; if one frame is unavailable, retain
the pose view but label the image state clearly.

Add a calibration workflow with reference landmarks, heading/pitch/FOV sliders,
before/after projection, reset, and an exportable calibration record. The
workflow should preserve the existing map-stack and ground-height boundaries,
and it must not claim metric accuracy from a manually aligned image alone.

## Testing and rollout

Test source normalization, missing fields, stale frames, FOV extremes, terrain
occlusion, antimeridian queries, calibration migration, and concurrent frame
updates. Add screenshot QA for the existing Austin, Caltrans, and TfL packs.
Require every label and export to say `ESTIMATED` unless the source explicitly
provides a verified pose.

## Definition of done

A user can compare nearby public cameras, inspect the provenance and age of each
pose/frame, calibrate locally with reversible changes, and distinguish estimated
coverage from a real observed image.

## Implemented surfaces

- `src/data/cctvCoverage.js` normalizes camera pose/frame provenance, freshness,
  calibration confidence, estimated footprints, blind-spot reasons, bounded
  antimeridian-aware queries, overlap estimates, and reversible calibration
  history.
- `src/cctv/coveragePanel.js` adds a public-camera comparison surface with
  provider, frame, confidence, estimated-overlap, and caveat labels.
- Calibration records are versioned and preserve the source pose as a
  before-value; manual alignment remains explicitly estimated.
- Tests cover FOV/pose validation, stale frames, antimeridian queries,
  estimated overlap, and calibration undo behavior.
