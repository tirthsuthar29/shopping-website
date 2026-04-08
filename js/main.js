// main.js - Shared Application Logic

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const cartCount = document.getElementById('cartCount');
const wishlistCount = document.getElementById('wishlistCount');
const toastContainer = document.getElementById('toast-container');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// State
let currentCart = JSON.parse(localStorage.getItem('cart')) || [];
let currentWishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let currentUser = null;

// Initialize Theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    if(!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Firebase Auth Listener for Data Sync
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        
        // Update User Button link
        const userBtn = document.getElementById('userBtn');
        if (userBtn) {
            if (user) {
                // Check if admin (via localStorage cached role)
                const localUser = JSON.parse(localStorage.getItem('currentUser'));
                const isAdmin = localUser && localUser.role === 'admin';
                
                if (isAdmin) {
                    userBtn.href = window.location.pathname.includes('pages/') ? '../admin/index.html' : 'admin/index.html';
                    userBtn.innerHTML = `<i class="fas fa-user-shield" style="color:var(--accent-color);"></i>`;
                    userBtn.title = "Admin Dashboard";
                } else {
                    userBtn.href = window.location.pathname.includes('pages/') ? 'profile.html' : 'pages/profile.html';
                    userBtn.innerHTML = `<i class="fas fa-user-check" style="color:var(--primary-color);"></i>`;
                    userBtn.title = "View Profile";
                }
            } else {
                userBtn.href = window.location.pathname.includes('pages/') ? 'login.html' : 'pages/login.html';
                userBtn.innerHTML = `<i class="far fa-user"></i>`;
                userBtn.title = "Login / Signup";
            }
        }

        if (user) {
            // Fetch cart and wishlist from Firestore
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    
                    // Merge logic: local + remote (remote wins for conflicts)
                    if (data.cart) {
                        currentCart = data.cart;
                        localStorage.setItem('cart', JSON.stringify(currentCart));
                    }
                    if (data.wishlist) {
                        currentWishlist = data.wishlist;
                        localStorage.setItem('wishlist', JSON.stringify(currentWishlist));
                    }
                    updateBadges();
                } else {
                    // Initialize user doc if not exists
                    await db.collection('users').doc(user.uid).set({
                        email: user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        cart: currentCart,
                        wishlist: currentWishlist
                    });
                }
            } catch (error) {
                console.error("Error syncing user data:", error);
            }
        }
    });
}

// Helper to save data to Firestore
async function syncDataToFirestore() {
    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).update({
                cart: currentCart,
                wishlist: currentWishlist,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Error saving data to Firestore:", error);
        }
    }
}

// 4. Smooth Section Reveals on Scroll
const revealOnScroll = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, { threshold: 0.05 });

    const targets = document.querySelectorAll('section, .category-pill, footer, .hero-content');
    targets.forEach(t => {
        t.classList.add('reveal-item');
        observer.observe(t);
    });
};

// Update Badges
function updateBadges() {
    if(cartCount) {
        const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    if (wishlistCount) {
        wishlistCount.textContent = currentWishlist.length;
        wishlistCount.style.display = currentWishlist.length > 0 ? 'flex' : 'none';
        
        // Universal Pop animation for header icon
        const icon = wishlistCount.previousElementSibling;
        if(icon && icon.classList.contains('fa-heart')) {
            icon.classList.add('anim-heart');
            wishlistCount.classList.add('badge-pop');
            setTimeout(() => {
                icon.classList.remove('anim-heart');
                wishlistCount.classList.remove('badge-pop');
            }, 500);
        }
    }
}

// Add to Cart
function addToCart(productId, event) {
    const product = appProducts.find(p => p.id == productId);
    if (!product) {
        console.warn(`Product not found: ${productId}`);
        return;
    }

    // Visual feedback for the button
    let targetBtn = event ? event.currentTarget : null;
    if (targetBtn) {
        targetBtn.classList.add('anim-pop');
        setTimeout(() => targetBtn.classList.remove('anim-pop'), 400);

        const originalContent = targetBtn.innerHTML;
        targetBtn.classList.add('btn-success-state');
        targetBtn.innerHTML = '<i class="fas fa-check"></i> Added';
        
        setTimeout(() => {
            targetBtn.classList.remove('btn-success-state');
            targetBtn.innerHTML = originalContent;
        }, 1500);
    }

    // Trigger 3D Particle Effect if available
    if (event && window.createFlyToCartEffect) {
        window.createFlyToCartEffect(event.clientX, event.clientY);
    }

    const existingItem = currentCart.find(item => item.id == productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        currentCart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(currentCart));
    updateBadges();
    syncDataToFirestore();
    showToast(`${product.name} added to cart!`, 'success');
}

// Add to Wishlist
function toggleWishlist(productId) {
    const product = appProducts.find(p => p.id == productId);
    if (!product) {
        console.warn(`Product not found: ${productId}`);
        return;
    }

    const index = currentWishlist.findIndex(item => item.id == productId);
    if (index > -1) {
        currentWishlist.splice(index, 1);
        showToast(`${product.name} removed from wishlist.`, 'info');
    } else {
        currentWishlist.push(product);
        showToast(`${product.name} added to wishlist!`, 'success');
    }

    // Animation feedback for ONLY wishlist buttons of this product
    const allWishBtns = document.querySelectorAll(`button.wish-btn[data-product-id="${productId}"], button.wish-btn[onclick*="'${productId}'"]`);
    allWishBtns.forEach(btn => {
        btn.classList.add('anim-heart');
        const icon = btn.querySelector('i');
        if (icon) {
            if (index > -1) {
                icon.className = 'far fa-heart';
                btn.classList.remove('wish-active');
            } else {
                icon.className = 'fas fa-heart';
                btn.classList.add('wish-active');
            }
        }
        setTimeout(() => btn.classList.remove('anim-heart'), 600);
    });

    localStorage.setItem('wishlist', JSON.stringify(currentWishlist));
    updateBadges();
    syncDataToFirestore();
    
    // Dispatch event to update icons if on products page
    document.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { productId } }));
}

