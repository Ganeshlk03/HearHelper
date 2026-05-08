from flask import Flask
from flask_socketio import SocketIO, emit
import numpy as np
import os
import tensorflow as tf
from tensorflow.keras.models import load_model

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Path to our trained model
model_path = 'action.h5'
model = None

if os.path.exists(model_path):
    print(f"Loading trained AI model from {model_path}...")
    try:
        model = load_model(model_path)
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print("Warning: Trained model 'action.h5' not found. Using stub predictions for testing.")
    print("Please run 'collect_data.py' and then 'train_model.py' to generate action.h5")

# Actions that the model was trained on
# These correspond to the words we want to recognize
actions = np.array(['Thanks', 'Mother', 'Looking', 'Yes', 'No', 'Love'])

sequence = []
# Threshold for recognizing the gesture
threshold = 0.8

@socketio.on('connect')
def handle_connect():
    print("Client connected to AI Backend!")

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected.")

@socketio.on('send_frame_coordinates')
def handle_coordinates(data):
    """
    Receives coordinate arrays from the frontend webcam.
    Data is expected to be a 1D array of 1662 elements
    (Pose: 33*4, Face: 468*3, Left Hand: 21*3, Right Hand: 21*3)
    """
    global sequence
    
    try:
        # Check if the shape matches our model requirements
        if len(data) == 1662:
            sequence.append(data)
            # Keep only the last 30 frames (our sequence length)
            sequence = sequence[-30:]
            
            # Once we have 30 frames, we can start making predictions
            if len(sequence) == 30:
                if model:
                    res = model.predict(np.expand_dims(sequence, axis=0))[0]
                    best_match_idx = np.argmax(res)
                    prediction = actions[best_match_idx]
                    confidence = float(res[best_match_idx]) * 100
                    
                    if confidence > threshold * 100:
                        emit('ai_prediction', {
                            'prediction': prediction,
                            'confidence': confidence
                        })
                else:
                    # In test mode without a trained model, simulate passing "Thanks" occasionally
                    import random
                    if random.random() > 0.95:
                        emit('ai_prediction', {
                            'prediction': random.choice(['Thanks', 'Mother']),
                            'confidence': random.uniform(85.0, 99.0)
                        })
    except Exception as e:
        print(f"Error processing frame: {e}")

if __name__ == '__main__':
    print("Starting AI Real-Time Translator WebSocket Server at port 5000...")
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
