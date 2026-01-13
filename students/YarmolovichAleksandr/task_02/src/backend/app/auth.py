from flask_restx import Namespace, Resource, fields
from werkzeug.security import generate_password_hash, check_password_hash
from flask import request
from .models import User
from .extensions import db
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity

ns = Namespace('auth', description='Authentication')

register_model = ns.model('Register', {
    'username': fields.String(required=True),
    'email': fields.String(required=True),
    'password': fields.String(required=True)
})

login_model = ns.model('Login', {
    'email': fields.String(required=True),
    'password': fields.String(required=True)
})


@ns.route('/register')
class Register(Resource):
    @ns.expect(register_model)
    def post(self):
        data = request.json or {}
        # validate input
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return {'status': 'error', 'error': {'code': 'validation_failed', 'message': 'username, email and password are required'}}, 400
        try:
            exists = User.query.filter((User.username == data['username']) | (User.email == data['email'])).first()
        except Exception:
            return {'status': 'error', 'error': {'code': 'db_error', 'message': 'Database not initialized. Run scripts/init_db.py or start the app in debug to auto-create tables.'}}, 500
        if exists:
            return {'status': 'error', 'error': {'code': 'exists', 'message': 'User with that username or email already exists'}}, 400
        user = User(username=data['username'], email=data['email'], password_hash=generate_password_hash(data['password']), role='user')
        db.session.add(user)
        db.session.commit()
        return {'status': 'ok', 'data': {'id': user.id, 'email': user.email, 'username': user.username, 'role': user.role}}, 201


@ns.route('/login')
class Login(Resource):
    @ns.expect(login_model)
    def post(self):
        data = request.json
        try:
            user = User.query.filter_by(email=data['email']).first()
        except Exception as e:
            # likely DB not initialized
            return {'status': 'error', 'error': {'code': 'db_error', 'message': 'Database not initialized. Run scripts/init_db.py or start the app in debug to auto-create tables.'}}, 500
        if not user or not check_password_hash(user.password_hash, data['password']):
            return {'status': 'error', 'error': {'code': 'auth_failed', 'message': 'Invalid credentials'}}, 401
        additional_claims = {'role': user.role}
        access = create_access_token(identity=user.id, additional_claims=additional_claims)
        refresh = create_refresh_token(identity=user.id)
        return {'status': 'ok', 'data': {'accessToken': access, 'refreshToken': refresh, 'user': {'id': user.id, 'username': user.username, 'email': user.email, 'role': user.role}}}


@ns.route('/refresh')
class Refresh(Resource):
    @jwt_required(refresh=True)
    def post(self):
        identity = get_jwt_identity()
        user = User.query.get(identity)
        access = create_access_token(identity=identity, additional_claims={'role': user.role})
        return {'status': 'ok', 'data': {'accessToken': access}}