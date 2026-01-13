from werkzeug.security import generate_password_hash
from app.extensions import db
from app.models import User


def test_admin_can_change_role(client, app):
    # create a normal user via register
    r = client.post('/auth/register', json={'username': 'alice', 'email': 'alice@example.com', 'password': 'pass'})
    assert r.status_code == 201
    user_id = r.json['data']['id']

    # create an admin directly in DB
    with app.app_context():
        admin = User(username='admin', email='admin@example.com', password_hash=generate_password_hash('adminpass'), role='admin')
        db.session.add(admin)
        db.session.commit()
        admin_email = admin.email

    # login as admin
    r = client.post('/auth/login', json={'email': admin_email, 'password': 'adminpass'})
    assert r.status_code == 200
    token = r.json['data']['accessToken']

    # admin sets role of alice to moderator
    res = client.put(f'/users/{user_id}', json={'role':'moderator'}, headers={'Authorization': 'Bearer ' + token})
    assert res.status_code == 200
    assert res.json['data']['role'] == 'moderator'


def test_non_admin_cannot_change_other_role(client):
    # register two normal users
    r1 = client.post('/auth/register', json={'username': 'u1', 'email': 'u1@example.com', 'password': 'p'})
    r2 = client.post('/auth/register', json={'username': 'u2', 'email': 'u2@example.com', 'password': 'p'})
    id1 = r1.json['data']['id']
    id2 = r2.json['data']['id']

    # login as u1
    r = client.post('/auth/login', json={'email': 'u1@example.com', 'password': 'p'})
    token = r.json['data']['accessToken']

    # u1 attempts to change u2 role -> forbidden
    res = client.put(f'/users/{id2}', json={'role':'admin'}, headers={'Authorization': 'Bearer ' + token})
    assert res.status_code == 403
    assert res.json['status'] == 'error'