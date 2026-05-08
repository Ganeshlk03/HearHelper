import {
    GestureRecognizer,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

// --- DOM Elements ---
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const enableWebcamButton = document.getElementById("enableWebcamButton");
const statusBadge = document.getElementById("camera-status");

const gestureEmoji = document.getElementById("gesture-emoji");
const gestureOutput = document.getElementById("gesture-output");
const confidenceFill = document.getElementById("confidence-fill");
const confidenceValue = document.getElementById("confidence-value");

const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");

// --- App State ---
let gestureRecognizer;
let runningMode = "VIDEO";
let webcamRunning = false;
let lastVideoTime = -1;

// To prevent speaking the same gesture 100 times a second
let currentSpokenGesture = "";
let stableGestureCount = 0;
const STABLE_THRESHOLD = 4; // Lowered from 15 to 4 for much faster response time

// --- Gesture Dictionary ---
// Mapping MediaPipe default recognized categories to more natural phrases and emojis
const gestureMap = {
    "None": { phrase: "Waiting...", emoji: "👀", color: "var(--text-muted)" },
    "Closed_Fist": { phrase: "Stop", emoji: "✊", color: "var(--danger-color)" },
    "Open_Palm": { phrase: "Hello", emoji: "🖐️", color: "var(--primary-color)" },
    "Pointing_Up": { phrase: "Look Up", emoji: "☝️", color: "var(--secondary-color)" },
    "Thumb_Down": { phrase: "No", emoji: "👎", color: "var(--danger-color)" },
    "Thumb_Up": { phrase: "Yes", emoji: "👍", color: "var(--success-color)" },
    "Victory": { phrase: "Peace", emoji: "✌️", color: "var(--success-color)" },
    "ILoveYou": { phrase: "I Love You", emoji: "🤟", color: "var(--primary-hover)" }
};

// --- History Management (localStorage) ---
const HISTORY_KEY = "sign_language_history";

function loadHistory() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    renderHistoryTasks(history);
}

function saveToHistory(phrase, emoji) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' });
    
    // Add new item to the beginning
    history.unshift({ phrase, emoji, time: timeString });
    
    // Keep only the latest 50 translations to avoid massive storage
    if (history.length > 50) history.pop();
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistoryTasks(history);
}

function renderHistoryTasks(history) {
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No translations yet. Start signing!</div>';
        return;
    }
    
    historyList.innerHTML = "";
    history.forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.innerHTML = `
            <span class="timestamp">${item.time}</span>
            <div class="phrase"><span>${item.emoji}</span> ${item.phrase}</div>
        `;
        historyList.appendChild(div);
    });
}

clearHistoryBtn.addEventListener("click", () => {
    if(confirm("Are you sure you want to clear your translation history?")) {
        localStorage.removeItem(HISTORY_KEY);
        loadHistory();
    }
});


// --- Text-to-Speech (Web Speech API) ---
function speakPhrase(phrase) {
    // Basic debounce check
    if (!window.speechSynthesis) return;
    
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}


// --- Initialize AI Model ---
const createGestureRecognizer = async () => {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                delegate: "GPU"
            },
            runningMode: runningMode,
            numHands: 2 // Can track up to 2 hands simultaneously
        });
        
        // Show the enable button once the AI is loaded
        enableWebcamButton.textContent = "Enable Camera";
        enableWebcamButton.innerHTML = '<i class="fa-solid fa-camera"></i> Enable Camera';
        enableWebcamButton.disabled = false;
        
    } catch (error) {
        console.error("Error loading MediaPipe model:", error);
        gestureOutput.textContent = "Error loading AI Model.";
    }
};

// Start setting up the model immediately
createGestureRecognizer();
loadHistory(); // Load history on startup

// --- Camera Access ---
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
    enableWebcamButton.addEventListener("click", toggleWebcam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
    gestureOutput.textContent = "Camera not supported.";
}

