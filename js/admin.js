// admin.js - Admin Dashboard Logic (100% LIVE FIRESTORE)
document.addEventListener('DOMContentLoaded', () => {

    function checkSession() {
        let sessionActive = false;
        let localUser = null;
        try {
            sessionActive = sessionStorage.getItem('adminSession') === 'true';
            localUser = JSON.parse(localStorage.getItem('currentUser'));
        } catch (e) {
            sessionActive = true;
        }

        if (sessionActive || (localUser && localUser.role === 'admin')) {
            try { if (!sessionActive) sessionStorage.setItem('adminSession', 'true'); } catch (e) { }
            initAdminData();
        } else {
            window.location.href = 'login.html';
        }
    }

    checkSession();

    const logoutBtn = document.getElementById('adminLogOutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        try { sessionStorage.removeItem('adminSession'); } catch (e) { }
        window.location.href = 'login.html';
    });

    const navItems = document.querySelectorAll('.admin-nav-item');
    const views = document.querySelectorAll('.admin-view');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (!item.hasAttribute('data-target')) return;
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            views.forEach(v => v.style.display = 'none');
            document.getElementById(`view-${target}`).style.display = 'block';
            pageTitle.innerText = item.innerText.trim();
        });
    });

    let localProducts = [];
    let localOrders = [];
    let localMessages = [];
    let productsUnsubscribe = null;
    let ordersUnsubscribe = null;
    let messagesUnsubscribe = null;

    function initAdminData() {
        if (typeof db === 'undefined' || !db) return;

        // Pure Live Listeners
        if (productsUnsubscribe) productsUnsubscribe();
        productsUnsubscribe = db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            localProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProductsTable();
            renderDashboard();
        });

        if (ordersUnsubscribe) ordersUnsubscribe();
        ordersUnsubscribe = db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            localOrders = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
            renderOrdersTable();
            renderDashboard();
        });

        if (messagesUnsubscribe) messagesUnsubscribe();
        messagesUnsubscribe = db.collection('messages').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            localMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderMessagesTable();
        });
    }

    window.closeModal = function (id) {
        document.getElementById(id).style.display = 'none';
    }

    window.openModal = function (id) {
        document.getElementById(id).style.display = 'flex';
    }

    function renderDashboard() {
        if(document.getElementById('statProducts')) document.getElementById('statProducts').textContent = localProducts.length;
        if(document.getElementById('statOrders')) document.getElementById('statOrders').textContent = localOrders.length;
        let totalRev = 0;
        localOrders.forEach(o => totalRev += (o.totalAmount || 0));
        if(document.getElementById('statRevenue')) document.getElementById('statRevenue').textContent = '₹' + totalRev.toLocaleString();

        const chartCtx = document.getElementById('salesChart');
        if (chartCtx && localOrders.length > 0) {
            if (window.salesChartInstance) window.salesChartInstance.destroy();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const today = new Date();
            const last7Days = [];
            const salesData = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                last7Days.push(days[d.getDay()]);
                const dayTotal = localOrders
                    .filter(o => {
                        const orderDate = new Date(o.date || o.createdAt?.toDate?.() || 0);
                        return orderDate.toDateString() === d.toDateString();
                    })
                    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                salesData.push(dayTotal);
            }
            window.salesChartInstance = new Chart(chartCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: last7Days,
                    datasets: [{
                        label: 'Daily Sales (₹)',
                        data: salesData,
                        backgroundColor: 'rgba(99, 102, 241, 0.7)',
                        borderRadius: 5
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    function renderProductsTable() {
        const tbody = document.getElementById('adminProductsTable');
        if (!tbody) return;
        tbody.innerHTML = localProducts.map(p => `
            <tr>
                <td><img src="${p.image}" style="width:40px; height:40px; object-fit:cover; border-radius:5px;"></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>₹${p.price}</td>
                <td>${p.stock || 'In Stock'}</td>
                <td>
                    <button class="btn btn-sm btn-outline"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline text-danger" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    function renderOrdersTable() {
        const tbody = document.getElementById('adminOrdersTable');
        if (!tbody) return;
        tbody.innerHTML = localOrders.map(o => `
            <tr>
                <td>${o.firestoreId.substring(0,8)}...</td>
                <td>${o.shipping?.firstName || 'Guest'}</td>
                <td>₹${o.totalAmount}</td>
                <td><span class="badge ${o.status?.toLowerCase()}">${o.status || 'Pending'}</span></td>
                <td>${new Date(o.date || o.createdAt?.toDate?.() || 0).toLocaleDateString()}</td>
                <td><button class="btn btn-sm btn-outline">Details</button></td>
            </tr>
        `).join('');
    }

    function renderMessagesTable() {
        const tbody = document.getElementById('adminMessagesTable');
        if (!tbody) return;
        tbody.innerHTML = localMessages.map(m => `
            <tr>
                <td>${m.name}</td>
                <td>${m.email}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis;">${m.message}</td>
                <td>${new Date(m.createdAt?.toDate?.() || 0).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }
});
