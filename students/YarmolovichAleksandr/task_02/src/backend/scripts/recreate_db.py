import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import create_app
from app.extensions import db
import sqlite3

app = create_app()
with app.app_context():
    print('Using DB URL:', app.config['SQLALCHEMY_DATABASE_URI'])
    # show tables before
    con = sqlite3.connect(Path(app.instance_path)/'dev.db')
    cur = con.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    print('before tables:', cur.fetchall())
    con.close()

    print('Calling create_all()')
    db.create_all()

    con = sqlite3.connect(Path(app.instance_path)/'dev.db')
    cur = con.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    print('after tables:', cur.fetchall())
    con.close()