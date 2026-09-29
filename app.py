"""Aplikasi Flask membership gym."""
from flask import Flask

from gym.api import api_bp
from gym.checkin import checkin_bp
from gym.db import init_db
from gym.membership import membership_bp


def create_app() -> Flask:
    app = Flask(__name__)
    init_db()
    app.register_blueprint(api_bp)
    app.register_blueprint(membership_bp)
    app.register_blueprint(checkin_bp)

    @app.get("/")
    def index():
        return "Membership Gym API — UI menyusul di F4"

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=False)
