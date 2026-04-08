// product-detail.js - Logic for viewing a single product
let renderProductDetailPage;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    let redirectTimer = null;

    renderProductDetailPage = async function() {
        const wrapper = document.getElementById('productDetailWrapper');
        if (!wrapper) return;

        // Default Skeleton
        const showSkeleton = () => {
             wrapper.innerHTML = `
                <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:60px; margin:40px 0;">
                    <div style="height:500px; background:rgba(255,255,255,0.05); border-radius:20px; animation: pulse 1.5s infinite;"></div>
                    <div>
                        <div style="height:40px; background:rgba(255,255,255,0.05); width:70%; margin-bottom:20px; animation: pulse 1.5s infinite;"></div>
                        <div style="height:20px; background:rgba(255,255,255,0.05); width:40%; margin-bottom:30px; animation: pulse 1.5s infinite;"></div>
                        <div style="height:150px; background:rgba(255,255,255,0.05); margin-bottom:20px; animation: pulse 1.5s infinite;"></div>
                    </div>
                </div>
            `;
        };

        if (!appProducts || appProducts.length === 0) {
            const cached = localStorage.getItem('products');
            if (cached) { appProducts = JSON.parse(cached); } 
            else { showSkeleton(); return; }
        }
        
        // Comprehensive Lookup
        const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let product = appProducts.find(p => String(p.id) === productId || (p.name && normalize(p.name) === productId));

        if (!product && typeof db !== 'undefined') {
            showSkeleton();
            try {
                const doc = await db.collection('products').doc(productId).get();
                if (doc.exists) {
                    product = { id: doc.id, ...doc.data() };
                } else {
                    const qSnap = await db.collection('products').where('id', '==', productId).get();
                    if(!qSnap.empty) product = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
                }
            } catch (e) { }
        }

        if (!product) {
            showSkeleton();
            if(!redirectTimer) {
                redirectTimer = setTimeout(() => {
                    const latest = appProducts.find(p => String(p.id) === productId || (p.name && normalize(p.name) === productId));
                    if (!latest) {
                        redirectTimer = null;
                        // Retry lookup one more time in 5s
                        renderProductDetailPage();
                    } else {
                        redirectTimer = null;
                        renderProductDetailPage();
                    }
                }, 5000);
            }
            return;
        }

        // --- SUCCESS: Clear all timers and render ---
        if(redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }

        document.getElementById('reviewsSection').style.display = 'block';

        // 1. Update Breadcrumbs and Title
        document.title = `${product.name} - NOVATECH`;
        const breadCategory = document.getElementById('breadCategory');
        if (breadCategory) {
            breadCategory.textContent = product.category;
            breadCategory.href = `products.html?category=${product.category}`;
        }
        const breadName = document.getElementById('breadName');
        if (breadName) breadName.textContent = product.name;

        // 2. Render Product Details
        const discountedPrice = product.price * (1 - product.discount/100);
        // wrapper is already defined at top of function
        
        // Generate star ratings
        let starsHtml = '';
        const fullStars = Math.floor(product.rating);
        for(let i=1; i<=5; i++) {
            if(i <= fullStars) starsHtml += '<i class="fas fa-star"></i>';
            else if(i === fullStars + 1 && product.rating % 1 >= 0.5) starsHtml += '<i class="fas fa-star-half-alt"></i>';
            else starsHtml += '<i class="far fa-star"></i>';
        }

        const inWishlist = currentWishlist.some(w => w.id === product.id);
        const inStock = product.stock > 0;

        wrapper.innerHTML = `
            <div class="product-detail-container">
                <!-- Left: Gallery -->
                <div class="gallery-container">
                    <div class="main-image-wrapper" id="imageZoomWrapper">
                        <img src="${typeof resolveImagePath === 'function' ? resolveImagePath(product.image) : product.image}" id="mainImage" class="main-image" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'">
                        ${product.image360 ? `
                        <button class="btn-360" id="start360View" title="360 Degree View">
                            <i class="fas fa-sync-alt"></i> 360Â° View
                        </button>` : ''}
                    </div>
                    <div class="thumbnail-list">
                        <img src="${typeof resolveImagePath === 'function' ? resolveImagePath(product.image) : product.image}" class="thumbnail active" onclick="changeImage(this)" title="Front View">
                        ${product.imageTop ? `<img src="${typeof resolveImagePath === 'function' ? resolveImagePath(product.imageTop) : product.imageTop}" class="thumbnail" onclick="changeImage(this)" title="Top View">` : ''}
                        ${product.imageBack ? `<img src="${typeof resolveImagePath === 'function' ? resolveImagePath(product.imageBack) : product.imageBack}" class="thumbnail" onclick="changeImage(this)" title="Back View">` : ''}
                        ${product.imageSide ? `<img src="${typeof resolveImagePath === 'function' ? resolveImagePath(product.imageSide) : product.imageSide}" class="thumbnail" onclick="changeImage(this)" title="Side View">` : ''}
                    </div>
                </div>

                <!-- Right: Details -->
                <div class="product-info-full">
                    <div class="product-meta">
                        <span class="category-badge">${product.category}</span>
                        <div class="stock-status ${inStock ? 'in-stock' : 'out-of-stock'}">
                            <i class="fas ${inStock ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                            ${inStock ? `In Stock (${product.stock} units)` : 'Out of Stock'}
                        </div>
                    </div>

                    <h1 class="product-title-large">${product.name}</h1>
                    
                    <div class="rating-large">
                        ${starsHtml}
                        <span style="color:var(--text-secondary); font-size:1rem;">(${product.reviews} customer reviews)</span>
                    </div>

                    <div class="price-large" style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
                        <span style="font-size:2.5rem; font-weight:800; color:var(--primary-color);">₹${discountedPrice.toLocaleString()}</span>
                        ${product.discount > 0 ? `
                            <div style="display:flex; flex-direction:column;">
                                <span class="old" style="font-size:1.4rem; color:var(--text-secondary); text-decoration:line-through; font-weight:400;">M.R.P: ₹${product.price}</span>
                                <span class="discount-badge-large" style="background:#ef4444; color:white; padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:700; width:fit-content;">-${product.discount}% OFF</span>
                            </div>` : ''}
                    </div>

                    <p class="description">${product.description}</p>

                    <div class="specs-grid">
                        <div class="spec-item">
                            <span class="spec-label">Brand</span>
                            <span class="spec-value">${product.specs.brand}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Warranty</span>
                            <span class="spec-value">${product.specs.warranty}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Color</span>
                            <span class="spec-value">${product.specs.color}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Condition</span>
                            <span class="spec-value">Brand New</span>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="btn btn-primary btn-large" onclick="addToCart('${product.id}', event)" ${!inStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                            <i class="fas fa-shopping-cart" style="margin-right:8px;"></i> ${inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                        <button class="btn btn-outline btn-large" onclick="toggleWishlist('${product.id}')" id="detailWishlistBtn">
                            <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i> ${inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        </button>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
                        <button class="btn btn-outline" onclick="addExternalToCompare('${product.id}')"><i class="fas fa-exchange-alt" style="margin-right:8px;"></i> Compare</button>
                        <button class="btn btn-outline" onclick="shareProduct('${product.id}', '${product.name.replace(/'/g, "\\'")}')" style="background:rgba(37, 211, 102, 0.1); color:#25D366; border-color:rgba(37, 211, 102, 0.3);"><i class="fas fa-share-alt" style="margin-right:8px;"></i> Share</button>
                    </div>

                    <div style="border-top: 1px solid var(--border-color); padding-top: 30px; margin-top: 30px;">
                        <h3 style="font-size:1.4rem; font-weight:700; color:var(--text-primary); margin-bottom: 20px;">About this item</h3>
                        <ul style="padding-left: 20px; color: var(--text-secondary); line-height: 1.8; display: flex; flex-direction: column; gap: 12px; list-style-type: disc;">
                            ${product.description.split('.').filter(s => s.trim().length > 10).map(s => `<li>${s.trim()}.</li>`).join('') || `<li>High-quality ${product.name} from ${product.specs?.brand || 'Premium Brand'}.</li><li>Engineered for professional performance and durability.</li><li>Full 1-year manufacturer warranty included.</li>`}
                        </ul>
                    </div>

                    <div style="margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; border-top: 1px solid var(--border-color); padding-top: 30px;">
                        <div style="text-align:center;">
                            <i class="fas fa-truck" style="font-size:1.5rem; color:var(--primary-color); margin-bottom:10px;"></i>
                            <div style="font-size:0.8rem; font-weight:600;">Fast Delivery</div>
                        </div>
                        <div style="text-align:center;">
                            <i class="fas fa-undo" style="font-size:1.5rem; color:var(--primary-color); margin-bottom:10px;"></i>
                            <div style="font-size:0.8rem; font-weight:600;">Easy Returns</div>
                        </div>
                        <div style="text-align:center;">
                            <i class="fas fa-shield-alt" style="font-size:1.5rem; color:var(--primary-color); margin-bottom:10px;"></i>
                            <div style="font-size:0.8rem; font-weight:600;">Secure Warranty</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Setup Image Zoom Hover Effect (after render)
        const zoomWrapper = document.getElementById('imageZoomWrapper');
        const mainImg = document.getElementById('mainImage');
        if (zoomWrapper && mainImg) {
            zoomWrapper.addEventListener('mousemove', (e) => {
                const { left, top, width, height } = zoomWrapper.getBoundingClientRect();
                const x = (e.clientX - left) / width * 100;
                const y = (e.clientY - top) / height * 100;
                mainImg.style.transformOrigin = `${x}% ${y}%`;
                mainImg.style.transform = 'scale(2)';
            });
            zoomWrapper.addEventListener('mouseleave', () => {
                mainImg.style.transform = 'scale(1)';
                mainImg.style.transformOrigin = 'center';
            });
        }

        // 360 View Logic
        const btn360 = document.getElementById('start360View');
        if (btn360 && product.image360) {
            btn360.addEventListener('click', (e) => {
                e.stopPropagation();
                open360View(product.image360);
            });
        }

        // Real Firestore Reviews
        const reviewsList = document.getElementById('reviewsList');
        if (reviewsList) {
            fetchReviews(productId);
        }

        // Related Products
        const relatedGrid = document.getElementById('relatedGrid');
        if (relatedGrid) {
            const related = appProducts
                .filter(p => p.category === product.category && p.id !== product.id)
                .sort(() => 0.5 - Math.random())
                .slice(0, 4);
            if(related.length > 0) {
                relatedGrid.innerHTML = related.map(p => createProductCard(p, '')).join('');
            } else if (document.querySelector('.related-products')) {
                document.querySelector('.related-products').style.display = 'none';
            }
        }

        // Customers Also Bought - Hybrid Logic
        const alsoBoughtGrid = document.getElementById('alsoBoughtGrid');
        if (alsoBoughtGrid) {
            // Priority 1: Same Brand
            // Priority 2: Same Category
            // Global Fallback: Trending
            let alsoBought = appProducts.filter(p => p.id !== product.id && p.specs.brand === product.specs.brand);
            
            if (alsoBought.length < 4) {
                const sameCategory = appProducts.filter(p => p.id !== product.id && p.category === product.category && !alsoBought.find(a => a.id === p.id));
                alsoBought = [...alsoBought, ...sameCategory];
            }

            if (alsoBought.length < 4) {
                const trending = appProducts.filter(p => (p.isTrending || p.rating >= 4.5) && p.id !== product.id && !alsoBought.find(a => a.id === p.id));
                alsoBought = [...alsoBought, ...trending];
            }

            alsoBought = alsoBought.sort(() => 0.5 - Math.random()).slice(0, 4);

            if (alsoBought.length > 0) {
                alsoBoughtGrid.innerHTML = alsoBought.map(p => createProductCard(p, '')).join('');
                if (document.querySelector('.also-bought-section')) document.querySelector('.also-bought-section').style.display = 'block';
            } else if (document.querySelector('.also-bought-section')) {
                document.querySelector('.also-bought-section').style.display = 'none';
            }
        }
    };

    async function fetchReviews(pid) {
        const reviewsList = document.getElementById('reviewsList');
        try {
            // Simplify query to avoid needing manual Firebase indexes
            const snapshot = await db.collection('reviews')
                .where('productId', '==', pid)
                .get();

            if (snapshot.empty) {
                reviewsList.innerHTML = '<p style="color:var(--text-secondary);">No reviews yet. Be the first to review!</p>';
                return;
            }

            // Sort locally in Javascript to avoid needing a Firebase composite index
            const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            reviews.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

            reviewsList.innerHTML = reviews.map(r => {
                const rDate = r.timestamp ? new Date(r.timestamp.toDate()).toLocaleDateString() : 'N/A';
                let sHtml = '';
                for(let j=0; j<5; j++) sHtml += (j < r.rating) ? '<i class="fas fa-star" style="color:var(--warning-color)"></i>' : '<i class="far fa-star" style="color:var(--warning-color)"></i>';
                
                return `
                    <div class="review-card">
                        <div class="review-header">
                            <span class="reviewer-name"><i class="fas fa-user-circle" style="color:var(--text-secondary); margin-right:5px;"></i> ${r.userName}</span>
                            <span class="review-date">${rDate}</span>
                        </div>
                        <div style="margin-bottom: 10px;">${sHtml}</div>
                        <p style="color:var(--text-secondary); margin-bottom:15px;">${r.text}</p>
                        ${r.image ? `<img src="${r.image}" style="width:100%; max-width:300px; border-radius:12px; margin-top:10px; display:block;" alt="Review Photo">` : ''}
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error("Error fetching reviews:", error);
            reviewsList.innerHTML = '<p style="color:var(--danger-color);">Could not load reviews. Check console for details.</p>';
        }
    }


    // Review Image Preview
    const reviewImageInput = document.getElementById('reviewImageInput');
    const reviewImgElem = document.getElementById('reviewImgElem');
    const reviewImagePreview = document.getElementById('reviewImagePreview');
    const reviewImageName = document.getElementById('reviewImageName');
    let reviewImageBase64 = null;

    if(reviewImageInput) {
        reviewImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                reviewImageName.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    reviewImageBase64 = event.target.result;
                    reviewImgElem.src = reviewImageBase64;
                    reviewImagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Review Form Handling
    const writeReviewForm = document.getElementById('writeReviewForm');
    if(writeReviewForm) {
        writeReviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('reviewName').value;
            const rating = parseInt(document.getElementById('reviewRating').value);
            const text = document.getElementById('reviewText').value;

            const success = await postReview({
                productId: String(productId),
                userName: name,
                rating: rating,
                text: text,
                image: reviewImageBase64
            });

            if(success) {
                showToast("✨ Your insight has been recorded! Thank you.", "success");
                writeReviewForm.reset();
                reviewImagePreview.style.display = 'none';
                reviewImageBase64 = null;
                reviewImageName.textContent = "No file selected";
                setTimeout(() => fetchReviews(productId), 500); // Wait for Firestore sync
            } else {
                showToast("⚠️ Submission failed. Please check your connection.", "error");
            }
        });
    }


    // Listener for wishlist button in detail page
    document.addEventListener('wishlistUpdated', (e) => {
        const productIdAtHand = urlParams.get('id');
        if(e.detail.productId === productIdAtHand) {
            const btn = document.getElementById('detailWishlistBtn');
            if (btn) {
                const isW = currentWishlist.some(w => w.id === productIdAtHand);
                btn.innerHTML = `<i class="${isW ? 'fas' : 'far'} fa-heart"></i> ${isW ? 'Remove from Wishlist' : 'Add to Wishlist'}`;
            }
        }
    });

    // Initial render
    renderProductDetailPage();

    // Re-render when products arrive from Firestore - DEBOUNCED to avoid 5-6x flickering
    let reRenderTimeout;
    document.addEventListener('productsLoaded', () => {
        clearTimeout(reRenderTimeout);
        reRenderTimeout = setTimeout(() => {
            console.log("🔄 Products stable, re-render triggered.");
            renderProductDetailPage();
        }, 300);
    });
});

