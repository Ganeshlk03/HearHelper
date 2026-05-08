import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Track the active role
let currentRole = 'user';
// Primary Admin Credentials: HearHelper@gmail.com / He@rHelper123
const ADMIN_EMAILS = ['hearhelper@gmail.com'];

/**
 * Handles the visual slider and logic for User/Admin switching
 */
const roleToggleBtn = document.getElementById('roleToggle');
if (roleToggleBtn) {
    roleToggleBtn.addEventListener('click', function() {
    const toggle = document.getElementById('roleToggle');
    const userOpt = document.getElementById('userOpt');
    const adminOpt = document.getElementById('adminOpt');
    const emailLabel = document.getElementById('emailLabel');
    const submitBtn = document.getElementById('submitBtn');
    const slider = document.querySelector('.role-slider');

    if (currentRole === 'user') {
        currentRole = 'admin';
        // UI Updates
        slider.style.transform = 'translateX(100%)';
        slider.style.backgroundColor = '#e74c3c'; // Change to Red for Admin
        userOpt.classList.remove('active');
        adminOpt.classList.add('active');
        
        emailLabel.innerText = "Admin Email Address";
        submitBtn.innerText = "Access Admin Panel";
        submitBtn.style.backgroundColor = "#e74c3c";
    } else {
        currentRole = 'user';
        // UI Updates
        slider.style.transform = 'translateX(0%)';
        slider.style.backgroundColor = '#3498db'; // Change to Blue for User
        userOpt.classList.add('active');
        adminOpt.classList.remove('active');
        
        emailLabel.innerText = "User Email Address";
        submitBtn.innerText = "Sign In";
        submitBtn.style.backgroundColor = "#3498db";
    }
    });
}
/**
 * Toggles password visibility
 */
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye-slash');
    });
}

// --- Navigation & Section Toggling ---
function hideAllSections() {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
}

// --- Mobile Hamburger Menu ---
function setupHamburgerMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if(hamburger) {
        hamburger.addEventListener('click', () => {
            if (navMenu.style.display === 'flex') {
                navMenu.style.display = 'none';
            } else {
                navMenu.style.display = 'flex';
                navMenu.style.flexDirection = 'column';
                navMenu.style.position = 'absolute';
                navMenu.style.top = '60px';
                navMenu.style.right = '20px';
                navMenu.style.backgroundColor = '#2c3e50';
                navMenu.style.padding = '1rem';
                navMenu.style.borderRadius = '8px';
            }
        });
    }
}

// --- Form Submission ---
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const emailLower = email.toLowerCase();
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 1. Admin Workflow
    if (currentRole === 'admin') {
        if (!ADMIN_EMAILS.includes(emailLower)) {
            showAlert("This email is not authorized for admin access.", "error");
            return;
        }

        try {
            // Attempt real Firebase Login
            await signInWithEmailAndPassword(auth, email, password);
            sessionStorage.setItem('isAdmin', 'true');
            showAlert("Welcome Admin! Authentication Successful.", "success");
            setTimeout(() => window.location.href = "admin.html", 1000);
        } catch (error) {
            console.warn("Dev Notice: Firebase Auth failed. Checking for local bypass...", error);
            
            // DEVELOPMENT BYPASS: Allow login if on localhost with the specific provided credentials
            if (isLocalhost && emailLower === 'hearhelper@gmail.com' && password === 'He@rHelper123') {
                sessionStorage.setItem('isAdmin', 'true');
                showAlert("✅ Local Admin Mode: Logged in (Dev Bypass)", "success");
                setTimeout(() => window.location.href = "admin.html", 1000);
            } else {
                showAlert("Invalid admin credentials. Please check your password.", "error");
            }
        }
        return;
    }

    // 2. User Workflow (Standard Firebase)
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showAlert("Login Successful! Redirecting...", "success");
        setTimeout(() => window.location.href = "../home.html", 1000);
    } catch (error) {
        console.error("Login Error:", error);
        let errorMessage = "Invalid email or password.";
        if (error.code === 'auth/user-not-found') errorMessage = "User account not found. Please register first.";
        else if (error.code === 'auth/wrong-password') errorMessage = "Incorrect password. Try again.";
        else if (error.code === 'auth/too-many-requests') errorMessage = "Too many attempts. Account temporary locked.";
        
        showAlert(errorMessage, "error");
    }
});

/**
 * Displays a styled notification message
 */
function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const color = type === 'success' ? '#2ecc71' : '#e74c3c';
    const bgColor = type === 'success' ? '#eafaf1' : '#fdecea';

    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        background: ${bgColor}; 
        color: ${color}; 
        border: 1px solid ${color};
        padding: 12px; 
        border-radius: 8px; 
        margin-bottom: 20px; 
        text-align: center; 
        font-weight: 600;
        animation: fadeIn 0.3s ease;
    `;
    alertDiv.textContent = message;
    container.innerHTML = '';
    container.appendChild(alertDiv);

    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}

/**
 * Hamburger Menu Toggle for Mobile
 */
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        if (navMenu.classList.contains('active')) {
            navMenu.style.display = 'flex';
            navMenu.style.flexDirection = 'column';
            navMenu.style.position = 'absolute';
            navMenu.style.top = '70px';
            navMenu.style.left = '0';
            navMenu.style.width = '100%';
            navMenu.style.backgroundColor = '#2c3e50';
        } else {
            navMenu.style.display = '';
        }
    });
}
