/**
 * HearHelper Backend Server
 * Express.js Server for handling data, emergency alerts, and API requests
 * 
 * Features:
 * - RESTful API endpoints
 * - Emergency alert management
 * - User data storage and retrieval
 * - Transcript storage
 * - Communication logging
 * - CORS support
 * - Error handling
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// ===== MIDDLEWARE CONFIGURATION =====
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// ===== DATABASE CONFIGURATION =====
const dataDir = path.join(__dirname, 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// ===== FILE OPERATIONS UTILITIES =====
/**
 * Read JSON file safely
 * @param {string} filename - Name of the file to read
 * @returns {Array|Object} - Parsed JSON data or empty array
 */
function readJSON(filename) {
    const filePath = path.join(dataDir, filename);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Error reading file ${filename}:`, error.message);
    }
    return [];
}

/**
 * Write JSON file safely
 * @param {string} filename - Name of the file to write
 * @param {Array|Object} data - Data to write
 * @returns {boolean} - Success status
 */
function writeJSON(filename, data) {
    const filePath = path.join(dataDir, filename);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing file ${filename}:`, error.message);
        return false;
    }
}

// ===== EMAIL CONFIGURATION (OPTIONAL) =====
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
});

/**
 * Send emergency alert email
 * @param {Object} alertData - Emergency alert data
 */
