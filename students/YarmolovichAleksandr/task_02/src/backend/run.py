from app import create_app

app = create_app()

# In debug/dev mode create DB tables automatically to ease local development
if app.debug:
    with app.app_context():
        from app.extensions import db
        db.create_all()

if __name__ == '__main__':
    app.run(debug=True)