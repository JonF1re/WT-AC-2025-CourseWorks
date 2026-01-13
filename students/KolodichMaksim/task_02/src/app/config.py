import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    ENV = os.getenv('FLASK_ENV', 'production')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///data.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    FRONTEND_ORIGINS = os.getenv('FRONTEND_ORIGINS', 'http://localhost:5000')
