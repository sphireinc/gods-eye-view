# Community Camera Pack Workbench

## Feature

Add a local workbench for contributors to assemble, validate, preview, and
submit regional public-camera packs before they become part of the shared
catalog.

## Why it is valuable

A global atlas will only stay healthy if adding cameras is easy and removing
broken or unauthorized cameras is equally easy. A workbench turns the existing
configuration files and QA scripts into an approachable contribution path for
municipal open-data users, geography enthusiasts, and maintainers.

## Implementation

Create `scripts/camera-pack-doctor.mjs` and an optional in-app development panel.
The doctor should validate schema, coordinate bounds, duplicate IDs, source
landing pages, terms metadata, feed type, content type, redirect policy,
attribution, FOV ranges, and privacy classification. It should generate a
human-readable report with `PASS`, `WARN`, and `BLOCKED` outcomes.

The workbench preview should render camera points, estimated viewsheds, cards,
freshness, and attribution without requiring the pack to be merged. It should
support a mocked frame server and a “feed unavailable” mode so contributors can
verify all UI states. Calibration edits should export a minimal patch against
the pack rather than modifying generated catalogs.

Add a pack README template containing operator, license, source URLs, permission
decisions, review date, known limitations, and removal contact. Generate unit
fixtures and a catalog fragment from the validated manifest. A CI job should
run the doctor, reject new unreviewed direct URLs, and check that every pack
has at least one attribution and rights test.

Provide a maintainer command to mark a source withdrawn while preserving its
history and reason. The workbench should make it possible to test a replacement
feed without resurrecting the old source ID.

## Testing and rollout

Use malformed-pack fixtures, hostile URLs, redirect chains, stale terms, invalid
coordinates, duplicate IDs, and mixed protocols. Add a smoke pack containing
one valid camera, one link-only camera, one stale camera, and one blocked camera.
Require the doctor to produce stable output for review diffs.

## Definition of done

A contributor can create a regional pack, run one command to find errors, preview
it locally, see all attribution and failure states, and produce a reviewable
change without editing unrelated core runtime files.