async function sendEmergencyEmail(alertData) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMERGENCY_EMAIL || 'emergency@service.com',
        subject: `🚨 EMERGENCY ALERT: ${alertData.type.toUpperCase()}`,
        html: `
            <h2>Emergency Alert Received</h2>
            <p><strong>Alert Type:</strong> ${alertData.type}</p>
            <p><strong>Alert ID:</strong> ${alertData.alertId}</p>
            <p><strong>Location:</strong> ${alertData.location}</p>
            <p><strong>Message:</strong> ${alertData.message}</p>
            <p><strong>Time:</strong> ${alertData.timestamp}</p>
            <p><strong>User Contact:</strong> ${JSON.stringify(alertData.userContact)}</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Emergency email sent successfully');
    } catch (error) {
        console.error('Error sending emergency email:', error);
    }
}

// ===== API ENDPOINTS: HEALTH CHECK =====
/**
 * GET /api/health
 * Check server health and status
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        server: 'HearHelper Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// ===== API ENDPOINTS: TRANSCRIPTS =====

/**
 * POST /api/transcripts
 * Save a new transcript
 */
app.post('/api/transcripts', (req, res) => {
    try {
        const { text, language, userId } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Transcript text is required',
                error: 'EMPTY_TRANSCRIPT'
            });
        }

        const transcripts = readJSON('transcripts.json');
        const transcript = {
            id: Date.now(),
            userId: userId || 'anonymous',
            text: text,
            language: language || 'en-US',
            timestamp: new Date().toISOString(),
            wordCount: text.split(' ').length,
            charCount: text.length
        };

        transcripts.push(transcript);
        
        if (writeJSON('transcripts.json', transcripts)) {
            res.json({
                success: true,
                message: 'Transcript saved successfully',
                transcript: transcript
            });
        } else {
            throw new Error('Failed to write transcript');
        }
    } catch (error) {
        console.error('Error saving transcript:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving transcript',
            error: error.message
        });
    }
});

/**
 * GET /api/transcripts
 * Retrieve all transcripts or filtered by userId
 */
app.get('/api/transcripts', (req, res) => {
    try {
        const { userId, limit = 50 } = req.query;
        let transcripts = readJSON('transcripts.json');

        if (userId) {
            transcripts = transcripts.filter(t => t.userId === userId);
        }

        // Sort by newest first and apply limit
        transcripts = transcripts.reverse().slice(0, parseInt(limit));

        res.json({
            success: true,
            count: transcripts.length,
            transcripts: transcripts
        });
    } catch (error) {
        console.error('Error retrieving transcripts:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transcripts',
            error: error.message
        });
    }
});

/**
 * GET /api/transcripts/:id
 * Get a specific transcript by ID
 */
app.get('/api/transcripts/:id', (req, res) => {
    try {
        const { id } = req.params;
        const transcripts = readJSON('transcripts.json');
        const transcript = transcripts.find(t => t.id === parseInt(id));

        if (!transcript) {
            return res.status(404).json({
                success: false,
                message: 'Transcript not found'
            });
        }

        res.json({
            success: true,
            transcript: transcript
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving transcript',
            error: error.message
        });
    }
});

/**
 * PUT /api/transcripts/:id
 * Update a transcript
 */
app.put('/api/transcripts/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { text, language } = req.body;
        let transcripts = readJSON('transcripts.json');

        const index = transcripts.findIndex(t => t.id === parseInt(id));
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Transcript not found'
            });
        }

        transcripts[index].text = text || transcripts[index].text;
        transcripts[index].language = language || transcripts[index].language;
        transcripts[index].wordCount = (text || transcripts[index].text).split(' ').length;
        transcripts[index].updatedAt = new Date().toISOString();

        if (writeJSON('transcripts.json', transcripts)) {
            res.json({
                success: true,
                message: 'Transcript updated successfully',
                transcript: transcripts[index]
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating transcript',
            error: error.message
        });
    }
});

/**
 * DELETE /api/transcripts/:id
 * Delete a transcript
 */
app.delete('/api/transcripts/:id', (req, res) => {
    try {
        const { id } = req.params;
        let transcripts = readJSON('transcripts.json');
        const initialLength = transcripts.length;

        transcripts = transcripts.filter(t => t.id !== parseInt(id));

        if (transcripts.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Transcript not found'
            });
        }

        if (writeJSON('transcripts.json', transcripts)) {
            res.json({
                success: true,
                message: 'Transcript deleted successfully'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting transcript',
            error: error.message
        });
    }
});

// ===== API ENDPOINTS: COMMUNICATIONS =====

/**
 * POST /api/communications
 * Log a communication session
 */
app.post('/api/communications', (req, res) => {
    try {
        const { speaker, listener, userId } = req.body;

        if (!speaker || !listener) {
            return res.status(400).json({
                success: false,
                message: 'Speaker and listener messages required'
            });
        }

        const communications = readJSON('communications.json');
        const communication = {
            id: Date.now(),
            userId: userId || 'anonymous',
            speaker: speaker,
            listener: listener,
            timestamp: new Date().toISOString(),
            duration: 0 // Can be calculated from actual conversation
        };

        communications.push(communication);
        
        if (writeJSON('communications.json', communications)) {
            res.json({
                success: true,
                message: 'Communication logged successfully',
                communication: communication
            });
        }
    } catch (error) {
        console.error('Error logging communication:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging communication',
            error: error.message
        });
    }
});

/**
 * GET /api/communications
 * Retrieve communications
 */
app.get('/api/communications', (req, res) => {
    try {
        const { userId, limit = 50 } = req.query;
        let communications = readJSON('communications.json');

        if (userId) {
            communications = communications.filter(c => c.userId === userId);
        }

        communications = communications.reverse().slice(0, parseInt(limit));

        res.json({
            success: true,
            count: communications.length,
            communications: communications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving communications',
            error: error.message
        });
    }
});

/**
 * DELETE /api/communications/:id
 * Delete a communication record
 */
app.delete('/api/communications/:id', (req, res) => {
    try {
        const { id } = req.params;
        let communications = readJSON('communications.json');
        communications = communications.filter(c => c.id !== parseInt(id));

        if (writeJSON('communications.json', communications)) {
            res.json({
                success: true,
                message: 'Communication deleted successfully'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting communication',
            error: error.message
        });
    }
});

// ===== API ENDPOINTS: EMERGENCY ALERTS =====

/**
 * POST /api/emergency-alert
 * Send emergency alert to authorities
 */
app.post('/api/emergency-alert', async (req, res) => {
    try {
        const { type, location, message, userId, userContact } = req.body;

        // Validate emergency type
        const validTypes = ['ambulance', 'police', 'fire', 'general'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid emergency type',
                validTypes: validTypes
            });
        }

        const emergencyAlerts = readJSON('emergency-alerts.json');
        const alert = {
            id: Date.now(),
            alertId: 'ALERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            userId: userId || 'anonymous',
            type: type,
            location: location || 'Location unavailable',
            message: message || '',
            userContact: userContact || {},
            timestamp: new Date().toISOString(),
            status: 'active',
            respondingAgency: null,
            responseTime: null
        };

        emergencyAlerts.push(alert);
        
        if (writeJSON('emergency-alerts.json', emergencyAlerts)) {
            // Send email notification (optional)
            await sendEmergencyEmail(alert);

            // Log emergency
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🚨 EMERGENCY ALERT RECEIVED`);
            console.log(`${'='.repeat(50)}`);
            console.log(`Alert ID: ${alert.alertId}`);
            console.log(`Type: ${type.toUpperCase()}`);
            console.log(`Location: ${alert.location}`);
            console.log(`Message: ${message}`);
            console.log(`Time: ${new Date(alert.timestamp).toLocaleString()}`);
            console.log(`${'='.repeat(50)}\n`);

            res.json({
                success: true,
                message: 'Emergency alert sent to authorities',
                alertId: alert.alertId,
                alert: alert
            });
        }
    } catch (error) {
        console.error('Error processing emergency alert:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing emergency alert',
            error: error.message
        });
    }
});

