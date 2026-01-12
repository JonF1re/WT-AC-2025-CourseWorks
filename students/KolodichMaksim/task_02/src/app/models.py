from .extensions import db
from datetime import datetime, date


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    metrics = db.relationship('Metric', backref='user', lazy=True, cascade='all, delete-orphan')


class Metric(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    unit = db.Column(db.String(40), nullable=True)
    target_value = db.Column(db.Float, nullable=True)
    color = db.Column(db.String(20), nullable=True)

    goals = db.relationship('Goal', backref='metric', lazy=True, cascade='all, delete-orphan')
    entries = db.relationship('Entry', backref='metric', lazy=True, cascade='all, delete-orphan')


class Goal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    metric_id = db.Column(db.Integer, db.ForeignKey('metric.id'), nullable=False)
    target_value = db.Column(db.Float, nullable=False)
    period = db.Column(db.String(20), nullable=False)  # daily/weekly/monthly
    start_date = db.Column(db.Date, nullable=False, default=date.today)
    end_date = db.Column(db.Date, nullable=True)


class Entry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    metric_id = db.Column(db.Integer, db.ForeignKey('metric.id'), nullable=False, index=True)
    value = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today, index=True)
    note = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
