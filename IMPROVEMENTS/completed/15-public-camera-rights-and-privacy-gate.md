# Public Camera Rights, Privacy, and Takedown Gate

## Feature

Add a formal review and runtime rights gate for public camera sources. The gate
would make the camera layer useful at global scale while preventing the project
from becoming an indiscriminate index of streams that were not intended for
redistribution or projection.

## Why it is valuable

“Publicly reachable” is not the same as “licensed for reuse.” Cameras may show
private homes, identifiable people, restricted facilities, or feeds whose terms
allow viewing but not caching, embedding, or transformation. The project already
has strong source attribution and security rules; this feature turns those
principles into an operational workflow for a much larger camera catalog.

## Implementation

Create a source-review manifest with required fields: operator identity, source
landing page, terms URL, permission basis, permitted display modes, caching
policy, retention policy, geographic precision, privacy review, review owner,
review date, expiry date, and takedown contact. A camera cannot enter the
production catalog without a passing manifest.

Define display permissions separately: `link-only`, `thumbnail`, `live-frame`,
`3d-projection`, `cache`, and `export`. The runtime adapter must enforce the
most restrictive permission. For example, a feed may be displayed as a link but
not proxied or included in an offline archive.

Add a visible `REPORT SOURCE` action that records the catalog ID, source page,
and reason without exposing private user information. Maintain a signed or
versioned denylist/takedown file that disables a source immediately at startup.
The disable state should say `WITHHELD BY SOURCE REVIEW`, not “offline.”

Never add face recognition, license-plate recognition, person search, or
behavioral tracking. Add configurable privacy masks only when the source
operator permits transformed display; masks should be conservative and should
not be presented as a guarantee of anonymity. The default should avoid storing
frames and should not write raw video into diagnostics or the observation ledger.

## Testing and rollout

Build a linter that rejects missing terms, expired reviews, ambiguous operators,
unbounded redirects, and unsupported permissions. Test that link-only feeds
never enter frame fetch code, withheld cameras disappear from active rendering,
and exported snapshots honor the source permission. Include a tabletop takedown
exercise and document the response SLA for maintainers.

## Definition of done

Every camera visible in the app has a reviewable source record and explicit
display permissions. Users can report a source, maintainers can withdraw it
without a code release, and the system never treats technical accessibility as
permission to republish.

## Implementation status

Completed on `improvements/15-camera-rights-privacy-gate`. Added a versioned
review gate requiring operator identity, source/terms URLs, permission basis,
review ownership and expiry, takedown contact, and explicit display
permissions. Runtime checks distinguish link, frame, projection, cache, and
export rights; a denylisted source reports `WITHHELD BY SOURCE REVIEW`; and
takedown reports are bounded to catalog metadata and a user-supplied reason.
