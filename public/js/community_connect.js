import { auth, db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    getDocs, 
    serverTimestamp,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// State Management
let currentUser = null;
let activeContact = null;
let messagesUnsubscribe = null;
let allUsers = [];

// Security Helper: Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// DOM Elements
const contactsList = document.getElementById('contactsList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const chatPlaceholder = document.getElementById('chatPlaceholder');
const chatActive = document.getElementById('chatActive');
const activeContactName = document.getElementById('activeContactName');
const activeAvatar = document.getElementById('activeAvatar');
const userSearch = document.getElementById('userSearch');

// Profile Modal Elements
const profileModal = document.getElementById('profileModal');
const openProfileModal = document.getElementById('openProfileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileDisplayName = document.getElementById('profileDisplayName');
const profileStatus = document.getElementById('profileStatus');

// Initialize App
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Fetch current user details for the modal
        const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", user.uid)));
        if (!userDoc.empty) {
            const data = userDoc.docs[0].data();
            profileDisplayName.value = data.displayName || data.fullName || "";
            profileStatus.value = data.privacyStatus || "Available";
        }
        loadContacts();
    } else {
        console.log("Not logged in");
    }
});

// Load all registered users from Firestore
async function loadContacts() {
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        allUsers = [];
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            userData.uid = doc.id;
            // Don't show current user in contact list
            if (userData.uid !== currentUser.uid) {
                allUsers.push(userData);
            }
        });
        
        renderContacts(allUsers);
    } catch (error) {
        console.error("Error loading contacts:", error);
        contactsList.innerHTML = '<div class="error-msg">Failed to load contacts</div>';
    }
}

// Render contacts list to the sidebar
function renderContacts(users) {
    if (users.length === 0) {
        contactsList.innerHTML = '<div class="no-users">No contacts found</div>';
        return;
    }

    contactsList.innerHTML = users.map(user => {
        const displayName = escapeHTML(user.displayName || user.fullName || "User");
        const status = escapeHTML(user.privacyStatus || "Available");
        const showStatus = status !== "Offline";

        // Note: we use id with prefix for safety and data attributes for dynamic info
        return `
            <div class="contact-item" onclick="selectContact('${user.uid}', '${displayName.replace(/'/g, "\\'")}')" id="contact-${user.uid}">
                <div class="avatar">${displayName.charAt(0).toUpperCase()}</div>
                <div class="contact-info-small">
                    <h4>${displayName}</h4>
                    <p>${showStatus ? status : 'Contact'}</p>
                </div>
                ${showStatus ? `<div class="status-dot ${status.toLowerCase()}"></div>` : ''}
            </div>
        `;
    }).join('');
}

// Select a contact to chat with
window.selectContact = function(uid, name) {
    activeContact = { uid, name };

    // Update UI
    chatPlaceholder.style.display = 'none';
    chatActive.style.display = 'flex';
    activeContactName.textContent = name;
    activeAvatar.textContent = name.charAt(0).toUpperCase();

    // Highlight active contact
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`contact-${uid}`).classList.add('active');

    // Subscribe to messages
    subscribeToMessages();
};

// Real-time listener for chat messages
function subscribeToMessages() {
    // Unsubscribe from previous chat if exists
    if (messagesUnsubscribe) messagesUnsubscribe();

    const messagesRef = collection(db, "messages");
    
    // Query messages where current user and active contact are participants
    // We use a "participants" array in Firestore for easy querying
    // Removed orderBy("timestamp", "asc") to avoid requiring a composite index in Firestore
    const q = query(
        messagesRef,
        where("participants", "array-contains", currentUser.uid)
    );

    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            const msg = doc.data();
            // Double filter because participants array contains all matching current user
            // but we only want messages with the CURRENTLY active contact
            if (msg.participants.includes(activeContact.uid)) {
                messages.push({
                    id: doc.id,
                    ...msg
                });
            }
        });

        // Sort messages locally by timestamp to avoid needing a Firestore composite index
        messages.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.toMillis() : document.timeline ? document.timeline.currentTime : Date.now();
            const timeB = b.timestamp ? b.timestamp.toMillis() : document.timeline ? document.timeline.currentTime : Date.now();
            return timeA - timeB;
        });

        renderMessages(messages);
    });
}

// Render messages to the container
function renderMessages(messages) {
    messagesContainer.innerHTML = messages.map(msg => `
        <div class="message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}">
            <div class="message-text">${escapeHTML(msg.text)}</div>
            <span class="message-time">${msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sending...'}</span>
        </div>
    `).join('');
    
    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message
async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!activeContact) {
        alert("Please select a contact from the list first!");
        return;
    }
    
    if (!text) return;

    messageInput.value = '';
    
    try {
        console.log("Sending message to:", activeContact.uid);
        await addDoc(collection(db, "messages"), {
            text: text,
            senderId: currentUser.uid,
            receiverId: activeContact.uid,
            participants: [currentUser.uid, activeContact.uid].sort(),
            timestamp: serverTimestamp()
        });
        console.log("Message sent successfully!");
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message: " + error.message);
    }
}

// Quick Phrase functionality
window.sendQuickPhrase = function(phrase) {
    messageInput.value = phrase;
    sendMessage();
};

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Search functionality
userSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => u.fullName.toLowerCase().includes(term));
    renderContacts(filtered);
});

// Profile Modal Handlers
openProfileModal.addEventListener('click', () => {
    profileModal.style.display = 'flex';
});

closeProfileModal.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        profileModal.style.display = 'none';
    }
});

saveProfileBtn.addEventListener('click', async () => {
    const newName = profileDisplayName.value.trim();
    const newStatus = profileStatus.value;

    if (!newName) {
        alert("Please enter an appearance name.");
        return;
    }

    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            displayName: newName,
            privacyStatus: newStatus
        });
        
        profileModal.style.display = 'none';
        alert("Profile updated successfully!");
        loadContacts(); // Refresh list to reflect our changes if we appear in others' lists (or just visual consistency)
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile.");
    }
});

// Voice Input (Simple implementation for Chat)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    voiceBtn.addEventListener('click', () => {
        voiceBtn.style.color = '#e74c3c';
        recognition.start();
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript;
        voiceBtn.style.color = '#888';
    };

    recognition.onend = () => {
        voiceBtn.style.color = '#888';
    };
} else {
    voiceBtn.style.display = 'none';
}
