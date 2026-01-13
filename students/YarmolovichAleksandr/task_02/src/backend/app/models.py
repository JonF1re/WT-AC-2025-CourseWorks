import uuid
from datetime import datetime
from .extensions import db


def gen_uuid():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    username = db.Column(db.String(80), nullable=False, unique=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')

    ads = db.relationship('Ad', backref='author', lazy=True)
    reports = db.relationship('Report', backref='reporter', lazy=True)


class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(120), nullable=False)
    parent_id = db.Column(db.String(36), db.ForeignKey('categories.id'), nullable=True)

    children = db.relationship('Category')


class Ad(db.Model):
    __tablename__ = 'ads'
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    author_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.String(36), db.ForeignKey('categories.id'), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric, nullable=False, default=0)
    location = db.Column(db.String(200))
    status = db.Column(db.String(20), nullable=False, default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    category = db.relationship('Category', backref='ads')
    media = db.relationship('Media', backref='ad', lazy=True)
    reports = db.relationship('Report', backref='ad', lazy=True)


class Media(db.Model):
    __tablename__ = 'media'
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ad_id = db.Column(db.String(36), db.ForeignKey('ads.id'), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(20))


class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ad_id = db.Column(db.String(36), db.ForeignKey('ads.id'))
    user1_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    user2_id = db.Column(db.String(36), db.ForeignKey('users.id'))

    messages = db.relationship('Message', backref='conversation', lazy=True)


class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    conversation_id = db.Column(db.String(36), db.ForeignKey('conversations.id'), nullable=False)
    author_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ad_id = db.Column(db.String(36), db.ForeignKey('ads.id'))
    reporter_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='new')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)