/**
 * GET /api/emergency-alerts
 * Get all emergency alerts
 */
app.get('/api/emergency-alerts', (req, res) => {
    try {
        const { userId, status, limit = 50 } = req.query;
        let alerts = readJSON('emergency-alerts.json');

        if (userId) {
            alerts = alerts.filter(a => a.userId === userId);
        }

        if (status) {
            alerts = alerts.filter(a => a.status === status);
        }

        alerts = alerts.reverse().slice(0, parseInt(limit));

        res.json({
            success: true,
            count: alerts.length,
            alerts: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving alerts',
            error: error.message
        });
    }
});

/**
 * GET /api/emergency-alerts/:alertId
 * Get specific alert details
 */
app.get('/api/emergency-alerts/:alertId', (req, res) => {
    try {
        const { alertId } = req.params;
        const alerts = readJSON('emergency-alerts.json');
        const alert = alerts.find(a => a.alertId === alertId);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        res.json({
            success: true,
            alert: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving alert',
            error: error.message
        });
    }
});

/**
 * PUT /api/emergency-alerts/:alertId
 * Update alert status
 */
app.put('/api/emergency-alerts/:alertId', (req, res) => {
    try {
        const { alertId } = req.params;
        const { status, respondingAgency } = req.body;

        let alerts = readJSON('emergency-alerts.json');
        const index = alerts.findIndex(a => a.alertId === alertId);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        alerts[index].status = status || alerts[index].status;
        alerts[index].respondingAgency = respondingAgency || alerts[index].respondingAgency;
        alerts[index].responseTime = alerts[index].status === 'responded' ? new Date().toISOString() : null;
        alerts[index].updatedAt = new Date().toISOString();

        if (writeJSON('emergency-alerts.json', alerts)) {
            res.json({
                success: true,
                message: 'Alert updated successfully',
                alert: alerts[index]
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating alert',
            error: error.message
        });
    }
});

// ===== API ENDPOINTS: USER PROFILES =====

/**
 * POST /api/user/profile
 * Create or update user profile
 */
app.post('/api/user/profile', (req, res) => {
    try {
        const { userId, name, email, phone, hearingType, preferredLanguage } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const profiles = readJSON('profiles.json');
        const existingIndex = profiles.findIndex(p => p.userId === userId);

        const profileData = {
            userId: userId,
            name: name || '',
            email: email || '',
            phone: phone || '',
            hearingType: hearingType || 'deaf',
            preferredLanguage: preferredLanguage || 'en-US',
            createdAt: existingIndex >= 0 ? profiles[existingIndex].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            profiles[existingIndex] = profileData;
        } else {
            profiles.push(profileData);
        }

        if (writeJSON('profiles.json', profiles)) {
            res.json({
                success: true,
                message: 'Profile saved successfully',
                profile: profileData
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving profile',
            error: error.message
        });
    }
});

/**
 * GET /api/user/profile/:userId
 * Get user profile
 */
app.get('/api/user/profile/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const profiles = readJSON('profiles.json');
        const profile = profiles.find(p => p.userId === userId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            profile: profile
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving profile',
            error: error.message
        });
    }
});

