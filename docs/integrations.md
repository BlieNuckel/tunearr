# Integrations

What each integration does, what it needs, and how to set it up. Everything here lives under **Settings → Integrations** (and most of it is also offered by the onboarding wizard on first run).

| Service              | Required | Purpose                                                      |
| -------------------- | -------- | ------------------------------------------------------------ |
| [Lidarr](#lidarr)    | Yes      | Music library management; requests and imports go through it |
| [Last.fm](#lastfm)   | No       | Similar artists and similar albums                           |
| [Plex](#plex)        | No       | Captures each user's listening history and ratings           |
| [slskd](soulseek.md) | No       | Soulseek downloads via Lidarr                                |

MusicBrainz (search and metadata), Deezer (album artwork), and ListenBrainz (similar artists) are public APIs used automatically — no configuration needed.

## Lidarr

Lidarr is the one required integration: it manages the music library, and every request and import ultimately lands there.

You need:

- **URL** — where Tunearr can reach Lidarr, e.g. `http://lidarr:8686` (Docker) or `http://localhost:8686` (same host).
- **API key** — in Lidarr under _Settings → General → Security_.

After connecting, pick a **quality profile**, **metadata profile**, and **root folder** — these are applied to every artist Tunearr adds to Lidarr. Profile and root folder lists come live from Lidarr, so create them there first if the ones you want don't exist yet.

## Last.fm

Powers "similar artists" on artist pages and "similar albums" on album pages. Without it, those sections simply stay empty — everything else works.

Setup: create a free API account at [last.fm/api/account/create](https://www.last.fm/api/account/create) and paste the **API key** into Tunearr. No user login or scrobbling setup involved — Tunearr only reads public artist data.

## Plex

Tunearr copies each linked user's Plex listening history, play counts and track/album ratings into its own database, so the history survives Plex purges and library re-imports. Nothing in the app reads it yet. Capture can be switched off with **Record listening history** on the Plex integration page.

Plex is linked **per user**, not globally:

1. An admin sets the shared **Plex server URL** under _Settings → Integrations_ (or in the onboarding wizard).
2. Each user clicks **Sign in with Plex** to link their own Plex account. This runs Plex's standard OAuth flow in a popup; the resulting token is stored on that user's account and used for their personal listening history.

No Plex password ever passes through Tunearr, and no user sees another user's history. Tunearr only reads from Plex — it never modifies your Plex library.

## Manual import

Lets users upload purchased music through the web UI, which Tunearr hands to Lidarr for import. This needs an **import directory** that both apps can access:

- **Tunearr** must be able to _write_ to it (uploads are saved there).
- **Lidarr** must be able to _read_ it under the same path (it imports from there).

In Docker, mount the same host directory into both containers at the same path (e.g. `./imports:/imports` in both — see the [Docker guide](setup-docker.md)). On a single host, any directory both users can access works (see the [NixOS guide](setup-nixos.md#manual-import-directory)).

Unlike the slskd download path, Tunearr validates this one: it must exist and be writable from Tunearr's point of view.

## Soulseek (slskd)

Bridges Soulseek into Lidarr as a normal indexer and download client. This one has its own guide: [Soulseek integration](soulseek.md).
