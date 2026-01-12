from flask import Blueprint
from flask_restx import Resource, Namespace
from .extensions import api
from .auth import ns as auth_ns
from .categories import ns as categories_ns
from .users import ns as users_ns

bp = Blueprint('api', __name__)
ns = Namespace('health', description='Health checks')

@ns.route('')
class Health(Resource):
    def get(self):
        return {'status': 'ok', 'data': {'app': 'ads-api'}}


def init_app(app):
    api.add_namespace(ns, path='/api/health')
    api.add_namespace(auth_ns, path='/api/auth')
    api.add_namespace(categories_ns, path='/api/categories')
    api.add_namespace(users_ns, path='/api/users')
    from .ads import ns as ads_ns
    from .media import ns as media_ns
    api.add_namespace(ads_ns, path='/api/ads')
    api.add_namespace(media_ns, path='/api/media')
    from .conversations import ns as conv_ns
    api.add_namespace(conv_ns, path='/api/conversations')
    from .reports import ns as reports_ns
    api.add_namespace(reports_ns, path='/api/reports')
    app.register_blueprint(bp)