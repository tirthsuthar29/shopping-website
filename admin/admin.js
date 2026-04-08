// admin/admin.js - Admin Dashboard Logic for NOVATECH

document.addEventListener('DOMContentLoaded', () => {

    /* --- INITIALIZATION & AUTH --- */
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();

    // Secure the page
    auth.onAuthStateChanged(async user => {
        const isSessionAdmin = sessionStorage.getItem('adminSession') === 'true';

        if (!user && !isSessionAdmin) {
            window.location.href = 'login.html';
        } else if (isSessionAdmin) {
             console.log("ðŸ›¡ï¸ Authenticated via Session Admin");
             document.getElementById('adminName').innerText = 'Admin User';
             initDashboard();
        } else {
            // Check for admin role in Firestore
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists && doc.data().role === 'admin') {
                    console.log("ðŸ›¡ï¸ Authenticated as Admin:", user.email);
                    const userData = doc.data();
                    const nameKey = Object.keys(userData).find(k => k.trim().toLowerCase() === 'firstname');
                    const displayName = (nameKey ? userData[nameKey] : (user.displayName || user.email.split('@')[0]));
                    document.getElementById('adminName').innerText = displayName;
                    initDashboard();
                } else {
                    console.warn("ðŸš« Access Denied: User is not an admin.");
                    alert("Unauthorized: Only administrators can access this area.");
                    auth.signOut().then(() => window.location.href = 'login.html');
                }
            } catch (err) {
                // Fallback for dev if Firestore rules are loose
                console.log("âš ï¸ Role check failed, allowing access (dev mode):", err);
                initDashboard();
            }
        }
    });

    // Theme Toggle Logic
    const themeBtn = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
        updateThemeIcon(nextTheme);
    });

    function updateThemeIcon(theme) {
        themeBtn.innerHTML = theme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    }

    const resolveImagePath = (rawPath) => {
        if (!rawPath) return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800';
        if (rawPath.startsWith('http') || rawPath.startsWith('data:')) return rawPath;
        const clean = rawPath.replace(/^(\.\.\/|\.\/)/, '');
        // Admin is in /admin/, so images in /img/ are at ../img/
        return '../' + clean;
    };

    // Sidebar Toggle for Mobile
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    /* --- DATA STATE --- */
    let allProducts = [];
    let allOrders = [];
    let allMessages = [];

    function initDashboard() {
        listenToProducts();
        listenToOrders();
        listenToMessages();
        setupNavigation();
        setupFormListeners();
    }

    /* --- NAVIGATION --- */
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link[data-target]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-target');
                switchView(target);
                
                // Active state
                navLinks.forEach(n => n.classList.remove('active'));
                link.classList.add('active');

                // Mobile: close sidebar
                if (window.innerWidth <= 1024) sidebar.classList.remove('active');
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'login.html');
        });
    }

    window.switchView = function(viewId) {
        const views = document.querySelectorAll('.admin-view');
        views.forEach(v => v.classList.add('d-none'));
        document.getElementById(`view-${viewId}`).classList.remove('d-none');
        
        const titles = {
            'dashboard': 'Dashboard Overview',
            'products': 'Product Management',
            'orders': 'Sales & Orders',
            'messages': 'Customer Inquiries'
        };
        document.getElementById('viewTitle').innerText = titles[viewId] || 'Dashboard';
    };

    /* --- FIRESTORE LISTENERS --- */
    function listenToProducts() {
        db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            allProducts = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
            renderProducts();
            updateStats();
        });
    }

    function listenToOrders() {
        db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            allOrders = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
            renderOrders();
            renderRecentOrders();
            updateStats();
        });
    }

    function listenToMessages() {
        db.collection('messages').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            allMessages = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
            renderMessages();
            updateStats();
        });
    }

    /* --- STATS & RENDERING --- */
    function updateStats() {
        document.getElementById('totalProducts').innerText = allProducts.length;
        document.getElementById('totalOrders').innerText = allOrders.length;
        document.getElementById('totalMessages').innerText = allMessages.length;

        let revenue = 0;
        allOrders.forEach(order => {
            if (order.status !== 'Cancelled') {
                revenue += (order.totalAmount || 0);
            }
        });
        document.getElementById('totalRevenue').innerText = `â‚¹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    function renderProducts() {
        const tbody = document.getElementById('productsTbody');
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        const catFilter = document.getElementById('categoryFilter').value;

        const filtered = allProducts.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm) || p.id.toString().includes(searchTerm);
            const matchesCat = !catFilter || p.category === catFilter;
            return matchesSearch && matchesCat;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">No products found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(p => `
            <tr>
                <td><img src="${typeof resolveImagePath === 'function' ? resolveImagePath(p.image) : p.image}" style="width: 48px; height: 48px; border-radius: 10px; object-fit: cover;"></td>
                <td>
                    <div style="font-weight: 700; color: var(--text-primary);">${p.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${p.id}</div>
                </td>
                <td><span class="badge badge-info">${p.category}</span></td>
                <td style="font-weight: 600;">â‚¹${(p.price || 0).toLocaleString()}</td>
                <td style="font-weight: 600;">${p.stock}</td>
                <td>
                    <span class="badge ${p.stock > 0 ? 'badge-success' : 'badge-danger'}">
                        ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                </td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="icon-btn" onclick="editProduct('${p.firestoreId}')"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn" style="color:var(--danger-color);" onclick="deleteProduct('${p.firestoreId}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderOrders() {
        const tbody = document.getElementById('ordersTbody');
        if (!tbody) return;

        tbody.innerHTML = allOrders.map(o => {
            const statusClass = `badge-${getStatusColor(o.status)}`;
            const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : 'N/A';
            return `
                <tr>
                    <td style="font-weight: 700;">#${o.id || o.firestoreId.substring(0, 8)}</td>
                    <td>${date}</td>
                    <td>${o.shipping?.firstName || 'Guest'} ${o.shipping?.lastName || ''}</td>
                    <td class="text-center">${o.items?.length || 0}</td>
                    <td style="font-weight: 700;">â‚¹${(o.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td><span class="badge ${statusClass}">${o.status || 'Placed'}</span></td>
                    <td style="font-family: monospace;">${o.trackingId || '---'}</td>
                    <td>
                        <button class="btn btn-outline" onclick="openOrderUpdate('${o.firestoreId}')">Update</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderRecentOrders() {
        const tbody = document.getElementById('recentOrdersTbody');
        const recent = allOrders.slice(0, 5);
        
        tbody.innerHTML = recent.map(o => `
            <tr>
                <td style="font-weight:700;">#${o.id || o.firestoreId.substring(0,8)}</td>
                <td>${o.shipping?.firstName || 'Guest'}</td>
                <td style="font-weight:700;">â‚¹${(o.totalAmount || 0).toLocaleString()}</td>
                <td><span class="badge badge-${getStatusColor(o.status)}">${o.status || 'Placed'}</span></td>
            </tr>
        `).join('');
    }

    function renderMessages() {
        const tbody = document.getElementById('messagesTbody');
        if (!tbody) return;

        tbody.innerHTML = allMessages.map(m => `
            <tr>
                <td>${m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'Now'}</td>
                <td style="font-weight:600;">${m.name}</td>
                <td>${m.email}</td>
                <td>${m.subject}</td>
                <td><div style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.message}</div></td>
                <td>
                    <button class="btn btn-outline" onclick="viewMessage('${m.firestoreId}')">Read</button>
                </td>
            </tr>
        `).join('');
    }

    function getStatusColor(status) {
        switch(status) {
            case 'Delivered': return 'success';
            case 'Shipped': return 'info';
            case 'Out for Delivery': return 'warning';
            case 'Cancelled': return 'danger';
            default: return 'warning';
        }
    }

    /* --- PRODUCT CRUD --- */
    window.openProductModal = function() {
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productModalTitle').innerText = 'Add New Product';
        document.getElementById('mainImgPreview').style.display = 'none';
        document.getElementById('productModal').style.display = 'flex';
    };

    window.closeModal = function(id) {
        document.getElementById(id).style.display = 'none';
    };

    // File Upload Handler (Compressed & Cloud Storage)
    async function handleFileUpload(fileInput, hiddenInput, previewImg = null) {
        const file = fileInput.files[0];
        if (!file) return;

        showToast(`Uploading ${file.name}...`, 'info');
        
        try {
            const fileName = `products/${Date.now()}_${file.name}`;
            const storageRef = storage.ref(fileName);
            const task = await storageRef.put(file);
            const url = await task.ref.getDownloadURL();
            
            hiddenInput.value = url;
            if (previewImg) {
                previewImg.src = url;
                previewImg.style.display = 'block';
            }
            showToast("Upload completed!", "success");
        } catch (error) {
            console.error("Upload error:", error);
            showToast("Upload failed", "error");
        }
    }

    function setupFormListeners() {
        // Main Image
        document.getElementById('prodImageFile').addEventListener('change', (e) => {
            handleFileUpload(e.target, document.getElementById('prodImageUrl'), document.getElementById('mainImgPreview'));
        });

        // Other Angles
        document.getElementById('prodImgTopFile').addEventListener('change', (e) => handleFileUpload(e.target, document.getElementById('prodImgTopUrl')));
        document.getElementById('prodImgBackFile').addEventListener('change', (e) => handleFileUpload(e.target, document.getElementById('prodImgBackUrl')));
        document.getElementById('prodImgSideFile').addEventListener('change', (e) => handleFileUpload(e.target, document.getElementById('prodImgSideUrl')));

        // Product Form Submit
        document.getElementById('productForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveProductBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const docId = document.getElementById('productId').value;
            const productData = {
                name: document.getElementById('prodName').value,
                category: document.getElementById('prodCategory').value,
                price: parseFloat(document.getElementById('prodPrice').value),
                discount: parseInt(document.getElementById('prodDiscount').value) || 0,
                stock: parseInt(document.getElementById('prodStock').value),
                description: document.getElementById('prodDesc').value,
                image: document.getElementById('prodImageUrl').value,
                imageTop: document.getElementById('prodImgTopUrl').value || null,
                imageBack: document.getElementById('prodImgBackUrl').value || null,
                imageSide: document.getElementById('prodImgSideUrl').value || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!productData.image) {
                showToast("Image is required!", "error");
                saveBtn.disabled = false;
                saveBtn.innerText = "Save Product";
                return;
            }

            try {
                if (docId) {
                    await db.collection('products').doc(docId).update(productData);
                    showToast("Product updated successfully", "success");
                } else {
                    productData.id = 'P' + Date.now(); // Unique ID for search
                    productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    productData.rating = 0;
                    productData.reviews = 0;
                    await db.collection('products').add(productData);
                    showToast("Product added successfully", "success");
                }
                closeModal('productModal');
            } catch (error) {
                showToast("Error saving product: " + error.message, "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerText = "Save Product";
            }
        });

        // Search & Filter Listeners
        document.getElementById('productSearch').addEventListener('input', renderProducts);
        document.getElementById('categoryFilter').addEventListener('change', renderProducts);

        // Order Status Form
        document.getElementById('orderUpdateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const docId = document.getElementById('updateOrderId').value;
            const status = document.getElementById('updateStatusSelect').value;
            const trackingId = document.getElementById('updateTrackingId').value;

            try {
                await db.collection('orders').doc(docId).update({
                    status: status,
                    trackingId: trackingId
                });
                showToast("Order sync completed", "success");
                closeModal('orderModal');
            } catch (error) {
                showToast("Sync failed", "error");
            }
        });
    }

    window.editProduct = function(docId) {
        const p = allProducts.find(item => item.firestoreId === docId);
        if (!p) return;

        document.getElementById('productId').value = docId;
        document.getElementById('prodName').value = p.name;
        document.getElementById('prodCategory').value = p.category;
        document.getElementById('prodPrice').value = p.price;
        document.getElementById('prodDiscount').value = p.discount || 0;
        document.getElementById('prodStock').value = p.stock || 0;
        document.getElementById('prodDesc').value = p.description;
        document.getElementById('prodImageUrl').value = p.image;
        document.getElementById('mainImgPreview').src = p.image;
        document.getElementById('mainImgPreview').style.display = 'block';

        document.getElementById('prodImgTopUrl').value = p.imageTop || '';
        document.getElementById('prodImgBackUrl').value = p.imageBack || '';
        document.getElementById('prodImgSideUrl').value = p.imageSide || '';

        document.getElementById('productModalTitle').innerText = 'Edit Product';
        document.getElementById('productModal').style.display = 'flex';
    };

    window.deleteProduct = async function(docId) {
        if (confirm("Permanently delete this product?")) {
            try {
                await db.collection('products').doc(docId).delete();
                showToast("Product removed", "success");
            } catch (e) {
                showToast("Delete failed", "error");
            }
        }
    };

    /* --- ORDER MANAGEMENT --- */
    window.openOrderUpdate = function(docId) {
        const o = allOrders.find(item => item.firestoreId === docId);
        if (!o) return;

        document.getElementById('updateOrderId').value = docId;
        document.getElementById('orderRefDisplay').innerText = `#${o.id || docId.substring(0,8)}`;
        document.getElementById('updateStatusSelect').value = o.status || 'Placed';
        document.getElementById('updateTrackingId').value = o.trackingId || '';
        
        document.getElementById('orderModal').style.display = 'flex';
    };

    /* --- MESSAGE VIEW --- */
    window.viewMessage = function(docId) {
        const m = allMessages.find(item => item.firestoreId === docId);
        if (!m) return;
        alert(`From: ${m.name}\nEmail: ${m.email}\nSubject: ${m.subject}\n\nMessage:\n${m.message}`);
    };

    /* --- TOAST NOTIFICATIONS --- */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.style.cssText = `
            padding: 12px 25px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 12px;
            margin-bottom: 10px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
            font-weight: 600;
            font-size: 0.9rem;
        `;
        toast.innerHTML = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            toast.style.transition = 'all 0.4s';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // Keyframe for toast
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideIn {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

});
