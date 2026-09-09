# Place Briefing and Public Context Dossier

## Feature

Add a structured briefing for every city, region, selected coordinate, or event.
The briefing should assemble current conditions, recent changes, relevant public
events, nearby infrastructure, humanitarian context, source health, and known
limitations into a readable public-data dossier.

## Why it is useful

The current application is excellent at showing a scene but asks users to know
which layer to activate and how to interpret it. A place briefing gives a
layperson an entry point without hiding the underlying evidence. It also creates
a natural surface for voice: “Explain this place,” “What changed here?”, and
“What should I be uncertain about?”

## Briefing structure

Every briefing should use the same sections:

1. **Where** — locality, region, coordinates, time zone, and map scale.
2. **Now** — weather, air, traffic, visible cameras, and active public signals.
3. **Recent change** — the most important ledger changes for the chosen window.
4. **Events** — natural, humanitarian, civic, or media-reported events.
5. **Systems** — transport, energy, water, communications, and infrastructure.
6. **Evidence** — sources, timestamps, agreement, and freshness.
7. **Limitations** — missing, stale, modeled, disputed, or low-resolution data.

The briefing should never summarize a place as safe, dangerous, normal, or
clear based on incomplete feeds. Use neutral language such as “no matching
public observations were found in the selected sources.”

## Implementation

Create `src/briefing/placeBriefing.js` with a deterministic section builder.
Each section returns structured facts and source references before any language
generation occurs. The voice or text summarizer receives only that structured
payload and must preserve uncertainty labels and links.

Add a cache keyed by place geometry, time window, enabled source versions, and
ledger generation. Briefings should be reproducible from an offline snapshot.
Allow users to expand every sentence into its supporting records and export the
briefing as Markdown with a source manifest.

## Testing and definition of done

Test empty regions, conflicting sources, missing locality names, stale weather,
offline snapshots, long place names, language fallback, and source-link
preservation. A user should be able to select any place and receive a useful,
readable, source-linked briefing without the app inventing facts.
