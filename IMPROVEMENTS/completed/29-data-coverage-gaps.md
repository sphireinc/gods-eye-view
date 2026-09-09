# Data Coverage and Blind-Spot Atlas

## Feature

Add a layer that visualizes where the observatory has strong, weak, stale, or
missing public data. The map should show the limits of observation as clearly as
it shows observations.

## Why it is useful

Users naturally mistake a quiet map for a quiet world. Coverage differs sharply
by country, provider, language, wealth, weather, Internet connectivity, and
political access. Showing the coverage surface helps prevent false conclusions
and gives contributors a way to improve source packs.

## Implementation

Create `src/coverage/coverageAtlas.js` that aggregates per-cell metadata:

- Last successful observation by source family
- Number of independent sources
- Average observation age
- Spatial precision
- Percentage of entities with provenance
- Public-camera availability
- Satellite acquisition recency
- Air-quality/weather station density
- Humanitarian reporting availability
- Internet measurement presence
- Conflict/event source coverage

Render this as a selectable “coverage confidence” layer with separate maps for
freshness, source diversity, precision, and missingness. Avoid a single global
coverage score unless users can inspect its components. A dark region should
mean “low available public coverage,” not “safe,” “empty,” or “inactive.”

Add a contributor view showing where a new source pack, camera catalog, weather
station, or map correction would improve coverage. Connect gaps to the
Community Map Verification and Source Pack Workbench proposals.

## Testing and definition of done

Test sparse regions, source outages, global wraparound, stale caches, unequal
cell sizes, and transitions between coverage levels. A user should be able to
look at any quiet area and immediately understand whether it is quiet or simply
poorly observed.
