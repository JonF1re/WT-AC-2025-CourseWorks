from werkzeug.security import generate_password_hash
from app.extensions import db
from app.models import User, Ad, Category


def test_moderator_can_resolve_and_block(client, app):
    # create admin to add category
    client.post('/auth/register', json={'username':'admin','email':'admin2@example.com','password':'adminpass'})
    from app.models import User
    admin = User.query.filter_by(email='admin2@example.com').first()
    admin.role = 'admin'
    db.session.commit()
    r = client.post('/auth/login', json={'email':'admin2@example.com','password':'adminpass'})
    token = r.json['data']['accessToken']
    headers = {'Authorization': 'Bearer ' + token}
    # create category
    r = client.post('/categories', json={'name':'Electronics'}, headers=headers)
    cat_id = r.json['data']['id']

    # create user alice and ad
    client.post('/auth/register', json={'username':'alice','email':'alice2@example.com','password':'apass'})
    r = client.post('/auth/login', json={'email':'alice2@example.com','password':'apass'})
    token_alice = r.json['data']['accessToken']
    headers_alice = {'Authorization': 'Bearer ' + token_alice}
    r = client.post('/ads', json={'title':'Phone','description':'Good','price':100,'category_id':cat_id}, headers=headers_alice)
    ad_id = r.json['data']['id']

    # create bob and file report
    client.post('/auth/register', json={'username':'bob','email':'bob2@example.com','password':'bpass'})
    r = client.post('/auth/login', json={'email':'bob2@example.com','password':'bpass'})
    token_bob = r.json['data']['accessToken']
    headers_bob = {'Authorization': 'Bearer ' + token_bob}
    r = client.post('/reports', json={'adId': ad_id, 'reason': 'Spam'}, headers=headers_bob)
    assert r.status_code == 201
    report_id = r.json['data']['id']

    # create moderator
    client.post('/auth/register', json={'username':'mod','email':'mod2@example.com','password':'m'})
    mod = User.query.filter_by(email='mod2@example.com').first()
    mod.role = 'moderator'
    db.session.commit()
    r = client.post('/auth/login', json={'email':'mod2@example.com','password':'m'})
    token_mod = r.json['data']['accessToken']
    headers_mod = {'Authorization': 'Bearer ' + token_mod}

    # moderator fetches reports
    r = client.get('/reports', headers=headers_mod)
    assert r.status_code == 200
    assert any(x['id'] == report_id for x in r.json['data'])

    # moderator resolves and blocks ad
    r = client.put(f'/reports/{report_id}', json={'status':'resolved', 'block_ad': True}, headers=headers_mod)
    assert r.status_code == 200
    # ad should be banned
    r = client.get(f'/ads/{ad_id}')
    assert r.status_code == 200
    assert r.json['data']['status'] == 'banned'


def test_non_moderator_cannot_list_reports(client):
    # create regular user
    client.post('/auth/register', json={'username':'quick','email':'quick@example.com','password':'p'})
    r = client.post('/auth/login', json={'email':'quick@example.com','password':'p'})
    token = r.json['data']['accessToken']
    headers = {'Authorization': 'Bearer ' + token}
    r = client.get('/reports', headers=headers)
    assert r.status_code == 403
