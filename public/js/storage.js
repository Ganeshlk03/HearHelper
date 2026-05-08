const storageManager = {
    // Basic settings
    getSettings: () => {
        const defaultSettings = {
            theme: 'light',
            fontSize: 16,
            speechRate: 1.0,
            volume: 1.0,
            pitch: 1.0,
            language: 'en-US',
            highContrast: false,
            darkMode: false
        };
        const saved = localStorage.getItem('hearhelper_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    },
    saveSettings: (settings) => {
        localStorage.setItem('hearhelper_settings', JSON.stringify(settings));
    },

    // Profile Settings
    getProfile: () => {
        const defaultProfile = {
            name: '',
            email: '',
            phone: '',
            hearingType: 'deaf',
            dateCreated: new Date().toISOString()
        };
        const saved = localStorage.getItem('hearhelper_profile');
        return saved ? { ...defaultProfile, ...JSON.parse(saved) } : defaultProfile;
    },
    saveProfile: (profile) => {
        localStorage.setItem('hearhelper_profile', JSON.stringify(profile));
    },

    // Emergency Contacts
    getEmergencyContacts: () => {
        const saved = localStorage.getItem('hearhelper_emergency');
        return saved ? JSON.parse(saved) : [];
    },
    addEmergencyContact: (name, phone, email) => {
        const contacts = storageManager.getEmergencyContacts();
        contacts.push({ id: Date.now(), name, phone, email });
        localStorage.setItem('hearhelper_emergency', JSON.stringify(contacts));
    },
    deleteEmergencyContact: (id) => {
        let contacts = storageManager.getEmergencyContacts();
        contacts = contacts.filter(c => c.id !== id);
        localStorage.setItem('hearhelper_emergency', JSON.stringify(contacts));
    },

    // Export/Import
    exportAllData: () => {
        const data = {
            settings: storageManager.getSettings(),
            profile: storageManager.getProfile(),
            emergency: storageManager.getEmergencyContacts()
        };
        return JSON.stringify(data, null, 2);
    },
    exportAsCSV: () => {
        // Mock CSV exporter
        return "Date,Transcript\n" + new Date().toISOString() + ",\"Example Transcript\"";
    },
    importData: (jsonString) => {
        try {
            const data = JSON.parse(jsonString);
            if (data.settings) storageManager.saveSettings(data.settings);
            if (data.profile) storageManager.saveProfile(data.profile);
            if (data.emergency) localStorage.setItem('hearhelper_emergency', JSON.stringify(data.emergency));
            return { success: true, message: "Settings restored successfully." };
        } catch (e) {
            return { success: false, message: "Invalid backup file." };
        }
    },

    // Wipe
    clearAllData: () => {
        localStorage.removeItem('hearhelper_settings');
        localStorage.removeItem('hearhelper_profile');
        localStorage.removeItem('hearhelper_emergency');
        localStorage.removeItem('transcriptHistory');
    },

    // Transcripts
    addTranscript: (text, lang) => {
        let history = JSON.parse(localStorage.getItem('transcriptHistory') || "[]");
        history.unshift({
            id: Date.now(),
            text: text,
            lang: lang,
            timestamp: new Date().toISOString()
        });
        if (history.length > 50) history.pop();
        localStorage.setItem('transcriptHistory', JSON.stringify(history));
    },

    // Activities
    recordActivity: (action, details = {}) => {
        console.log(`Activity Recorded: ${action}`, details);
        // Could be expanded to save to a local 'activities' log or Firestore
    },

    // Statistics
    getStorageStats: () => {
        return {
            transcripts: 0,
            communications: 0,
            emergencyContacts: storageManager.getEmergencyContacts().length,
            favorites: 0,
            activities: 0
        };
    }
};

window.storageManager = storageManager;
