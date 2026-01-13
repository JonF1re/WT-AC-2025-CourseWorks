from flask import Blueprint, render_template, send_from_directory, current_app
import os

static_folder = os.path.join(os.path.dirname(__file__), 'static')
template_folder = os.path.join(os.path.dirname(__file__), 'templates')
bp = Blueprint('frontend', __name__, template_folder=template_folder, static_folder=static_folder, static_url_path='/static')

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/login')
def login():
    return render_template('login.html')

@bp.route('/register')
def register():
    return render_template('register.html')

@bp.route('/ads/new')
def create_ad():
    return render_template('create_ad.html')

@bp.route('/ads/<id>')
def ad_detail(id):
    return render_template('ad_detail.html', ad_id=id)

@bp.route('/ads/<id>/edit')
def ad_edit(id):
    return render_template('edit_ad.html', ad_id=id)

@bp.route('/conversations')
def conversations():
    return render_template('conversations.html')

@bp.route('/reports')
def reports():
    return render_template('reports.html')

@bp.route('/my-ads')
def my_ads():
    return render_template('my_ads.html')

@bp.route('/profile')
def profile():
    return render_template('profile.html')

@bp.route('/moderator')
def moderator():
    return render_template('moderator.html')

@bp.route('/admin')
def admin():
    return render_template('admin.html')

# Serve uploaded files
@bp.route('/uploads/<path:filename>')
def uploads(filename):
    uploads_dir = os.path.join(current_app.root_path, '..', 'uploads')
    return send_from_directory(uploads_dir, filename)