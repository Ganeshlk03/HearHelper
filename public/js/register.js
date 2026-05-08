import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

/**
 * Toggles visibility for the main registration password
 */
window.toggleRegPassword = function() {
    const passInput = document.getElementById('regPassword');
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
};

/**
 * Toggles visibility for the confirm password field
 */
window.toggleConfirmPassword = function() {
    const confirmInput = document.getElementById('confirmPassword');
    confirmInput.type = confirmInput.type === 'password' ? 'text' : 'password';
};

/**
 * Real-time Password Strength Checker
 */
document.getElementById('regPassword').addEventListener('input', function(e) {
    const password = e.target.value;
    const strengthBar = document.getElementById('passwordStrength');
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    // Update UI based on strength
    switch(strength) {
        case 0:
        case 1:
            strengthBar.style.width = '25%';
            strengthBar.style.backgroundColor = '#e74c3c'; // Weak
            break;
        case 2:
            strengthBar.style.width = '50%';
            strengthBar.style.backgroundColor = '#f1c40f'; // Medium
            break;
        case 3:
            strengthBar.style.width = '75%';
            strengthBar.style.backgroundColor = '#3498db'; // Good
            break;
        case 4:
            strengthBar.style.width = '100%';
            strengthBar.style.backgroundColor = '#2ecc71'; // Strong
            break;
    }
});

/**
 * Form Submission and Validation
 */
document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    // 1. Check if passwords match
    if (password !== confirmPassword) {
        showNotification("Passwords do not match!", "error");
        return;
    }

    // 2. Check password length
    if (password.length < 8) {
        showNotification("Password must be at least 8 characters long.", "error");
        return;
    }

    // 3. Ensure Terms are agreed to
    if (!agreeTerms) {
        showNotification("You must agree to the Terms & Conditions.", "error");
        return;
    }

    // If all validations pass
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('phone').value,
        hearingType: document.getElementById('hearingType').value
    };

    try {
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, password);
        const user = userCredential.user;
        
        // Save additional details to Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            hearingType: formData.hearingType,
            createdAt: new Date().toISOString()
        });
        
        console.log("Registered User:", formData);
        showNotification("Account created successfully! Redirecting...", "success");

        // Simulate redirect
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        console.error("Error signing up:", error);
        let errorMessage = "Registration failed. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Email is already in use.";
        }
        showNotification(errorMessage, "error");
    }
});

/**
 * Reusable Alert Function
 */
function showNotification(message, type) {
    const container = document.getElementById('alertContainer');
    const color = type === 'success' ? '#2ecc71' : '#e74c3c';
    const bgColor = type === 'success' ? '#eafaf1' : '#fdecea';

    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        background: ${bgColor}; 
        color: ${color}; 
        border: 1px solid ${color};
        padding: 15px; 
        border-radius: 8px; 
        margin-bottom: 20px; 
        text-align: center; 
        font-weight: bold;
        font-size: 0.9rem;
    `;
    alertDiv.textContent = message;
    container.innerHTML = '';
    container.appendChild(alertDiv);

    // Clear alert after 4 seconds
    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}