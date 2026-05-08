// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active'); // Added to trigger the X animation
    });
}

// Close menu when link is clicked
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Update active nav link
function updateActiveNav() {
    const currentLocation = location.pathname;
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.href.includes(currentLocation) || 
            (currentLocation === '/' && link.href.includes('index.html'))) {
            link.classList.add('active');
        }
    });
}

// Navigation function
function navigateTo(page) {
    // Add fade out animation
    document.body.style.opacity = '0.7';
    
    setTimeout(() => {
        window.location.href = page;
    }, 300);
}

// Call on page load
document.addEventListener('DOMContentLoaded', updateActiveNav);

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-container')) {
        navMenu.classList.remove('active');
    }
});