function toggleWebcam(event) {
    if (!gestureRecognizer) {
        alert("Please wait for the AI model to load before turning on the camera.");
        return;
    }

    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerHTML = '<i class="fa-solid fa-camera"></i> Enable Camera';
        statusBadge.innerHTML = '<i class="fa-solid fa-video-slash"></i> Camera Off';
        statusBadge.classList.remove('active');
        
        // Stop video streams
        const stream = video.srcObject;
        if(stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
    } else {
        webcamRunning = true;
        enableWebcamButton.innerHTML = '<i class="fa-solid fa-square-person-confined"></i> Stop Camera';
        statusBadge.innerHTML = '<i class="fa-solid fa-video"></i> Starting...';
        
        const constraints = { video: true };

        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadeddata", () => {
                statusBadge.innerHTML = '<i class="fa-solid fa-video"></i> Tracking Active';
                statusBadge.classList.add('active');
                predictWebcam();
            });
        }).catch((err) => {
            console.error("Error accessing camera: ", err);
            statusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Camera Blocked';
            webcamRunning = false;
        });
    }
}

async function predictWebcam() {
    // Ensure canvas dimensions match video
    if(video.videoWidth > 0 && video.videoHeight > 0) {
       canvasElement.style.width = video.videoWidth + "px";
       canvasElement.style.height = video.videoHeight + "px";
       canvasElement.width = video.videoWidth;
       canvasElement.height = video.videoHeight;
    }

    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }

    let startTimeMs = performance.now();
    
    // Always draw the live video feed every single painted frame so it doesn't blink or stutter
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
    
    // Process new video frame for AI recognition
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        
        let results = null;
        try {
            results = gestureRecognizer.recognizeForVideo(video, startTimeMs);
        } catch(e) {
            console.error("AI Recognition failed on frame:", e);
        }


        let dominantGestureName = "None";
        let maxConfidence = 0;

        if (results && results.landmarks && results.landmarks.length > 0) {
            const drawingUtils = new DrawingUtils(canvasCtx);
            
            for (let i = 0; i < results.landmarks.length; i++) {
                const landmarks = results.landmarks[i];
                drawingUtils.drawConnectors(
                    landmarks,
                    GestureRecognizer.HAND_CONNECTIONS,
                    { color: "#06b6d4", lineWidth: 5 } 
                );
                drawingUtils.drawLandmarks(landmarks, {
                    color: "#8b5cf6", 
                    lineWidth: 2
                });
            }

            if (results.gestures.length > 0) {
                const gesture = results.gestures[0][0];
                dominantGestureName = gesture.categoryName;
                maxConfidence = Math.round(parseFloat(gesture.score) * 100);
            }
        } 
        
        // UI Updates
        const mappedData = gestureMap[dominantGestureName] || gestureMap["None"];
        gestureEmoji.textContent = mappedData.emoji;
        gestureOutput.textContent = mappedData.phrase;
        gestureOutput.style.color = mappedData.color;
        
        confidenceFill.style.width = maxConfidence + "%";
        confidenceValue.textContent = maxConfidence;
        
        // Logic to Speak and Save to History (Debounced)
        if (dominantGestureName !== "None") {
             if (dominantGestureName === currentSpokenGesture) {
                 stableGestureCount++;
                 if(stableGestureCount === STABLE_THRESHOLD) {
                     speakPhrase(mappedData.phrase);
                     saveToHistory(mappedData.phrase, mappedData.emoji);
                     
                     // Visual feedback scaling
                     gestureOutput.style.transform = "scale(1.2)";
                     setTimeout(() => gestureOutput.style.transform = "scale(1)", 200);
                 }
             } else {
                 currentSpokenGesture = dominantGestureName;
                 stableGestureCount = 0;
             }
        } else {
            stableGestureCount = 0;
            currentSpokenGesture = "None";
        }
        
    }
    
    canvasCtx.restore();

    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}
