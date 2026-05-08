// ============================================================
// BENEFITS PAGE JAVASCRIPT
// ============================================================

// Filter benefits by category
function applyBenefitFilter(category, clickedButton) {
    // Update active button
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (clickedButton) {
        clickedButton.classList.add('active');
    } else if (buttons.length > 0) {
        buttons[0].classList.add('active');
    }

    // Filter cards
    const cards = document.querySelectorAll('.benefit-card');
    cards.forEach(card => {
        if (category === 'all') {
            card.style.display = 'block';
            card.style.animation = 'slideUp 0.5s ease-out';
        } else {
            if (card.getAttribute('data-category').includes(category)) {
                card.style.display = 'block';
                card.style.animation = 'slideUp 0.5s ease-out';
            } else {
                card.style.display = 'none';
            }
        }
    });

    // Scroll to first visible card
    const firstVisible = Array.from(cards).find(card => card.style.display !== 'none');
    if (firstVisible) {
        firstVisible.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Initialize page
window.addEventListener('DOMContentLoaded', () => {
    // Show all benefits on load
    applyBenefitFilter('all');

    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

window.filterBenefits = function(category) {
    applyBenefitFilter(category, window.event ? window.event.target : null);
};
