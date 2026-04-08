// profile.js - Logic for User Profile Page

document.addEventListener('DOMContentLoaded', () => {
    const sections = ['overview', 'orders', 'business', 'settings'];
    const navBtns = document.querySelectorAll('.profile-nav-btn[data-target]');
    
    // Tab Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            sections.forEach(s => {
                document.getElementById(`${s}Section`).style.display = s === target ? 'block' : 'none';
            });
        });
    });

    // Firebase Auth State
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Fetch user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            updateUI(data, user);
            
            // Check Seller Status
            if (data.role === 'seller') {
                document.getElementById('upgradeToSeller').style.display = 'none';
                document.getElementById('sellerDashboard').style.display = 'block';
                fetchSellerProducts(user.uid);
            } else {
                document.getElementById('upgradeToSeller').style.display = 'block';
                document.getElementById('sellerDashboard').style.display = 'none';
            }
        } else {
            // Fallback for new users
            updateUI({}, user);
            document.getElementById('upgradeToSeller').style.display = 'block';
        }

        // Fetch order history
        fetchOrders(user.uid);
    });

    function updateUI(data, user) {
        const name = data.displayName || user.email.split('@')[0];
        const email = user.email;
        const phone = data.phone || 'Not set';
        const address = data.address || 'No address saved yet.';
        const joinDate = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';

        // Overview
        document.getElementById('profileName').textContent = name;
        document.getElementById('avatarInitial').textContent = name.charAt(0).toUpperCase();
        document.getElementById('dispName').textContent = name;
        document.getElementById('dispEmail').textContent = email;
        document.getElementById('dispPhone').textContent = phone;
        document.getElementById('dispJoinDate').textContent = joinDate;
        document.getElementById('dispAddress').textContent = address;
        if(data.createdAt) {
            document.getElementById('profileRole').textContent = `Member since ${new Date(data.createdAt.toDate()).getFullYear()}`;
        }

        // Settings inputs
        document.getElementById('newName').value = data.displayName || '';
        document.getElementById('newPhone').value = data.phone || '';
        document.getElementById('newAddress').value = data.address || '';
    }

    async function fetchOrders(uid) {
        try {
            const snapshot = await db.collection('orders')
                .where('userId', '==', uid)
                .get();

            const list = document.getElementById('orderHistoryList');
            const noOrders = document.getElementById('noOrders');

            if (snapshot.empty) {
                noOrders.style.display = 'block';
                list.style.display = 'none';
                return;
            }

            // Map and Sort in-memory
            let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            orders.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt?.toDate?.() || 0);
                const dateB = new Date(b.date || b.createdAt?.toDate?.() || 0);
                return dateB - dateA;
            });

            noOrders.style.display = 'none';
            list.style.display = 'flex';
            list.innerHTML = orders.map(order => {
                const date = order.date ? new Date(order.date).toLocaleDateString() : (order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'N/A');
                return `
                    <div class="order-history-item">
                        <div>
                            <div style="font-weight:700; color:var(--primary-color);">Order #${order.id || order.id.substring(0,8)}</div>
                            <div style="font-size:0.85rem; color:var(--text-secondary);">${date} - ${order.items.length} items</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700;">${formatCurrency(order.totalAmount)}</div>
                            <span class="status-badge status-${(order.status || 'Placed').toLowerCase().replace(' ', '-')}">${order.status || 'Placed'}</span>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    }

    // Update Profile Form
    document.getElementById('updateProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) return;

        const updatedData = {
            displayName: document.getElementById('newName').value,
            phone: document.getElementById('newPhone').value,
            address: document.getElementById('newAddress').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('users').doc(user.uid).update(updatedData);
            showToast("Profile updated successfully!", "success");
            // Refresh UI
            const userDoc = await db.collection('users').doc(user.uid).get();
            updateUI(userDoc.data(), user);
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("Failed to update profile", "error");
        }
    });

    // --- Business / Seller Logic ---

    // Upgrade to Seller
    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', async () => {
            const user = firebase.auth().currentUser;
            if (!user) return;
            
            upgradeBtn.disabled = true;
            upgradeBtn.innerText = "Upgrading...";
            try {
                await db.collection('users').doc(user.uid).update({ role: 'seller' });
                showToast("Welcome to the Business Portal!", "success");
                document.getElementById('upgradeToSeller').style.display = 'none';
                document.getElementById('sellerDashboard').style.display = 'block';
                fetchSellerProducts(user.uid);
            } catch (err) {
                showToast("Upgrade failed", "error");
                upgradeBtn.disabled = false;
                upgradeBtn.innerText = "Convert to Business Account";
            }
        });
    }

    // Toggle Add Product Form
    document.getElementById('showAddProductBtn')?.addEventListener('click', () => {
        document.getElementById('sellerProductForm').style.display = 'block';
    });
    document.getElementById('cancelAddProduct')?.addEventListener('click', () => {
        document.getElementById('sellerProductForm').style.display = 'none';
        document.getElementById('sellerProductForm').reset();
        document.getElementById('sellerPreview').style.display = 'none';
        document.getElementById('sellerPreview360').style.display = 'none';
        document.getElementById('sellerPreviewTop').style.display = 'none';
        document.getElementById('sellerPreviewBack').style.display = 'none';
        document.getElementById('sellerPreviewSide').style.display = 'none';
        
        document.getElementById('sellerProdBase64').value = '';
        document.getElementById('sellerProdBase360').value = '';
        document.getElementById('sellerProdBaseTop').value = '';
        document.getElementById('sellerProdBaseBack').value = '';
        document.getElementById('sellerProdBaseSide').value = '';

        document.getElementById('sellerProdBaseSide').value = '';
    });

    // Seller Image Compression (Robust Base64 fallback approach)
    function compressImageAndGetBase64(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; const MAX_HEIGHT = 600;
                let width = img.width; let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.7)); // Compress significantly
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    const sellerImageInput = document.getElementById('sellerProdImage');
    const sellerPreview = document.getElementById('sellerPreview');
    const sellerBase64 = document.getElementById('sellerProdBase64');
    
    // 360 support
    const sellerImage360Input = document.getElementById('sellerProdImage360');
    const sellerPreview360 = document.getElementById('sellerPreview360');
    const sellerBase360 = document.getElementById('sellerProdBase360');

    if (sellerImageInput) {
        sellerImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showToast("Preparing image...", "info");
            compressImageAndGetBase64(file, (base64Str) => {
                sellerPreview.src = base64Str;
                sellerPreview.style.display = 'block';
                sellerBase64.value = base64Str;
                showToast("Image ready!", "success");
            });
        });
    }

    if (sellerImage360Input) {
        sellerImage360Input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showToast("Preparing 360° image...", "info");
            compressImageAndGetBase64(file, (base64Str) => {
                sellerPreview360.src = base64Str;
                sellerPreview360.style.display = 'block';
                sellerBase360.value = base64Str;
                showToast("360° Image ready!", "success");
            });
        });
    }

    // Additional Angles
    const setupSellerAngle = (inputId, previewId, hiddenId) => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        const hiddenUrl = document.getElementById(hiddenId);

        if (input) {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                compressImageAndGetBase64(file, (base64Url) => {
                    preview.src = base64Url;
                    preview.style.display = 'block';
                    hiddenUrl.value = base64Url;
                });
            });
        }
    };
    setupSellerAngle('sellerProdImageTop', 'sellerPreviewTop', 'sellerProdBaseTop');
    setupSellerAngle('sellerProdImageBack', 'sellerPreviewBack', 'sellerProdBaseBack');
    setupSellerAngle('sellerProdImageSide', 'sellerPreviewSide', 'sellerProdBaseSide');

    // Submit New Seller Product
    document.getElementById('sellerProductForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if(!user) return;

        const baseImage = sellerBase64.value;
        if (!baseImage) {
            showToast("Please select an image first", "warning");
            return;
        }

        const submitBtn = document.getElementById('sellerSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerText = "Listing...";

        const newProd = {
            id: 'S' + Date.now(),
            sellerId: user.uid,
            sellerName: document.getElementById('profileName').textContent,
            name: document.getElementById('sellerProdName').value,
            category: document.getElementById('sellerProdCategory').value,
            price: parseFloat(document.getElementById('sellerProdPrice').value),
            image: baseImage,
            image360: sellerBase360.value || null,
            imageTop: document.getElementById('sellerProdBaseTop').value || null,
            imageBack: document.getElementById('sellerProdBaseBack').value || null,
            imageSide: document.getElementById('sellerProdBaseSide').value || null,
            description: document.getElementById('sellerProdDesc').value,
            discount: 0,
            stock: 10, // default stock for sellers
            rating: 0,
            reviews: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('products').doc(newProd.id).set(newProd);
            showToast("Product listed successfully!", "success");
            document.getElementById('sellerProductForm').reset();
            sellerPreview.style.display = 'none';
            document.getElementById('sellerProductForm').style.display = 'none';
            fetchSellerProducts(user.uid);
        } catch (err) {
            console.error(err);
            showToast("Failed to list product. Check permissions.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "List Product";
        }
    });

    // Fetch Seller Products
    async function fetchSellerProducts(uid) {
        try {
            const snapshot = await db.collection('products').where('sellerId', '==', uid).get();
            const list = document.getElementById('sellerProductsList');
            if (snapshot.empty) {
                list.innerHTML = `<p style="color:var(--text-secondary);">You haven't listed any products yet.</p>`;
                return;
            }
            
            list.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                    <div style="display:flex; gap:15px; padding:15px; background:var(--surface-color); border:1px solid var(--border-color); border-radius:8px; align-items:center;">
                        <img src="${p.image}" style="width:60px; height:60px; object-fit:cover; border-radius:6px;">
                        <div style="flex:1;">
                            <div style="font-weight:600;">${p.name}</div>
                            <div style="color:var(--text-secondary); font-size:0.85rem;">${p.category} | ${formatCurrency(p.price)}</div>
                        </div>
                        <button class="icon-btn delete-seller-prod" data-id="${doc.id}" style="color:var(--danger-color);"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }).join('');

            // Bind delete buttons
            document.querySelectorAll('.delete-seller-prod').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const prodId = e.currentTarget.getAttribute('data-id');
                    if(confirm("Remove this product from your store?")) {
                        await db.collection('products').doc(prodId).delete();
                        showToast("Product removed", "success");
                        fetchSellerProducts(uid);
                    }
                });
            });

        } catch (err) {
            console.error("Error fetching seller products:", err);
        }
    }
});

window.logout = function() {
    firebase.auth().signOut().then(() => {
        window.location.href = '../index.html';
    });
}
