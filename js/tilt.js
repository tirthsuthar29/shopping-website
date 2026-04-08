/**
 * tilt.js
 * Adds a 3D tilt effect and 3D reveal animations to elements with class .product-card
 */

document.addEventListener('DOMContentLoaded', () => {
    initTilt();
    initReveal();
    
    // Watch for dynamic product additions (mutation observer)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                initTilt();
                initReveal();
            }
        });
    });

    const config = { childList: true, subtree: true };
    const containers = ['dealsGrid', 'featuredGrid', 'recommendationsGrid', 'productsGrid', 'catalogGrid'];
    
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el, config);
    });
});

/**
 * 3D Reveal on Scroll
 */
function initReveal() {
    const cards = document.querySelectorAll('.product-card');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        if (card.dataset.revealInit) return;
        card.dataset.revealInit = "true";
        
        // Initial state for 3D reveal
        card.style.opacity = "0";
        card.style.transform = "perspective(1000px) rotateX(20deg) rotateY(-10deg) translateZ(-100px) translateY(50px) scale(0.8)";
        card.style.transition = "all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        
        revealObserver.observe(card);
    });
}

// Add a CSS rule for the reveal state
const style = document.createElement('style');
style.textContent = `
    .product-card.reveal-active {
        opacity: 1 !important;
        transform: perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0) translateY(0) scale(1) !important;
    }
`;
document.head.appendChild(style);

/**
 * 3D Tilt on Hover
 */
function initTilt() {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        // Skip if already initialized
        if (card.dataset.tiltInit) return;
        card.dataset.tiltInit = "true";
        
        // Settings
        const settings = {
            max: 15,        // Max rotation in degrees
            perspective: 1000,
            scale: 1.02,
            speed: 1000,
            easing: "cubic-bezier(.03,.98,.52,.99)"
        };

        card.style.transformStyle = "preserve-3d";

        card.addEventListener('mouseenter', () => {
            card.style.transition = "none";
        });

        card.addEventListener('mousemove', (e) => {
            // Only tilt if it has been revealed
            if (!card.classList.contains('reveal-active')) return;

            const cardRect = card.getBoundingClientRect();
            const cardWidth = cardRect.width;
            const cardHeight = cardRect.height;
            const centerX = cardRect.left + cardWidth / 2;
            const centerY = cardRect.top + cardHeight / 2;
            const mouseX = e.clientX - centerX;
            const mouseY = e.clientY - centerY;

            const rotateX = (-(mouseY / (cardHeight / 2)) * settings.max).toFixed(2);
            const rotateY = ((mouseX / (cardWidth / 2)) * settings.max).toFixed(2);

            card.style.transform = `perspective(${settings.perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${settings.scale}, ${settings.scale}, ${settings.scale})`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transition = `transform ${settings.speed}ms ${settings.easing}, opacity 0.8s ease`;
            card.style.transform = `perspective(${settings.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });

        // 3D effect is applied, but we use the existing HTML badges for cleaner UI
        // add3DBadges(card);
    });
}

function add3DBadges(card) {
    if (card.querySelector('.badge-3d')) return;

    // Check if it's a sale product (has discount badge)
    const hasDiscount = card.querySelector('.discount-badge');
    if (hasDiscount) {
        createBadge(card, 'SALE', '#f43f5e');
        hasDiscount.style.display = 'none'; // Replace old badge
    }

    // Occasionally add a "NEW" badge for flavor if no sale
    else if (Math.random() > 0.7) {
        createBadge(card, 'NEW', '#06b6d4');
    }
}

function createBadge(card, text, color) {
    const badge = document.createElement('div');
    badge.className = 'badge-3d';
    badge.textContent = text;
    badge.style.cssText = `
        position: absolute;
        top: 20px;
        left: -10px;
        background: ${color};
        color: white;
        padding: 5px 15px;
        font-weight: 800;
        font-size: 0.7rem;
        letter-spacing: 1px;
        transform: translateZ(50px) rotateY(-20deg);
        box-shadow: 10px 10px 20px rgba(0,0,0,0.3);
        pointer-events: none;
        z-index: 100;
        border-radius: 4px;
        transform-style: preserve-3d;
    `;
    
    // Add a side fold for 3D effect
    const side = document.createElement('div');
    side.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        width: 10px;
        height: 10px;
        background: black;
        opacity: 0.3;
        clip-path: polygon(0 0, 100% 0, 100% 100%);
        transform: rotateY(20deg);
    `;
    badge.appendChild(side);
    
    card.appendChild(badge);
}
