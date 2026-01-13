from flask_restx import Namespace, Resource, fields
from flask import request, current_app, url_for
from .models import Ad, Media
from .extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .utils import role_required
import os

ns = Namespace('ads', description='Ads operations')

ad_model = ns.model('Ad', {
    'title': fields.String(required=True),
    'description': fields.String(required=True),
    'price': fields.Float(required=True),
    'category_id': fields.String(required=True),
    'location': fields.String()
})


@ns.route('')
class AdsList(Resource):
    def get(self):
        author_id = request.args.get('authorId')
        current_user = None
        try:
            claims = get_jwt()
            if claims:
                current_user = claims.get('sub')
        except:
            current_user = None
        
        if author_id and (author_id == current_user):
            q = Ad.query.filter_by(author_id=author_id)
        else:
            q = Ad.query.filter(Ad.status.in_(['active']))
        
        category_id = request.args.get('categoryId')
        query = request.args.get('query')
        price_from = request.args.get('price_from', type=float)
        price_to = request.args.get('price_to', type=float)
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        if category_id:
            q = q.filter_by(category_id=category_id)
        if query:
            q = q.filter(Ad.title.ilike(f"%{query}%"))
        if price_from is not None:
            q = q.filter(Ad.price >= price_from)
        if price_to is not None:
            q = q.filter(Ad.price <= price_to)
        if author_id and author_id != current_user:
            q = q.filter_by(author_id=author_id)

        items = q.limit(limit).offset(offset).all()
        data = []
        for a in items:
            images = [m.url for m in a.media]
            data.append({'id': a.id, 'title': a.title, 'price': float(a.price), 'status': a.status, 'author_id': a.author_id, 'author_username': getattr(a.author, 'username', None), 'images': images})
        return {'status': 'ok', 'data': data}

    @jwt_required()
    def post(self):
        data = request.json
        current_user = get_jwt_identity()
        # basic validation per spec
        if not data.get('title') or len(data.get('title')) < 1:
            return {'status': 'error', 'error': {'code': 'validation_failed', 'message': 'Введите заголовок.'}}, 400
        if not data.get('category_id'):
            return {'status': 'error', 'error': {'code': 'validation_failed', 'message': 'Укажите категорию.'}}, 400
        ad = Ad(author_id=current_user, category_id=data['category_id'], title=data['title'], description=data.get('description',''), price=data.get('price',0), location=data.get('location'))
        db.session.add(ad)
        db.session.commit()
        return {'status': 'ok', 'data': {'id': ad.id}}, 201


@ns.route('/<string:id>')
class AdItem(Resource):
    def get(self, id):
        a = Ad.query.get_or_404(id)
        if a.status in ('banned', 'closed'):
            current_user = None
            claims = get_jwt()
            if claims:
                current_user = claims.get('sub')
            if current_user != a.author_id and not (claims and claims.get('role') in ('admin', 'moderator')):
                return {'status': 'error', 'error': {'code': 'not_found', 'message': 'Ad not found'}}, 404
        category = a.category
        images = [m.url for m in a.media]
        return {'status': 'ok', 'data': {'id': a.id, 'title': a.title, 'description': a.description, 'price': float(a.price), 'status': a.status, 'author_id': a.author_id, 'author_username': getattr(a.author, 'username', None), 'created_at': a.created_at.isoformat(), 'location': a.location, 'category_id': a.category_id, 'category_name': getattr(category, 'name', 'Unknown'), 'images': images}}

    @jwt_required()
    def put(self, id):
        a = Ad.query.get_or_404(id)
        current = get_jwt_identity()
        claims = get_jwt()
        if current != a.author_id and claims.get('role') not in ('admin', 'moderator'):
            return {'status': 'error', 'error': {'code':'forbidden','message':'Not allowed'}}, 403
        data = request.json
        a.title = data.get('title', a.title)
        a.description = data.get('description', a.description)
        a.price = data.get('price', a.price)
        a.location = data.get('location', a.location)
        a.status = data.get('status', a.status)
        db.session.commit()
        return {'status': 'ok', 'data': {'id': a.id}}

    @jwt_required()
    def delete(self, id):
        a = Ad.query.get_or_404(id)
        current = get_jwt_identity()
        claims = get_jwt()
        if current != a.author_id and claims.get('role') not in ('admin', 'moderator'):
            return {'status': 'error', 'error': {'code':'forbidden','message':'Not allowed'}}, 403
        db.session.delete(a)
        db.session.commit()
        return {'status': 'ok'}


@ns.route('/<string:id>/media')
class AdMedia(Resource):
    @ns.doc(consumes=['multipart/form-data'])
    @jwt_required()
    def post(self, id):
        a = Ad.query.get_or_404(id)
        current = get_jwt_identity()
        if current != a.author_id and get_jwt().get('role') not in ('admin','moderator'):
            return {'status':'error','error':{'code':'forbidden','message':'Not allowed'}},403
        if 'file' not in request.files:
            return {'status':'error','error':{'code':'validation_failed','message':'No file provided'}},400
        file = request.files['file']
        uploads_dir = os.path.join(current_app.root_path, '..', 'uploads')
        os.makedirs(uploads_dir, exist_ok=True)
        filename = f"{id}_{file.filename}"
        path = os.path.join(uploads_dir, filename)
        file.save(path)
        url_path = f"/uploads/{filename}"
        m = Media(ad_id=id, url=url_path, type='image')
        db.session.add(m)
        db.session.commit()
        return {'status':'ok','data':{'id':m.id,'url':m.url}},201

    def get(self, id):
        # list media for ad
        items = Media.query.filter_by(ad_id=id).all()
        data = [{'id': m.id, 'url': m.url, 'type': m.type} for m in items]
        return {'status': 'ok', 'data': data}