from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def role_required(roles):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get('role')
            if role not in roles:
                return {'status': 'error', 'error': {'code': 'forbidden', 'message': 'Insufficient permissions'}}, 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper