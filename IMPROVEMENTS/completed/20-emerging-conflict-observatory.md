# Emerging Conflict Observatory

## Feature

Add a public-data Conflict Observatory for discovering, contextualizing, and
tracking emerging conflict zones and humanitarian crises. It should combine
georeferenced event data, humanitarian reports, displacement indicators,
protests, disaster conditions, media attention, and infrastructure disruption
into an explainable evidence view.

## Product charter

This is a public, educational feature for laypeople who want to monitor and
understand ongoing situations in the world. God's Eye View is not a tactical
battlefield map, is not intended for use in a conflict, and must not provide
operational or conflict-support capabilities. The feature exists to make public
evidence, humanitarian impact, source disagreement, and uncertainty easier to
understand.

This is deliberately not a battlefield command layer. It should not provide
target recommendations, individual tracking, weapon-effects analysis, tactical
route planning, live unit locations, or predictions about where a person or
force will move next.

## Why it belongs in God's Eye View

The project already visualizes aircraft, vessels, fires, earthquakes, public
cameras, installations, satellites, and communications infrastructure. An
emerging conflict is rarely represented by one feed. It appears as a changing
pattern across reported events, displacement, communications, infrastructure
damage, weather, public imagery, and humanitarian response.

The valuable product is therefore not “the red zone map.” It is a transparent
answer to:

- What public evidence suggests that conditions are changing?
- When did each source observe or report it?
- Which sources independently agree?
- What is known about civilian and humanitarian impact?
- What remains unknown, stale, disputed, or underreported?

## Recommended source stack

### UCDP Georeferenced Event Dataset

UCDP provides a REST API for georeferenced conflict events and related conflict
datasets. It is useful for historical baselines, event-rate changes, conflict
geography, and retrospective validation. It is not a second-by-second live feed,
so the UI must label its publication cadence and revision date.

