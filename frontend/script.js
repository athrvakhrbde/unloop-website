// Smooth scroll behavior
document.addEventListener('DOMContentLoaded', function() {
    // Initialize ticker animation
    initTicker();
    
    // Add smooth scroll to buttons
    initButtonLinks();
});

// Initialize ticker with seamless loop
function initTicker() {
    const tickerContent = document.querySelector('.ticker-content');
    if (!tickerContent) return;
    
    // Clone the content for seamless loop
    const originalContent = tickerContent.innerHTML;
    tickerContent.innerHTML = originalContent + originalContent;
    
    // Reset animation if needed
    const tickerElement = document.querySelector('.ticker');
    if (tickerElement) {
        tickerElement.style.animation = 'none';
        setTimeout(() => {
            tickerElement.style.animation = '';
        }, 10);
    }
}

// Initialize button links
function initButtonLinks() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Add click animation
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// Handle window resize for responsive adjustments
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // Reinitialize ticker on resize if needed
        const ticker = document.querySelector('.ticker');
        if (ticker) {
            ticker.style.animation = 'none';
            setTimeout(() => {
                ticker.style.animation = '';
            }, 10);
        }
    }, 250);
});

// Prevent ticker animation issues on mobile
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ticker = document.querySelector('.ticker');
    if (ticker) {
        ticker.style.animation = 'none';
    }
}
