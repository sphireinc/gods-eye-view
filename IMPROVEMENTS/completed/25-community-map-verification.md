# Community Map Verification Workspace

## Feature

Add a workspace for users to flag stale, incorrect, or incomplete public map
context and prepare evidence-backed OpenStreetMap Notes or source-pack reports.
The workspace should help users contribute corrections without granting the app
automatic editing authority.

## Why it is useful

Live data and bundled datasets inevitably contain errors. The project already
surfaces cameras, roads, installations, facilities, and infrastructure from
public sources. A verification workflow turns users from passive viewers into
careful contributors while keeping edits reviewable by the appropriate
community.

## Implementation

Add `src/verification/` with a local evidence bundle containing selected entity,
map position, observation timestamps, source links, optional user note, and
before/after imagery references. Provide templates for “wrong location,” “no
longer exists,” “new feature,” “stale feed,” and “source attribution issue.”

For OpenStreetMap, generate a reviewable note draft and link to the official
OSM note flow. The app should not automatically create or close notes by
default. OSM documentation explicitly recommends contextual analysis because
notes can be misleading or false, so the UI should require a confirmation step
and show the evidence bundle before submission.

For internal catalog sources, export a maintainer-ready JSON or Markdown report.
Keep user identity and private annotations local unless the user explicitly
submits them.

## Testing and definition of done

Test coordinate precision, attachment redaction, offline drafts, duplicate
reports, source takedown, and submission cancellation. A user should be able to
produce a useful correction report without the application silently editing
third-party databases.

## Implementation status

Completed on `improvements/25-community-map-verification`. Evidence bundles now
validate and round coordinates, cap notes and labels, retain only HTTPS source
attachments, mark every export as `DRAFT_ONLY`, and preserve the explicit
non-submission OSM disclaimer. This creates a reviewable, offline-friendly
correction artifact without granting the application edit authority over any
third-party database.
