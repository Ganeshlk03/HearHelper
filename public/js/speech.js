class HearHelperSpeech {
    constructor() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.isListening = false;
        this.transcript = '';
        this.setupRecognition();
    }

    setupRecognition() {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('Listening started...');
        };

        this.recognition.onresult = (event) => {
            this.transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                this.transcript += event.results[i][0].transcript;
            }
            if (window.onSpeechUpdate) {
                window.onSpeechUpdate(this.transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
        };
    }

    start() {
        this.transcript = '';
        this.recognition.start();
    }

    stop() {
        this.recognition.stop();
    }

    toggleListening() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }

    setLanguage(lang) {
        this.recognition.lang = lang;
    }
}

// Text to Speech
class HearHelperTTS {
    speak(text, options = {}) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        utterance.lang = options.lang || 'en-US';
        window.speechSynthesis.speak(utterance);
    }

    stop() {
        window.speechSynthesis.cancel();
    }
}

const speechService = new HearHelperSpeech();
const ttsService = new HearHelperTTS();