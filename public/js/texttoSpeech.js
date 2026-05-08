class TextToSpeechService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.isSpeaking = false;
        this.currentUtterance = null;
    }

    speak(text, options = {}) {
        // Cancel any ongoing speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        utterance.lang = options.lang || 'en-US';

        utterance.onstart = () => {
            this.isSpeaking = true;
            if (window.onSpeechStart) window.onSpeechStart();
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            if (window.onSpeechEnd) window.onSpeechEnd();
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            if (window.onSpeechError) {
                window.onSpeechError(event.error);
            }
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }

    pause() {
        this.synth.pause();
    }

    resume() {
        this.synth.resume();
    }

    stop() {
        this.synth.cancel();
        this.isSpeaking = false;
    }

    getAvailableVoices() {
        return this.synth.getVoices();
    }

    setVoice(voiceName) {
        const voices = this.getAvailableVoices();
        const voice = voices.find(v => v.name === voiceName);
        if (this.currentUtterance && voice) {
            this.currentUtterance.voice = voice;
        }
    }
}

const ttsService = new TextToSpeechService();

// Load voices when they're available
window.speechSynthesis.onvoiceschanged = () => {
    // Voices loaded
};