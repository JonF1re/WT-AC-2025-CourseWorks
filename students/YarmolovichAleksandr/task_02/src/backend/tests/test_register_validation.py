def test_register_missing_fields(client):
    r = client.post('/auth/register', json={})
    assert r.status_code == 400
    data = r.get_json()
    assert data['status'] == 'error'
    assert data['error']['code'] == 'validation_failed'