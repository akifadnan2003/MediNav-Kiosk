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

def transcribe_audio(audio_bytes, language="en"):
    """
    Decodes the incoming audio, converts it to the correct format, and transcribes it.
    """
    audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
    print(f"✅ [Backend] Decoded audio. Original Frame Rate: {audio_segment.frame_rate}, Channels: {audio_segment.channels}, Duration: {len(audio_segment)}ms")
    audio_segment = audio_segment.set_frame_rate(16000)
    audio_segment = audio_segment.set_channels(1)
    audio_segment = audio_segment.normalize()
    print(f"✅ [Backend] Converted audio to 16kHz Mono and normalized.")
    samples = np.array(audio_segment.get_array_of_samples()).astype(np.float32) / 32768.0
    audio_duration = len(samples) / 16000
    max_amplitude = np.max(np.abs(samples)) if len(samples) > 0 else 0
    print(f"🔍 [Backend] Audio analysis - Duration: {audio_duration:.2f}s, Max amplitude: {max_amplitude:.3f}, Samples: {len(samples)}")
    if len(samples) == 0:
        print("⚠️ [Backend] Audio contains no samples after decoding.")
        return ""
    if audio_duration < 0.1:
        print("⚠️ [Backend] Audio too short (< 0.1s)")
        return ""
    if max_amplitude < 0.01:
        print("⚠️ [Backend] Audio level too low")
        return ""
    print(f"✅ [Backend] Starting transcription with Whisper model (language={language})...")
    result = transcriber(samples, generate_kwargs={
        "repetition_penalty": 1.1,
        "no_repeat_ngram_size": 2,
        "max_length": 448,
        "temperature": 0.1,
        "do_sample": False,
        "use_cache": True,
        "language": language
    })
    print("✅ [Backend] Transcription finished.")
    return result["text"]

# my custom logic
def process_audio_task(sid, audio_bytes, language="en"):
    print(f"✅ [Task {sid}] Starting audio processing in background.")
    try:
        transcribed_text = transcribe_audio(audio_bytes, language)
        clean_text = transcribed_text.strip()
        print(f"📝 [Task {sid}] Transcription: '{clean_text}'")
        if clean_text:
            matched_intent = process_intent(clean_text)
            if matched_intent:
                response = matched_intent.get('response_en') or matched_intent.get('response_ur') or "No response found."
                print(f"🚀 [Task {sid}] Sending response to client.")
                socketio.emit('response', {'response_en': response}, to=sid)
            else:
                print(f"⚠️ [Task {sid}] No intent matched, sending fallback.")
                fallback_intent = next((i for i in intents_data if i.get('response_en') or i.get('response_ur')), None)
                if fallback_intent:
                    socketio.emit('fallback_response', {'response_en': fallback_intent.get('response_en') or fallback_intent.get('response_ur')}, to=sid)
        else:
            print(f"⚠️ [Task {sid}] Empty transcription, sending fallback.")
            fallback_intent = next((i for i in intents_data if i.get('response_en') or i.get('response_ur')), None)
            if fallback_intent:
                socketio.emit('fallback_response', {'response_en': fallback_intent.get('response_en') or fallback_intent.get('response_ur')}, to=sid)
    except Exception as e:
        print(f"❌ [Task {sid}] An error occurred during background audio processing: {e}")

#Server Connection
@socketio.on('connect')
def handle_connect():
    print(f'✅ [Backend] Client connected: {request.sid}')

@socketio.on('process_audio')
def handle_process_audio(data):
    print("🎤 [Backend] 'process_audio' event received. Starting background task.")
    audio_bytes = data['audio_data']
    language = data.get('language', 'en')
    socketio.start_background_task(target=process_audio_task, sid=request.sid, audio_bytes=audio_bytes, language=language)
    print("✅ [Backend] Background task started. Server is free.")

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
    socketio.run(app, host='0.0.0.0', port=5001)