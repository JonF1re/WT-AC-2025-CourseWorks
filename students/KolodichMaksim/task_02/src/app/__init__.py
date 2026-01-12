from flask import Flask
from .config import Config
from .extensions import db, migrate, jwt, cors, talisman


def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(Config)

    # basic logging
    import logging
    logging.basicConfig(level=logging.INFO)

    # extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config.get('FRONTEND_ORIGINS')}})

    # Add JWT callbacks for clearer error messages and logging
    from flask import request, jsonify

    @jwt.unauthorized_loader
    def custom_unauthorized_response(err):
        app.logger.warning(f"JWT unauthorized: {err} path={request.path} auth={request.headers.get('Authorization')}")
        return jsonify({'msg': err}), 401

    @jwt.invalid_token_loader
    def custom_invalid_token(err):
        app.logger.warning(f"JWT invalid token: {err} path={request.path} auth={request.headers.get('Authorization')}")
        return jsonify({'msg': 'Invalid token'}), 422

    # disable force HTTPS redirects in development to avoid SSL errors when running locally or in Docker
    if app.config.get('ENV') == 'development':
        # avoid redirecting to HTTPS and do not set HSTS in development
        # Relax CSP in development to allow CDN assets and inline scripts used by templates
        csp = {
            'default-src': ["'self'"],
            'script-src': ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
            'style-src': ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:'],
            'connect-src': ["'self'"],
        }
        talisman.init_app(app, force_https=False, strict_transport_security=False, content_security_policy=csp)
    else:
        talisman.init_app(app)

    # debug endpoint for development to inspect Authorization header
    if app.config.get('ENV') == 'development':
        @app.route('/api/v1/debug/headers')
        def debug_headers():
            return jsonify({'Authorization': request.headers.get('Authorization')}), 200

    # blueprints
    from .auth.routes import auth_bp
    from .api.routes import api_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    # simple index route
    @app.route('/')
    def index():
        from flask import render_template
        return render_template('index.html')

    # explicit routes for client pages so direct /register.html etc. work
    @app.route('/register.html')
    def register_page():
        from flask import render_template
        return render_template('register.html')

    @app.route('/login.html')
    def login_page():
        from flask import render_template
        return render_template('login.html')

    @app.route('/dashboard.html')
    def dashboard_page():
        from flask import render_template
        return render_template('dashboard.html')

    @app.route('/metric.html')
    def metric_page():
        from flask import render_template
        return render_template('metric.html')

    # API-friendly error handlers
    from flask import request, jsonify, render_template

    @app.errorhandler(404)
    def not_found(err):
        if request.path.startswith('/api/'):
            return jsonify({'msg': 'not found'}), 404
        return render_template('index.html'), 404

    @app.errorhandler(500)
    def server_error(err):
        if request.path.startswith('/api/'):
            return jsonify({'msg': 'internal server error'}), 500
        return render_template('index.html'), 500

    return app
