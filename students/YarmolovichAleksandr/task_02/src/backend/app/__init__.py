from flask import Flask
from .config import Config
from .extensions import db, migrate, jwt, ma, api


def create_app(config_object: str | None = None):
    app = Flask(__name__)
    app.config.from_object(Config)

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    ma.init_app(app)

    @jwt.unauthorized_loader
    def unauthorized_callback(err):
        return {'status': 'error', 'error': {'code': 'unauthorized', 'message': 'Missing or invalid authorization header'}}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(err):
        return {'status': 'error', 'error': {'code': 'invalid_token', 'message': 'Invalid or expired token'}}, 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'status': 'error', 'error': {'code': 'expired_token', 'message': 'Token has expired'}}, 401

    @app.errorhandler(401)
    def handle_unauthorized(e):
        return {'status': 'error', 'error': {'code': 'unauthorized', 'message': 'Unauthorized'}}, 401

    @app.errorhandler(403)
    def handle_forbidden(e):
        return {'status': 'error', 'error': {'code': 'forbidden', 'message': 'Forbidden'}}, 403

    @app.errorhandler(404)
    def handle_not_found(e):
        return {'status': 'error', 'error': {'code': 'not_found', 'message': 'Not found'}}, 404

    # frontend blueprint FIRST (highest priority)
    from .frontend import bp as frontend_bp
    if 'frontend' not in app.blueprints:
        app.register_blueprint(frontend_bp)

    # init API (won't conflict with frontend)
    api.init_app(app)

    # register API namespaces
    from . import routes
    routes.init_app(app)

    return app