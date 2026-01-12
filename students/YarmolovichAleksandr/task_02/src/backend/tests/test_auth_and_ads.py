def test_register_and_login(client):
    # register
    r = client.post('/auth/register', json={'username':'testuser','email':'t@example.com','password':'pass'})
    assert r.status_code == 201
    # login
    r = client.post('/auth/login', json={'email':'t@example.com','password':'pass'})
    assert r.status_code == 200
    data = r.get_json()
    assert data['status']=='ok'
    assert 'accessToken' in data['data']


def test_create_category_and_ad(client):
    # create admin
    client.post('/auth/register', json={'username':'admin','email':'admin@example.com','password':'adminpass'})
    # manually set role to admin
    from app.models import User, Category
    from app.extensions import db
    admin = User.query.filter_by(email='admin@example.com').first()
    admin.role = 'admin'
    db.session.commit()
    # login
    r = client.post('/auth/login', json={'email':'admin@example.com','password':'adminpass'})
    token = r.get_json()['data']['accessToken']
    headers = {'Authorization':f'Bearer {token}'}
    # create category
    r = client.post('/categories', json={'name':'Toys'}, headers=headers)
    assert r.status_code == 201
    cat_id = r.get_json()['data']['id']
    # create regular user
    client.post('/auth/register', json={'username':'alice','email':'alice@example.com','password':'apass'})
    r = client.post('/auth/login', json={'email':'alice@example.com','password':'apass'})
    token2 = r.get_json()['data']['accessToken']
    headers2 = {'Authorization':f'Bearer {token2}'}
    # create ad
    r = client.post('/ads', json={'title':'Toy car','description':'Nice','price':10,'category_id':cat_id}, headers=headers2)
    assert r.status_code == 201
    data = r.get_json()
    assert data['status']=='ok'