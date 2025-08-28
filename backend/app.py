# backend/app.py

from flask import Flask, request, jsonify
from flask_socketio import SocketIO
import json
import torch
from transformers import pipeline
import numpy as np
import sys 
from pydub import AudioSegment
import io

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# --- LOAD MODELS ---
try:
    #Using GPU i.e NVIDIA 3050ti
    device = 0 if torch.cuda.is_available() else -1
    print(f"✅ [Backend] PyTorch CUDA available: {torch.cuda.is_available()}")
    print(f"✅ [Backend] Using device: {'cuda:0' if device == 0 else 'cpu'}")
    
    model_path = "./models/whisper-large-v2/"
    print(f"✅ [Backend] Loading Whisper model from: {model_path}")
    
    transcriber = pipeline(
        "automatic-speech-recognition",
        model=model_path,
        device=device
    )
    
    with open('intents.json', 'r', encoding='utf-8') as f:
        intents_data = json.load(f)["intents"]
    
    print("✅ [Backend] All models loaded successfully.")
except Exception as e:
    print(f"❌ [Backend] Fatal Error loading models: {e}")
    sys.exit(1)


def process_intent(text):
    for intent in intents_data:
        if intent['tag'] == 'fallback':
            continue
        for keyword in intent["keywords"]:
            if keyword in text.lower().strip():
                print(f"✅ [Backend] Found keyword '{keyword}' for intent '{intent['tag']}'")
                return intent
    print("⚠️ [Backend] No intent matched, returning fallback.")
    return next((i for i in intents_data if i['tag'] == 'fallback'), None)

def transcribe_audio(audio_bytes):
    audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
    audio_segment = audio_segment.set_frame_rate(16000)
    audio_segment = audio_segment.set_channels(1)
    samples = np.array(audio_segment.get_array_of_samples()).astype(np.float32) / 32768.0
    
    if len(samples) == 0:
        return ""

    result = transcriber(samples)
    return result["text"]

# --- BACKGROUND TASK ---
def process_audio_task(sid, audio_bytes):
    try:
        transcribed_text = transcribe_audio(audio_bytes)
        clean_text = transcribed_text.strip()
        print(f"📝 [Task {sid}] Transcription: '{clean_text}'")

        if clean_text:
            matched_intent = process_intent(clean_text)
            if matched_intent:
                response = matched_intent['response_en']
                socketio.emit('response', {'response_en': response}, to=sid)
        else:
            fallback_intent = next((i for i in intents_data if i['tag'] == 'fallback'), None)
            if fallback_intent:
                socketio.emit('fallback_response', {'response_en': fallback_intent['response_en']}, to=sid)
    except Exception as e:
        print(f"❌ [Task {sid}] An error occurred: {e}")

#Server Connection
@socketio.on('connect')
def handle_connect():
    print(f'✅ [Backend] Client connected: {request.sid}')

@socketio.on('process_audio')
def handle_process_audio(data):
    audio_bytes = data['audio_data']
    socketio.start_background_task(target=process_audio_task, sid=request.sid, audio_bytes=audio_bytes)
    
#Just for testing purposes, using this as an alternative for microphone
@app.route('/test_transcribe', methods=['POST'])
def test_transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    audio_bytes = audio_file.read()
    
    try:
        print("✅ [Test Route] Received audio file. Starting transcription.")
        text = transcribe_audio(audio_bytes)
        print(f"✅ [Test Route] Transcription successful: '{text}'")
        return jsonify({'transcription': text})
    except Exception as e:
        print(f"❌ [Test Route] Error during transcription: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 [Backend] Starting Flask-SocketIO server...")
    # --- THIS IS THE FIX ---
    socketio.run(app, host='0.0.0.0', port=5001)