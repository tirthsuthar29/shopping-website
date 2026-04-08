// cart.js - Shopping Cart Logic

document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartLayout = document.getElementById('cartLayout');
    const summaryCard = document.getElementById('summaryCard');

    function renderCart() {
        if (currentCart.length === 0) {
            cartLayout.innerHTML = `
                <div class="empty-cart glass">
                    <i class="fas fa-shopping-basket" style="font-size: 4rem; color: var(--border-color); margin-bottom: 20px;"></i>
                    <h2>Your cart is empty</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 30px;">Looks like you haven't added anything to your cart yet.</p>
                    <a href="products.html" class="btn btn-primary btn-lg">Start Shopping</a>
                </div>
            `;
            return;
        }

        // Show/Hide Clear Cart button based on cart content
        const clearBtn = document.getElementById('clearCartBtn');
        if(clearBtn) clearBtn.style.display = 'block';

        // Render Items
        cartItemsContainer.innerHTML = currentCart.map(item => {
            const discountedPrice = item.price * (1 - item.discount/100);
            return `
                <div class="cart-item glass">
                    <a href="product-detail.html?id=${item.id}">
                        <img src="${typeof resolveImagePath === 'function' ? resolveImagePath((appProducts && appProducts.find(p => p.id === item.id))?.image || item.image || '') : (item.image || '')}" alt="${item.name}" onerror="this.style.opacity='0.3'">
                    </a>
                    <div class="item-details">
                        <a href="product-detail.html?id=${item.id}" style="text-decoration:none; color:inherit;">
                            <h3 class="item-title">${item.name}</h3>
                        </a>
                        <div class="item-price">${formatCurrency(discountedPrice)} <span style="font-size:0.9rem; color:var(--text-secondary); text-decoration:line-through; font-weight:normal; margin-left:10px;">${item.discount > 0 ? formatCurrency(item.price) : ''}</span></div>
                        <div style="margin-top:15px; display:flex; justify-content:space-between; align-items:center;">
                            <div class="quantity-control">
                                <button class="quantity-btn" onclick="updateItemQuantity('${item.id}', -1)">-</button>
                                <span style="font-weight:600; width:30px; text-align:center;">${item.quantity}</span>
                                <button class="quantity-btn" onclick="updateItemQuantity('${item.id}', 1)">+</button>
                            </div>
                            <button class="remove-btn" onclick="removeFromCart('${item.id}')" title="Remove Item"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Calculate Totals
        let subtotal = 0;
        let totalDiscount = 0;
        let totalItems = 0;

        currentCart.forEach(item => {
            subtotal += item.price * item.quantity;
            totalDiscount += (item.price * (item.discount/100)) * item.quantity;
            totalItems += item.quantity;
        });

        const finalPrice = subtotal - totalDiscount;
        const tax = finalPrice * 0.08; // 8% simulated tax
        const absoluteTotal = finalPrice + tax;

        // Update Summary DOM
        document.getElementById('summaryCount').textContent = totalItems;
        document.getElementById('summarySubtotal').textContent = formatCurrency(subtotal);
        document.getElementById('summaryDiscount').textContent = `-${formatCurrency(totalDiscount)}`;
        document.getElementById('summaryTax').textContent = formatCurrency(tax);
        document.getElementById('summaryTotal').textContent = formatCurrency(absoluteTotal);
    }

    // Bind logic to window so it can be called from inline onclicks
    window.updateItemQuantity = function(id, change) {
        const itemIndex = currentCart.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            currentCart[itemIndex].quantity += change;
            if (currentCart[itemIndex].quantity <= 0) {
                currentCart.splice(itemIndex, 1);
            }
            localStorage.setItem('cart', JSON.stringify(currentCart));
            updateBadges();
            if (typeof syncDataToFirestore === 'function') syncDataToFirestore();
            renderCart();
        }
    };

    window.removeFromCart = function(id) {
        currentCart = currentCart.filter(item => item.id !== id);
        localStorage.setItem('cart', JSON.stringify(currentCart));
        updateBadges();
        if (typeof syncDataToFirestore === 'function') syncDataToFirestore();
        renderCart();
        showToast('Item removed from cart', 'info');
    };

    window.clearCart = function() {
        if (confirm('Are you sure you want to clear your entire cart?')) {
            currentCart = [];
            localStorage.setItem('cart', JSON.stringify(currentCart));
            updateBadges();
            if (typeof syncDataToFirestore === 'function') syncDataToFirestore();
            renderCart();
            showToast('Cart cleared', 'info');
        }
    };

    // Attach listener to clear cart button
    const clearBtn = document.getElementById('clearCartBtn');
    if(clearBtn) {
        clearBtn.addEventListener('click', () => window.clearCart());
        // Initial visibility check
        clearBtn.style.display = currentCart.length > 0 ? 'block' : 'none';
    }

    // Listen for data load
    document.addEventListener('productsLoaded', () => {
        renderCart();
    });

    // Initial Render
    renderCart();
});
