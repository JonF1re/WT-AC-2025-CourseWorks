from app import create_app
from app.extensions import db
from app.models import User, Category, Ad, Media

app = create_app()

with app.app_context():
    alice = User.query.filter_by(username='alice').first()
    electronics = Category.query.filter_by(name='Electronics').first()

    if alice and electronics and not Ad.query.filter_by(title='iPhone X - good condition').first():
        ad = Ad(author_id=alice.id, category_id=electronics.id, title='iPhone X - good condition', description='Used iPhone X, 64GB, works fine', price=250)
        db.session.add(ad)
        db.session.commit()
        m = Media(ad_id=ad.id, url='/uploads/iphone.jpg', type='image')
        db.session.add(m)
        db.session.commit()
        print('Seeded ad with media')
    else:
        print('Demo ad already exists or prerequisites missing')
