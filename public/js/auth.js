import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Check authentication state
onAuthStateChanged(auth, (user) => {
    const isLoginPage = window.location.pathname.includes('login.html');
    const isIntroPage = window.location.pathname.endsWith('/') || window.location.pathname.includes('index.html');
    const isLocalAdmin = sessionStorage.getItem('isAdmin') === 'true' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isAdmin = (user && sessionStorage.getItem('isAdmin') === 'true') || isLocalAdmin;

    if (user || isLocalAdmin) {
        // User/Admin is logged in
        console.log(user ? "User logged in: " + user.email : "Local Admin logged in");
        
        // If logged in, redirect away from login/intro
        if (isLoginPage || isIntroPage) {
            window.location.href = isLoginPage ? '../home.html' : './home.html';
            return;
        }

        updateNavbarForLoggedInUser(Boolean(isAdmin));
    } else {
        // User is NOT logged in
        console.log("No user is logged in");
        
        // Redirect protected pages to intro page (index.html)
        const isRegisterPage = window.location.pathname.includes('register.html');
        const isForgotPage = window.location.pathname.includes('forgot-password.html');
        const isAdminLoginPage = window.location.pathname.includes('admin_login.html');

        if (!isLoginPage && !isIntroPage && !isRegisterPage && !isForgotPage && !isAdminLoginPage) {
            // Need to handle relative paths for pages/ vs root directory
            const prefix = window.location.pathname.includes('pages/') ? '../' : './';
            window.location.href = prefix + 'index.html';
        }

        sessionStorage.removeItem('isAdmin');
    }
});

function updateNavbarForLoggedInUser(isAdmin) {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    // We'll rewrite the nav-menu depending if user or admin
    // Use relative paths properly depending on current location
    const atRoot = window.location.pathname.endsWith('/') || window.location.pathname.includes('home.html');
    const prefix = atRoot ? './pages/' : './';

    let navHTML = `
        <li><a href="${atRoot ? '' : '../'}home.html" class="nav-link ${window.location.pathname.includes('home.html') ? 'active' : ''}">Home</a></li>
        <li><a href="${prefix}transcription.html" class="nav-link">Transcription</a></li>
        <li><a href="${prefix}community.html" class="nav-link ${window.location.pathname.includes('community.html') ? 'active' : ''}">Community</a></li>
        <li><a href="${prefix}sign_language.html" class="nav-link">Sign Language</a></li>
        <li><a href="${prefix}benefits.html" class="nav-link">Benefits</a></li>
        <li><a href="${prefix}settings.html" class="nav-link">Settings</a></li>
    `;

    if (isAdmin) {
        navHTML += `<li><a href="${prefix}admin.html" class="nav-link" style="color: #e74c3c; font-weight: bold;">Admin Portal</a></li>`;
    }

    // Add Logout Button
    navHTML += `<li><a href="#" id="logoutBtn" class="nav-link">Logout</a></li>`;

    navMenu.innerHTML = navHTML;

    // Attach event listener to newly created logout button
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
}

window.logoutUser = function logoutUser(e) {
    if (e) {
        e.preventDefault();
    }

    const atRoot = window.location.pathname.endsWith('/') || window.location.pathname.includes('home.html');
    sessionStorage.removeItem('isAdmin');

    signOut(auth).then(() => {
        console.log("Successfully logged out");
        window.location.href = atRoot ? 'index.html' : '../index.html';
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
};
