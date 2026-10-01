# Print Queue

A private 3D print request queue for friends, built with Next.js, NextAuth, shadcn/ui, SQLite, and Drizzle.

## Setup

1. Run `bun install`.
2. Copy `.env.example` to `.env`. Set `AUTH_SECRET` to a long random value (for example, `openssl rand -base64 32`). Set `DB_FILE_NAME` to a persistent SQLite path and `UPLOAD_DIR` to a persistent upload directory.
3. Run `bun run db:migrate`.
4. Run `bun run dev`, visit `/setup`, and create the first admin account before sharing the URL. The first successful submission claims the admin role; setup closes immediately afterward.

The admin creates friend accounts with temporary passwords. Friends change their password at first sign-in. The admin can reset a forgotten password. New print requests join the queue immediately; only the admin can change queue order and printing status.

## Persistent storage

Keep both the SQLite file and `UPLOAD_DIR` on persistent disk. Back up both together. Do not deploy the app with a writable ephemeral filesystem. Use a single app instance for this local SQLite queue.

Run behind a reverse proxy that passes the intended public host to the app. Auth.js trusts that host when forming authentication URLs.

## Checks

Run `bun run lint`, `bun run typecheck`, and `bun run build`.