/**
 * DELETE /api/user/profile/:userId
 * Delete user profile
 */
app.delete('/api/user/profile/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        let profiles = readJSON('profiles.json');
        profiles = profiles.filter(p => p.userId !== userId);

        if (writeJSON('profiles.json', profiles)) {
            res.json({
                success: true,
                message: 'Profile deleted successfully'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting profile',
            error: error.message
        });
    }
});

// ===== API ENDPOINTS: STATISTICS =====

/**
 * GET /api/statistics
 * Get application statistics
 */
app.get('/api/statistics', (req, res) => {
    try {
        const transcripts = readJSON('transcripts.json');
        const communications = readJSON('communications.json');
        const alerts = readJSON('emergency-alerts.json');
        const profiles = readJSON('profiles.json');

        const stats = {
            summary: {
                totalTranscripts: transcripts.length,
                totalCommunications: communications.length,
                totalEmergencyAlerts: alerts.length,
                totalUsers: profiles.length,
                generatedAt: new Date().toISOString()
            },
            transcripts: {
                count: transcripts.length,
                averageLength: transcripts.length > 0 
                    ? Math.round(transcripts.reduce((sum, t) => sum + (t.wordCount || 0), 0) / transcripts.length)
                    : 0,
                totalWords: transcripts.reduce((sum, t) => sum + (t.wordCount || 0), 0),
                totalCharacters: transcripts.reduce((sum, t) => sum + (t.charCount || 0), 0),
                languages: [...new Set(transcripts.map(t => t.language))],
                lastTranscript: transcripts[transcripts.length - 1] || null
            },
            emergencyAlerts: {
                count: alerts.length,
                byType: {
                    ambulance: alerts.filter(a => a.type === 'ambulance').length,
                    police: alerts.filter(a => a.type === 'police').length,
                    fire: alerts.filter(a => a.type === 'fire').length,
                    general: alerts.filter(a => a.type === 'general').length
                },
                byStatus: {
                    active: alerts.filter(a => a.status === 'active').length,
                    responded: alerts.filter(a => a.status === 'responded').length,
                    resolved: alerts.filter(a => a.status === 'resolved').length
                },
                averageResponseTime: calculateAverageResponseTime(alerts),
                lastAlert: alerts[alerts.length - 1] || null
            },
            users: {
                count: profiles.length,
                byHearingType: {
                    deaf: profiles.filter(p => p.hearingType === 'deaf').length,
                    hardOfHearing: profiles.filter(p => p.hearingType === 'hard-of-hearing').length,
                    hearingAidUser: profiles.filter(p => p.hearingType === 'hearing-aid-user').length,
                    cochlearImplant: profiles.filter(p => p.hearingType === 'cochlear-implant').length
                }
            }
        };

        res.json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving statistics',
            error: error.message
        });
    }
});

/**
 * Helper function to calculate average response time
 */
function calculateAverageResponseTime(alerts) {
    const respondedAlerts = alerts.filter(a => a.responseTime);
    if (respondedAlerts.length === 0) return 'N/A';

    const times = respondedAlerts.map(a => {
        const alertTime = new Date(a.timestamp);
        const responseTime = new Date(a.responseTime);
        return (responseTime - alertTime) / 1000 / 60; // Convert to minutes
    });

    const average = times.reduce((a, b) => a + b, 0) / times.length;
    return `${Math.round(average)} minutes`;
}

// ===== API ENDPOINTS: DATA EXPORT =====

/**
 * GET /api/export/all
 * Export all data
 */
