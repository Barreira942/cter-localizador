from flask import Flask, render_template, request, jsonify
import time

app = Flask(__name__)
locations = {}
visibility = {}

@app.route("/")
def index():
    return render_template("index.html")

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
    if user in locations:
        del locations[user]
    if user in visibility:
        del visibility[user]
    return jsonify(success=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
