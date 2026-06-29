# RFC: Stabilising user profiles

Status: Steps 1 & 2 implemented; similar-graph persisted. Step 3 (taste page) split out to
the standalone exploratory [#176](https://github.com/BlieNuckel/tunearr/issues/176); Step 4
(export/restore) discarded. Snapshot retention resolved via delta-encoding + un-rating detection.
Tracking issue: [#144](https://github.com/BlieNuckel/tunearr/issues/144)
Step 1 issues: [#166](https://github.com/BlieNuckel/tunearr/issues/166) (#167 entities, #168 recommender, #169 scheduler)
Step 2 issue: [#172](https://github.com/BlieNuckel/tunearr/issues/172)
Related: #137 (explore mode), #145 (explore-vs-Plex boundary), #136 (listening window + anti-repeat)

## Implementation status

**Step 1 (#166) is implemented** (persist the derived profile). The sections below are
the original design; this block records what actually shipped and where it diverged.

Done:

- **Entities + migration (#167).** `UserProfile` (derived cache, one versioned JSON doc
  per user) and `UserSignalEvent` (append-only, `kind`-tagged) in `server/db/entity/`,
  migration `8_UserProfile`, both cascade-deleting with the owning user. Access helpers in
  `server/db/userProfile.ts`.
- **Profile-first recommender (#168).** `server/promotedAlbum/profileService.ts`:
  `regenerateProfile(userId, plexToken)` (request-free, reused by the scheduler) and
  `loadFreshProfile` (read-first; regenerate only on TTL expiry, `config_hash` mismatch, or
  `schema_version` bump), guarded by a per-user `AsyncLock`. `getPromotedAlbum` /
  `getPromotedArtists` now key on `userId`; the in-memory `userCache` /
  `recentlyShownByUser` maps folded into the persisted `explorationHistory`.
- **Background regeneration (#169).** `server/services/profile/regenPoller.ts` refreshes
  stale **and** recently-active profiles off the request path, reusing the in-flight guard.

- **`similarGraph` persisted; explore no longer fans out per request.** `DerivedProfile`
  now carries a `similarGraph` (per seed artist: its MBID, genre set, play count, and the
  genre-tagged ListenBrainz similar artists). `regenerateProfile` builds it in the same pass
  via `buildSimilarGraph` (the old per-request MusicBrainz + ListenBrainz + Last.fm fan-out,
  moved off the request path and run sequentially per seed to keep network load identical).
  At request time `buildExploreResult` reads the graph, weighted-picks a seed, applies the
  genre-overlap threshold in memory, and only the final album pick (MusicBrainz release
  groups) hits the network — mirroring how within-taste keeps its Last.fm album fetch
  per-request. Schema bumped to v2 (forces one clean regen); `topArtistsCount` +
  `exploreCandidateCount` added to `config_hash` (they shape the stored graph;
  `genreOverlapThreshold` stays out so threshold tuning needs no regen). No migration.

Diverged from / refined beyond the original sketch:

- **`DerivedProfile` carries `artistTags`** (`{ name, viewCount, tags: {name,count}[] }[]`)
  in addition to `genreVector` + `explorationHistory`. The within-taste recommendation
  `trace` ("How this was recommended") renders per-artist viewCounts + tag contributions,
  which `genreVector` alone can't rebuild — without this, the trace's first two stages go
  empty once a recommendation is served from the persisted profile (the normal path). Both
  are produced in one regeneration pass so they can't disagree. We deliberately do **not**
  store the raw unfiltered Last.fm tag dump: it's re-fetchable external data, and a config /
  algorithm change flips `config_hash` and forces a clean refetch rather than recomputing a
  stale snapshot.
- **Two-layer cache** (was sketched, now concrete): long-lived persisted profile
  (`profileTtlMinutes`, default 1440) + short-lived in-memory result cache
  (`cacheDurationMinutes`, default 30). A refresh re-picks a tag/album off the cached vector
  without re-running the Plex + Last.fm fan-out.
- **New config** (`promotedAlbum.*`, validated, with Settings UI): `profileTtlMinutes`,
  `backgroundRegenEnabled`, `backgroundRegenIntervalMinutes`,
  `backgroundRegenActiveWithinMinutes`.

Deferred, as planned:

- **Ratings ingestion + snapshots (`UserSignalEvent` writes)** — Step 2 ([#172](https://github.com/BlieNuckel/tunearr/issues/172)).
  The table exists and the regen poller is the intended home for the snapshot cadence. The
  Plex ratings **reader** is prototyped (`server/api/plex/ratings.ts`, with `getMusicSectionKey`
  extracted to `sections.ts`); the `UserSignalEvent` **writes** and cadence are still to do.
- **Taste page** (Step 3) and **export/restore** (Step 4) are **no longer part of this
  work** — see "Next step" below.

## Problem

Recommendations on the explore/discover pages are generated **on demand** from live Plex
data and thrown away. There is no persisted, stabilised notion of a user's taste. Two
consequences:

1. **No stability / inspectability.** The derived profile (genre vector, similar-artist
   graph, exploration history) is recomputed roughly every 30 minutes and lost on restart.
   Recommendations are not reproducible, not debuggable, and cannot be surfaced to the user.
2. **No backup.** If a user loses Plex play-count or rating data (library re-import, server
   migration, accidental reset), the listening signal tunearr depends on is gone. Ratings
   in particular are unrecoverable — Plex cannot reconstruct them from history.

The issue rightly flags the risk: a naive "snapshot Plex into a table" mostly **duplicates**
data Plex already owns and creates a second source of truth that drifts. This RFC defines
what is worth persisting and what is not.

## Decision (proposed)

**Tunearr persists derived profile state and an optional backup snapshot. Plex remains the
source of truth and tunearr never writes back to it.** This is consistent with the
explore-vs-Plex boundary agreed in #145: Tunearr owns discovery, Plex is read-only playback.

We explicitly reject building a standalone "profile of record" intended to replace Plex.

## Current state (verified against code, June 2026)

The per-user profile is entirely ephemeral.

- `server/promotedAlbum/getPromotedAlbum.ts` and `server/promotedArtists/getPromotedArtists.ts`
  rebuild the profile on every cold request.
  - Seed = `getTopArtists(plexToken, …)` (`server/api/plex/topArtists.ts`): reads Plex
    `viewCount` all-time, or aggregates `/status/sessions/history` for a window. This is the
    **only** per-user signal consumed today.
  - Tags via Last.fm (`getArtistTopTags`), weighted `tag.count × viewCount`.
  - Explore mode (`server/promotedAlbum/explore.ts`): ListenBrainz similar-artists →
    Last.fm genres → Jaccard genre-distance filter.
- Only caching: two in-memory `Map`s keyed by `plexToken` — `userCache` (30-min TTL) and
  `recentlyShownByUser` (last ~10 albums / ~18 artists). **Both lost on restart.**
- DB entities: `User, Session, Request, Config, WantedItem, FollowedArtist, SeenRelease,
Purchase`. `User.plex_token` exists; **no taste columns**. `Config` is global, not per-user.

### Signals available

| Signal                            | Source                     | Used today?           | Persistable?                   | Plex can rebuild it?                                            |
| --------------------------------- | -------------------------- | --------------------- | ------------------------------ | --------------------------------------------------------------- |
| Play counts (per artist)          | Plex `viewCount` / history | Yes                   | Yes (snapshot)                 | Partially (from history)                                        |
| Star ratings                      | Plex `userRating`          | **No**                | Yes (snapshot)                 | **No — unrecoverable**                                          |
| Genre / tag vector                | Last.fm (derived)          | Recomputed, discarded | Yes (derived)                  | N/A — Plex never has it                                         |
| Similar-artist graph              | ListenBrainz (derived)     | Recomputed, discarded | Yes (derived)                  | N/A                                                             |
| Exploration history (shown items) | in-memory only             | Lost on restart       | Yes                            | N/A                                                             |
| Trend over time                   | —                          | No                    | Yes (time-series of snapshots) | Play counts: partially (bounded, prunable history). Ratings: no |

Note: backing up ratings is **net-new ingestion** — tunearr does not read `userRating` today.
Reachability confirmed (June 2026): the existing per-user token path can fetch it — see
"Resolved: ratings ingestion" under Open questions.

### Snapshots vs. Plex's own history

Plex is not purely "current state." `getTopArtistsByHistory` (`server/api/plex/topArtists.ts`)
already reads play _events_ with timestamps from `/status/sessions/history`, so for play
counts Plex does retain a window of history. The marginal value of snapshotting play counts
over that window is therefore modest. The snapshot still earns its place for four reasons:

1. **Ratings have no history at all.** The history endpoint returns play events; `userRating`
   is current-state only — Plex stores the rating you have _now_, not when it changed or what
   it was. A rating timeline can only exist if tunearr records it. This is the one genuinely
   unrecoverable signal (see the table above).
2. **Plex history is bounded and destructible — it is not an archive.** The fetch is capped
   (`HISTORY_FETCH_SIZE = 5000`); a heavy user in a long window is silently truncated. And the
   history itself is wiped by "Clear All Play History," library re-import, or server
   migration — exactly the data-loss scenarios #144 exists to guard against. tunearr's
   append-only snapshot log is its _own_ durable copy that survives a Plex history clear.
3. **Pre-aggregated and local vs. repeated rate-limited refetch.** Deriving a trend from the
   history endpoint means re-pulling up to 5000 rows and re-aggregating against Plex on every
   regenerate. A daily snapshot is ~200 pre-summed artist rows; diffing 30 of them is cheap
   and entirely local, off the network and off Plex.
4. **Fixed baselines, unbounded lookback, multi-signal alignment.** The history endpoint gives
   windows relative to _now_ ("last 4 weeks"). Snapshots give fixed calendar points to diff
   (June 1 vs. July 1), ranges _beyond_ whatever Plex still retains, and a stable baseline as
   Plex prunes underneath. The snapshot payload also aligns ratings + play counts (+ future
   tunearr behaviour) at one timestamp, which the play-events feed cannot do.

Accurate framing: Plex keeps a **bounded, mutable, play-only** history; the snapshot is an
**append-only, durable, multi-signal, pre-aggregated** copy. The value is small over the live
window and compounds as the log outlives Plex's retention and as ratings accumulate.

## What we persist vs. what we don't

**Persist (derived state — a cache with provenance, not a duplicate of Plex):**

- Genre/tag vector with weights and contributing artists.
- Similar-artist graph used for explore mode.
- Exploration history (recently-shown albums/artists) so anti-repeat survives restart.
- Provenance: which Plex range/config + generation timestamp produced this profile.

**Persist (backup — the decay-prone signals Plex can lose):**

- Periodic snapshot of per-artist play counts and ratings, kept in tunearr's own DB.
- This is purely _internal durability_: the point is that tunearr's profiles don't depend on
  destructible data owned by another app. If Plex loses play counts or ratings, tunearr still
  has its own copy and its profiles keep working. There is no user-facing export of this data —
  that's a separate feature decision, deliberately not in scope here (see Out of scope).

**Do NOT persist / do NOT build:**

- A profile-of-record meant to supersede Plex.
- Any write-back to Plex (ratings, playlists, play counts).
- Per-user duplication of data Plex serves cheaply on demand and can always rebuild.

## Proposed schema (sketch — to refine in implementation issue)

Two storage strategies, split by data ownership so that **adding a new signal later costs zero
migrations**:

- **Regenerable-derived** (genre vector, exploration memory, future similar graph): a cache,
  stored as **one versioned JSON document**. Never queried by field (the recommender loads the
  whole row per user), so a document beats a column-per-artifact.
- **Authoritative-raw** (Plex ratings, snapshots, future tunearr behaviour): cannot be rebuilt
  and _is_ worth querying, so it lives in **one append-only, `kind`-tagged table**.

```ts
// server/db/entity/UserProfile.ts — derived, regenerable cache (one row per user)
@Entity("user_profiles")
class UserProfile {
  @PrimaryGeneratedColumn() id!: number;
  @Index({ unique: true }) @Column("integer") user_id!: number;

  @Column("text") profile_json!: string; // JSON: DerivedProfile (see below)
  @Column("integer") schema_version!: number; // bump when DerivedProfile shape changes
  @Column("text") config_hash!: string; // hash(topArtistsRange, genericTags, tagsPerArtist, pickedArtistsCount)
  @Column("text") generated_at!: string;
  @Column("text") last_used_at!: string;
}

// The derived document. Adding a derived field = edit this type + bump schema_version.
// No migration: a version mismatch makes the row stale → it regenerates and self-heals.
type DerivedProfile = {
  genreVector: { tag: string; weight: number; fromArtists: string[] }[];
  explorationHistory: { albums: string[]; artists: string[] };
  // future: similarGraph, ratingWeightedVector, ... — added without a migration
};

// server/db/entity/UserSignalEvent.ts — authoritative-raw, append-only (time-series)
// Subsumes the earlier ListeningSnapshot idea: a snapshot is just kind = "snapshot".
@Entity("user_signal_events")
class UserSignalEvent {
  @PrimaryGeneratedColumn() id!: number;
  @Index() @Column("integer") user_id!: number;
  @Index() @Column("text") kind!: string; // "snapshot" | "plex_rating" | "request" | "skip" | ...
  @Column("text") payload!: string; // JSON, shape per kind
  @Column("text") recorded_at!: string;
}
```

`UserProfile` is upserted (1:1 with user) and treated as a regenerable cache: changing the
derived shape needs no data migration, since a `schema_version` (or `config_hash`) mismatch just
forces a regenerate. `UserSignalEvent` is append-only and the basis for internal-durability backup and trend
analysis; a daily snapshot is one row with `kind = "snapshot"` and a per-artist
`{ name, playCount, rating? }` payload. Adding a new raw signal is a new `kind` string — no new
table, no migration.

## How the recommender changes

`getPromotedAlbum` / `getPromotedArtists` gain a profile-first path:

1. Load `UserProfile` for the user.
2. If fresh (within a TTL, e.g. configurable hours) → use persisted derived state, skip the
   expensive Plex + Last.fm + ListenBrainz recompute.
3. If stale/missing → regenerate from Plex as today, then upsert the profile.
4. Snapshot job (periodic or on-login) appends a `UserSignalEvent` (`kind = "snapshot"`) and pulls ratings.

The in-memory `userCache`/`recentlyShownByUser` maps fold into `UserProfile`.

## How each #144 motivation is served

- **Better / stable recs** → derived state persisted, regenerable cache, survives restart.
- **Backup taste data** → `UserSignalEvent` snapshots give tunearr its own durable copy so its
  profiles survive Plex losing play counts/ratings; ratings ingested for the first time. Internal
  durability only — no user-facing export.
- **User-facing taste page** → `UserProfile`'s `genreVector` (inside `profile_json`) renders directly (top genres, weights).
- **Trend over time** → diff successive `kind = "snapshot"` events for rising/falling artists; lets recs
  de-bias away from stale all-time favourites.

## Open questions

1. **Snapshot cadence** — on login, on a timer (cron-like), or both? How many to retain?
2. **Profile TTL** — how stale before we force a regenerate? ~~Per-user override?~~
   **Closed — won't do (June 2026).** No per-user TTL override. A user could set an
   unreasonably low TTL and flood the server with regenerations; TTL is a server-capacity
   concern and stays a single global setting owned by whoever runs the server.
3. **Ratings ingestion** — ~~confirm Plex exposes `userRating` per track/album via the existing
   per-user token path; volume/perf of pulling it.~~ **Resolved (June 2026) — yes; see below.**
4. **Storage growth / retention** — `plex_plays` is the dominant growth driver; bound it without
   losing fidelity. ~~On a timer; how many to retain / how to compact?~~ **Resolved (June 2026)
   — delta-encode plays + detect un-ratings; see below.**
5. **Privacy / retention** — more per-user data on disk; deletion-on-user-removal must cascade
   (handled: `UserSignalEvent` cascade-deletes with the owning user).

### Resolved: ratings ingestion (open question 3)

**Verdict: yes — `userRating` is reachable through the per-user token path tunearr already
has, and Step 2 is unblocked.** Investigated June 2026 against the live Plex API and the
existing integration.

- **Same token path, no new auth.** Plex resolves `userRating` per account: querying the PMS
  with account A's token returns account A's own rating. This is the identical mechanism the
  app already relies on for `viewCount` / play history in `server/api/plex/topArtists.ts`
  (`store-plex-token` → `getServerAccessToken` → `User.plex_token` → request headers). No new
  token flow is needed — each user reads **their own** ratings with **their own** stored
  token.
- **Why the "shared user" limitation does not apply.** Plex blocks an _owner's_ token from
  reading a _friend's_ personal ratings. Tunearr never does this: every user queries with
  their own token, which is exactly the case Plex supports. We never have one user read
  another's data.
- **Read endpoint + perf (the volume half of the question).** Use a server-side filter for
  rated items only — `GET /library/sections/{sectionKey}/all?type=10&userRating>=1`. This
  means we **never scan the whole library** — one paginated, filtered query returns just the
  (small) rated set. Container pagination (`X-Plex-Container-Size`) is already wired up in
  `topArtists.ts`. Single-item reads via `GET /library/metadata/{ratingKey}` also carry
  `userRating`. **Prototype note (June 2026):** `server/api/plex/ratings.ts` implements this
  with `userRating%3E=1` (i.e. `userRating>=1`, matching the proven `viewedAt>=` filter in
  `topArtists.ts`) rather than the `>>=` operator originally sketched here. The exact encoding
  a live PMS accepts is the one item still to confirm against a real server.
- **Field semantics.** Music ratings exist at artist (`type=8`), album (`type=9`) and track
  (`type=10`); recommend ingesting albums + tracks. `userRating` is **absent** when an item
  is unrated — treat missing as "no rating", not 0. Scale is 0–10 (half-star = 1 unit),
  matching the existing `{ rating: 8 }` stub in `userProfile.test.ts` and the reserved
  `"plex_rating"` `SignalKind`.

Two caveats to handle during Step 2, neither blocking:

- **Managed / Plex Home users** have no full plex.tv account and follow a different token
  flow; `userRating` will not resolve for them. The common case (full Plex accounts) is
  unaffected — just skip or flag managed users.
- **`view_state_sync` is a per-user toggle** (`PUT /api/v2/user/view_state_sync`) governing
  cross-platform sync. It does not affect single-PMS reads — music ratings are stored
  server-side keyed to the account, so the metadata query returns them regardless. Don't
  assume ratings made on _other_ servers are present.

### Resolved: storage growth / retention (open question 4)

**Verdict: delta-encode plays + detect un-ratings.** The earlier worry was that a daily,
all-artist, per-user `plex_plays` snapshot grows ~linearly (~9 KB/row → ~3.3 MB/user/year).
The fix follows from the data's own shape — and is consistent with framing plays and ratings as
two different kinds of signal. Implemented June 2026 (`signalIngestion.ts`, `artistWeights.ts`,
`api/plex/ratings.ts`).

- **Plays are accumulated facts; ratings are revocable opinions.** A cumulative play count only
  ever rises under normal use (you can't un-listen); a decrease or a vanished artist means Plex
  lost data (history clear, re-import) — exactly what this backup exists to survive. A star, by
  contrast, can be un-starred. The two get different handling rules.
- **Plays → monotonic-max delta log.** Each `plex_plays` event now carries only the artists
  whose cumulative count _increased_ since the last capture; an unchanged day writes nothing.
  Full state is reconstructed by folding the series last-write-wins (`reconstructPlayCounts`),
  carrying unchanged artists forward. Stored value = `max(everything seen)`: decreases /
  disappearances / a transient-empty read are never recorded, which protects the backup against
  a Plex clear **and** removes the mass-clear ambiguity for free. Expected ~95% reduction
  (steady state ~1–1.5 MB/user; ~1.5 GB at 1000 users), full daily resolution retained, trend
  diffing unchanged (it just reconstructs both endpoints from the fold). No migration — old full
  rows fold correctly as baselines.
- **Ratings → change log incl. un-stars.** Because the rated read uses a server-side
  `userRating>=1` filter, an un-starred item simply drops out — indistinguishable from a
  truncated/glitchy fetch. `detectUnratings` finds previously-rated keys absent from the current
  set; each candidate is **confirmed** against live Plex (`getItemRating` →
  `/library/metadata/{key}`) before a `rating: 0` clear is appended. Guards: skip on an empty
  response, and a candidate cap (`UNRATE_CANDIDATE_CAP = 50`) that skips + logs an implausible
  mass disappearance (a data event, not user action). `aggregateArtistRatings` excludes
  `rating <= 0` so a cleared star stops contributing.
- **Deferred (not needed yet):** periodic full **checkpoints** + pruning of pre-checkpoint
  deltas. The reconstruction fold is O(total deltas) — a few thousand tiny entries even after
  years on a home server, and run only during background regen — so this buys nothing for
  correctness or perf today. It is the natural next step if a very long-lived install ever makes
  the fold or pre-checkpoint history worth bounding.

## Out of scope

- Any Plex write-back.
- Replacing Plex as the source of truth.
- New recommendation _algorithms_ (this is about persistence/stability of the existing ones).
- **User-facing export / download / portability of profile or backup data.** The backup here is
  internal durability only. A user-facing export is a separate feature decision and is not part
  of this work.

## Next step

Step 1 (persist the derived profile) is implemented — see **Implementation status** above.
Discussion now moves to what comes after, in roughly dependency order:

- **Step 2 — ratings ingestion + snapshots ([#172](https://github.com/BlieNuckel/tunearr/issues/172)).**
  **Unblocked** — open question 3 resolved (Plex exposes `userRating` via the per-user token
  path; see "Resolved: ratings ingestion" above) and the reader is prototyped
  (`server/api/plex/ratings.ts`, server-side `userRating>=1` filter, paginated, albums + tracks).
  Remaining: write `UserSignalEvent` rows (`kind = "snapshot"` / `"plex_rating"`) and wire the
  cadence into the regen poller, which already exists as the cadence home. This is the first
  feature that makes `UserSignalEvent` earn its place.
- **Feed new signals into the vector.** The contributor-registry seam from #166 lets a
  rating / behaviour signal add weight to the _same_ `genreVector` without restructuring the
  recommender. Worth deciding the weighting model before Step 2 lands data.
- **~~`similarGraph` for explore mode.~~ Done** — see Implementation status. The graph is
  built at regeneration time and read per request; explore no longer fans out to Plex /
  MusicBrainz / ListenBrainz / Last.fm on the request path.
- **Step 3 — taste page. Dropped from this work.** Split out to a standalone, exploratory
  issue ([#176](https://github.com/BlieNuckel/tunearr/issues/176)) and deliberately
  disconnected from #144 — whether to build it at all is undecided. The persistence it would
  render (`genreVector`, snapshot/rating series) already shipped, so nothing here blocks it.
- **Step 4 — export/restore. Discarded.** No driver; user-facing portability was always out
  of scope (see Out of scope). Not tracked anywhere; revisit only if a concrete need appears.

Open questions 1 (cadence), 3 (ratings exposure) and 4 (storage growth / retention) are
resolved; 2 (per-user TTL override) is closed as won't-do. Question 4's only remaining piece —
checkpoint + prune — is deferred as not-yet-needed (see "Resolved: storage growth / retention").
With that, every open question under #144 is settled.
