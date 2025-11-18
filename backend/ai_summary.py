import os
import traceback

import requests
from flask import jsonify, request

DEFAULT_GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")


def register_ai_summary_route(app):
    @app.route('/ai-summary', methods=['POST'])
    def ai_summary():
        try:
            payload = request.get_json() or {}
            prompt = (payload.get('prompt') or '').strip()
            lang = (payload.get('lang') or 'es').lower()
            if not prompt:
                return jsonify({'error': 'empty-prompt'}), 400

            api_key = os.environ.get('GROQ_API_KEY') or os.environ.get('MASHIA_GROQ_KEY')
            if not api_key:
                return jsonify({'error': 'missing-groq-key'}), 503

            system_prompt = (
                "You are a compassionate Kabbalistic astrologer. Explain the Tree of Life chart in detail."
                if lang.startswith('en') else
                "Eres un astr\u00f3logo kabalista compasivo. Explica a fondo la carta del \u00c1rbol de la Vida."
            )
            chat_payload = {
                "model": DEFAULT_GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.65,
                "max_tokens": 600
            }
            resp = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json=chat_payload,
                timeout=30
            )
            if resp.status_code >= 400:
                return jsonify({'error': 'groq-error', 'detail': resp.text[:400]}), resp.status_code
            data = resp.json()
            try:
                summary = (data.get('choices') or [{}])[0].get('message', {}).get('content', '').strip()
            except Exception:
                summary = ''
            return jsonify({'summary': summary})
        except Exception as exc:
            traceback.print_exc()
            return jsonify({'error': 'ai-summary-failed', 'detail': str(exc)}), 500
