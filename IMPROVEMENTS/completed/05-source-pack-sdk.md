# Data Source Pack SDK and Capability Registry

## Feature

Create a documented, validated SDK for adding third-party data source packs and
city packs without editing the central `main.js`, giant UI surfaces, or the
server proxy by hand. A pack could add public cameras, a regional transit feed,
weather stations, ports, or a licensed local dataset.

## Why it is valuable

The project already has a clear layer interface and explicitly encourages new
layers and CCTV packs. Today, contributors still need to understand many
implicit registries, attribution paths, voice enums, UI controls, and proxy
security rules. A pack manifest can make the extension seam discoverable while
preserving reviewable source, licensing, and safety boundaries.

## Implementation

Define `src/plugins/packSchema.js` and a manifest format with `id`, `version`,
`displayName`, `description`, `provider`, `license`, `attributionUrl`,
`capabilities`, `layerFactory`, `configurationSchema`, `refreshPolicy`, and
`privacyClass`. Capabilities should be explicit: `map-entities`, `routes`,
`imagery`, `video`, `audio`, or `annotations`. Require a stable entity schema,
source health states, and a declared maximum resource cost.

Add a build-time registry loader that imports local packs from a configured
directory and rejects duplicate IDs, unsupported schema versions, missing
attribution, undeclared network destinations, and layers that do not implement
the lifecycle contract. Keep remote code loading out of the default product;
installation should mean adding reviewed local code, not executing arbitrary
URLs in the browser.

Expose pack layers through the existing manager and layer-state registry. Render
their controls using a small data-driven section component, but allow a pack to
provide richer UI only through constrained extension points. Route all private
keys through explicitly registered server adapters with host allowlists,
response-size caps, timeout limits, and per-provider rate controls. A manifest
must be able to say “client-visible key” versus “server-only key.”

Provide a `createSourcePack` test harness with fake clock, fake fetch, fake
Cesium collection, and failure injection. Add a generator command that produces
a pack skeleton, data-source attribution template, unit-test fixtures, and a
`DATA_SOURCES.md` fragment.

## Testing and rollout

First migrate one existing bundled layer and one CCTV source pack to the
registry without changing behavior. Test malformed manifests, lifecycle
rollback, disabled packs, license rendering, capability enforcement, and
server-host allowlists. The app should show a rejected pack as a precise setup
error, never as a successful empty layer.

## Definition of done

A contributor can generate, implement, test, and locally install a public-data
pack using documented interfaces. The pack appears with attribution and health
state, can be disabled cleanly, and cannot expand the app's network or secret
access beyond what its reviewed manifest declares.

## Implemented surfaces

- `src/sources/sourcePackSdk.js` defines the schema, stable-slug validation,
  capability and permission allowlists, attribution/license requirements,
  replay policy, network destination allowlist, resource-cost declaration,
  client/server key declarations, lifecycle validation, and local-only module
  loading.
- `DataLayerManager.registerSourcePack()` provides the reviewed layer handoff
  after the core registry is sealed; pack layers remain ordinary lifecycle
  participants and can be disabled cleanly.
- `createSourcePackHarness()` supplies a deterministic clock, fetch seam,
  fake Cesium collections, call capture, and failure injection.
- `generateSourcePackSkeleton()` returns a manifest, lifecycle layer, test, and
  `DATA_SOURCES.md` fragment for a new contributor pack.
- Remote module paths are explicitly rejected, and malformed packs are returned
  as precise loader errors rather than installed as empty layers.
