---
title: Local environment
description: Docker Compose with hot reload is the default way to run ratewatch locally.
sidebar:
  order: 13
---

**Status:** Accepted · **Issue:** [#13](https://github.com/nitzanto/ratewatch/issues/13)

Anyone should be able to run ratewatch from a fresh clone without installing Node, on any operating system. **`docker compose up --watch` runs the whole product with hot reload.** Each app's Dockerfile builds both the development image and the production image, and native pnpm stays available for tests, linting and mock mode.

**Options considered**

- **Docker Compose with Compose Watch** (chosen): one command, the same on Docker Desktop, Colima, OrbStack and Linux, and it builds from the same Dockerfiles as production.
- **Dev Container**: no install either, but tied to editors that support it, and pnpm's hard links need its store and `node_modules` on one filesystem, which container volumes complicate.
- **Native only**: no Docker, but every developer installs and matches Node and pnpm, and nobody runs the production images before CI does.
- **Sharing the source folder with polling file watchers**: no rebuild for dependency changes, but file-change events through the Docker VM differ per engine, polling costs CPU, and `node_modules` on the host would hold the wrong platform's binaries.

**Why:** Compose Watch copies each edit into the container instead of sharing a folder, so hot reload doesn't depend on how a Docker engine forwards file events, and `node_modules` is always built for Linux inside the container.

**Trade-offs we accept:** adding a dependency rebuilds the image (a minute or two, mostly cached). Every `docker compose up` rebuilds the images too (`pull_policy: build`), which takes seconds when nothing changed; without it, a branch switched while Watch wasn't running left a container serving the old code. Tests and mock mode still need Node on your machine. The first run downloads every package.

**How the images are built:**

| Stage        | What it does                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Deps         | Downloads every package in the lockfile. It reads only the lockfile, so source and script changes reuse this step.                        |
| Builder      | Copies the workspace without tests, test setup or lint and test configs, and builds the production output.                                |
| Runtime base | A clean image with a non-root user: Node for the API, nginx for the dashboard.                                                            |
| Dev          | The full source and all dependencies, running the dev server. This is what Compose starts.                                                |
| Prod         | The runtime base plus the build output only: no sources, tests or dev dependencies. It's the default target, so CI and production get it. |

**Revisit when:** a team needs editor-integrated containers, or the Docker engines' file sharing makes plain bind mounts reliable everywhere.

**In the code:** `compose.yaml` (development), `compose.prod.yaml` (production-like overlay), `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore`. How to run it is in [Running locally](../../guides/running-locally/).
