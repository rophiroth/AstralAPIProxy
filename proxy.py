from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import os

app = Flask(__name__)
CORS(app)

API_ID = "8d2774d4-9c34-4782-9d15-2fe1ee6bd447"
API_SECRET = "8db221b9aea2fbe23365b1d86dd94b5a44684947d12ddad2703c5a13b916106d90e8f20b266a79e63b0fa68c99fae09a726413f29ac370f83e9af965636466057895e1fd6c8c718092a57792049023640b462742ac81b2707a364fa976f0a5b34fde5b6c289abd59fe37ecd5749aaf9b"

@app.route('/proxy', methods=['POST'])
def proxy():
    try:
        payload = request.get_json()
        auth = base64.b64encode(f"{API_ID}:{API_SECRET}".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json"
        }
        res = requests.post(
            "https://api.astronomyapi.com/api/v2/bodies/positions",
            headers=headers,
            json=payload
        )
        return res.text, res.status_code, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