// Toast Notification System
function showToast(message, type = 'success') {
    if(!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div style="font-weight: 500;">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Search Logic
if (searchInput && searchResults) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const filtered = appProducts.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.category.toLowerCase().includes(query)
        ).slice(0, 5); // Limit to 5 results

        if (filtered.length > 0) {
            searchResults.innerHTML = filtered.map(p => `
                <a href="${window.location.pathname.includes('pages/') ? '' : 'pages/'}product-detail.html?id=${p.id}" style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid var(--border-color); color:inherit; text-decoration:none;">
                    <img src="${typeof resolveImagePath === 'function' ? resolveImagePath(p.image) : p.image}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <div>
                        <div style="font-weight:500; font-size:0.9rem;">${p.name}</div>
                        <div style="color:var(--primary-color); font-weight:700;">₹${(p.price * (1 - p.discount/100)).toFixed(2)}</div>
                    </div>
                </a>
            `).join('');
            searchResults.style.display = 'flex';
        } else {
            searchResults.innerHTML = `<div style="padding:15px; text-align:center; color:var(--text-secondary);">No products found</div>`;
            searchResults.style.display = 'flex';
        }
    });

    // Close search on outside click
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

// Voice Search
const voiceSearchBtn = document.getElementById('voiceSearchBtn');
if (voiceSearchBtn && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
        voiceSearchBtn.classList.add('listening');
        showToast("Listening... Speak now", "info");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const targetInput = document.getElementById('searchInput');
        if(targetInput) {
            targetInput.value = transcript;
            targetInput.dispatchEvent(new Event('input'));
            showToast(`Searching for: "${transcript}"`, "success");
        }
    };

    recognition.onerror = (event) => {
        voiceSearchBtn.classList.remove('listening');
        console.error("Speech Recognition Error:", event.error);
        if(event.error === 'not-allowed') {
            showToast("Microphone access denied.", "error");
        }
    };

    recognition.onend = () => {
        voiceSearchBtn.classList.remove('listening');
    };

    voiceSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            if (voiceSearchBtn.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        } catch(e) {
            console.log("Recognition toggled");
        }
    });
} else if (voiceSearchBtn) {
    voiceSearchBtn.style.display = 'none';
}

// Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function addExternalToCompare(id) {
    let externalList = JSON.parse(localStorage.getItem('compareList')) || [];
    if(externalList.length >= 3) {
        showToast("Compare list full (Max 3).", "info");
    } else if(!externalList.includes(String(id))) {
        externalList.push(String(id));
        localStorage.setItem('compareList', JSON.stringify(externalList));
        showToast("Added to comparison!", "success");
        document.dispatchEvent(new CustomEvent('compareUpdated', { detail: { productId: id } }));
    } else {
        showToast("Product already in comparison.", "info");
    }
}

// Product Card Generator now centralized in products.js to avoid duplication



