# Proposed Improvements

These proposals are deliberately implementation-oriented. They treat the current
Vite + vanilla JavaScript + Cesium application as the starting point, preserve
the local-first and public-data boundaries, and assume the existing layer
contract (`init`, `enable`, `disable`, `update`, `destroy`, `getStats`) remains
the primary extension seam.

## Product charter

God's Eye View is a public, educational observatory for laypeople who want to
understand ongoing situations in the world through openly available data. It is
not a tactical battlefield map, is not intended for use in a conflict, and must
not provide operational or conflict-support capabilities. Proposed features
should improve public understanding, source transparency, humanitarian context,
and uncertainty awareness.

The proposals are independent enough to be delivered separately, but they form
an especially strong long-term sequence:

1. Make observations durable and explainable with the Observation Ledger.
2. Add time navigation and deterministic replay on top of those observations.
3. Add event correlation and user-authored alert rules without identifying
   people.
4. Add a plugin/source-pack SDK so the ecosystem can contribute layers safely.
5. Add the adaptive LOD and offline/export features to make large scenes useful
   on more machines and in more contexts.

The public-camera proposals extend the existing CCTV layer into a world-wide
atlas while keeping each feed's publication terms, attribution, freshness, and
privacy posture visible.

The public-conflict proposal applies the same discipline to emerging crises:
source triangulation, humanitarian context, historical trends, and uncertainty
instead of a tactical live-battle map.

Additional observatory proposals cover the user-facing layer above the feeds:
change detection, place briefings, public street imagery, community map
verification, everyday-world context, uncertainty education, comparisons, daily
briefings, and visible data-coverage gaps.

Each file describes one feature, why it belongs in God's Eye View, a concrete
implementation design, UI behavior, tests, rollout risks, and a definition of
done. These are proposals, not claims that the features already exist.
