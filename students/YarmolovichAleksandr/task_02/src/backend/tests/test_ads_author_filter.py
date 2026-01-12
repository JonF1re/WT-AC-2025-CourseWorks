def test_author_filter(client, app):
    # create a user and an ad
    client.post('/auth/register', json={'username':'author','email':'auth@example.com','password':'p'})
    r = client.post('/auth/login', json={'email':'auth@example.com','password':'p'})
    token = r.get_json()['data']['accessToken']
    headers = {'Authorization': 'Bearer ' + token}
    # create category
    client.post('/auth/register', json={'username':'admin2','email':'admin2@example.com','password':'admin'})
    from app.models import User, Category
    from app.extensions import db
    admin = User.query.filter_by(email='admin2@example.com').first()
    admin.role = 'admin'
    db.session.commit()
    r = client.post('/auth/login', json={'email':'admin2@example.com','password':'admin'})
    token_admin = r.get_json()['data']['accessToken']
    headers_admin = {'Authorization': 'Bearer ' + token_admin}
    r = client.post('/categories', json={'name':'Misc'}, headers=headers_admin)
    cat_id = r.get_json()['data']['id']

    # author creates an ad
    r = client.post('/ads', json={'title':'My item','description':'Ok','price':1,'category_id':cat_id}, headers=headers)
    ad_id = r.get_json()['data']['id']

    # fetch by author
    # sanity check: fetch by admin id
    r = client.get(f'/ads?authorId={admin.id}')
    assert r.status_code == 200
    # fetch by the author id (who created the ad)
    author = User.query.filter_by(email='auth@example.com').first()
    r = client.get(f'/ads?authorId={author.id}')
    assert r.status_code == 200
    data = r.get_json()
    assert any(a['id'] == ad_id for a in data['data'])