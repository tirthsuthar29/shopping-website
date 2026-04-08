// products.js - Global Product Hub (100% LIVE FIRESTORE ONLY)
window.appProducts = window.appProducts || [];

// --- PATH RESOLUTION HELPER ---
const resolveImagePath = (rawPath) => {
    if (!rawPath) return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800';
    if (rawPath.startsWith('http') || rawPath.startsWith('data:')) return rawPath;
    const inSubdir = window.location.pathname.includes('/pages/');
    const clean = rawPath.replace(/^(\.\.\/|\.\/)/, '');
    return inSubdir ? '../' + clean : clean;
};

// --- PRODUCT CARD GENERATOR ---
function createProductCard(product, pathPrefix = '', viewMode = 'grid') {
    const discountedPrice = (product.price * (1 - (product.discount || 0) / 100)).toFixed(2);
    const imageUrl = resolveImagePath(product.image);
    const pid = product.id; // Using pure Firestore ID

    if (viewMode === 'list') {
        return `
            <div class="product-card list-view">
                <div class="product-image-wrapper">
                    <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'">
                </div>
                <div class="product-info">
                    <span class="product-category" style="color:#3b82f6; font-weight:700; text-transform:uppercase; font-size:0.75rem; letter-spacing:1px;">${product.category}</span>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">
                        <div class="discounted-group" style="display:flex; flex-direction:column;">
                            <span class="price-current" style="color:#2563eb; font-weight:800; font-size:1.4rem;">₹${discountedPrice}</span>
                            ${product.discount > 0 ? `<span class="price-old" style="text-decoration: line-through; color:#94a3b8; font-size:0.8rem; margin-top:2px;">M.R.P: ₹${product.price}</span>` : ''}
                        </div>
                        ${product.discount > 0 ? `<div class="sale-tag-box" style="background:#ef4444; color:white; padding:4px 10px; border-radius:4px; font-size:0.75rem; font-weight:800; display:inline-block; margin-top:10px;">SALE</div>` : ''}
                    </div>
                    <div class="product-footer" style="border:none; padding:0; margin-top:15px; display:flex; gap:10px;">
                        <button class="btn btn-primary add-to-cart-btn" onclick="addToCart('${pid}')" style="background:#2563eb; border-radius:10px;">
                            <i class="fas fa-shopping-cart" style="margin-right:8px;"></i> Add to Cart
                        </button>
                        <a href="${pathPrefix}product-detail.html?id=${pid}" class="btn btn-outline" style="border-radius:10px;">Details</a>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="product-card">
            <div class="product-actions-overlay" style="position: absolute; top: 15px; right: 15px; display: flex; flex-direction: column; gap: 8px; z-index: 20; transition: all 0.3s ease;">
                <button class="icon-btn action-btn wish-btn" data-product-id="${pid}" onclick="toggleWishlist('${pid}', this)" title="Add to Wishlist">
                    <i class="far fa-heart" style="font-size:1.1rem;"></i>
                </button>
                <button class="icon-btn action-btn" onclick="addExternalToCompare('${pid}')" title="Compare">
                    <i class="fas fa-columns" style="font-size:1.1rem;"></i>
                </button>
                <button class="icon-btn action-btn" onclick="openQuickView('${pid}')" title="Quick View">
                    <i class="far fa-eye" style="font-size:1.1rem;"></i>
                </button>
            </div>
            ${product.discount > 0 ? `<span class="badge-overlay new-badge" style="position: absolute; top: 15px; left: 15px; background: #06b6d4; color: white; padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; z-index: 21;">-${product.discount}%</span>` : 
              (product.isTrending ? '<span class="badge-overlay new-badge" style="position: absolute; top: 15px; left: 15px; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; z-index: 21;">TRENDING</span>' : '')}
            <div class="product-image-wrapper" onclick="window.location.href='${pathPrefix}product-detail.html?id=${pid}'" style="cursor:pointer; position:relative; background:#f8fafc; height:240px; display:flex; align-items:center; justify-content:center;">
                <img src="${imageUrl}" alt="${product.name}" style="max-width:85%; max-height:85%; object-fit:contain;" onerror="this.src='https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'">
            </div>
            <div class="product-info" style="padding:20px;">
                <span class="product-category" style="color:var(--primary-color); font-weight:700; text-transform:uppercase; font-size:0.75rem; letter-spacing:1px; display:block; margin-bottom:8px;">${product.category}</span>
                <h3 class="product-title" onclick="window.location.href='${pathPrefix}product-detail.html?id=${pid}'" style="cursor:pointer; font-size:1.05rem; font-weight:700; color:var(--text-primary); margin-bottom:10px; line-height:1.4; height:2.8em; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${product.name}</h3>
                
                <div class="product-rating" style="margin-bottom:15px; display:flex; align-items:center; gap:4px;">
                    <div style="color:#f59e0b; display:flex; gap:2px;">
                        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
                    </div>
                    <span style="color:#64748b; font-size:0.85rem; font-weight:600; margin-left:4px;">(${product.reviews.toLocaleString()})</span>
                </div>
                
                <div style="border-top:1px solid #f1f5f9; padding-top:15px; display:flex; justify-content:space-between; align-items:flex-end;">
                    <div>
                        <div class="price-current" style="color:#2563eb; font-size:1.4rem; font-weight:800; margin-bottom:4px;">₹${discountedPrice}</div>
                        ${product.discount > 0 ? `<div class="price-old" style="text-decoration:line-through; color:#94a3b8; font-size:0.8rem; font-weight:500;">M.R.P: ₹${product.price}</div>` : ''}
                        ${product.discount > 0 ? `<div class="sale-tag-box" style="background:#ef4444; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:800; display:inline-block; margin-top:8px;">SALE</div>` : ''}
                    </div>
                    <button class="cart-btn-square" onclick="addToCart('${pid}', event)" style="background:#2563eb; color:white; border:none; width:45px; height:45px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(37, 99, 235, 0.3); transition:all 0.3s;">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.createProductCard = createProductCard;
window.resolveImagePath = resolveImagePath;

// --- FIRESTORE SYNC ---
async function fetchProducts() {
    if (typeof db === 'undefined') return;
    
    // Real-time listener: ONLY from Firestore
    db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        appProducts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: data.id || doc.id,
                firestoreId: doc.id,
                ...data
            };
        });
        localStorage.setItem('products', JSON.stringify(appProducts));
        triggerRender();
        console.log("✅ LIVE PRODUCTS SYNCED.");
    }, error => {
        console.error("❌ Firestore Error:", error);
    });
}

if (typeof db !== 'undefined') fetchProducts();

// --- RENDER TRIGGER ---
function triggerRender() {
    if (typeof renderHomePageProducts === 'function') renderHomePageProducts();
    if (typeof renderProductsPage === 'function') renderProductsPage();
    if (typeof renderProductDetailPage === 'function') renderProductDetailPage();
    document.dispatchEvent(new CustomEvent('productsLoaded', { detail: appProducts }));
}

triggerRender();

// Init common storage
if (!localStorage.getItem('cart')) localStorage.setItem('cart', JSON.stringify([]));
if (!localStorage.getItem('wishlist')) localStorage.setItem('wishlist', JSON.stringify([]));
if (!localStorage.getItem('currentUser')) localStorage.setItem('currentUser', JSON.stringify(null));
window.appProducts = appProducts;
