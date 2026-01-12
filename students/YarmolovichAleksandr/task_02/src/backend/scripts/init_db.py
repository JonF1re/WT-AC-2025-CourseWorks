import sys
from pathlib import Path
# ensure project root is on sys.path so this script can be run directly
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import create_app
from app.extensions import db
from app.models import User, Category, Ad
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    print('Creating database tables...')
    db.create_all()

    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', email='admin@example.com', password_hash=generate_password_hash('adminpass'), role='admin')
        mod = User(username='moderator', email='mod@example.com', password_hash=generate_password_hash('modpass'), role='moderator')
        user1 = User(username='alice', email='alice@example.com', password_hash=generate_password_hash('alicepass'), role='user')
        user2 = User(username='bob', email='bob@example.com', password_hash=generate_password_hash('bobpass'), role='user')
        db.session.add_all([admin, mod, user1, user2])

    if not Category.query.first():
        cat1 = Category(name='Electronics')
        cat2 = Category(name='Books')
        db.session.add_all([cat1, cat2])

    db.session.commit()
    print('Done.')