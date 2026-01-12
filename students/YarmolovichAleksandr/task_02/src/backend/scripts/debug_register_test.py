import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import create_app
from app.extensions import db

print('debug_register_test start')
app = create_app()
app.config['TESTING'] = True
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

with app.test_client() as client:
    with app.app_context():
        from app.models import User
    db.create_all()
    print('users before:', [(u.username,u.email) for u in User.query.all()])
    r = client.post('/auth/register', json={'username': 'alice', 'email': 'alice@example.com', 'password': 'pass'})
    print('status_code', r.status_code)
    try:
        print('json:', r.get_json())
    except Exception as e:
        print('no json', e)
