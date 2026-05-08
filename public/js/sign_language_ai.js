import {
    GestureRecognizer,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

/**
 * HearHelper Sign Language AI Logic
 * Features:
 * 1. Real-time Gesture Recognition (Local Fallback)
 * 2. Speech Synthesis (Text-to-Speech)
 * 3. Dynamic Python ML Backend Integration (WebSockets)
 * 4. Translation History with Persistence
 */

// --- Socket.IO for Python Backend ---
// Use dynamic detection or default to 5000
const SOCKET_URL = "http://localhost:5000";
let socket = null;

try {
    // Import Socket.IO dynamically
    const socketModule = await import("https://cdn.socket.io/4.7.2/socket.io.esm.min.js");
    socket = socketModule.io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: 5
    });

    socket.on("connect", () => {
        console.log("Connected to Python AI Backend!");
        updateStatus("AI Backend Online", true);
    });

    socket.on("connect_error", () => {
        console.log("Python Backend offline. Using local AI engine.");
        updateStatus("Local AI Mode", false);
    });
} catch (e) {
    console.warn("Socket.io not found. Using local AI only.");
}

// --- DOM Elements ---
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const enableWebcamButton = document.getElementById("enableWebcamButton");

const gestureEmoji = document.getElementById("gesture-emoji");
const gestureOutput = document.getElementById("gesture-output");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");

const currentSentenceEl = document.getElementById("current-sentence");
const speakSentenceBtn = document.getElementById("speak-sentence-btn");
const saveSentenceBtn = document.getElementById("save-sentence-btn");
const clearSentenceBtn = document.getElementById("clear-sentence-btn");

// --- App State ---
let gestureRecognizer;
let webcamRunning = false;
let lastVideoTime = -1;
let currentGesture = "";
let stableCount = 0;
let formingSentence = [];
const STABILITY_THRESHOLD = 10; // Increased to 10 so it doesn't fire too fast when trying to form sentences

const gestureMap = {
    "None": { phrase: "Waiting...", emoji: "👀", color: "#888" },
    "Closed_Fist": { phrase: "Stop", emoji: "✊", color: "#ff4d4d" },
    "Open_Palm": { phrase: "Hello", emoji: "🖐️", color: "#4d94ff" },
    "Pointing_Up": { phrase: "Look Up", emoji: "☝️", color: "#4dff88" },
    "Pointing_Down": { phrase: "Look Down", emoji: "👇", color: "#ffdb4d" },
    "Thumb_Up": { phrase: "Yes", emoji: "👍", color: "#4dff88" },
    "Thumb_Down": { phrase: "No", emoji: "👎", color: "#ff4d4d" },
    "Victory": { phrase: "Peace", emoji: "✌️", color: "#ff4dff" },
    "ILoveYou": { phrase: "I Love You", emoji: "🤟", color: "#ff4d94" },
}

const HISTORY_KEY = "sign_language_history";

// --- Initialization ---
async function initAI() {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        enableWebcamButton.classList.add("ready");
    } catch (error) {
        console.error("AI Init Error:", error);
    }
}

initAI();
renderHistory();

// --- Event Listeners ---
enableWebcamButton.addEventListener("click", toggleCamera);
clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Clear translation history?")) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    }
});

speakSentenceBtn.addEventListener("click", () => {
    if (formingSentence.length > 0) {
        speakPhrase(formingSentence.join(" "));
    }
});

saveSentenceBtn.addEventListener("click", () => {
    if (formingSentence.length > 0) {
        saveHistory(formingSentence.join(" "), "📝");
        formingSentence = [];
        updateSentenceDisplay();
    }
});

clearSentenceBtn.addEventListener("click", () => {
    formingSentence = [];
    updateSentenceDisplay();
});

// --- Core Functions ---

function updateStatus(text, isActive) {
    // Optional: add a status badge if it exists in HTML
    const statusEl = document.getElementById("ai-status") || document.getElementById("camera-status");
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.className = isActive ? "active" : "";
    }
}

async function toggleCamera() {
    if (webcamRunning) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        webcamRunning = false;
        enableWebcamButton.innerText = "Enable AI Camera";
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
        webcamRunning = true;
        enableWebcamButton.innerText = "Stop Camera";
    } catch (err) {
        alert("Could not access webcam. Please check permissions.");
    }
}

