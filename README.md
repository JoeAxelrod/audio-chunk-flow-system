# Audio-Chunk Flow System

![Architecture Diagram](system_images/system_architecture.png)

A tiny end-to-end demo that mimics an audio-streaming pipeline:
1. **Fake-Zoom** service spits WAV chunks to a webhook.
2. **Backend** persists chunk metadata, orchestrates processing / concat queues and pushes socket events.
3. **Processing** service mocks speech-to-text.
4. **Concat** service incrementally concatenates WAV files into `main.wav`.
5. **Frontend** plays the growing audio file and shows live transcripts / logs.

The entire stack is Dockerised and wired together with **Redis Streams**, **PostgreSQL** and **Socket.IO**.

---

## Quick Start (Exact Startup Order)

```bash
# clone & cd
git clone https://github.com/JoeAxelrod/audio-chunk-flow-system.git
cd audio-chunk-flow-system

# 1 & 2. Start infrastructure (queue & db) in detached mode
docker compose up -d queue db

# 3. Start **backend** first (this resets DB & Redis state)
cd services/backend
npm install        # first time only
npm run start &    # or `docker compose up backend` if you dockerise it
cd ../..

# 4. Start processing service
cd services/processing && npm install && npm run start &
cd ../..

# 5. Start concat service
cd services/concat && npm install && npm run start &
cd ../..

# 6. Start frontend
cd services/frontend && npm install && npm run dev &
cd ../..

# 7. **Only when everything above is running**, trigger the flow with fake-zoom
cd services/fake-zoom && npm install && npm run start
```

> **Note**: Steps 1-2 use Docker Compose to spin up Redis and Postgres. You can run the remaining services in separate terminals / panes or dockerise them as well. The important part is running the **backend before any worker services** so it can initialise fresh state.


![Client App](system_images/the-client-app.png)

Console output of the running services:

![Console Services](system_images/console_services.png)

---

## Services

| Name          | Folder                     | Port | Description                                                            |
| ------------- | -------------------------- | ---- | ---------------------------------------------------------------------- |
| Backend       | `services/backend`         | 8080 | Express API, Redis consumers, PostgreSQL access, Socket.IO gateway     |
| Fake-Zoom     | `services/fake-zoom`       | –    | Generates dummy WAV chunks and POSTs them to `/webhook/chunk`          |
| Processing    | `services/processing`      | –    | Listens on `queue.backend_to_processing`, writes transcripts           |
| Concat        | `services/concat`          | –    | Listens on `queue.backend_to_concat`, appends chunks to `main.wav`     |
| Frontend      | `services/frontend`        | 5173 | Vite + React client                                                    |

All services log to the central log channel so you can tail container output or just watch the web UI.

---

## Main Flow

1. `fake-zoom` POSTs `{ meetingId, seq, path }` to `/webhook/chunk`.
2. Backend stores a DB row and APPENDS message to:
   * `queue.backend_to_processing` ( **always** )
   * `queue.backend_to_concat` (only for first or already-ready chunks)
3. Processing service pops messages from `queue.backend_to_processing`, mocks a transcript → writes back to DB → publishes to `queue.processing_to_backend`.
4. Backend consumer marks processing done and, once the *previous* chunk was concatenated, enqueues concat.
5. Concat service pops from `queue.backend_to_concat`, appends WAV data, then publishes to `queue.concat_to_backend`.
6. Backend marks concat done, checks next chunk, emits Socket.IO events when *both* statuses are `done`.

---

## Local Development

### Manual Start (Without Docker Compose)

1. Start Redis (`redis-server`) and Postgres (or Docker containers) manually.
2. **Backend** – `cd services/backend && npm run dev` (must be first).
3. Processing – `cd services/processing && npm run start`.
4. Concat – `cd services/concat && npm run start`.
5. Frontend – `cd services/frontend && npm run dev`.
6. When ready, Fake-Zoom – `cd services/fake-zoom && npm run start`.

Environment variables live in each service's `.env` or `env` file (see `services/frontend/env` for example). **Those files are committed only for demonstration purposes** – update them or create your own `.env` files (never commit secrets) for any real deployment. Defaults assume `redis://localhost:6379` and `postgres://postgres:postgres@localhost:5432/postgres`.

---

## Troubleshooting

* **Double `audio_update` events** → ensure only one concat queue entry per chunk (fixed in `services/backend/src/consumers/queueConsumer.ts`).
* **No transcripts** → check `processing` service logs; Redis stream names must match those in `common/constants.ts`.
* **Audio stutters** → concatenation is naive (writes whole file each time); try increasing chunk size or using a smarter ffmpeg strategy.

---

## License

MIT – have fun hacking on this demo! 