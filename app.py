from flask import Flask, render_template, request, jsonify
import time

app = Flask(__name__)

# Utilizadores registados
USERS = {
    "2090786": {"password": "2090786", "admin": True},
    "2071307": {"password": "2071307", "admin": True},
    "NAIIC": {"password": "NAIIC", "admin": True},
    "Joana": {"password": "joana456", "admin": False},
    "Rui": {"password": "rui123", "admin": False}
}

# Localizações, visibilidade e pendentes
locations = {}
visibility = {}
pending_users = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    user = data.get("user")
    password = data.get("password")

    if user in USERS and USERS[user]["password"] == password:
        return jsonify(success=True, admin=USERS[user]["admin"], pending=False)

    if user not in pending_users:
        pending_users[user] = {"password": password, "requested_at": time.time()}

    return jsonify(success=False, pending=True)

@app.route("/update_location", methods=["POST"])
def update_location():
    data = request.json
    user = data["user"]
    lat = data["lat"]
    lon = data["lon"]
    is_public = visibility.get(user, False)
    locations[user] = {
        "lat": lat,
        "lon": lon,
        "timestamp": time.time(),
        "public": is_public
    }
    return jsonify(success=True)

@app.route("/get_locations")
def get_locations():
    return jsonify(locations)

@app.route("/set_visibility", methods=["POST"])
def set_visibility():
    data = request.json
    user = data["user"]
    is_public = data["public"]
    visibility[user] = is_public
    if user in locations:
        locations[user]["public"] = is_public
    return jsonify(success=True)

@app.route("/remove_user", methods=["POST"])
def remove_user():
    data = request.json
    user = data["user"]
    locations.pop(user, None)
    visibility.pop(user, None)
    return jsonify(success=True)

@app.route("/get_pending_users")
def get_pending_users():
    return jsonify(list(pending_users.keys()))

@app.route("/approve_user", methods=["POST"])
def approve_user():
    data = request.json
    user = data["user"]
    if user in pending_users:
        USERS[user] = {"password": pending_users[user]["password"], "admin": False}
        del pending_users[user]
        return jsonify(success=True)
    return jsonify(success=False)

@app.route("/reject_user", methods=["POST"])
def reject_user():
    data = request.json
    user = data["user"]
    if user in pending_users:
        del pending_users[user]
        return jsonify(success=True)
    return jsonify(success=False)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
