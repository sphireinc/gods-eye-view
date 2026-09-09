# Camera Handoff Trails and World Mosaic View

## Feature

Add a “camera handoff” experience that moves through nearby public cameras as a
user travels across a city or coastline. A mosaic mode can show several nearby
feeds at once, ordered by direction, distance, freshness, and scene similarity.

## Why it is valuable

One camera is an interesting endpoint; a network of public cameras becomes a
way to understand a place. Users could follow a road toward a harbor, compare
weather across a mountain range, or inspect a transit corridor without treating
any individual feed as a complete view of reality. This makes the map-camera
relationship more spatial and less like a list of unrelated thumbnails.

## Implementation

Create `src/data/cameraHandoff.js` with a camera graph. Nodes are catalog camera
IDs. Edges are created only from geographic distance, compatible orientation,
operator-provided coverage, or an explicit source-pack relationship. Each edge
stores the reason it exists; never imply that two cameras are continuous views
unless the catalog says so.

Add `NEXT CAMERA`, `PREVIOUS CAMERA`, and `MOSAIC` controls to the CCTV panel.
The next-camera ranking should be deterministic: selected route direction,
heading alignment, distance, frame freshness, calibration quality, then stable
camera ID. A handoff animates the globe to the next camera, preserves the
current map style, and transfers selection only after the target metadata has
loaded. A failed target leaves the current camera selected and reports the
reason.

Mosaic mode should be a bounded grid, initially four or six tiles. Each tile
shows a frame, source, age, and camera ID. Tiles must have independent loading
and failure states. The map highlights all tile locations, while selecting a
tile can promote it to the main projection. Do not automatically fetch every
camera in a region; use an explicit tile budget and pause off-screen tiles.

For a scenic or weather route, add a “follow daylight” option that ranks cameras
by local solar elevation and freshness. This can create a visually delightful
world tour without pretending the feeds are a continuous video stream.

## Testing and rollout

Test ranking ties, antimeridian distance, unavailable frames, camera removal,
rapid next/previous clicks, cancellation during camera flight, and stale mosaic
tiles. Add performance tests proving off-screen tiles stop fetching and that
camera handoff does not interfere with aircraft tracking or Context isolation.

## Definition of done

A user can move through a lawful public camera network or compare a small set of
nearby feeds, with every transition attributable and cancellable. Missing feeds
do not break the mosaic or silently substitute another camera.
