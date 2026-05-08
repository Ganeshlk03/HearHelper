import { auth, db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

let usersData = [];
let feedbackData = [];
let activityData = []; // Optional: Could be populated from log collections in the future
const ADMIN_EMAILS = ['hearhelper@gmail.com'];

// Security Helper: Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    protectAdminRoute();

    // 1. Setup Listeners
    setupFirestoreListeners();
    
    // 2. ui
    
    // 3. Expose functions to window (since this is a module now)
    window.showDashboard = showDashboard;
    window.showUsers = showUsers;
    window.showFeedback = showFeedback;
    window.showAnalytics = showAnalytics;
    window.showSettings = showSettings;
    window.showAlert = showAlert;
    window.showAddUserForm = showAddUserForm;
    window.filterUsers = filterUsers;
    window.filterFeedback = filterFeedback;
    window.logoutAdmin = logoutAdmin;
});

function protectAdminRoute() {
    onAuthStateChanged(auth, (user) => {
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isLocalAdmin = isLocalHost && sessionStorage.getItem('isAdmin') === 'true';
        const isFirebaseAdmin = user && ADMIN_EMAILS.includes((user.email || '').toLowerCase()) && sessionStorage.getItem('isAdmin') === 'true';

        if (!isFirebaseAdmin && !isLocalAdmin) {
            console.warn("Unauthorized access attempt to admin panel.");
            sessionStorage.removeItem('isAdmin');
            window.location.href = './login.html';
        }
    });
}

function setupFirestoreListeners() {
    // Listen to Users
    const usersQ = query(collection(db, "users"), orderBy("createdAt", "desc"));
    onSnapshot(usersQ, (snapshot) => {
        usersData = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            usersData.push({
                id: doc.id,
                name: data.fullName || "Unknown",
                email: data.email || "N/A",
                role: "User", // Defaults to User unless role logic exists
                status: "Active", // Default dummy status
                createdAt: data.createdAt
            });
        });
        updateDashboardStats();
        renderUsers(usersData);
        initCharts(); // update charts based on new users
    });

    // Listen to Feedback
    const feedbackQ = query(collection(db, "feedback"), orderBy("timestamp", "desc"));
    onSnapshot(feedbackQ, (snapshot) => {
        feedbackData = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            feedbackData.push({
                id: doc.id,
                user: data.name || "Anonymous",
                message: data.message || "",
                status: "Open", // Example default
                type: data.type || "general"
            });
        });
        updateDashboardStats();
        renderFeedback(feedbackData);
        initCharts(); 
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

function showDashboard() {
    hideAllSections();
    document.getElementById('dashboard-section').classList.add('active');
    const link = document.querySelector('a[href="#dashboard"]');
    if (link) link.classList.add('active');
}

function showUsers() {
    hideAllSections();
    document.getElementById('users-section').classList.add('active');
    const link = document.querySelector('a[href="#users"]');
    if (link) link.classList.add('active');
}

function showFeedback() {
    hideAllSections();
    document.getElementById('feedback-section').classList.add('active');
    const link = document.querySelector('a[href="#feedback"]');
    if (link) link.classList.add('active');
}

function showAnalytics() {
    hideAllSections();
    document.getElementById('analytics-section').classList.add('active');
    const link = document.querySelector('a[href="#analytics"]');
    if (link) link.classList.add('active');
}

function showSettings() {
    hideAllSections();
    document.getElementById('settings-section').classList.add('active');
    const link = document.querySelector('a[href="#settings"]');
    if (link) link.classList.add('active');
}

// --- Data Rendering ---
function updateDashboardStats() {
    document.getElementById('totalUsers').innerText = usersData.length;
    document.getElementById('activeUsers').innerText = usersData.filter(u => u.status === 'Active').length;
    document.getElementById('totalFeedback').innerText = feedbackData.length;
    document.getElementById('openTickets').innerText = feedbackData.filter(f => f.status === 'Open').length;
}

