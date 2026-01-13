import pytest
import bcrypt
from jose import jwt
from datetime import datetime, timedelta
import os


def get_password_hash(password: str) -> str:
    """Хеширование пароля (копия из app.auth)"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля (копия из app.auth)"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Создание JWT токена (копия из app.auth)"""
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def test_password_hashing():
    """Тест хеширования паролей"""
    password = "testpassword123"
    hashed = get_password_hash(password)
    
   
    assert verify_password(password, hashed) == True
    
    
    assert verify_password("wrongpassword", hashed) == False
    

    assert verify_password("", hashed) == False

def test_create_access_token():
    """Тест создания JWT токена"""
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM = "HS256"
    
    data = {"sub": "123", "role": "user"}
    token = create_access_token(data)
    
    assert isinstance(token, str)
    assert len(token) > 0
    

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "123"
    assert payload["role"] == "user"
    assert "exp" in payload

def test_password_hash_uniqueness():
    """Тест уникальности хешей"""
    password = "samepassword"
    hash1 = get_password_hash(password)
    hash2 = get_password_hash(password)
    

    assert hash1 != hash2
    

    assert verify_password(password, hash1) == True
    assert verify_password(password, hash2) == True

def test_token_expiration():
    """Тест истечения срока токена"""
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM = "HS256"
    
 
    data = {"sub": "456"}
    token = create_access_token(data, expires_delta=timedelta(minutes=-1))
    
   
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def test_special_characters_in_password():
    """Тест паролей со спецсимволами"""
    special_passwords = [
        "test@123#",
        "пароль123",  
        "  spaces  ",
        "test\nnewline",
        "test\ttab",
    ]
    
    for password in special_passwords:
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) == True
        assert verify_password(password + "wrong", hashed) == False

if __name__ == "__main__":
    pytest.main([__file__, "-v"])