# Global Open Camera Atlas

## Feature

Build a world-wide catalog of openly published public camera feeds: municipal
traffic cameras, webcams from parks and universities, harbor views, ski-area
cameras, weather cameras, wildlife observation cameras, public transit cameras,
and other feeds intentionally made available by their operators.

This is not an arbitrary URL viewer. Every camera must come from a reviewed
source catalog with a public landing page, identifiable operator, usage terms,
geographic location, feed type, and an attribution requirement.

## Why it is valuable

The current CCTV experience is compelling but geographically concentrated. A
global atlas would make the globe feel alive in every region and let users move
from a satellite-scale view into ordinary public scenes: a harbor in Rotterdam,
a mountain pass in Chile, a traffic interchange in Tokyo, or a weather camera
on a Pacific island.

It also turns the existing source-pack architecture into a community-sized
feature. Contributors could add a city or region without modifying the core
camera renderer.

## Implementation

Create a versioned camera catalog schema under `config/camera-packs/`. Each pack
should contain:

- Camera ID, operator, country, city/region, latitude, longitude, elevation,
  heading, approximate field of view, and optional orientation metadata.
- Feed type: JPEG snapshot, MJPEG, HLS, DASH, embedded public player, or a
  metadata-only camera with no direct frame endpoint.
- Public source page, terms/license URL, attribution text, update cadence,
  contact/reporting URL, and last catalog review date.
- Whether frames may be proxied, cached, displayed in thumbnails, projected
  into 3D, or exported. These are separate permissions.
- A privacy classification: scenic, traffic, weather, wildlife, transit, or
  mixed public-space view.

Add `src/data/openCameraAtlas.js` as a layer built on the current CCTV card,
projection, viewshed, ground-floor, and calibration systems. It should load a
small spatial index first, then fetch metadata and frames only for cameras near
the active viewport or selected region. At global scale, render clustered camera
nodes and counts rather than thousands of billboards.

Add a source selector with region, camera type, freshness, and “currently
available” filters. The camera card must show operator, source page, frame age,
catalog review date, and whether the projection is estimated. A missing or
blocked frame should leave the catalog point visible with `FRAME UNAVAILABLE`,
not remove the camera or show a stale image as live.

For direct feeds, use server-side adapters with strict host allowlists generated
from the reviewed catalog. Reject client-supplied proxy URLs, redirects to
unapproved hosts, private IP ranges, oversized responses, and unsupported
content types. Keep credentials out of the browser; if a source requires an
account or private token, it does not belong in the open atlas.

## Testing and rollout

Start with three source packs covering different protocols and continents.
Contract-test catalog validation, attribution rendering, frame age, redirects,
content-type checks, disabled sources, and operator takedown. Add a catalog
review script that flags expired terms, dead URLs, missing landing pages, and
coordinates outside valid bounds.

## Definition of done

Users can browse public cameras across multiple continents from the globe,
open the operator's source page, see honest freshness and projection status,
and understand why a feed is unavailable. No camera is accepted solely because
someone pasted a URL into a text box.

## Implementation status

Completed on `improvements/13-global-open-camera-atlas`. Added a versioned,
review-oriented camera catalog validator with operator, source-page, protocol,
privacy-class, coordinate, and projection checks. The atlas core filters
catalog records by viewport/type/availability, handles antimeridian bounds,
retains unavailable records, and clusters cameras into bounded global nodes for
low-zoom rendering. Direct feed brokering remains intentionally separate from
catalog admission so a URL alone cannot become an accepted camera source.
