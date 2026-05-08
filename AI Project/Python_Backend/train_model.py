import numpy as np
import os
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import TensorBoard

# Path for exported data, numpy arrays
DATA_PATH = os.path.join(os.getcwd(), 'MP_Data')

# Define the gestures we want the AI to recognize
actions = np.array(['Thanks', 'Mother', 'Looking', 'Yes', 'No', 'Love'])

# Number of sequences (videos) per gesture to collect
no_sequences = 30
# Number of frames per sequence
sequence_length = 30

def train_network():
    print("Building and training local LSTM Network for Sign Language Recognition...")
    
    label_map = {label:num for num, label in enumerate(actions)}
    
    sequences, labels = [], []
    for action in actions:
        try:
            for sequence in range(no_sequences):
                window = []
                for frame_num in range(sequence_length):
                    file_path = os.path.join(DATA_PATH, action, str(sequence), f"{frame_num}.npy")
                    if os.path.exists(file_path):
                        res = np.load(file_path)
                        window.append(res)
                # Only add if we got a full valid window
                if len(window) == sequence_length:
                    sequences.append(window)
                    labels.append(label_map[action])
        except Exception as e:
            print(f"Error accessing data for {action}: {e}")
            
    if not sequences:
        print("\nERROR: No training data found in MP_Data folder. Please run collect_data.py first to generate your gesture dataset!")
        return
        
    X = np.array(sequences)
    y = to_categorical(labels).astype(int)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1)
    
    log_dir = os.path.join('Logs')
    tb_callback = TensorBoard(log_dir=log_dir)

    print("Configuring LSTM model architecture...")
    model = Sequential()
    # 30 frames, each with 1662 coordinates
    model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(30, 1662)))
    model.add(LSTM(128, return_sequences=True, activation='relu'))
    model.add(LSTM(64, return_sequences=False, activation='relu'))
    model.add(Dense(64, activation='relu'))
    model.add(Dense(32, activation='relu'))
    model.add(Dense(actions.shape[0], activation='softmax'))

    model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])

    print("Training model... (this will output logs)")
    model.fit(X_train, y_train, epochs=200, callbacks=[tb_callback])
    
    # Save the trained model
    model.save('action.h5')
    print("\nModel trained successfully! Saved to action.h5")
    print("You can now run 'python app.py' to launch the AI translation backend.")

if __name__ == "__main__":
    train_network()
