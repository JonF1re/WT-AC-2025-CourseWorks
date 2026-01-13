from flask_restx import Namespace, Resource, fields
from flask import request
from .models import Category
from .extensions import db
from .utils import role_required
from flask_jwt_extended import jwt_required

ns = Namespace('categories', description='Category operations')

category_model = ns.model('Category', {
    'id': fields.String(readOnly=True),
    'name': fields.String(required=True),
    'parent_id': fields.String()
})


@ns.route('')
class CategoryList(Resource):
    def get(self):
        cats = Category.query.all()
        data = [{'id': c.id, 'name': c.name, 'parent_id': c.parent_id} for c in cats]
        return {'status': 'ok', 'data': data}

    @ns.expect(category_model)
    @jwt_required()
    @role_required(['admin'])
    def post(self):
        data = request.json
        if not data.get('name'):
            return {'status': 'error', 'error': {'code': 'validation_failed', 'message': 'Введите название категории.'}}, 400
        cat = Category(name=data['name'], parent_id=data.get('parent_id'))
        db.session.add(cat)
        db.session.commit()
        return {'status': 'ok', 'data': {'id': cat.id, 'name': cat.name}}, 201


@ns.route('/<string:id>')
class CategoryItem(Resource):
    def get(self, id):
        c = Category.query.get_or_404(id)
        return {'status': 'ok', 'data': {'id': c.id, 'name': c.name, 'parent_id': c.parent_id}}

    @ns.expect(category_model)
    @jwt_required()
    @role_required(['admin'])
    def put(self, id):
        c = Category.query.get_or_404(id)
        data = request.json
        c.name = data.get('name', c.name)
        c.parent_id = data.get('parent_id', c.parent_id)
        db.session.commit()
        return {'status': 'ok', 'data': {'id': c.id, 'name': c.name}}

    @jwt_required()
    @role_required(['admin'])
    def delete(self, id):
        c = Category.query.get_or_404(id)
        db.session.delete(c)
        db.session.commit()
        return {'status': 'ok'}