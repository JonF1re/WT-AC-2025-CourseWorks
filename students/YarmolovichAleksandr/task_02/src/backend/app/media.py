from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .models import Media
from .extensions import db
from flask import current_app
import os

ns = Namespace('media', description='Media operations')


@ns.route('/<string:id>')
class MediaItem(Resource):
    @jwt_required()
    def delete(self, id):
        m = Media.query.get_or_404(id)
        # who can delete: author (of ad), moderator, admin
        ad = m.ad
        current = get_jwt_identity()
        claims = get_jwt()
        if current != ad.author_id and claims.get('role') not in ('admin','moderator'):
            return {'status':'error','error':{'code':'forbidden','message':'Not allowed'}},403
        # try remove file
        uploads_dir = os.path.join(current_app.root_path, '..', 'uploads')
        filename = m.url.split('/')[-1]
        try:
            os.remove(os.path.join(uploads_dir, filename))
        except Exception:
            pass
        db.session.delete(m)
        db.session.commit()
        return {'status':'ok'}