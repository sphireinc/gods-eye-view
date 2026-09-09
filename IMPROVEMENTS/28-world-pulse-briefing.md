# World Pulse Daily Briefing

## Feature

Add an optional daily and hourly “World Pulse” surface that presents a small,
ranked set of notable public changes around the globe. It should be a doorway
into the observatory, not a sensationalist breaking-news feed.

## Content

Possible cards include:

- Newly detected natural events
- Environmental changes
- Humanitarian reporting changes
- Significant connectivity disruptions
- Interesting satellite or orbital events
- Public-camera scenes with changing conditions
- Major infrastructure or transport changes
- A region with unusually sparse or conflicting data
- A place whose public systems returned to normal after an outage

Every card should show the reason it was selected, source age, source diversity,
and a direct action to open the evidence view. “Most discussed” and “most
severe” must remain separate concepts.

## Implementation

Build a server-side or local digest generator over Observation Ledger changes,
event clusters, provider health, and user watchlists. Use a bounded daily
generation job rather than making every browser independently query all feeds.
Store the digest as a signed/versioned snapshot with source references so a user
can revisit yesterday's briefing.

Allow filters for environment, humanitarian context, infrastructure, space,
Internet, and public cameras. Let users mute categories and choose a calmer
“quiet mode” that shows slow changes rather than alerts.

## Testing and definition of done

Test duplicate stories, source outages, stale inputs, time zones, empty days,
and sensational-card suppression. A user should receive a concise, source-linked
overview that leads into the globe and remains understandable when no major
event occurred.