function renderActivity() {
    const tbody = document.getElementById('activityTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    activityData.forEach(act => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${escapeHTML(act.user)}</strong></td>
                <td>${escapeHTML(act.action)}</td>
                <td><span style="color: #7f8c8d; font-size: 0.9em;">${escapeHTML(act.time)}</span></td>
            </tr>
        `;
    });
}

function renderUsers(data) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(user => {
        const statusColor = user.status === 'Active' ? '#2ecc71' : '#e74c3c';
        const safeName = escapeHTML(user.name);
        tbody.innerHTML += `
            <tr>
                <td><strong>${safeName}</strong></td>
                <td>${escapeHTML(user.email)}</td>
                <td>${escapeHTML(user.role)}</td>
                <td style="color: ${statusColor}; font-weight: 600;">${escapeHTML(user.status)}</td>
                <td>
                    <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;" onclick="showAlert('Edit user: ${safeName.replace(/'/g, "\\'")}')">Edit</button>
                </td>
            </tr>
        `;
    });
}

function renderFeedback(data) {
    const tbody = document.getElementById('feedbackTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(fb => {
        const statusColor = fb.status === 'Open' ? '#f1c40f' : '#2ecc71';
        const safeUser = escapeHTML(fb.user);
        tbody.innerHTML += `
            <tr>
                <td><strong>${safeUser}</strong></td>
                <td>${escapeHTML(fb.message)}</td>
                <td style="color: ${statusColor}; font-weight: 600;">${escapeHTML(fb.status)}</td>
                <td>
                    <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;" onclick="showAlert('Viewing ticket #${escapeHTML(fb.id)}')">View</button>
                </td>
            </tr>
        `;
    });
}

// --- Search & Filtering ---
function filterUsers() {
    const queryStr = document.getElementById('userSearch').value.toLowerCase();
    const filtered = usersData.filter(user => 
        user.name.toLowerCase().includes(queryStr) || 
        user.email.toLowerCase().includes(queryStr)
    );
    renderUsers(filtered);
}

function filterFeedback() {
    const queryStr = document.getElementById('feedbackSearch').value.toLowerCase();
    const filtered = feedbackData.filter(fb => 
        fb.user.toLowerCase().includes(queryStr) || 
        fb.message.toLowerCase().includes(queryStr)
    );
    renderFeedback(filtered);
}

// --- Utility Functions ---
function showAddUserForm() {
    showAlert('Add User modal would open here.', 'success');
}

function logoutAdmin() {
    showAlert('Logging out...', 'warning');
    sessionStorage.removeItem('isAdmin');
    signOut(auth).finally(() => {
        setTimeout(() => {
            window.location.href = './login.html';
        }, 1500);
    });
}

function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    
    // Basic styling for the alert injected via JS
    alertDiv.style.padding = '15px';
    alertDiv.style.marginBottom = '20px';
    alertDiv.style.borderRadius = '6px';
    alertDiv.style.color = '#fff';
    alertDiv.style.fontWeight = 'bold';
    alertDiv.style.transition = 'opacity 0.3s ease';
    
    if (type === 'success') alertDiv.style.backgroundColor = '#2ecc71';
    if (type === 'danger') alertDiv.style.backgroundColor = '#e74c3c';
    if (type === 'warning') alertDiv.style.backgroundColor = '#f39c12';

    alertDiv.innerText = message;
    container.appendChild(alertDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}



let userChartInstance = null;
let feedbackChartInstance = null;

// --- Charts Placeholder ---
function initCharts() {
    if (typeof Chart !== 'undefined') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let userCounts = new Array(12).fill(0);
        
        usersData.forEach(u => {
            if (u.createdAt) {
                const date = new Date(u.createdAt);
                if (!isNaN(date.getMonth())) {
                    userCounts[date.getMonth()] += 1;
                }
            }
        });

        let fbTypes = { 'bug': 0, 'feature': 0, 'improvement': 0, 'general': 0 };
        feedbackData.forEach(fb => {
             if (fb.type && fbTypes[fb.type] !== undefined) {
                 fbTypes[fb.type] += 1;
             } else {
                 fbTypes['general'] += 1;
             }
        });

        const userCtx = document.getElementById('userGrowthChart');
        if (userCtx) {
            const ctx = userCtx.getContext('2d');
            if (userChartInstance) userChartInstance.destroy();
            userChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months.slice(0, new Date().getMonth() + 1),
                    datasets: [{
                        label: 'New Users',
                        data: userCounts.slice(0, new Date().getMonth() + 1),
                        borderColor: '#3498db',
                        tension: 0.4
                    }]
                }
            });
        }

        const feedbackCtx = document.getElementById('feedbackTrendsChart');
        if (feedbackCtx) {
            const ctx = feedbackCtx.getContext('2d');
            if (feedbackChartInstance) feedbackChartInstance.destroy();
            feedbackChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Bugs', 'Features', 'Improvements', 'Support'],
                    datasets: [{
                        label: 'Tickets',
                        data: [fbTypes['bug'], fbTypes['feature'], fbTypes['improvement'], fbTypes['general']],
                        backgroundColor: ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f']
                    }]
                }
            });
        }
    } else {
        console.log("Chart.js not loaded. Charts will not display.");
    }
}
