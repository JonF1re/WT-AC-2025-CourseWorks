# Ads API (Coursework)

This is a Flask-based API for the coursework "Ad board" (Variant 8).

Quick start:

- Create virtualenv: `python -m venv .venv` and `source .venv/Scripts/activate` (Windows)
- Install deps: `pip install -r requirements.txt`
- Copy `.env.example` to `.env` and adjust if necessary
- Initialize DB & migrations:
  - `flask db init` (first time)
  - `flask db migrate -m "Initial"`
  - `flask db upgrade`
- Run: `python run.py`

Endpoints:
- `GET /` health
- OpenAPI docs: `/docs`

How to run:
- Create virtualenv: `python -m venv .venv` and activate: `.\.venv\Scripts\activate` (Windows)
- Install: `pip install -r requirements.txt`
- Initialize DB and seed demo data:
  - `python scripts/init_db.py`
  - `python scripts/seed_demo_data.py`
- Run: `python run.py`

Tests:
- Run `pytest` from `backend/`

Acceptance criteria (MVP):
- User can create an Ad and include required fields ✅
- User can upload images for their Ad ✅
- User can open Ad and start a conversation (chat) ✅
- User can submit a Report for an Ad ✅
- Moderator/Admin can change Report status and block Ad ✅
- Regular users cannot edit or delete others' Ads ✅

Notes:
- API follows response format: `{status: "ok"|"error", data?, error?}`
- Pagination: `limit` and `offset` supported on list endpoints
- Auth: `Authorization: Bearer <accessToken>`

Planned extras:
- Postman collection / small UI (optional)
- WebSocket notifications (bonus)

Frontend:
- Basic server-rendered UI with Jinja2 templates and Bootstrap under `app/templates` and `app/static`.
- Pages: home (ads list), ad detail, create ad, login/register, conversations, reports, admin.
- Client-side JS in `/static/js/app.js` handles auth and API requests using JWT stored in localStorage.
