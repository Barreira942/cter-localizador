from flask import Flask, render_template, request, jsonify
import time

app = Flask(__name__)
locations = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/update_location", methods=["POST"])
def update_location():
    data = request.json
    user = data["user"]
    lat = data["lat"]
    lon = data["lon"]
    locations[user] = {
        "lat": lat,
        "lon": lon,
        "timestamp": time.time()
    }
    return jsonify(success=True)

@app.route("/get_locations")
def get_locations():
    return jsonify(locations)

@app.route("/remove_user", methods=["POST"])
def remove_user():
    data = request.json
    user = data["user"]
    if user in locations:
        del locations[user]
    return jsonify(success=True)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
