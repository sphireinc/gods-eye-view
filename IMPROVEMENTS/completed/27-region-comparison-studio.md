# Region Comparison Studio

## Feature

Add a synchronized comparison workspace for two locations, regions, time
windows, or source configurations. Users can compare places using the same
categories and scales instead of mentally switching between separate globe
views.

## Useful comparisons

- Two cities during the same weather event
- Two river basins during flooding
- Two ports during a shipping change
- Two regions with different air-quality conditions
- Two places before and after a major event
- Current conditions versus a historical baseline
- Two conflict-affected regions using humanitarian indicators
- Satellite imagery versus public street imagery

## Implementation

Create `src/comparison/` with two independent scene contexts sharing a clock,
style, source-health store, and comparison schema. The primary globe remains
interactive; the secondary view can be a split globe, synchronized inset, or
2D evidence panel depending on screen size.

Each metric must define its unit, time basis, spatial aggregation, and missing-
data behavior. Never compare raw counts from regions with radically different
coverage without showing normalization. For example, a higher news count can
mean greater media attention, not greater event severity.

Add difference cards for density, change rate, freshness, source coverage, and
selected environmental values. Export comparisons as a source-linked Markdown
briefing or portable snapshot.

## Testing and definition of done

Test different time zones, unequal observation coverage, missing secondary
data, antimeridian regions, rapid location swaps, and camera synchronization. A
user should be able to compare two places without losing track of which source
or time window each value represents.

## Implementation status

Completed on `improvements/27-region-comparison-studio`. Comparisons now carry
metric units, source time basis, explicit missing-data policy, normalized-value
flags, coverage ratios, stable tie ordering, and a caveat that raw counts are
not comparable across unequal coverage. Unknown values remain distinct from
zero, and the comparison remains descriptive rather than causal or safety
oriented.