// Quick View Modal logic
function openQuickView(productId) {
    const product = appProducts.find(p => p.id == productId);
    if (!product) return;

    // Create modal if it doesn't exist
    let modal = document.getElementById('quickViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quickViewModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const discountedPrice = product.price * (1 - product.discount/100);

    modal.innerHTML = `
        <div class="modal-content glass fade-in-up">
            <button class="modal-close" onclick="closeQuickView()"><i class="fas fa-times"></i></button>
            <div class="quick-view-flex">
                <div class="quick-view-image">
                    <img src="${typeof resolveImagePath === 'function' ? resolveImagePath(product.image) : product.image}" alt="${product.name}">
                </div>
                <div class="quick-view-details">
                    <span class="product-category">${product.category}</span>
                    <h2 style="font-size: 2rem; margin-bottom: 10px;">${product.name}</h2>
                    <div class="product-rating" style="margin-bottom: 20px;">
                         ${Array(5).fill(0).map((_, i) => `<i class="${i < Math.floor(product.rating) ? 'fas' : 'far'} fa-star" style="color: #fbbf24;"></i>`).join('')}
                         <span>(${product.reviews} reviews)</span>
                    </div>
                    <p style="color: var(--text-secondary); margin-bottom: 25px; line-height: 1.8;">${product.description}</p>
                    <div style="margin-bottom: 30px;">
                        <span style="font-size: 2rem; font-weight: 800; color: var(--text-primary);">${formatCurrency(discountedPrice)}</span>
                        ${product.discount > 0 ? `<span style="text-decoration: line-through; color: var(--text-secondary); margin-left: 15px;">${formatCurrency(product.price)}</span>` : ''}
                    </div>
                    <div style="display:flex; gap: 15px;">
                        <button class="btn btn-primary btn-lg" style="flex: 1;" onclick="addToCart('${product.id}', event); closeQuickView();">Add to Cart</button>
                        <button class="btn btn-outline" onclick="toggleWishlist('${product.id}'); closeQuickView();"><i class="far fa-heart"></i></button>
                    </div>
                    <a href="${window.location.pathname.includes('pages/') ? '' : 'pages/'}product-detail.html?id=${product.id}" style="display: block; text-align: center; margin-top: 20px; color: var(--primary-color); font-weight: 600;">View Full Details</a>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Close on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) closeQuickView();
    };
}

function closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Add global listener for wishlist updates
document.addEventListener('wishlistUpdated', (e) => {
    const { productId } = e.detail;
    const btns = document.querySelectorAll(`.wishlist-btn[data-id="${productId}"], .action-btn[data-id="${productId}"]`);
    const inWishlist = currentWishlist.some(w => w.id === productId);
    
    btns.forEach(btn => {
        if (inWishlist) {
            btn.classList.add('active');
            btn.style.color = 'var(--danger-color)';
            const icon = btn.querySelector('i');
            if(icon) icon.className = 'fas fa-heart';
        } else {
            btn.classList.remove('active');
            btn.style.color = 'var(--text-secondary)';
            const icon = btn.querySelector('i');
            if(icon) icon.className = 'far fa-heart';
        }
    });
});

// Header Scroll Effect
const mainHeader = document.querySelector('header');
if (mainHeader) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            mainHeader.classList.add('scrolled');
        } else {
            mainHeader.classList.remove('scrolled');
        }
    });
}

// Removed Section Transitions for Simplicity


// Add CSS for 3D transitions and button effects
const premiumStyles = document.createElement('style');
premiumStyles.textContent = `
    .btn, .add-to-cart-btn, .icon-btn {
        position: relative;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease, color 0.3s ease;
    }
    
    .btn:active, .add-to-cart-btn:active, .icon-btn:active {
        transform: scale(0.96);
    }

    .btn-success-state {
        background-color: #10b981 !important;
        color: white !important;
        border-color: #10b981 !important;
        transform: scale(1.05);
    }

    .action-btn.active i {
        color: var(--danger-color);
        filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.5));
    }

    .voice-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 8px;
        transition: all 0.2s;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .voice-btn:hover {
        color: var(--primary-color);
        background: rgba(99, 102, 241, 0.1);
    }
    
    .voice-btn.listening {
        color: var(--danger-color);
        animation: pulse-red 1.5s infinite;
    }
    
    @keyframes pulse-red {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
`;

document.head.appendChild(premiumStyles);

// Premium Studio: Interactive Cursor Spotlight
function initCursorSpotlight() {
    const spotlight = document.createElement('div');
    spotlight.id = 'cursor-spotlight';
    document.body.appendChild(spotlight);

    window.addEventListener('mousemove', (e) => {
        // We use requestAnimationFrame for performance
        requestAnimationFrame(() => {
            spotlight.style.left = `${e.clientX}px`;
            spotlight.style.top = `${e.clientY}px`;
        });
    });
}

// Initial boot
updateBadges();
initCursorSpotlight();
revealOnScroll();

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${window.location.pathname.includes('/pages/') ? '../' : ''}sw.js`)
            .then(reg => console.log('🚀 PWA Service Worker registered.'))
            .catch(err => console.log('❌ PWA Registration failed.', err));
    });
}
