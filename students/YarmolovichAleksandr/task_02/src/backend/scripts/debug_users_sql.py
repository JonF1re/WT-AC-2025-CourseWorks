import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import create_app
from app.extensions import db

app = create_app()
app.config['TESTING'] = True
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

with app.app_context():
    db.create_all()
    from sqlalchemy import text
    res = db.session.execute(text('SELECT name FROM sqlite_master WHERE type="table"'))
    print('tables:', res.fetchall())
    try:
        rows = db.session.execute(text('SELECT id,username,email FROM users')).fetchall()
        print('users rows:', rows)
    except Exception as e:
        print('users query error:', e)
