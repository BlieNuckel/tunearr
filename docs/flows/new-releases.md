# New releases shelf

Six cards on Discover, all releases by artists the user follows. The followed-artist poller
records them; the shelf reads what it recorded.

Code: `server/services/discover/newReleases.ts`, `server/services/followed/`.

## The followed pipeline (persisted, poller-driven)

```mermaid
flowchart TB
  poll["followed-artist poller<br/>every 6h, first run after 30s"]
  each["for each row in followed_artists"]
  mb["MusicBrainz: fetchReleaseGroupsForArtist<br/>background lane"]
  dz["Deezer: getArtistAlbumsByName"]
  agg["aggregateArtistReleases<br/>dedup on normalized title + release year-month,<br/>MusicBrainz preferred"]
  known{"release_key already stored?"}
  rec["recordFollowedRelease"]
  back["backfillReleaseMetadata<br/>mbid, cover, types"]
  notify{"first poll after following,<br/>or older than 30 days?"}
  push["notifyFollowedRelease"]
  db[("followed_releases")]

  poll --> each --> mb --> agg
  each --> dz --> agg
  agg --> known
  known -->|no| rec --> db
  known -->|"yes, missing mbid"| back --> db
  rec --> notify
  notify -->|no| push
```

The first poll after following records the entire back catalogue, and none of it is news to
the person who just chose to follow that artist, so notifications are suppressed for it.

## The shelf (per request)

```mermaid
flowchart TB
  f["getFollowedReleasesForUser<br/>up to 200 rows"]
  filter["isAllowedReleaseType + placeholder-artist filter"]
  dedup["dedupeCandidates<br/>one entry per release-group mbid"]
  win["widen the window 30 -> 60 -> 90 days<br/>until 6 candidates exist"]
  sort["unseen first, then newest"]
  enrich["enrichRequestsWithLidarr<br/>downloading / wanted / imported"]
  out["6 items + the window used"]

  f --> filter --> dedup --> win --> sort --> enrich --> out
```

A release by two followed artists is stored once per artist, which is why the shelf dedupes on
the release-group mbid. The window widens rather than the count shrinking, because a
half-empty shelf reads as broken while a 90 day window reads as quiet.
