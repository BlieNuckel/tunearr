# RFC: Stabilising user profiles

Status: Draft / for discussion
Tracking issue: [#144](https://github.com/BlieNuckel/tunearr/issues/144)
Related: #137 (explore mode), #145 (explore-vs-Plex boundary), #136 (listening window + anti-repeat)

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
2. **Profile TTL** — how stale before we force a regenerate? Per-user override?
3. **Ratings ingestion** — confirm Plex exposes `userRating` per track/album via the existing
   per-user token path; volume/perf of pulling it.
4. **Multi-user** — snapshots are per-user; confirm storage growth is acceptable for many users.
5. **Privacy / retention** — more per-user data on disk; deletion-on-user-removal must cascade.

## Out of scope

- Any Plex write-back.
- Replacing Plex as the source of truth.
- New recommendation _algorithms_ (this is about persistence/stability of the existing ones).
- **User-facing export / download / portability of profile or backup data.** The backup here is
  internal durability only. A user-facing export is a separate feature decision and is not part
  of this work.

## Next step

Agree on the open questions above, then split into an implementation issue: entities +
migration first, snapshot/ingestion second, recommender profile-first path third, taste page
last. Each lands with full frontend + backend tests per project policy.
