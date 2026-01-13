from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Metric, Entry, Goal
from datetime import datetime, date

api_bp = Blueprint('api', __name__)


@api_bp.route('/metrics', methods=['GET'])
@jwt_required()
def list_metrics():
    user_id = int(get_jwt_identity())
    metrics = Metric.query.filter_by(user_id=user_id).all()
    data = [
        {'id': m.id, 'name': m.name, 'unit': m.unit, 'target_value': m.target_value, 'color': m.color}
        for m in metrics
    ]
    return jsonify(data)


@api_bp.route('/metrics', methods=['POST'])
@jwt_required()
def create_metric():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'msg': 'name required'}), 400
    m = Metric(user_id=user_id, name=name, unit=data.get('unit'), target_value=data.get('target_value'), color=data.get('color'))
    db.session.add(m)
    db.session.commit()
    return jsonify({'id': m.id, 'name': m.name}), 201


@api_bp.route('/metrics/<int:mid>', methods=['GET'])
@jwt_required()
def get_metric(mid):
    user_id = int(get_jwt_identity())
    m = Metric.query.filter_by(id=mid, user_id=user_id).first_or_404()
    return jsonify({'id': m.id, 'name': m.name, 'unit': m.unit, 'target_value': m.target_value, 'color': m.color})


@api_bp.route('/metrics/<int:mid>', methods=['PUT'])
@jwt_required()
def update_metric(mid):
    user_id = int(get_jwt_identity())
    m = Metric.query.filter_by(id=mid, user_id=user_id).first_or_404()
    data = request.get_json() or {}
    m.name = data.get('name', m.name)
    m.unit = data.get('unit', m.unit)
    m.target_value = data.get('target_value', m.target_value)
    m.color = data.get('color', m.color)
    db.session.commit()
    return jsonify({'msg': 'updated'})


@api_bp.route('/metrics/<int:mid>', methods=['DELETE'])
@jwt_required()
def delete_metric(mid):
    user_id = int(get_jwt_identity())
    m = Metric.query.filter_by(id=mid, user_id=user_id).first_or_404()
    db.session.delete(m)
    db.session.commit()
    return jsonify({'msg': 'deleted'})


@api_bp.route('/metrics/<int:mid>/entries', methods=['GET'])
@jwt_required()
def entries_for_metric(mid):
    user_id = int(get_jwt_identity())
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    m = Metric.query.filter_by(id=mid, user_id=user_id).first_or_404()
    q = Entry.query.filter_by(metric_id=m.id)
    if date_from:
        q = q.filter(Entry.date >= datetime.fromisoformat(date_from).date())
    if date_to:
        q = q.filter(Entry.date <= datetime.fromisoformat(date_to).date())
    entries = q.order_by(Entry.date.desc()).all()
    data = [
        {'id': e.id, 'value': e.value, 'date': e.date.isoformat(), 'note': e.note}
        for e in entries
    ]
    return jsonify(data)


@api_bp.route('/entries', methods=['POST'])
@jwt_required()
def create_entry():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    metric_id = data.get('metric_id')
    value = data.get('value')
    date_s = data.get('date')
    if not metric_id or value is None:
        return jsonify({'msg': 'metric_id and value required'}), 400
    m = Metric.query.filter_by(id=metric_id, user_id=user_id).first_or_404()
    d = date.fromisoformat(date_s) if date_s else date.today()
    e = Entry(metric_id=m.id, value=value, date=d, note=data.get('note'))
    db.session.add(e)
    db.session.commit()
    return jsonify({'id': e.id, 'value': e.value, 'date': e.date.isoformat()}), 201


@api_bp.route('/entries/<int:eid>', methods=['PUT'])
@jwt_required()
def update_entry(eid):
    user_id = int(get_jwt_identity())
    e = Entry.query.get_or_404(eid)
    # ensure owner
    if e.metric.user_id != user_id:
        return jsonify({'msg': 'not found'}), 404
    data = request.get_json() or {}
    e.value = data.get('value', e.value)
    if data.get('date'):
        e.date = date.fromisoformat(data.get('date'))
    e.note = data.get('note', e.note)
    db.session.commit()
    return jsonify({'msg': 'updated'})


@api_bp.route('/entries/<int:eid>', methods=['DELETE'])
@jwt_required()
def delete_entry(eid):
    user_id = int(get_jwt_identity())
    e = Entry.query.get_or_404(eid)
    if e.metric.user_id != user_id:
        return jsonify({'msg': 'not found'}), 404
    db.session.delete(e)
    db.session.commit()
    return jsonify({'msg': 'deleted'})


@api_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """Return a simple summary for today for each metric: total value and progress to target"""
    user_id = int(get_jwt_identity())
    today = date.today()
    metrics = Metric.query.filter_by(user_id=user_id).all()
    data = []
    for m in metrics:
        total = sum(e.value for e in m.entries if e.date == today)
        target = m.target_value or None
        progress = (total / target) if target else None
        data.append({'id': m.id, 'name': m.name, 'unit': m.unit, 'total_today': total, 'target': target, 'progress': progress})
    return jsonify({'date': today.isoformat(), 'metrics': data})


@api_bp.route('/reports', methods=['GET'])
@jwt_required()
def reports():
    user_id = int(get_jwt_identity())
    metric_id = request.args.get('metric_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    if not metric_id:
        return jsonify({'msg': 'metric_id required'}), 400
    m = Metric.query.filter_by(id=metric_id, user_id=user_id).first_or_404()
    q = Entry.query.filter_by(metric_id=m.id)
    if date_from:
        q = q.filter(Entry.date >= date.fromisoformat(date_from))
    if date_to:
        q = q.filter(Entry.date <= date.fromisoformat(date_to))
    entries = q.order_by(Entry.date.asc()).all()
    data = [{'date': e.date.isoformat(), 'value': e.value} for e in entries]
    return jsonify({'metric': {'id': m.id, 'name': m.name, 'unit': m.unit}, 'entries': data})
