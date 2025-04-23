from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import os

app = Flask(__name__)
CORS(app)


API_ID = "11a6717c-63d2-4c36-a1e3-1955ce6a58d8"
API_SECRET = "8db221b9aea2fbe23365b1d86dd94b5a44684947d12ddad2703c5a13b916106d90e8f20b266a79e63b0fa68c99fae09a726413f29ac370f83e9af96563646605301e7b4c4548eaf57bc2768c036a9ddceef04b38f562675f186706a9cbf3c4aa8811b450b33d0c0f1c046cd91d158c52"

@app.route('/proxy', methods=['POST'])
def proxy():
    try:
        payload = request.get_json()
        auth_string = f"{API_ID}:{API_SECRET}"
        headers = {
            "Authorization": "Basic " + base64.b64encode(auth_string.encode()).decode(),
            "Content-Type": "application/json"
        }
        res = requests.post(
            "https://api.astronomyapi.com/api/v2/bodies/positions",
            headers=headers,
            json=payload
        )
        return (res.text, res.status_code, {'Content-Type': 'application/json'})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
