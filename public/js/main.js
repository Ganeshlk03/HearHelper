import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log('HearHelper Application Loaded');
    
    // Add any global event listeners or initialization code here
    setupAccessibilityFeatures();

    // Map global functions to window
    window.startChat = startChat;
    window.closeFeedbackModal = closeFeedbackModal;
});

function setupAccessibilityFeatures() {
    // Keyboard navigation support
    document.addEventListener('keydown', (e) => {
        // Alt + S: Start/Stop listening
        if (e.altKey && e.key === 's') {
            if (speechService) {
                speechService.toggleListening();
            }
        }
        // Alt + M: Mute/Unmute
        if (e.altKey && e.key === 'm') {
            if (ttsService) {
                ttsService.stop();
            }
        }
    });

    // Help system functionality
    setupHelpSystem();
}

function setupHelpSystem() {
    // Main elements
    const helpBtn = document.getElementById('help-btn');
    const helpDropdown = document.getElementById('help-dropdown');
    const helpModal = document.getElementById('help-modal');
    const feedbackModal = document.getElementById('feedback-modal');

    // Buttons
    const helpOptionBtn = document.getElementById('help-option-btn');
    const feedbackOptionBtn = document.getElementById('feedback-option-btn');
    const helpCloseBtn = document.querySelector('.help-close-btn');
    const feedbackCloseBtn = document.querySelector('.feedback-close-btn');

    // Toggle dropdown when help button is clicked
    if (helpBtn && helpDropdown) {
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = helpDropdown.classList.contains('show');

            if (isVisible) {
                hideDropdown();
            } else {
                showDropdown();
            }
        });
    }

    // Help option - opens help modal
    if (helpOptionBtn && helpModal) {
        helpOptionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideDropdown();
            helpModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    }

    // Feedback option - opens feedback modal
    if (feedbackOptionBtn && feedbackModal) {
        feedbackOptionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideDropdown();
            feedbackModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    }

    // Help modal close
    if (helpCloseBtn && helpModal) {
        helpCloseBtn.addEventListener('click', () => {
            helpModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    // Feedback modal close
    if (feedbackCloseBtn && feedbackModal) {
        feedbackCloseBtn.addEventListener('click', () => {
            feedbackModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (helpDropdown && helpDropdown.classList.contains('show')) {
            if (!helpDropdown.contains(e.target) && !helpBtn.contains(e.target)) {
                hideDropdown();
            }
        }
    });

    // Close modals when clicking outside
    [helpModal, feedbackModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        }
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close dropdown if open
            if (helpDropdown && helpDropdown.classList.contains('show')) {
                hideDropdown();
            }

            // Close any open modals
            [helpModal, feedbackModal].forEach(modal => {
                if (modal && modal.style.display === 'block') {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        }
    });

    // Feedback form handling
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFeedbackSubmission();
        });
    }
}

function showDropdown() {
    const helpBtn = document.getElementById('help-btn');
    const helpDropdown = document.getElementById('help-dropdown');

    if (helpBtn && helpDropdown) {
        helpBtn.classList.add('active');
        helpDropdown.classList.add('show');
    }
}

function hideDropdown() {
    const helpBtn = document.getElementById('help-btn');
    const helpDropdown = document.getElementById('help-dropdown');

    if (helpBtn && helpDropdown) {
        helpBtn.classList.remove('active');
        helpDropdown.classList.remove('show');
    }
}

function startChat() {
    // Placeholder for chat functionality
    showNotification('Live chat feature coming soon! Please use phone support for now.', 'info');
}

function closeFeedbackModal() {
    const feedbackModal = document.getElementById('feedback-modal');
    if (feedbackModal) {
        feedbackModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function handleFeedbackSubmission() {
    const form = document.getElementById('feedback-form');
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');

    // Get form values
    const feedback = {
        name: formData.get('name'),
        email: formData.get('email'),
        type: formData.get('type'),
        rating: formData.get('rating'),
        message: formData.get('message'),
        timestamp: new Date().toISOString()
    };

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Submitting...";

        // Send to Firebase Firestore
        await addDoc(collection(db, "feedback"), feedback);
        
        showNotification('Thank you for your feedback! We appreciate your input.', 'success');
        closeFeedbackModal();
        form.reset();
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification('Failed to submit feedback. Please check your connection and try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Feedback";
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function logActivity(action, details) {
    console.log(`[${new Date().toLocaleTimeString()}] ${action}:`, details);
}