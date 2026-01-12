from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db
from ..models import User, Metric
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'msg': 'email and password required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'msg': 'email already registered'}), 400

    u = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(u)
    db.session.commit()

    # seed some default metrics for convenience (ensure they are added to the session)
    defaults = [
        {'name': 'Вода', 'unit': 'ml', 'target_value': 2000, 'color': '#1EA7FF'},
        {'name': 'Сон', 'unit': 'hours', 'target_value': 8, 'color': '#6B7280'},
        {'name': 'Шаги', 'unit': 'steps', 'target_value': 10000, 'color': '#10B981'},
    ]
    created = []
    for m in defaults:
        mm = Metric(user_id=u.id, **m)
        db.session.add(mm)
        created.append({'id': mm.id, 'name': mm.name, 'unit': mm.unit, 'target_value': mm.target_value, 'color': mm.color})
    db.session.commit()

    token = create_access_token(identity=str(u.id))
    from flask import current_app
    current_app.logger.info(f"Registered user {u.email} token[:8]={token[:8]}")
    return jsonify({'access_token': token, 'user': {'id': u.id, 'email': u.email}, 'metrics': created}), 201


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    u = User.query.get_or_404(user_id)
    return jsonify({'id': u.id, 'email': u.email})


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'msg': 'email and password required'}), 400

    u = User.query.filter_by(email=email).first()
    if not u or not check_password_hash(u.password_hash, password):
        return jsonify({'msg': 'invalid credentials'}), 401

    token = create_access_token(identity=str(u.id))
    from flask import current_app
    current_app.logger.info(f"Login user {u.email} token[:8]={token[:8]}")
    return jsonify({'access_token': token, 'user': {'id': u.id, 'email': u.email}})
