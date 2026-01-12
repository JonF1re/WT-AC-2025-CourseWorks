# How to run (quickstart)

1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Copy `.env.example` to `.env` and set `JWT_SECRET_KEY` (Windows):

```bash
copy .env.example .env
```

1. Initialize database (quick method without migrations):

```bash
python init_db.py
```

1. Run the app:

```bash
python run.py
```

1. Open <http://localhost:5000> and register a user.

## Running in Docker

You can run the app in a container using Docker or docker-compose.

Build image and run container (docker):

```bash
docker build -t zoj-tracker .
docker run --env-file .env -p 5000:5000 -v $(pwd)/data.db:/app/data.db zoj-tracker
```

Or using docker-compose (recommended for development):

```bash
docker-compose up --build
```

The entrypoint will initialize the SQLite DB (`data.db`) automatically if it does not exist.

Notes:

- API endpoints are under `/api/v1`.
- Auth endpoints: `/api/v1/auth/register`, `/api/v1/auth/login`.
- Metrics/Entries/Dashboard/Reports: `/api/v1/metrics`, `/api/v1/entries`, `/api/v1/dashboard`, `/api/v1/reports`.

This repository contains a minimal frontend (static HTML + JS) and a Flask backend that implements the MVP specified in the README.
