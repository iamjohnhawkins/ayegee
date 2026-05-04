# Local Postgres with Docker

## Prerequisites

[Install Docker Desktop](https://www.docker.com/products/docker-desktop/) and make sure it is running.

## Start the database

```bash
docker run -d \
  --name ayegee-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ayegee \
  -p 5432:5432 \
  postgres:15
```

This starts a Postgres 15 container in the background and exposes it on port 5432.

## Configure the app

Copy `.env.example` to `.env` and set the database variables:

```bash
cp .env.example .env
```

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=ayegee
```

## Start the app

```bash
npm run dev
```

The app will connect to the database and run migrations automatically on startup.

## Useful Docker commands

| Command | Description |
|---------|-------------|
| `docker stop ayegee-db` | Stop the container |
| `docker start ayegee-db` | Start it again after a reboot |
| `docker rm -f ayegee-db` | Delete the container entirely |
| `docker logs ayegee-db` | View Postgres logs |
| `docker exec -it ayegee-db psql -U postgres -d ayegee` | Open a psql shell |

## Notes

- Data persists inside the container between restarts. If you delete the container with `docker rm`, all data is lost.
- To persist data across container deletions, add a volume: append `-v ayegee-db-data:/var/lib/postgresql/data` to the `docker run` command.
