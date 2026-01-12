from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import User
from .extensions import db
from .utils import role_required

ns = Namespace('users', description='User operations')

user_model = ns.model('User', {
    'id': fields.String(readOnly=True),
    'username': fields.String(required=True),
    'email': fields.String(required=True),
    'role': fields.String()
})


@ns.route('')
class UserList(Resource):
    @jwt_required()
    @role_required(['admin'])
    def get(self):
        users = User.query.all()
        data = [{'id': u.id, 'username': u.username, 'email': u.email, 'role': u.role} for u in users]
        return {'status': 'ok', 'data': data}


@ns.route('/<string:id>')
class UserItem(Resource):
    @jwt_required()
    def get(self, id):
        current = get_jwt_identity()
        if current != id:
            # only admin can access others
            claims = None
            try:
                from flask_jwt_extended import get_jwt
                claims = get_jwt()
            except Exception:
                pass
            if not claims or claims.get('role') != 'admin':
                return {'status': 'error', 'error': {'code': 'forbidden', 'message': 'Admin or self only'}}, 403
        u = User.query.get_or_404(id)
        return {'status': 'ok', 'data': {'id': u.id, 'username': u.username, 'email': u.email, 'role': u.role}}

    @jwt_required()
    def put(self, id):
        current = get_jwt_identity()
        claims = None
        try:
            from flask_jwt_extended import get_jwt
            claims = get_jwt()
        except Exception:
            pass
        if current != id:
            if not claims or claims.get('role') != 'admin':
                return {'status': 'error', 'error': {'code': 'forbidden', 'message': 'Admin or self only'}}, 403
        data = ns.payload or {}
        u = User.query.get_or_404(id)
        u.username = data.get('username', u.username)
        u.email = data.get('email', u.email)
        # allow admin to change role
        if claims and claims.get('role') == 'admin' and 'role' in data:
            u.role = data.get('role', u.role)
        db.session.commit()
        return {'status': 'ok', 'data': {'id': u.id, 'username': u.username, 'email': u.email, 'role': u.role}}

    @jwt_required()
    @role_required(['admin'])
    def delete(self, id):
        u = User.query.get_or_404(id)
        db.session.delete(u)
        db.session.commit()
        return {'status': 'ok'}