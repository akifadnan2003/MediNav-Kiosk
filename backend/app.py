# backend/app.py

from flask import Flask, request
from flask_socketio import SocketIO
import json
import vosk
import sys

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-very-secret-key!' 
socketio = SocketIO(app, cors_allowed_origins="*")

# --- VOSK MODEL SETUP ---
# Define the path to your English model folder
MODEL_PATH = "models/vosk-en" 
# The sample rate of the model (usually 16000)
SAMPLE_RATE = 16000

# Check if the model path exists, otherwise exit
try:
    model = vosk.Model(MODEL_PATH)
except Exception:
    print(f"Error: Could not load model from path '{MODEL_PATH}'.")
    print("Please make sure you have downloaded the model and placed it in the correct folder.")
    sys.exit(1)

# A dictionary to hold a separate recognizer for each connected client
recognizers = {}

@app.route('/')
def index():
    return "MediNav Backend Server is running."

@socketio.on('connect')
def handle_connect():
    """A new client has connected. Create a new recognizer for them."""
    print(f'Client connected: {request.sid}')
    # Create a new KaldiRecognizer for this session and store it
    recognizers[request.sid] = vosk.KaldiRecognizer(model, SAMPLE_RATE)

@socketio.on('disconnect')
def handle_disconnect():
    """A client has disconnected. Remove their recognizer."""
    print(f'Client disconnected: {request.sid}')
    # Clean up the recognizer for the disconnected client
    if request.sid in recognizers:
        del recognizers[request.sid]

@socketio.on('audio_stream')
def handle_audio_stream(audio_data):
    """Process the incoming audio stream from a client."""
    recognizer = recognizers.get(request.sid)
    if not recognizer:
        print(f"Warning: No recognizer found for client {request.sid}")
        return

    # Feed the audio data to the recognizer
    if recognizer.AcceptWaveform(audio_data):
        # The recognizer has a final result
        result = json.loads(recognizer.Result())
        text = result.get('text', '')
        print(f"Transcription result for {request.sid}: {text}")

        # --- MOCKUP NLP LOGIC (to be replaced later) ---
        # For now, we just send the transcribed text back.
        # In the future, we will do intent matching here.
        if text:
            response = {
                "response_en": f"I heard you say: '{text}'",
                "response_ur": "" # No Urdu response yet
            }
            socketio.emit('response', response, to=request.sid)
    # else:
    #     # The recognizer has a partial result (optional to process)
    #     # partial_result = json.loads(recognizer.PartialResult())
    #     # print(f"Partial result: {partial_result.get('partial', '')}")


if __name__ == '__main__':
    print("Starting Flask-SocketIO server on http://localhost:5001")
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
