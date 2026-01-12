import os
import logging
from app import create_app

app = create_app()

if __name__ == "__main__":
    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_RUN_PORT', '5000'))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() in ('1', 'true', 'yes')
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Starting Flask app on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)
