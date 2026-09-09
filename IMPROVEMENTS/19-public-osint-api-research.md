# Public OSINT Expansion: A Research-Backed World Observatory

## Executive direction

God's Eye View should evolve from a globe with many live layers into a public
world observatory: a system that lets someone ask what is happening at a place,
what changed, which independent sources agree, and how confident the answer is.
The strongest expansion is not simply adding more aircraft or more map points.
It is adding a shared observation model that fuses physical-world events,
Earth-observation imagery, environmental measurements, infrastructure status,
humanitarian reporting, and Internet reachability while keeping every claim
source-stamped and uncertainty-aware.

This report was researched against public API documentation and data portals on
September 9, 2026. “Open” below means technically accessible or publicly
documented; it does not automatically mean unrestricted redistribution,
commercial use, unlimited rate, or suitability for a public hosted service.
Every integration would still need a source-specific license and quota review.

## The most important architectural move

Add a common `Observation` envelope before adding many more providers:

```js
{
  observationId,
  entityKey,
  entityType,
  geometry,
  observedAt,
  receivedAt,
  source: { id, url, license, attribution },
  status: 'OBSERVED' | 'MODELED' | 'INFERRED' | 'STALE' | 'UNKNOWN',
  confidence: { band, basis },
  values,
  derivation: []
}
```

The existing layer contract and `DataLayerManager` can remain intact. Each new
provider gets a source adapter and a normalizer; rendering, provenance,
timeline, correlation, alerts, exports, and voice context consume normalized
observations. This prevents every layer from inventing different meanings for
“live,” “current,” “nearby,” and “no data.”

## Tier 1: highest-value integrations

These are the best first additions because they have strong public
documentation, map naturally onto the existing application, and can be useful
without building a large proprietary backend.

### 1. Global natural-event radar

