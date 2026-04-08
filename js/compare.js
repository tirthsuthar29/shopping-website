// compare.js - Product Comparison Logic

document.addEventListener('DOMContentLoaded', () => {
    
    const resolveImagePath = (rawPath) => {
        if (!rawPath) return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800';
        if (rawPath.startsWith('http') || rawPath.startsWith('data:')) return rawPath;
        const inSubdir = window.location.pathname.includes('/pages/');
        const clean = rawPath.replace(/^(\.\.\/|\.\/)/, '');
        return inSubdir ? '../' + clean : clean;
    };

    const compareTable = document.getElementById('compareTable');
    const searchModal = document.getElementById('searchModal');
    const searchInput = document.getElementById('compareSearchInput');
    const searchResults = document.getElementById('compareSearchResults');
    
    // Max 3 products
    const MAX_COMPARE = 3;

    function getCleanCompareList() {
        let list = [];
        try {
            const raw = localStorage.getItem('compareList');
            list = raw ? JSON.parse(raw) : [];
        } catch (e) {
            list = [];
        }
        if (!Array.isArray(list)) list = [];
        return list.map(id => String(id));
    }

    let compareList = getCleanCompareList();

    function renderTable() {
        if(!compareTable) return;

        let theadHtml = '<tr><th>Product Features</th>';
        let imgRow = '<tr><td>Preview</td>';
        let priceRow = '<tr><td>Price</td>';
        let ratingRow = '<tr><td>Rating</td>';
        let brandRow = '<tr><td>Brand</td>';
        let catRow = '<tr><td>Category</td>';
        let descRow = '<tr><td>Description</td>';
        let actionRow = '<tr><td>Action</td>';

        let productsInTable = [];

        if (!window.appProducts || window.appProducts.length === 0) {
            // Priority Fallback Order:
            // 1. Check window.products (from products-data.js)
            if (typeof products !== 'undefined') {
                window.appProducts = products;
            } else {
                // 2. Check localStorage
                const cached = localStorage.getItem('products');
                if (cached) {
                    window.appProducts = JSON.parse(cached);
                }
            }
            
            if (!window.appProducts || window.appProducts.length === 0) {
                compareTable.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:100px; color:var(--text-secondary);"><i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:15px;"></i><br>Loading product data...</td></tr>';
                // Final re-check attempt to handle any async timing
                setTimeout(renderTable, 500); 
                return;
            }
        }
        
        const appProducts = window.appProducts;

        for(let i=0; i<MAX_COMPARE; i++) {
            const pId = compareList[i];
            const p = appProducts.find(x => String(x.id) === String(pId));

            if(p) {
                productsInTable.push(p);
                const discountedPrice = p.price * (1 - p.discount/100);
                theadHtml += `<th><a href="product-detail.html?id=${p.id}" style="color:var(--text-primary); text-decoration:none;">${p.name}</a></th>`;
                imgRow += `<td><div class="compare-img-card" style="perspective:1000px;"><img src="${typeof resolveImagePath === 'function' ? resolveImagePath(p.image) : p.image}" class="compare-image" style="transition:transform 0.3s ease;"></div></td>`;
                priceRow += `<td style="font-weight:700; color:var(--primary-color); font-size:1.2rem;">${formatCurrency(discountedPrice)}</td>`;
                ratingRow += `<td><i class="fas fa-star" style="color:var(--warning-color);"></i> ${p.rating} (${p.reviews})</td>`;
                brandRow += `<td>${p.specs.brand}</td>`;
                catRow += `<td>${p.category}</td>`;
                descRow += `<td><p style="font-size:0.9rem; color:var(--text-secondary); line-height:1.4;">${p.description}</p></td>`;
                actionRow += `<td>
                    <button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}', event)" style="margin-bottom:10px; width:100%; border-radius:8px;"><i class="fas fa-cart-plus"></i> Add to Cart</button>
                    <button class="remove-compare-btn" onclick="removeFromCompare('${p.id}')" style="width:100%;"><i class="fas fa-trash"></i> Remove</button>
                </td>`;
            } else {
                // Empty slot
                const slotHtml = `<td>
                    <div class="add-compare-slot" onclick="openCompareSearch()">
                        <i class="fas fa-plus-circle" style="font-size:2rem; margin-bottom:10px;"></i>
                        <span>Add Product</span>
                    </div>
                </td>`;
                theadHtml += `<th>Slot ${i+1}</th>`;
                imgRow += slotHtml;
                priceRow += `<td>-</td>`;
                ratingRow += `<td>-</td>`;
                brandRow += `<td>-</td>`;
                catRow += `<td>-</td>`;
                descRow += `<td>-</td>`;
                actionRow += `<td>-</td>`;
            }
        }

        theadHtml += '</tr>';
        imgRow += '</tr>';
        priceRow += '</tr>';
        ratingRow += '</tr>';
        brandRow += '</tr>';
        catRow += '</tr>';
        descRow += '</tr>';
        actionRow += '</tr>';

        compareTable.innerHTML = `
            <thead>${theadHtml}</thead>
            <tbody>
                ${imgRow}
                ${priceRow}
                ${ratingRow}
                ${brandRow}
                ${catRow}
                ${descRow}
                ${actionRow}
            </tbody>
        `;

        generateAISummary(productsInTable);
        
        // Update Clear All button visibility
        const clearBtn = document.getElementById('clearCompareBtn');
        if(clearBtn) {
            clearBtn.style.display = compareList.length > 0 ? 'inline-block' : 'none';
        }
    }
    
    function generateAISummary(products) {
        const aiSection = document.getElementById('aiSummarySection');
        const aiContent = document.getElementById('aiSummaryContent');
        
        if(!aiSection || !aiContent) return;

        if(products.length < 2) {
            aiSection.style.display = 'none';
            return;
        }

        aiSection.style.display = 'block';
        document.getElementById('aiChartContainer').style.display = 'none';
        aiContent.innerHTML = '<div class="typing-indicator" style="padding:10px 0;"><div class="typing-dot" style="background:var(--primary-color);"></div><div class="typing-dot" style="background:var(--primary-color);"></div><div class="typing-dot" style="background:var(--primary-color);"></div></div>';

        setTimeout(() => {
            let names = products.map(p => p.name).join(' vs ');
            let lowestPrice = products.reduce((prev, curr) => (prev.price * (1 - prev.discount/100)) < (curr.price * (1 - curr.discount/100)) ? prev : curr);
            let highestRating = products.reduce((prev, curr) => prev.rating > curr.rating ? prev : curr);
            
            let html = `<p style="margin-bottom:15px;"><strong>Comparing: ${names}</strong></p>`;
            
            html += `<p style="margin-bottom:10px;">Based on the selected electronics, here is a quick breakdown:</p>`;
            html += `<ul style="margin-left:20px; margin-bottom:20px;">
                <li style="margin-bottom:8px;"><strong>Best Value:</strong> The <em>${lowestPrice.name}</em> is the most affordable option at ${formatCurrency(lowestPrice.price * (1 - lowestPrice.discount/100))}.</li>
                <li style="margin-bottom:8px;"><strong>Highest Rated:</strong> The <em>${highestRating.name}</em> has the highest customer satisfaction score at ${highestRating.rating} stars.</li>
            </ul>`;

            if(products[0].category === products[1].category) {
                html += `<p><strong>Our Recommendation:</strong> If budget is your main constraint, go with the ${lowestPrice.name}. Otherwise, the ${highestRating.name} offers the best long-term quality and performance in the ${products[0].category} category.</p>`;
            } else {
                html += `<p><strong>Note:</strong> You are comparing products from different categories! Make sure you are prioritizing the features you actually need.</p>`;
            }

            aiContent.innerHTML = html;
            
            // Build Chart.js overlay (Bar Chart & Radar Chart)
            document.getElementById('aiChartContainer').style.display = 'grid';
            document.getElementById('aiChartContainer').style.gridTemplateColumns = '1fr 1fr';
            document.getElementById('aiChartContainer').style.gap = '20px';
            
            // Ensure canvas elements exist and wrap in panels
            let chartArea = document.getElementById('aiChartContainer');
            chartArea.innerHTML = `
                <div class="ai-chart-panel">
                    <canvas id="compareChart"></canvas>
                </div>
                <div class="ai-chart-panel">
                    <canvas id="radarChart"></canvas>
                </div>
            `;

            const ctxBar = document.getElementById('compareChart').getContext('2d');
            const ctxRadar = document.getElementById('radarChart').getContext('2d');
            
            // Create Gradients for Bar Chart
            const barGradient1 = ctxBar.createLinearGradient(0, 0, 0, 300);
            barGradient1.addColorStop(0, 'rgba(99, 102, 241, 1)');
            barGradient1.addColorStop(1, 'rgba(139, 92, 246, 0.5)');

            const barGradient2 = ctxBar.createLinearGradient(0, 0, 0, 300);
            barGradient2.addColorStop(0, 'rgba(236, 72, 153, 1)');
            barGradient2.addColorStop(1, 'rgba(244, 63, 94, 0.5)');

            if(window.compareChartInstance) window.compareChartInstance.destroy();
            if(window.radarChartInstance) window.radarChartInstance.destroy();
            
            Chart.defaults.color = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim();
            Chart.defaults.font.family = "'Inter', sans-serif";

            // 1. Bar Chart (Price & Rating)
            window.compareChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: products.map(p => p.name.length > 15 ? p.name.substring(0,15)+'...' : p.name),
                    datasets: [
                        {
                            label: 'Price (₹)',
                            data: products.map(p => p.price * (1 - p.discount/100)),
                            backgroundColor: barGradient1,
                            borderRadius: 8,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Rating (0-5)',
                            data: products.map(p => p.rating),
                            backgroundColor: barGradient2,
                            borderRadius: 8,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'top' },
                        title: { display: true, text: 'Market Value Comparison', font: { size: 16 } } 
                    },
                    scales: {
                        y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' } },
                        y1: { type: 'linear', display: true, position: 'right', min: 0, max: 5, grid: { drawOnChartArea: false } }
                    }
                }
            });

            // 2. Radar Chart (AI Feature Analysis)
            const radarMeta = [
                {bg: 'rgba(6, 182, 212, 0.2)', border: 'rgba(6, 182, 212, 1)'}, 
                {bg: 'rgba(244, 63, 94, 0.2)', border: 'rgba(244, 63, 94, 1)'}, 
                {bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 1)'}
            ];

            window.radarChartInstance = new Chart(ctxRadar, {
                type: 'radar',
                data: {
                    labels: ['Performance', 'Battery Life', 'Design', 'Value', 'Durability'],
                    datasets: products.map((p, index) => {
                        const perf = Math.min(100, Math.max(40, (p.rating * 15) + (p.price % 30)));
                        const energy = Math.min(100, Math.max(40, (p.rating * 12) + (p.id % 40)));
                        const design = Math.min(100, Math.max(40, (p.rating * 18) - (p.price % 20)));
                        const value = Math.min(100, Math.max(40, (100 - (p.price / 50000) * 100) + (p.rating * 5)));
                        const dur = Math.min(100, Math.max(40, (p.rating * 10) + 30));

                        return {
                            label: p.name.substring(0,12)+'...',
                            data: [perf, energy, design, value, dur],
                            backgroundColor: radarMeta[index % 3].bg,
                            borderColor: radarMeta[index % 3].border,
                            borderWidth: 3,
                            pointBackgroundColor: radarMeta[index % 3].border,
                            pointHoverRadius: 8,
                            fill: true
                        };
                    })
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: 'AI Technical Capability Matrix', font: { size: 16 } } },
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255,255,255,0.1)' },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            pointLabels: { font: { size: 11 } },
                            suggestedMin: 0,
                            suggestedMax: 100
                        }
                    }
                }
            });

        }, 1200);
    }

    // Modal logic
    window.openCompareSearch = function() {
        searchModal.style.display = 'flex';
        searchInput.value = '';
        renderSearchResults('');
        searchInput.focus();
    };

    window.closeCompareSearch = function() {
        searchModal.style.display = 'none';
    };

    searchInput.addEventListener('input', (e) => {
        renderSearchResults(e.target.value.toLowerCase());
    });

    function renderSearchResults(query) {
        let results = window.appProducts || [];
        
        if(query) {
            results = results.filter(p => 
                (p.name && p.name.toLowerCase().includes(query)) || 
                (p.category && p.category.toLowerCase().includes(query))
            );
        }

        // exclude already added
        results = results.filter(p => !compareList.includes(String(p.id))).slice(0, 10);

        if(results.length === 0) {
            searchResults.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-secondary);">
                <i class="fas fa-search" style="font-size:2rem; margin-bottom:10px; opacity:0.3;"></i><br>
                No products found matching "${query}"
            </div>`;
            return;
        }

        searchResults.innerHTML = results.map(p => `
            <div class="search-result-item" onclick="addToCompare('${p.id}')">
                <img src="${typeof resolveImagePath === 'function' ? resolveImagePath(p.image) : p.image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; margin-right:15px;">
                <div>
                    <div style="font-weight:600;">${p.name}</div>
                    <div style="color:var(--text-secondary); font-size:0.85rem;">${p.category} | ${formatCurrency(p.price)}</div>
                </div>
            </div>
        `).join('');
    }

    // List Logic
    window.addToCompare = function(id) {
        if(compareList.length >= MAX_COMPARE) {
            showToast("Maximum 3 products for comparison.", "info");
            return;
        }
        const sid = String(id);
        if(!compareList.includes(sid)) {
            compareList.push(sid);
            localStorage.setItem('compareList', JSON.stringify(compareList));
            showToast("Excellent choice! Added to comparison Matrix.", "success");
            renderTable();
        }
        closeCompareSearch();
    };

    window.removeFromCompare = function(id) {
        // Handle both string and numeric IDs for robustness
        compareList = compareList.filter(x => String(x) !== String(id));
        localStorage.setItem('compareList', JSON.stringify(compareList));
        renderTable();
    };

    window.clearCompare = function() {
        if(confirm("Are you sure you want to clear the comparison list?")) {
            compareList = [];
            localStorage.setItem('compareList', JSON.stringify(compareList));
            renderTable();
            showToast("Comparison list cleared.", "info");
        }
    };

    // Init & Listener for state updates
    renderTable();

    const clearBtn = document.getElementById('clearCompareBtn');
    if(clearBtn) {
        clearBtn.addEventListener('click', () => window.clearCompare());
    }

    document.addEventListener('compareUpdated', () => {
        compareList = JSON.parse(localStorage.getItem('compareList')) || [];
        renderTable();
    });
    
    document.addEventListener('productsLoaded', () => {
        renderTable();
    });
});
