// wishlist.js - Wishlist System Logic

document.addEventListener('DOMContentLoaded', () => {
    const wishlistLayout = document.getElementById('wishlistLayout');
    const clearWishlistBtn = document.getElementById('clearWishlistBtn');

    function renderWishlist() {
        if (currentWishlist.length === 0) {
            wishlistLayout.innerHTML = `
                <div class="empty-wishlist glass">
                    <i class="far fa-heart" style="font-size: 4rem; color: var(--border-color); margin-bottom: 20px;"></i>
                    <h2>Your wishlist is empty</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 30px;">Save items you like here to keep track of them.</p>
                    <a href="products.html" class="btn btn-primary btn-lg">Explore Products</a>
                </div>
            `;
            clearWishlistBtn.style.display = 'none';
            return;
        }

        clearWishlistBtn.style.display = 'block';

        wishlistLayout.innerHTML = `
            <div class="product-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
                ${currentWishlist.map(product => {
                    const discountedPrice = product.price * (1 - product.discount/100);
                    let starsHtml = '';
                    const fullStars = Math.floor(product.rating);
                    for(let i=1; i<=5; i++) {
                        if(i <= fullStars) starsHtml += '<i class="fas fa-star"></i>';
                        else if(i === fullStars + 1 && product.rating % 1 >= 0.5) starsHtml += '<i class="fas fa-star-half-alt"></i>';
                        else starsHtml += '<i class="far fa-star"></i>';
                    }

                    const productObj = (typeof appProducts !== 'undefined' && appProducts.find(p => p.id === product.id)) || product;
                    const imgPath = typeof resolveImagePath === 'function'
                        ? resolveImagePath(productObj.image || product.image || '')
                        : (productObj.image || product.image || '');

                    return `
                        <div class="product-card">
                            ${product.discount > 0 ? `<div class="discount-badge">-${product.discount}%</div>` : ''}
                            <button onclick="removeFromWishlist('${product.id}')" class="wishlist-item-btn" title="Remove from wishlist" style="position:absolute; top:10px; right:10px; z-index:10;">
                                <i class="fas fa-trash"></i>
                            </button>
                            <a href="product-detail.html?id=${product.id}" class="product-image-wrapper" style="display:block;">
                                <img src="${imgPath}" alt="${product.name}" class="product-image" onerror="this.style.opacity='0.3'">
                            </a>
                            <div class="product-info">
                                <span class="product-category">${product.category}</span>
                                <a href="product-detail.html?id=${product.id}" style="color:inherit; text-decoration:none;">
                                    <h3 class="product-title">${product.name}</h3>
                                </a>
                                <div class="product-rating">
                                    ${starsHtml}
                                    <span>(${product.reviews})</span>
                                </div>
                                <div class="product-footer" style="margin-bottom:15px;">
                                    <div>
                                        <span class="product-price">${formatCurrency(discountedPrice)}</span>
                                        ${product.discount > 0 ? `<span class="old-price">${formatCurrency(product.price)}</span>` : ''}
                                    </div>
                                </div>
                                <button class="btn btn-primary move-to-cart-btn" onclick="moveToCart('${product.id}', event)">
                                    <i class="fas fa-cart-arrow-down" style="margin-right:8px;"></i> Move to Cart
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Bind to window for absolute inline calls
    window.removeFromWishlist = function(id) {
        currentWishlist = currentWishlist.filter(item => item.id !== id);
        localStorage.setItem('wishlist', JSON.stringify(currentWishlist));
        updateBadges();
        if (typeof syncDataToFirestore === 'function') syncDataToFirestore();
        renderWishlist();
        showToast('Item removed from wishlist', 'info');
    };

    window.clearWishlist = function() {
        if(confirm("Are you sure you want to clear your entire wishlist?")) {
            currentWishlist = [];
            localStorage.setItem('wishlist', JSON.stringify(currentWishlist));
            updateBadges();
            if (typeof syncDataToFirestore === 'function') syncDataToFirestore();
            renderWishlist();
            showToast('Wishlist cleared', 'info');
        }
    };

    window.moveToCart = function(id, event) {
        // Add to cart
        addToCart(id, event);
        
        // Remove from wishlist
        currentWishlist = currentWishlist.filter(item => item.id !== id);
        localStorage.setItem('wishlist', JSON.stringify(currentWishlist));
        
        updateBadges();
        if (typeof syncDataToFirestore === 'function') syncDataToFirestore();
        renderWishlist();
    };

    // Listen for data load
    document.addEventListener('productsLoaded', () => {
        renderWishlist();
    });

    renderWishlist();
});