[UCDP API documentation](https://ucdp.uu.se/apidocs/)

### ACLED

ACLED provides political-violence, demonstration, and related event data. Its
API requires account authentication, and its CAST endpoint provides monthly
country/territory-level forecasts of political-violence event counts up to six
months ahead. Forecasts must be presented as forecasts with model/source
metadata, never as certainties or tactical warnings.

[ACLED access documentation](https://acleddata.com/api-documentation/getting-started) ·
[ACLED CAST endpoint](https://acleddata.com/api-documentation/cast-endpoint)

### ReliefWeb

ReliefWeb's read-only v2 API provides curated reports, disasters, countries,
sources, and related content. It requires an application name, limits results
and daily calls, and warns that contributed reports may retain the original
source's copyright. The integration should display report metadata and link to
the original rather than bulk-republish report bodies.

[ReliefWeb API documentation](https://apidoc.reliefweb.int/index.html) ·
[ReliefWeb endpoints](https://apidoc.reliefweb.int/endpoints)

### HDX HAPI

HDX HAPI is designed to standardize humanitarian indicators from multiple
partners. Relevant datasets include conflict events, food security, internally
displaced people, operational presence, humanitarian needs, and population
context. HAPI requires an app identifier and should be treated as a metadata or
indicator source rather than universal ground truth.

[HDX HAPI getting started](https://hdx-hapi.readthedocs.io/en/latest/getting-started/) ·
[HDX HAPI overview](https://centre.humdata.org/ufaqs/about-the-humanitarian-api-hapi/)

### GDELT and public reporting

GDELT can provide multilingual news/event geography and media-volume context.
Use it to detect that reporting about a place is changing, not to assert that
the most-mentioned claim is true. Keep article links and publisher diversity
visible. Combine it with ReliefWeb and official sources rather than allowing
media volume to become a conflict-severity score.

[GDELT data documentation](https://gdeltproject.org/data.html)

### Supporting context

Use NASA EONET and GDACS for overlapping natural disasters, Open-Meteo or
official national weather for environmental conditions, IODA/RIPE for aggregate
Internet disruption, Copernicus or NASA imagery for dated change evidence, and
the existing aircraft, vessel, fire, camera, road, and infrastructure layers.
Each remains a separate evidence stream with its own freshness and uncertainty.

## Core experience

### Conflict watchlist

Add a `CONFLICTS` mode to the right rail. It shows a ranked but explainable list
of regions where one or more indicators changed recently. A row should include
the region, latest event/report dates, event-rate change against baseline,
humanitarian indicators, source count, source diversity, connectivity or
infrastructure changes, and a confidence band.

Do not show one opaque “threat score.” If ranking is needed, use visible factors
such as `EVENT ACTIVITY`, `HUMANITARIAN PRESSURE`, `REPORTING CHANGE`, and
`SOURCE AGREEMENT`, each linked to underlying records.

### Evidence timeline

Selecting a region opens a timeline with separate lanes for UCDP/ACLED events,
ReliefWeb reports, HAPI indicators, GDELT media clusters, Internet signals,
imagery acquisitions, and relevant natural hazards. Every item shows event time,
publication time, source time, and ingestion time where available.

The timeline distinguishes a directly reported event, a later revision, a
forecast, a model-derived indicator, a media-volume change, and a missing or
stale source. This is where the existing Observation Ledger and Time Machine
proposals become essential.

### Civilian context panel

Make humanitarian impact a first-class surface. Show available displacement,
food-security, shelter, health, access, and operational-presence indicators with
their geographic granularity and reporting date. Add public infrastructure such
as hospitals, roads, water systems, and power facilities only as context, never
as targetable objects.

If a source is silent, state `NO PUBLIC INDICATOR AVAILABLE`; never interpret
absence of humanitarian data as absence of harm.

### Source agreement and dispute view

For every event cluster, show which sources corroborate it, which merely repeat
one another, and which disagree on date, location, severity, or status. Articles
that cite the same wire report must not count as independent corroboration.

An event with one unverified report can be shown as `REPORTED / UNCORROBORATED`.
After independent confirmation it may become `MULTI-SOURCE REPORTED`; it should
not become `CONFIRMED` unless the source methodology supports that word.

## Transparent emergence detection

Define emergence as a visible combination of changes, not a hidden model
intuition. Candidate signals include:

1. Event-count acceleration against a region's own historical baseline.
2. Geographic spread into adjacent cells.
3. Increased event-type diversity.
4. Independent source arrival or source-diversity increase.
5. Humanitarian reporting or displacement change.
6. Communications disruption from aggregate Internet systems.
7. Dated imagery change or natural-hazard overlap.
8. A sharp difference from the prior 30/90-day norm.

The detector should emit structured explanations rather than a bare score:

```js
{
  regionId,
  window: { from, to },
  indicators: [
    { id: 'event-acceleration', value, baseline, sourceIds },
    { id: 'humanitarian-pressure', value, sourceIds },
    { id: 'source-diversity', value, sourceIds }
  ],
  state: 'WATCH' | 'CHANGING' | 'ESTABLISHED' | 'UNCERTAIN',
  limitations: []
}
```

Use hysteresis and minimum evidence thresholds so one sensational article or
one provider outage cannot flip a region into an alert state. A source outage
must produce `UNKNOWN`, not a false decrease in conflict activity.

## Architecture

Add `src/data/conflictObservatory.js` as a coordinator, keeping provider
adapters separate:

- `src/data/ucdp.js`
- `src/data/acled.js`
- `src/data/reliefWeb.js`
- `src/data/hdxHapi.js`
- `src/data/gdelt.js`
- `src/data/conflictChange.js`

Each adapter normalizes into the common Observation envelope. Authenticated
providers such as ACLED belong behind server-side proxies with rate limits,
cache headers, and sanitized errors. ReliefWeb's `appname` should identify the
application. Large historical pulls should run as scheduled imports or bounded
server jobs, not on every browser pan.

Initially render coarse hexagons, region boundaries, and event clusters. Exact
point display should be restricted by source precision and a privacy/safety
policy. Store source attribution and terms beside each observation so exports
do not detach evidence from its conditions of use.

Voice commands can include “show emerging conflict contexts in the last 30
days,” “why is this region on the watchlist,” “compare humanitarian reports with
event data,” and “show only multi-source reported events.” Responses must cite
the evidence state and say when a result is inferred, forecast, stale, or
contested.

## Safe public-imagery context

Allow dated satellite imagery, public cameras, and terrain context only when
source rights and privacy rules permit it. Imagery comparisons can show broad
urban damage, smoke, flooding, road blockage, or fire extent, but the UI should
avoid exact tactical interpretation and avoid exposing sensitive locations at
unnecessary precision.

## Safety and responsible-use boundaries

- No individual people, biometric data, phone identifiers, or social-graph
  tracking.
- No targeting, target ranking, strike support, weapon effects, or tactical
  route features.
- No automated actor-intent classification.
- No live unit tracking or prediction of force movement.
- No exact-location amplification when a source intentionally generalizes it.
- No raw user-generated imagery redistribution without rights.
- No alerts that imply emergency authority or operational certainty.
- Clear delays, spatial aggregation, and source-specific precision controls for
  rapidly changing or sensitive events.

The app should include a “why this is limited” disclosure. Public OSINT should
make evidence easier to examine, not make uncertain claims look like classified
truth.

## Testing and QA

Build fixtures for a single uncorroborated report, multiple reports copied from
one source, independent sources with conflicting coordinates, a revised event,
a delayed humanitarian indicator, a forecast that does not materialize, an
Internet outage with no conflict evidence, a conflict event with no humanitarian
data, provider failure, stale-cache states, and a sensitive location requiring
aggregation.

Add visual QA for the watchlist, timeline, source graph, civilian context panel,
and globe overlays. Test that Context isolation and existing tracked aircraft,
vessel, satellite, and camera selections survive entry and exit. Add a red-team
review specifically for accidental tactical affordances and misleading color
semantics.

## Suggested delivery sequence

1. UCDP historical layer and evidence timeline.
2. ReliefWeb reports and disaster grouping.
3. HDX HAPI humanitarian indicators.
4. ACLED authenticated integration and CAST forecasts.
5. GDELT media-volume and source-diversity context.
6. Transparent emergence indicators and watchlist.
7. Dated imagery and aggregate connectivity context.
8. Correlation workspaces and replayable conflict briefings.

## Definition of done

A user can open a region, see a dated and source-linked account of changing
public evidence, compare conflict events with humanitarian conditions, inspect
source disagreement, and understand what is unknown. The app never turns that
context into a tactical targeting system or presents a forecast as a fact.

## Implementation status

Completed on `improvements/20-emerging-conflict-observatory`. The observatory
core now normalizes coarse, source-stamped evidence; aggregates transparent
activity, source-diversity, and evidence-type indicators; handles invalid time
data safely; rounds point precision; strips non-HTTPS source links; and rejects
tactical fields or tactical language before it enters the model. Its
limitations explicitly describe public-evidence uncertainty and lack of
independent corroboration, preserving the conflict-observatory rather than
battlefield-map charter.
