import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
print('Running inspect_db')
from app import create_app
from app.extensions import db
app = create_app()
with app.app_context():
    print('DB URL:', str(db.engine.url))
    try:
        res = db.engine.execute("SELECT name FROM sqlite_master WHERE type='table'")
        print('tables:', res.fetchall())
    except Exception as e:
        print('error listing tables:', e)
    # check if users table exists
    try:
        print('users count:', db.session.execute('SELECT count(*) FROM users').scalar())
    except Exception as e:
        print('users table error:', e)
