# Task API

## Run locally

1. Install dependencies with `npm install`.
2. Start the backend with `npm run dev`.
3. Start the Angular app from `frontend/` with `npm start`.

The API reads `PORT` and `JWT_SECRET` from `.env`. If `JWT_SECRET` is not set, the app falls back to the current default secret.

## Real-time task events

The backend now exposes an authenticated WebSocket endpoint at `/ws/tasks`.

- Authentication: pass the same JWT used for the REST API as the `token` query parameter.
- Event `task.updated`: emitted when a task is modified. The payload includes the full populated task document.
- Event `task.deleted`: emitted when a task is deleted or when an assignee loses access after reassignment. The payload includes `taskId`.

Example connection:

```text
ws://localhost:3000/ws/tasks?token=<jwt>
```

The Angular dashboard subscribes to these events and updates the task list in place, so task edits and deletions appear without a manual refresh.
