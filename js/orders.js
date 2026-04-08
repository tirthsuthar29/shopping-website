// orders.js - Logic for order history and tracking pages

document.addEventListener('DOMContentLoaded', () => {

    const ordersList = document.getElementById('ordersList');
    const trackingWrapper = document.getElementById('trackingWrapper');

    function initOrders() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                fetchOrders(user.uid);
            } else {
                fetchOrders('guest');
            }
        });

        const trackBtn = document.getElementById('trackSubmitBtn');
        const trackInput = document.getElementById('orderTrackInput');
        
        if(trackBtn && trackInput) {
            const urlParams = new URLSearchParams(window.location.search);
            const initialId = urlParams.get('id');
            if(initialId) {
                trackInput.value = initialId;
                searchOrder(initialId);
            }

            trackBtn.addEventListener('click', () => {
                const id = trackInput.value.trim();
                if(id) searchOrder(id);
                else showToast("Please enter an Order ID", "warning");
            });

            trackInput.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') {
                    const id = trackInput.value.trim();
                    if(id) searchOrder(id);
                }
            });
        }
    }

    async function searchOrder(id) {
        if(!trackingWrapper) return;
        
        showToast("Searching for order...", "info");
        
        try {
            let snapshot = await db.collection('orders').where('id', '==', id).get();
            
            if(snapshot.empty) {
                const doc = await db.collection('orders').doc(id).get();
                if(doc.exists) {
                    renderTrackingView({ firestoreId: doc.id, ...doc.data() });
                    return;
                }
            } else {
                renderTrackingView({ firestoreId: snapshot.docs[0].id, ...snapshot.docs[0].data() });
                return;
            }
            
            document.getElementById('trackingWrapper').style.display = 'none';
            document.getElementById('noOrderFound').style.display = 'block';
            showToast("Order not found.", "error");

        } catch (error) {
            console.error("Search error:", error);
            showToast("Error searching for order.", "error");
        }
    }

    function renderTrackingView(order) {
        const wrapper = document.getElementById('trackingWrapper');
        const noFound = document.getElementById('noOrderFound');
        
        wrapper.style.display = 'block';
        noFound.style.display = 'none';

        const statuses = ["Placed", "Shipped", "Out for Delivery", "Delivered"];
        const currentIndex = statuses.indexOf(order.status) !== -1 ? statuses.indexOf(order.status) : 0;
        const widthPercentage = (currentIndex / (statuses.length - 1)) * 100;

        const stepsHtml = statuses.map((status, index) => {
            let stateClass = '';
            let icon = '';
            
            if (index < currentIndex) stateClass = 'completed';
            else if (index === currentIndex) stateClass = 'active';

            if (status === "Placed") icon = 'fa-clipboard-check';
            if (status === "Shipped") icon = 'fa-box';
            if (status === "Out for Delivery") icon = 'fa-truck';
            if (status === "Delivered") icon = 'fa-home';

            return `
                <div class="step ${stateClass}">
                    <div class="step-icon"><i class="fas ${icon}"></i></div>
                    <div class="step-label" style="font-size:0.75rem;">${status}</div>
                </div>
            `;
        }).join('');

        const d = new Date(order.date || order.createdAt?.toDate?.() || Date.now());

        wrapper.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid var(--border-color); padding-bottom:20px; margin-bottom:20px;">
                <div>
                    <h1 style="font-size:1.8rem; margin-bottom:10px;">Order <span style="color:var(--primary-color);">#${order.id || 'REF'}</span></h1>
                    <p style="color:var(--text-secondary);">Placed on ${d.toLocaleDateString()}</p>
                </div>
                <div>
                    <span class="badge" style="background:var(--primary-color); color:white; padding:8px 15px; border-radius:20px;">${order.status || 'Placed'}</span>
                </div>
            </div>

            <div class="stepper">
                <div class="progress-bar" style="width: ${widthPercentage}%"></div>
                ${stepsHtml}
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:40px;">
                <div class="order-details-card">
                    <h3 style="margin-bottom:15px; font-size:1rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-secondary);">Delivery Details</h3>
                    <p style="font-weight:700; font-size:1.1rem; margin-bottom:5px;">${order.shipping.firstName} ${order.shipping.lastName}</p>
                    <p style="color:var(--text-secondary); line-height:1.6;">
                        ${order.shipping.address}<br>
                        ${order.shipping.city}, ${order.shipping.zip}
                    </p>
                    ${order.trackingId ? `<div style="margin-top:15px; padding:10px; background:rgba(99, 102, 241, 0.1); border-radius:8px; border:1px dashed var(--primary-color);">
                        <span style="font-size:0.8rem; color:var(--primary-color); font-weight:700;">TRACKING ID:</span> ${order.trackingId}
                    </div>` : ''}
                </div>

                <div class="order-details-card">
                    <h3 style="margin-bottom:15px; font-size:1rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-secondary);">Summary</h3>
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span>Total Paid</span>
                        <span style="font-weight:700; font-size:1.2rem;">${formatCurrency(order.totalAmount)}</span>
                    </div>
                    <div class="items-preview" style="display:flex; gap:10px; margin-top:15px; overflow-x:auto; padding-bottom:10px;">
                        ${(order.items || []).map(i => `<img src="${typeof resolveImagePath === 'function' ? resolveImagePath(i.image) : i.image}" title="${i.name}" onerror="this.style.opacity='0.5'" style="width:50px; height:50px; border-radius:8px; object-fit:cover; border:1px solid var(--border-color);">`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    async function fetchOrders(uid) {
        if (!ordersList) return;
        
        try {
            const snapshot = await db.collection('orders').where('userId', '==', uid).get();
            let userOrders = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
            
            userOrders.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt?.toDate?.() || 0);
                const dateB = new Date(b.date || b.createdAt?.toDate?.() || 0);
                return dateB - dateA;
            });

            renderOrdersList(userOrders);
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    }

    function renderOrdersList(userOrders) {
        if (!ordersList) return;

        if (userOrders.length === 0) {
            ordersList.innerHTML = `
                <div style="text-align:center; padding: 60px 20px; background:var(--surface-color); border-radius:var(--border-radius);">
                    <i class="fas fa-box-open" style="font-size:4rem; color:var(--text-secondary); margin-bottom:20px;"></i>
                    <h2>No orders found</h2>
                    <p style="color:var(--text-secondary); margin-bottom:20px;">You haven't placed any orders yet.</p>
                    <a href="products.html" class="btn btn-primary">Start Shopping</a>
                </div>
            `;
            return;
        }

        ordersList.innerHTML = userOrders.map(order => {
            const d = new Date(order.date || order.createdAt?.toDate?.() || Date.now());
            const statusClass = `status-${(order.status || 'Placed').toLowerCase().replace(' ', '-')}`;

            return `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-header-info">
                            <div class="info-group">
                                <span class="info-label">Order Placed</span>
                                <span class="info-value">${d.toLocaleDateString()}</span>
                            </div>
                            <div class="info-group">
                                <span class="info-label">Total</span>
                                <span class="info-value">${formatCurrency(order.totalAmount)}</span>
                            </div>
                            <div class="info-group">
                                <span class="info-label">Order #</span>
                                <span class="info-value">${order.id || 'REF'}</span>
                            </div>
                        </div>
                        <div>
                            <span class="status-badge ${statusClass}">${order.status || 'Placed'}</span>
                            <a href="order-tracking.html?id=${order.id || order.firestoreId}" class="btn btn-outline" style="margin-left:15px; padding:6px 15px; font-size:0.9rem;">Track</a>
                        </div>
                    </div>
                    <div class="order-body">
                        ${(order.items || []).map(item => `
                            <div class="order-item">
                                <img src="${typeof resolveImagePath === 'function' ? resolveImagePath(item.image) : item.image}" alt="" onerror="this.style.opacity='0.5'">
                                <div style="flex:1;">
                                    <div style="font-weight:600;">${item.name}</div>
                                    <div style="color:var(--text-secondary); font-size:0.9rem;">Qty: ${item.quantity}</div>
                                </div>
                                <div style="font-weight:700;">${formatCurrency(item.price * (1 - (item.discount || 0)/100))}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    initOrders();
});
