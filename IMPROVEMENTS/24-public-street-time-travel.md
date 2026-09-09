# Public Street-Level Time Travel

## Feature

Add an historical street-imagery experience using openly accessible,
rights-reviewed sources such as KartaView, Mapillary, and local public imagery
packs. Users can select a road or neighborhood, browse available sequences by
date, and compare how the visible environment changed over time.

## Why it is useful

Satellite imagery gives broad coverage but little street-level context. Public
street sequences make the globe tangible: users can see road construction,
seasonal change, flood aftermath, new buildings, changing signage, or how a
neighborhood grows. This is also useful for map literacy and historical
exploration without requiring a proprietary street-view license.

## Implementation

Create `src/data/streetImagery.js` with provider adapters, a sequence index, and
a rights-aware frame loader. KartaView provides public photos and sequences
with geographic and date search; Mapillary requires registered API access. The
catalog must preserve attribution, capture date, contributor/source, and image
license.

The UI should offer a road ribbon, date slider, sequence playback, side-by-side
comparison, and a “show on globe” action. Frames should remain attached to their
original capture location; interpolating a camera path between images must be
visibly marked as approximate.

Do not run generic object recognition over the imagery. If a provider supplies
its own scene metadata, display it as provider metadata with provenance. Do not
retain downloaded frames in the observation ledger unless the source permits
caching and export.

## Testing and definition of done

Test sparse sequences, gaps, duplicate captures, privacy masks, expired imagery,
provider outages, date/time zones, and license restrictions. A user should be
able to compare public street-level views across time without the feature
pretending that sparse imagery is continuous surveillance.
