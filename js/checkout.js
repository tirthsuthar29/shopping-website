// checkout.js - Checkout and processing logic

document.addEventListener('DOMContentLoaded', () => {

    // 1. Redirect to cart if empty
    if(currentCart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    // 2. Auth State Handling
    let firebaseUser = null;
    firebase.auth().onAuthStateChanged(user => {
        firebaseUser = user;
        if(user) {
            document.getElementById('chkFName').value = user.displayName ? user.displayName.split(' ')[0] : '';
            document.getElementById('chkEmail').value = user.email || '';
            // Pre-fill from Firestore if available
            db.collection('users').doc(user.uid).get().then(doc => {
                if(doc.exists) {
                    const data = doc.data();
                    if(data.firstName) document.getElementById('chkFName').value = data.firstName;
                    if(data.lastName) document.getElementById('chkLName').value = data.lastName;
                    if(data.phone) document.getElementById('chkPhone').value = data.phone;
                    if(data.address) document.getElementById('chkAddress').value = data.address;
                }
            });
        }
    });

    // 3. Render Order Summary
    const checkoutItemsList = document.getElementById('checkoutItemsList');
    let subtotal = 0;
    let totalDiscount = 0;

    checkoutItemsList.innerHTML = currentCart.map(item => {
        subtotal += item.price * item.quantity;
        totalDiscount += (item.price * (item.discount/100)) * item.quantity;
        const discountedPrice = item.price * (1 - item.discount/100);

        return `
            <div class="summary-item">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${typeof resolveImagePath === 'function' ? resolveImagePath(item.image) : item.image}" alt="" onerror="this.src='https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'">
                    <div>
                        <div style="font-weight:500; font-size:0.9rem; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
                        <div style="color:var(--text-secondary); font-size:0.8rem;">Qty: ${item.quantity}</div>
                    </div>
                </div>
                <div style="font-weight:600;">${formatCurrency(discountedPrice * item.quantity)}</div>
            </div>
        `;
    }).join('');

    const finalPrice = subtotal - totalDiscount;
    const tax = finalPrice * 0.08;
    const absoluteTotal = finalPrice + tax;

    document.getElementById('chkSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('chkDiscount').textContent = `-${formatCurrency(totalDiscount)}`;
    document.getElementById('chkTax').textContent = formatCurrency(tax);
    document.getElementById('chkTotal').textContent = formatCurrency(absoluteTotal);

    // 4. Payment Method Toggles
    const methods = document.querySelectorAll('.payment-method');
    const cardForm = document.getElementById('cardDetailsForm');
    const paypalForm = document.getElementById('paypalDetailsForm');
    const codForm = document.getElementById('codDetailsForm');
    let activeMethod = 'credit';

    methods.forEach(m => {
        m.addEventListener('click', () => {
            // reset
            methods.forEach(me => me.classList.remove('active'));
            cardForm.style.display = 'none';
            paypalForm.style.display = 'none';
            codForm.style.display = 'none';
            
            // disable required attrs in card form temporarily
            const cardInputs = cardForm.querySelectorAll('input');
            cardInputs.forEach(i => i.removeAttribute('required'));

            // activate
            m.classList.add('active');
            activeMethod = m.dataset.method;
            
            if(activeMethod === 'credit') {
                cardForm.style.display = 'block';
                cardInputs.forEach(i => i.setAttribute('required', 'true'));
            } else if (activeMethod === 'paypal') {
                paypalForm.style.display = 'block';
            } else {
                codForm.style.display = 'block';
            }
        });
    });

    // 5. Submit Order
    const checkoutForm = document.getElementById('checkoutForm');
    const loaderOverlay = document.getElementById('loaderOverlay');

    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Show mock loading spinner
        loaderOverlay.style.display = 'flex';

        setTimeout(() => {
            // Generate Order
            const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            
            const shipping = {
                firstName: document.getElementById('chkFName').value,
                lastName: document.getElementById('chkLName').value,
                email: document.getElementById('chkEmail').value,
                phone: document.getElementById('chkPhone').value,
                address: document.getElementById('chkAddress').value,
                city: document.getElementById('chkCity').value,
                zip: document.getElementById('chkZip').value,
            };

            const order = {
                id: orderId,
                date: new Date().toISOString(),
                status: 'Placed',
                items: [...currentCart],
                totalAmount: absoluteTotal,
                tax: tax,
                shipping: shipping,
                paymentMethod: activeMethod,
                userId: firebaseUser ? firebaseUser.uid : 'guest',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Save order to Firestore
            if (typeof db === 'undefined') {
                console.error("Firestore DB not found!");
                showToast("Configuration error. Please try again later.", "error");
                loaderOverlay.style.display = 'none';
                return;
            }

            db.collection('orders').add(order)
                .then(() => {
                    console.log("ðŸ›’ Order saved successfully:", orderId);
                    // Clear cart
                    localStorage.setItem('cart', JSON.stringify([]));
                    // Success alert
                    alert(`Order #${orderId} placed successfully! Thank you for shopping with NOVATECH.`);
                    // Redirect to success
                    window.location.href = `order-confirmation.html?id=${orderId}`;
                })
                .catch((error) => {
                    console.error("Error saving order:", error);
                    loaderOverlay.style.display = 'none';
                    showToast("Failed to place order. Please try again.", "error");
                });

        }, 2000); // 2 second simulated delay
    });
});