// Global function to change main image
window.changeImage = function(elem) {
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    elem.classList.add('active');
    document.getElementById('mainImage').src = elem.src;
}

// 360 Viewer Implementation using Pannellum
let currentPanorama = null;

window.open360View = function(imgSrc) {
    const overlay = document.getElementById('viewer360');
    if (!overlay) return;
    
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // prevent scrolling
    
    if (currentPanorama) {
        currentPanorama.destroy();
    }
    
    // Slight delay to ensure container is visible for calculation
    setTimeout(() => {
        currentPanorama = pannellum.viewer('panorama-container', {
            type: 'equirectangular',
            panorama: imgSrc,
            autoLoad: true,
            compass: false,
            showZoomCtrl: true
        });
    }, 100);
};

window.close360View = function() {
    const overlay = document.getElementById('viewer360');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    if(currentPanorama) {
        currentPanorama.destroy();
        currentPanorama = null;
    }
};

// Share Product Logic
window.shareProduct = function(id, name) {
    const shareData = {
        title: name + ' - NOVATECH Electronics',
        text: 'Check out this amazing ' + name + ' on NOVATECH!',
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showToast("Thanks for sharing!", "success"))
            .catch((err) => console.log('Error sharing', err));
    } else {
        // Fallback: Copy to clipboard and open WhatsApp
        const shareUrl = window.location.href;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("Link copied to clipboard!", "success");
            const waUrl = `https://wa.me/?text=Check out this amazing ${encodeURIComponent(name)} on NOVATECH: ${encodeURIComponent(shareUrl)}`;
            window.open(waUrl, '_blank');
        });
    }
};
