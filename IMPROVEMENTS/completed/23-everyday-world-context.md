# Everyday World and Continuity Layer

## Feature

Add an “everyday world” layer that shows ordinary civic and community activity
alongside crisis, infrastructure, and environmental layers. It can include
public transit, schools, universities, hospitals, markets, parks, cultural
venues, libraries, sports events, public webcams, bikeshare, and open community
spaces.

## Why it is useful

A world observatory should not define places only through disasters, conflict,
military installations, or infrastructure. Showing ordinary life gives users
geographic and human context, reduces sensationalism, and makes the globe
interesting even when no major event is occurring.

It also creates better briefings: a city is not just a coordinate with traffic;
it has institutions, routines, public services, and changing patterns of use.

## Implementation

Build this as a curated category registry over existing OSM, GBFS, public-event,
and source-pack data. Every category declares whether it is static, scheduled,
observed, or inferred. Use clustered symbols at global scale and richer cards
only near the camera.

Add a `CONTINUITY` preset that activates a balanced set of civic layers without
turning on every dataset. The preset should be reversible and should not alter
the user's explicit layer choices permanently. A daily panel can show public
activity such as transit service, open-air markets, events, and public cameras.

Keep sensitive facilities generalized where appropriate. Do not expose personal
attendance, individual movement, or private event-participant data. Public venue
records are context, not a people-tracking system.

## Testing and definition of done

Test category licensing, stale schedules, duplicate OSM entities, global LOD,
accessibility labels, and interactions with conflict and humanitarian modes. A
user should be able to explore a place through ordinary civic context without
the map becoming a dense unreadable inventory.

## Implementation status

Completed on `improvements/23-everyday-world-context`. The continuity core now
validates civic categories and coordinate bounds, accepts only HTTPS source
links, normalizes explicit static/scheduled/observed/inferred/stale/unknown
states, excludes sensitive records before normalization, deduplicates public
entities, and clusters them into bounded global context nodes. Its preset
caveat explicitly prevents interpreting civic places as attendance or
individual movement.
