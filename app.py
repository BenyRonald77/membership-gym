"""Aplikasi Flask membership gym."""
from flask import Flask, render_template

from gym.api import api_bp
from gym.checkin import checkin_bp
from gym.classes import classes_bp
from gym.db import init_db
from gym.membership import membership_bp


def create_app() -> Flask:
    app = Flask(__name__)
    init_db()
    app.register_blueprint(api_bp)
    app.register_blueprint(membership_bp)
    app.register_blueprint(checkin_bp)
    app.register_blueprint(classes_bp)

    @app.get("/")
    def index():
        return render_template("checkin.html", aktif="checkin")

    @app.get("/member")
    def member():
        return render_template("member.html", aktif="member")

    @app.get("/kelas")
    def kelas():
        return render_template("kelas.html", aktif="kelas")

    @app.get("/laporan")
    def laporan():
        return render_template("laporan.html", aktif="laporan")

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=False)