function speakPhrase(phrase) {
    if (!window.speechSynthesis) return;

    // Stop any current speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0; // Say it louder!
    window.speechSynthesis.speak(utterance);
}

function saveHistory(phrase, emoji) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add to top of list
    history.unshift({ phrase, emoji, time });
    
    // Limit history size
    if (history.length > 50) history.pop();
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById("history-list");
    if (!historyList) return;

    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-msg">No history yet. Start signing!</div>';
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <span class="history-time">${item.time}</span>
            <span class="history-phrase">${item.emoji} ${item.phrase}</span>
        </div>
    `).join('');
}

function updateSentenceDisplay() {
    if (formingSentence.length === 0) {
        currentSentenceEl.textContent = "Waiting for gestures...";
        currentSentenceEl.style.color = "#888";
    } else {
        currentSentenceEl.textContent = formingSentence.join(" ");
        currentSentenceEl.style.color = "var(--primary-color)";
    }
}

function addWordToSentence(word) {
    // Avoid repeating the same word directly back to back in a sentence accidentally
    // due to holding the sign too long.
    if (formingSentence.length > 0 && formingSentence[formingSentence.length - 1] === word) {
        return;
    }

    formingSentence.push(word);
    updateSentenceDisplay();
}

// --- Prediction Loop ---
async function predictWebcam() {
    if (!webcamRunning) return;

    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const results = gestureRecognizer.recognizeForVideo(video, performance.now());

        let detectedName = "None";
        let score = 0;

        if (results.landmarks && results.landmarks.length > 0) {
            const drawingUtils = new DrawingUtils(canvasCtx);
            const landmarks = results.landmarks[0];

            // Draw skeleton
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
            drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });

            // Send to Python Backend if connected
            if (socket && socket.connected) {
                // Flatten landmarks [x,y,z] for Python model (1662 coordinates expected by the LSTM we wrote)
                // Note: The previous LSTM used Holistic (Pose+Face+Hands).
                // For simplicity here, we pad or just wait for the socket prediction.
                let rawCoords = [];
                // Padding pose(33*4) and face(468*3) as zeros for now to match model shape
                rawCoords.push(...new Array(33 * 4 + 468 * 3).fill(0));
                for (let lm of landmarks) {
                    rawCoords.push(lm.x, lm.y, lm.z);
                }
                // Pad enough to reach 1662 or whatever the server expects
                while (rawCoords.length < 1662) rawCoords.push(0);

                socket.emit('send_frame_coordinates', rawCoords);
            }

            if (results.gestures.length > 0) {
                detectedName = results.gestures[0][0].categoryName;
                score = results.gestures[0][0].score;
            }
        }

        // Handle prediction results
        const data = gestureMap[detectedName] || gestureMap["None"];

        // Update UI
        gestureEmoji.textContent = data.emoji;
        gestureOutput.textContent = data.phrase;
        gestureOutput.style.color = data.color;

        // Stability Logic for Speech & History
        if (detectedName !== "None" && score > 0.6) {
            if (detectedName === currentGesture) {
                stableCount++;
                if (stableCount === STABILITY_THRESHOLD) {
                    addWordToSentence(data.phrase);

                    // visual bounce effect
                    gestureOutput.style.transform = "scale(1.2)";
                    setTimeout(() => gestureOutput.style.transform = "scale(1)", 200);
                }
            } else {
                currentGesture = detectedName;
                stableCount = 0;
            }
        } else {
            stableCount = 0;
            currentGesture = "None";
        }
    }

    canvasCtx.restore();
    window.requestAnimationFrame(predictWebcam);
}

// Listening for Python Predictions
if (socket) {
    socket.on('ai_prediction', (data) => {
        const name = data.prediction;
        const confidence = data.confidence;

        if (gestureMap[name] && confidence > 80) {

            // Only add if we haven't just added this word recently to avoid spamming
            const phrase = gestureMap[name].phrase;

            if (currentGesture !== name) {
                gestureEmoji.textContent = gestureMap[name].emoji;
                gestureOutput.textContent = phrase;
                gestureOutput.style.color = gestureMap[name].color;

                addWordToSentence(phrase);
                currentGesture = name;

                // visual bounce effect
                gestureOutput.style.transform = "scale(1.2)";
                setTimeout(() => gestureOutput.style.transform = "scale(1)", 200);
            }
        }
    });
}
