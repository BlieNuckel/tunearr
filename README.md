<p align="center">
  <img src="public/favicon.svg" alt="Tunearr" width="80" />
</p>

<h1 align="center">Tunearr</h1>

<p align="center">
  A self-hosted web app for discovering, requesting, and managing music through Lidarr — with multi-user requests, taste-based recommendations, and optional Soulseek integration.
</p>

<!-- SCREENSHOT PLACEHOLDER: Discover page (bento grid) — e.g. docs/screenshots/discover.png, width 700 -->

---

## Features

- **Discover** — A personalized dashboard built from your listening history. Tunearr derives a taste profile from your Plex plays and ratings and uses it to promote an album and a set of artists you're likely to enjoy, alongside new releases and genre-based exploration that deliberately steps outside your comfort zone.
- **Search & browse** — Search MusicBrainz for albums and artists. Artist pages show the full discography and similar artists; album pages show track listings and purchase links, and let you request the album or add it straight to Lidarr.
- **Requests** — A multi-user request workflow. Users with the right permission can request albums; admins approve or deny, or grant auto-approval. Approved requests are sent to Lidarr and tracked until they land in your library.
- **Users & permissions** — Multiple user accounts with granular permissions (managing users, managing requests, requesting, auto-approval). Each user can link their own Plex account for personalized recommendations.
- **Soulseek integration** — Connect an [slskd](https://github.com/slskd/slskd) instance and Tunearr exposes it to Lidarr as a standard indexer and download client, so Soulseek results flow through Lidarr's normal grab/import pipeline.
- **Buy or download** — A configurable purchase-decision engine suggests when an album is better bought than downloaded (e.g. rare labels, old releases), with spending tracking and an optional monthly budget.
- **Library** — Track your purchases, wanted albums, and open requests in one place. Follow artists to get notified in-app when they release something new.
- **Manual import** — Upload purchased music files through the web interface, review them, and import them into Lidarr.
- **Logs & settings** — Searchable settings, connection tests for every integration, and a built-in log viewer.

<!-- SCREENSHOT PLACEHOLDER: 2-3 more screenshots (artist page, requests/library, settings) — side by side or stacked -->

## Getting started

However you deploy (Docker or NixOS), first run works the same:

1. Open Tunearr in your browser (default port `3001`).
2. Create the first admin account.
3. Follow the onboarding wizard: connect Lidarr (URL + API key), pick quality/metadata profiles and a root folder, and optionally set up Last.fm, Plex, and the manual import directory.

Everything in the wizard can be changed later under **Settings**.

## Running with Docker Compose

### Prerequisites

- Docker and Docker Compose
- A running Lidarr instance

### Setup

1. Create a `docker-compose.yml`:

```yaml
services:
  tunearr:
    image: ghcr.io/blienuckel/tunearr:latest
    user: "1000:1000"
    ports:
      - "3001:3001"
    volumes:
      - ./config:/config
    restart: unless-stopped
```

If you want to use the manual import feature, also mount the directory your music files will be uploaded to:

```yaml
volumes:
  - ./config:/config
  - /path/to/your/music/imports:/imports
```

2. Start the container:

```sh
docker compose up -d
```

3. Open `http://localhost:3001` and follow [Getting started](#getting-started).

All persistent state (settings, database, logs) lives in the `/config` volume.

### Building from source

```sh
git clone git@github.com:BlieNuckel/tunearr.git
cd tunearr
docker build -t tunearr .
docker run -d -p 3001:3001 -v ./config:/config tunearr
```

## Running on NixOS

The repository is a flake that ships a package and a NixOS module.

1. Add the flake input:

```nix
{
  inputs.tunearr.url = "github:BlieNuckel/tunearr";
}
```

2. Import the module and enable the service:

```nix
{
  imports = [ inputs.tunearr.nixosModules.tunearr ];

  services.tunearr = {
    enable = true;
    port = 3001;
    openFirewall = true;
  };
}
```

3. Rebuild, open `http://<host>:3001`, and follow [Getting started](#getting-started).

### Module options

| Option                          | Default              | Description                                                      |
| ------------------------------- | -------------------- | ---------------------------------------------------------------- |
| `services.tunearr.enable`       | `false`              | Enable the service                                               |
| `services.tunearr.port`         | `3001`               | TCP port the server listens on                                   |
| `services.tunearr.dataDir`      | `"/var/lib/tunearr"` | Persistent state: SQLite database, config JSON, logs             |
| `services.tunearr.user`         | `"tunearr"`          | User to run as (set to an existing user, e.g. `media`, to share) |
| `services.tunearr.group`        | `"tunearr"`          | Group to run as                                                  |
| `services.tunearr.openFirewall` | `false`              | Open the port in the firewall                                    |
| `services.tunearr.environment`  | `{ }`                | Extra environment variables for the service                      |

An overlay is also available as `inputs.tunearr.overlays.default` if you prefer managing the package yourself.

## Integrations

| Service | Required | Purpose                                                      |
| ------- | -------- | ------------------------------------------------------------ |
| Lidarr  | Yes      | Music library management; requests and imports go through it |
| Last.fm | No       | Similar artists and genre tags for discovery                 |
| Plex    | No       | Listening history and ratings that power recommendations     |
| slskd   | No       | Soulseek downloads via Lidarr (see below)                    |

MusicBrainz, Deezer (album artwork), and ListenBrainz are used automatically and need no configuration.

### Soulseek via slskd

Tunearr can bridge Soulseek into Lidarr's normal workflow. Point Tunearr at your slskd instance under **Settings → Integrations**, then add two things in Lidarr:

- An **indexer** of type Newznab pointing at `http(s)://<tunearr>/api/torznab`
- A **download client** of type SABnzbd pointing at `http(s)://<tunearr>/api/sabnzbd`

Lidarr then searches, grabs, and imports Soulseek releases exactly like it would from any indexer — Tunearr handles the translation to and from slskd behind the scenes.

> **Note:** the `/api/torznab` and `/api/sabnzbd` endpoints are unauthenticated so Lidarr can reach them. Don't expose Tunearr directly to the internet without a reverse proxy handling access control.

## Environment variables

| Variable         | Default    | Purpose                                        |
| ---------------- | ---------- | ---------------------------------------------- |
| `APP_CONFIG_DIR` | `./config` | Runtime config JSON, SQLite database, and logs |
| `PORT`           | `3001`     | Server port                                    |

## Development

You'll need Node.js 22 and [pnpm](https://pnpm.io). If you use Nix, `nix develop` drops you into a shell with both.

```sh
pnpm install
pnpm dev
```

This starts the Vite dev server on port `3002` and the Express API on port `3001`; the client proxies `/api/*` to the server. Open `http://localhost:3002`.

Useful commands:

```sh
pnpm test          # frontend tests (Vitest + Testing Library)
pnpm test:server   # server tests
pnpm lint          # ESLint
pnpm typecheck     # TypeScript, client + server
pnpm dev:mock      # dev mode with a mocked Lidarr (MOCK_LIDARR=true)
```

The stack is React 19 + Tailwind CSS v4 on the frontend and Express 5 + SQLite (TypeORM) on the backend, all TypeScript. See [CLAUDE.md](CLAUDE.md) for a full architecture overview.