Combine the existing USGS earthquakes and NASA FIRMS fires with NASA EONET,
GDACS, USGS volcanoes, and selected national alert feeds. NASA EONET v3
provides event objects and GeoJSON endpoints for natural events, with an
explicit disclaimer that event metadata may be incomplete. GDACS provides free
geospatial disaster data and event searches for earthquakes, tropical cyclones,
and floods, with source acknowledgement required. The USGS Volcano API exposes
monitored and elevated volcano states, including CAP-style alert information.
[ NASA EONET ](https://eonet.gsfc.nasa.gov/docs/v3),
[ GDACS API quick start ](https://gdacs.org/Documents/2025/GDACS_API_quickstart_v1.pdf),
[ USGS Volcano API ](https://volcanoes.usgs.gov/hans-public/api/volcano/default)

Feature: an `EVENT RADAR` layer with event tracks, affected-area polygons,
alert severity, source agreement, and a time window. Clicking an event opens a
source card rather than claiming that a colored alert is ground truth. EONET
and GDACS should remain separate evidence streams even when they describe the
same event.

Implementation: `src/data/worldEvents.js`, `/api/eonet`, `/api/gdacs`, and
`/api/usgs-volcanoes`. Use a deduplication key based on event type, location,
time, and source—not title similarity alone. Add a conflict state when sources
disagree on severity or closure. This immediately enables features such as
“show all active natural hazards within 100 km of the camera” and “replay the
first 48 hours of an event.”

### 2. Earth-observation change lens

Integrate NASA GIBS and Copernicus Data Space imagery as time-aware raster
layers. GIBS exposes public WMTS, WMS, TMS, and related services with a time
dimension and near-real-time visualization products. Copernicus Data Space
provides STAC, openEO, Sentinel Hub, catalog, visualization, and processing
APIs; Copernicus describes Sentinel data as free and open, but individual
services, credentials, quotas, and downstream terms still need checking.
[ NASA GIBS access basics ](https://nasa-gibs.github.io/gibs-api-docs/access-basics/),
[ Copernicus Data Space APIs ](https://dataspace.copernicus.eu/),
[ Sentinel Hub API reference ](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/ApiReference.html)

Feature: `BEFORE / AFTER` satellite mode. A user selects an area and date
window; the app finds low-cloud imagery, renders a swipe comparison, and
computes only conservative scene-level products such as burn scar, flood-water
extent, vegetation change, snow cover, turbidity, or construction footprint
change. It must display acquisition dates, sensor, resolution, cloud cover,
processing method, and a “not independently verified” label.

Implementation: use GIBS first for low-friction visual overlays. Add a server
proxy for Copernicus catalog search and bounded image/statistical requests;
never let a browser submit arbitrary processing expressions or unbounded AOIs.
Cache tiles by source, date, layer, and projection. Add a small raster-analysis
worker that operates on requested tiles, not the entire globe. Put derived
change detections into the observation ledger with `derivation` explaining the
algorithm and input scenes.

### 3. Weather, air, and atmospheric observatory

The existing cockpit weather effects can become evidence-backed environmental
context. Open-Meteo offers forecast, historical, marine, air-quality, elevation,
and flood APIs without an API key for its non-commercial use case. OpenAQ v3
provides global public air-quality measurements, including PM2.5, PM10, ozone,
NO2, CO, SO2, black carbon, humidity, and temperature. The US National Weather
Service API provides forecasts, alerts, observations, and other weather data
for the United States. 
[ Open-Meteo documentation ](https://open-meteo.com/en/docs),
[ OpenAQ API overview ](https://docs.openaq.org/about/about),
[ NWS API ](https://www.weather.gov/documentation/services-web-api)

Feature: `ATMOSPHERE` mode with wind vectors, temperature, precipitation,
cloud base, lightning/alert context where available, air-quality stations, and
vertical slices around the selected aircraft or camera. The app can show
“model forecast,” “station observation,” and “satellite-derived” as different
visual channels instead of blending them into one fake current condition.

Implementation: use Open-Meteo for global keyless defaults, OpenAQ for station
observations, and NWS for US authoritative alert geometry. Add a model-versus-
observation comparison panel. This creates an unusually good educational
feature: “the model predicted this,” “the station measured this,” and “the
camera visually suggests this” can be compared without pretending any one
source is perfect.

### 4. Ocean state and maritime environment

Add Copernicus Marine Service data for currents, sea-surface height, waves,
temperature, salinity, sea ice, and biogeochemistry. The official service
documents a Toolbox API plus OGC endpoints, and its global products include
physics forecasts and reanalysis. The Toolbox supports metadata discovery and
spatial/time subsetting; account requirements and access mode should be handled
server-side rather than placing credentials in the client.
[ Copernicus Marine programmatic services ](https://help.marine.copernicus.eu/en/articles/4794731-which-programmatic-services-are-available),
[ Copernicus Marine Toolbox ](https://help.marine.copernicus.eu/en/articles/7949409-copernicus-marine-toolbox-introduction),
[ Global ocean products ](https://data.marine.copernicus.eu/)

Feature: an animated ocean surface with current streamlines, wave direction,
sea-ice edge, SST anomaly, and a “maritime conditions” card beside AIS tracks.
Correlate vessel motion with current and weather as context, never as a claim
that a ship is behaving suspiciously. Use Global Fishing Watch separately for
fishing-effort and encounter analysis; its API is explicitly non-commercial and
requires a token.
[ Global Fishing Watch APIs ](https://globalfishingwatch.org/our-apis/documentation/)

### 5. Flood, river, and water-system layer

Use the modern USGS Water Data APIs for real-time sensors, daily values,
monitoring locations, water quality, basin navigation, and gage imagery. The
modern API is important because USGS says the legacy WaterServices family is
scheduled for decommissioning in early 2027. The USGS OGC APIs and NLDI also
support standardized geospatial queries and network navigation.
[ USGS Water API documentation ](https://api.waterdata.usgs.gov/docs/),
[ USGS Water API migration notice ](https://www.usgs.gov/tools/usgs-water-data-apis)

Feature: click a river, dam, or city and see upstream/downstream gauges,
recent stage change, basin extent, flood observations, and nearby camera feeds.
For global coverage, add Copernicus flood products and GDACS flood events as
separate sources. A “water system view” would be one of the most distinctive
features in the entire product: it links terrain, infrastructure, rain,
reservoirs, rivers, and public imagery in a single explorable system.

## Tier 2: the genuinely surprising layers

### 6. Global Internet observatory

Treat the Internet as another physical-ish world system. IODA exposes signals,
outage events, outage alerts, summaries, and entity metadata. RIPEstat exposes
routing status for prefixes and ASNs, RIPE Atlas provides active measurement
data, RIS Live provides real-time BGP JSON over WebSocket, and RouteViews
provides current routing and RPKI-related APIs. These are excellent for showing
Internet outages, routing instability, submarine-cable context, and regional
connectivity changes without probing private systems.
[ IODA API ](https://api.ioda.inetintel.cc.gatech.edu/v2/),
[ RIPE routing status ](https://stat.ripe.net/docs/data-api/api-endpoints/routing-status),
[ RIS Live ](https://ris-live.ripe.net/manual/),
[ RouteViews API ](https://api.routeviews.org/docs/)

Feature: `CONNECTIVITY WEATHER`. The globe shows regional outage halos,
affected autonomous systems, BGP announcement changes, and measurement probes.
Selecting a city can answer “is this place reachable from the public Internet?”
without scanning endpoints. Add a time slider because BGP and outage data are
most interesting as change histories.

Guardrails: only consume published aggregate signals. Do not add port scanning,
credential testing, exploit feeds, or tooling that targets individual hosts.
Show measurement vantage points and distinguish “not observed by this network”
from “offline.”

### 7. Global news and event geography

GDELT 2.0 provides event and knowledge-graph data derived from global news,
with multilingual coverage and frequent updates. The direct GDELT project
documents GEO, event, mention, and GKG data; GDELT Cloud offers a newer
structured Events/Stories/Entities REST surface but requires API access under
its current product model. ReliefWeb provides a read-only, curated humanitarian
archive with reports, disasters, countries, sources, and other endpoints.
[ GDELT project data documentation ](https://gdeltproject.org/data.html),
[ GDELT DOC 2.0 API ](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/),
[ ReliefWeb API ](https://apidoc.reliefweb.int/index.html)

Feature: `WORLD BRIEFING MAP`. Cluster geographically anchored event reports,
show source diversity, publication age, language, and story volume. Clicking a
cluster opens source links and a short neutral summary. “Media attention” must
not be rendered as “event severity”; high coverage can reflect interest rather
than scale.

Add source-diversity scoring: an event supported by multiple independent
publishers is different from five articles repeating one wire report. Keep the
underlying links visible and never make a model-generated summary the only
representation of evidence.

### 8. Conflict and humanitarian context, carefully scoped

ACLED offers an API for political violence, demonstrations, and strategic
development events, but access requires an account and authentication. It is
valuable as historical/contextual data, not as a tactical targeting feed.
ReliefWeb is the better low-friction starting point for humanitarian reports
and disasters. 
[ ACLED API documentation ](https://acleddata.com/api-documentation),
[ ACLED access model ](https://acleddata.com/api-documentation/getting-started)

Feature: a `CIVILIAN CONTEXT` layer that displays event locations, dates,
categories, displacement/humanitarian reports, and uncertainty bands. Keep it
historical and aggregate by default. Disable exact-person records, tactical
recommendations, target ranking, and automated “threat” scores. Every card
should include the source's own caveat and a prominent “not operational” label.

### 9. Global power and industrial infrastructure

Global Energy Monitor publishes open-access datasets covering global power
plants and related energy infrastructure. Its Global Integrated Power Tracker
describes facilities, capacity, technology, status, and owners across many
countries. This complements the project's existing datacenters, dams, and
submarine cables.
[ GEM open data ](https://globalenergymonitor.org/download-data),
[ Global Integrated Power Tracker ](https://globalenergymonitor.org/projects/global-integrated-power-tracker)

Feature: `ENERGY SYSTEMS` mode with generation facilities, transmission context
where licensed, construction/retirement status, energy technology, and a
time-lapse of the global energy transition. Add Open Charge Map for charging
stations and OpenStreetMap/GBFS for local mobility context.
[ Open Charge Map API ](https://www.openchargemap.org/develop/api)

This is a strong visual differentiator because it turns “infrastructure mode”
from a dense pile of points into a system: source, fuel, capacity, status,
nearby weather, grid geography, and imagery.

### 10. Biodiversity and living-world layer

GBIF provides occurrence search, species matching, species profiles, media,
maps, and spatially binned occurrence layers. It supports global biodiversity
records but warns that high-volume queries can be rate-limited; map tiles and
bounded queries are preferable for an interactive globe.
[ GBIF occurrence API ](https://techdocs.gbif.org/en/openapi/v1/occurrence),
[ GBIF maps API ](https://techdocs.gbif.org/en/openapi/v2/maps)

Feature: `LIVING EARTH`. Show species observations, migration corridors,
protected areas, flowering/seasonality signals, and acoustic or camera-trap
datasets where licensed. A time slider can show how observations move with
seasons and climate. Use coarse aggregation and location uncertainty for
sensitive species; never expose precise nests or endangered-animal locations
when the source applies protection rules.

### 11. Public knowledge graph for place intelligence

Wikidata's SPARQL service can retrieve structured entities with coordinates,
relationships, dates, identifiers, and multilingual labels. OpenAlex and
Crossref provide scholarly metadata, institutions, funding, licenses, and
linked identifiers. These are not live sensors, but they let a selected place
explain itself: nearby observatories, universities, dams, ports, research
stations, protected sites, historic events, and public datasets.
[ Wikidata SPARQL service ](https://www.wikidata.org/wiki/Help%3AQueries),
[ OpenAlex API ](https://help.openalex.org/api/),
[ Crossref REST API ](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)

Feature: `PLACE DOSSIER`. One click on a region produces a source-linked graph
of public institutions, infrastructure, environmental datasets, observatories,
and relevant research. This is a much safer and more useful AI context layer
than asking a model to hallucinate what a location contains.

Implementation: precompute bounded place packs and cache query results. Do not
run unconstrained SPARQL from the browser; the public endpoint has query-load
constraints. Require explicit user action before expensive knowledge-graph
queries.

## Feature concepts that emerge from these APIs

### A. The World State Graph

Create a graph view where nodes are public entities or events and edges are
observed relationships: “camera near flood gauge,” “vessel crossed current,”
“fire near road,” “satellite passed over event,” “facility in basin,” or “news
cluster references disaster.” Every edge needs a provenance list and a rule
explanation. The graph is not an AI oracle; it is a transparent composition of
public evidence.

### B. Change detection as the primary interaction

Make “what changed?” a first-class button. Compare current and previous
observations for imagery, fire, water, traffic, flights, vessels, Internet
reachability, air quality, and event reports. The result should be a ranked
change queue with evidence age, magnitude, and confidence—not an unbounded
stream of notifications.

### C. Independent-source agreement meter

For any selected event, show which sources agree, which are stale, which are
modeled, and which are silent. This would be a signature feature of the app:
the globe visualizes not only the world but also the limits of knowing it.

### D. Public-data mission generator

Turn the existing scene director into research missions:

- “Follow a flood from rainfall to river gauge to public camera.”
- “Compare a wildfire's thermal anomaly, smoke, weather, and road network.”
- “Trace an Internet outage from IODA signal to BGP visibility and submarine
  cable geography.”
- “Watch a volcanic alert alongside seismicity, satellite imagery, and public
  reports.”
- “Compare ocean currents, AIS density, fishing effort, and sea-surface
  temperature.”

Each mission should use a ledger snapshot and source manifest so it is
repeatable and educational rather than dependent on a lucky live moment.

### E. Open-source provider marketplace

The existing source-pack idea can grow into a signed catalog of reviewed public
data packs. Each pack declares API host, license, attribution, refresh rate,
maximum cost, privacy class, and failure states. Installers can choose “natural
events,” “Internet observatory,” “marine,” “biodiversity,” or “energy” packs
without enabling everything at once.

## Recommended build order

### Phase 1: high leverage, low integration risk

1. Observation envelope and provenance ledger.
2. NASA EONET + GDACS + USGS volcano layer.
3. NASA GIBS dated raster overlay.
4. Open-Meteo + OpenAQ atmosphere panel.
5. ReliefWeb/GDELT geographically clustered briefing layer.

### Phase 2: distinctive systems view

6. USGS modern water data and basin navigation.
7. Copernicus Marine current/wave layer.
8. IODA + RIPE routing/connectivity observatory.
9. Global Energy Monitor infrastructure pack.
10. Change detection and source-agreement UI.

### Phase 3: heavier and permissioned

11. Copernicus Sentinel search and bounded processing.
12. Global Fishing Watch integration under its non-commercial terms.
13. ACLED contextual layer for approved users.
14. GBIF living-world layer with sensitive-location handling.
15. World State Graph and mission authoring over all of the above.

## What not to integrate

Do not add arbitrary camera scraping, private feeds, leaked credentials, facial
recognition, license-plate recognition, people search, device tracking, port
scanning, exploit databases used for targeting, or person-level “threat” scores.
Do not turn aggregate public events into claims about individual intent. Do not
make a map look more certain by hiding source age, model status, spatial error,
or contradictory observations.

The product can feel like a god's-eye view while remaining responsible if its
central promise is: **see more of the public world, understand where each fact
came from, and see the uncertainty instead of hiding it.**

## Sources

1. [NASA EONET v3 documentation](https://eonet.gsfc.nasa.gov/docs/v3)
2. [GDACS API quick start](https://gdacs.org/Documents/2025/GDACS_API_quickstart_v1.pdf)
3. [USGS Volcano API](https://volcanoes.usgs.gov/hans-public/api/volcano/default)
4. [NASA GIBS access basics](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
5. [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/)
6. [Sentinel Hub API reference](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/ApiReference.html)
7. [Open-Meteo API documentation](https://open-meteo.com/en/docs)
8. [OpenAQ API overview](https://docs.openaq.org/about/about)
9. [National Weather Service API](https://www.weather.gov/documentation/services-web-api)
10. [Copernicus Marine programmatic access](https://help.marine.copernicus.eu/en/articles/4794731-which-programmatic-services-are-available)
11. [Global Fishing Watch API documentation](https://globalfishingwatch.org/our-apis/documentation/)
12. [USGS Water Data API documentation](https://api.waterdata.usgs.gov/docs/)
13. [IODA HTTP API](https://api.ioda.inetintel.cc.gatech.edu/v2/)
14. [RIPE routing status API](https://stat.ripe.net/docs/data-api/api-endpoints/routing-status)
15. [RIS Live manual](https://ris-live.ripe.net/manual/)
16. [RouteViews API documentation](https://api.routeviews.org/docs/)
17. [GDELT Project data documentation](https://gdeltproject.org/data.html)
18. [ReliefWeb API documentation](https://apidoc.reliefweb.int/index.html)
19. [ACLED API documentation](https://acleddata.com/api-documentation)
20. [Global Energy Monitor open data](https://globalenergymonitor.org/download-data)
21. [Global Integrated Power Tracker](https://globalenergymonitor.org/projects/global-integrated-power-tracker)
22. [Open Charge Map API](https://www.openchargemap.org/develop/api)
23. [GBIF occurrence API](https://techdocs.gbif.org/en/openapi/v1/occurrence)
24. [GBIF maps API](https://techdocs.gbif.org/en/openapi/v2/maps)
25. [Wikidata SPARQL service](https://www.wikidata.org/wiki/Help%3AQueries)
26. [OpenAlex API](https://help.openalex.org/api/)
27. [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