app.get('/api/export/all', (req, res) => {
    try {
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            transcripts: readJSON('transcripts.json'),
            communications: readJSON('communications.json'),
            emergencyAlerts: readJSON('emergency-alerts.json'),
            profiles: readJSON('profiles.json')
        };

        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="hearhelper-export-${Date.now()}.json"`);
        res.setHeader('Content-Type', 'application/json');
        
        res.json(exportData);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting data',
            error: error.message
        });
    }
});

/**
 * POST /api/import/data
 * Import data
 */
app.post('/api/import/data', (req, res) => {
    try {
        const { transcripts, communications, emergencyAlerts, profiles } = req.body;

        if (transcripts && Array.isArray(transcripts)) {
            writeJSON('transcripts.json', transcripts);
        }
        if (communications && Array.isArray(communications)) {
            writeJSON('communications.json', communications);
        }
        if (emergencyAlerts && Array.isArray(emergencyAlerts)) {
            writeJSON('emergency-alerts.json', emergencyAlerts);
        }
        if (profiles && Array.isArray(profiles)) {
            writeJSON('profiles.json', profiles);
        }

        res.json({
            success: true,
            message: 'Data imported successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error importing data',
            error: error.message
        });
    }
});

// ===== API ENDPOINTS: SEARCH =====

/**
 * GET /api/search
 * Search across transcripts and communications
 */
app.get('/api/search', (req, res) => {
    try {
        const { query, type = 'all', limit = 20 } = req.query;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const searchQuery = query.toLowerCase();
        let results = {
            transcripts: [],
            communications: []
        };

        if (type === 'all' || type === 'transcripts') {
            const transcripts = readJSON('transcripts.json');
            results.transcripts = transcripts.filter(t => 
                t.text.toLowerCase().includes(searchQuery)
            ).reverse().slice(0, parseInt(limit));
        }

        if (type === 'all' || type === 'communications') {
            const communications = readJSON('communications.json');
            results.communications = communications.filter(c => 
                c.speaker.toLowerCase().includes(searchQuery) || 
                c.listener.toLowerCase().includes(searchQuery)
            ).reverse().slice(0, parseInt(limit));
        }

        res.json({
            success: true,
            query: query,
            results: results,
            totalResults: results.transcripts.length + results.communications.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching data',
            error: error.message
        });
    }
});

// ===== API ENDPOINTS: BATCH OPERATIONS =====

/**
 * POST /api/batch/transcripts
 * Bulk save transcripts
 */
app.post('/api/batch/transcripts', (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required and must not be empty'
            });
        }

        const transcripts = readJSON('transcripts.json');
        const newTranscripts = items.map(item => ({
            id: Date.now() + Math.random(),
            userId: item.userId || 'anonymous',
            text: item.text,
            language: item.language || 'en-US',
            timestamp: new Date().toISOString(),
            wordCount: item.text.split(' ').length,
            charCount: item.text.length
        }));

        transcripts.push(...newTranscripts);

        if (writeJSON('transcripts.json', transcripts)) {
            res.json({
                success: true,
                message: `${newTranscripts.length} transcripts saved successfully`,
                count: newTranscripts.length
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error batch saving transcripts',
            error: error.message
        });
    }
});

/**
 * DELETE /api/batch/transcripts
 * Bulk delete transcripts
 */
app.delete('/api/batch/transcripts', (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'IDs array is required'
            });
        }

        let transcripts = readJSON('transcripts.json');
        const initialCount = transcripts.length;
        transcripts = transcripts.filter(t => !ids.includes(t.id));
        const deletedCount = initialCount - transcripts.length;

        if (writeJSON('transcripts.json', transcripts)) {
            res.json({
                success: true,
                message: `${deletedCount} transcripts deleted successfully`,
                count: deletedCount
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error batch deleting transcripts',
            error: error.message
        });
    }
});

// ===== ERROR HANDLING =====

/**
 * 404 Handler
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
        method: req.method
    });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// ===== SERVER STARTUP =====

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║         HearHelper Backend Server Started           ║
╠════════════════════════════════════════════════════╣
║ Server:     ${HOST}
║ Port:       ${PORT}
║ URL:        http://${HOST}:${PORT}
║ API Base:   http://${HOST}:${PORT}/api
║ Status:     ✅ Running
║ Version:    1.0.0
║ Time:       ${new Date().toLocaleString()}
╚════════════════════════════════════════════════════╝
    `);

    // Initialize data files
    const requiredFiles = [
        'transcripts.json',
        'communications.json',
        'emergency-alerts.json',
        'profiles.json'
    ];

    requiredFiles.forEach(file => {
        const filePath = path.join(dataDir, file);
        if (!fs.existsSync(filePath)) {
            writeJSON(file, []);
        }
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;