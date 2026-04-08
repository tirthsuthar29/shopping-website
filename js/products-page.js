// products-page.js - Logistics for Catalog Page
let renderProductsPage;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const catalogGrid = document.getElementById('catalogGrid');
    const skeletonGrid = document.getElementById('skeletonGrid');
    const productCount = document.getElementById('productCount');
    const catalogSearch = document.getElementById('catalogSearch');
    const categoryFilters = document.getElementById('categoryFilters');
    const priceRadios = document.querySelectorAll('input[name="price"]');
    const ratingRadios = document.querySelectorAll('input[name="rating"]');
    const sortSelect = document.getElementById('sortSelect');
    const noProductsFound = document.getElementById('noProductsFound');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const activeFiltersBar = document.getElementById('activeFilters');
    const clearAllFiltersBtn = document.getElementById('clearAllFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');

    // State Variables
    const urlParams = new URLSearchParams(window.location.search);
    let currentFilters = {
        search: '',
        category: urlParams.get('category') || 'all',
        price: 'all',
        rating: 'all'
    };
    let currentSort = 'popularity';
    let viewMode = localStorage.getItem('viewMode') || 'grid';
    let isCategoriesInitialized = false;
    let isLoading = true;

    // Handle initial view mode
    if (viewMode === 'list') {
        listViewBtn?.classList.add('active');
        gridViewBtn?.classList.remove('active');
        catalogGrid?.classList.add('list-view');
    }

    // 1. Skeleton Management
    function toggleSkeletons(show) {
        if (!skeletonGrid || !catalogGrid) return;
        
        if (show) {
            skeletonGrid.style.display = 'grid';
            catalogGrid.style.display = 'none';
            // Generate 6 skeletons
            skeletonGrid.innerHTML = Array(6).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton" style="width: 100%; height: 200px; border-radius: 0;"></div>
                    <div style="padding: 20px;">
                        <div class="skeleton" style="width: 40%; height: 12px; margin-bottom: 10px;"></div>
                        <div class="skeleton" style="width: 80%; height: 20px; margin-bottom: 15px;"></div>
                        <div class="skeleton" style="width: 100%; height: 15px; margin-bottom: 20px;"></div>
                        <div style="display:flex; justify-content:space-between;">
                            <div class="skeleton" style="width: 40%; height: 25px;"></div>
                            <div class="skeleton" style="width: 25%; height: 25px;"></div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            skeletonGrid.style.display = 'none';
            catalogGrid.style.display = viewMode === 'grid' ? 'grid' : 'flex';
            if (viewMode === 'list') catalogGrid.style.flexDirection = 'column';
        }
    }

    // 2. Render Active Filter Chips
    function renderFilterChips() {
        if (!activeFiltersBar) return;
        
        const chips = [];
        if (currentFilters.search) {
            chips.push({ id: 'search', label: `Search: ${currentFilters.search}` });
        }
        if (currentFilters.category !== 'all') {
            chips.push({ id: 'category', label: `Category: ${currentFilters.category}` });
        }
        if (currentFilters.price !== 'all') {
            const priceLabels = {
                'under40k': 'Under ₹40,000',
                '40k-80k': '₹40,000 - ₹80,000',
                'over80k': 'Over ₹80,000'
            };
            chips.push({ id: 'price', label: priceLabels[currentFilters.price] });
        }
        if (currentFilters.rating !== 'all') {
            chips.push({ id: 'rating', label: `${currentFilters.rating}+ Stars` });
        }

        if (chips.length > 0) {
            activeFiltersBar.style.display = 'flex';
            activeFiltersBar.innerHTML = chips.map(chip => `
                <div class="filter-chip" onclick="removeFilter('${chip.id}')">
                    ${chip.label} <i class="fas fa-times"></i>
                </div>
            `).join('') + `<button class="btn btn-outline" style="font-size: 0.8rem; padding: 4px 12px; border-radius: 50px;" onclick="clearAllFilters()">Clear All</button>`;
        } else {
            activeFiltersBar.style.display = 'none';
        }
    }

    window.removeFilter = function(type) {
        if (type === 'search') {
            currentFilters.search = '';
            if (catalogSearch) catalogSearch.value = '';
        } else if (type === 'category') {
            currentFilters.category = 'all';
            const radio = document.querySelector('input[name="category"][value="all"]');
            if (radio) radio.checked = true;
        } else if (type === 'price') {
            currentFilters.price = 'all';
            const radio = document.querySelector('input[name="price"][value="all"]');
            if (radio) radio.checked = true;
        } else if (type === 'rating') {
            currentFilters.rating = 'all';
            const radio = document.querySelector('input[name="rating"][value="all"]');
            if (radio) radio.checked = true;
        }
        renderProductsPage();
    };

    window.clearAllFilters = function() {
        currentFilters = { search: '', category: 'all', price: 'all', rating: 'all' };
        if (catalogSearch) catalogSearch.value = '';
        document.querySelector('input[name="category"][value="all"]').checked = true;
        document.querySelector('input[name="price"][value="all"]').checked = true;
        document.querySelector('input[name="rating"][value="all"]').checked = true;
        renderProductsPage();
    };

    // 3. Main Render Function
    renderProductsPage = function() {
        if (!catalogGrid) return;
        if (!appProducts || appProducts.length === 0) {
            return;
        }


        // Populate Categories once
        if (!isCategoriesInitialized && categoryFilters) {
            const uniqueCategories = [...new Set(appProducts.map(p => p.category))];
            uniqueCategories.forEach(cat => {
                const label = document.createElement('label');
                label.className = 'filter-item';
                label.innerHTML = `<input type="radio" name="category" value="${cat}" ${currentFilters.category === cat ? 'checked' : ''}> ${cat}`;
                categoryFilters.appendChild(label);
            });

            const categoryRadios = document.querySelectorAll('input[name="category"]');
            categoryRadios.forEach(radio => radio.addEventListener('change', (e) => {
                currentFilters.category = e.target.value;
                renderProductsPage();
            }));

            isCategoriesInitialized = true;
        }

        // Filter Logic
        let filtered = appProducts.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(currentFilters.search) || 
                                p.category.toLowerCase().includes(currentFilters.search);
            if (!matchSearch) return false;
            if (currentFilters.category !== 'all' && p.category !== currentFilters.category) return false;
            
            const discountedPrice = p.price * (1 - p.discount/100);
            if (currentFilters.price === 'under40k' && discountedPrice >= 40000) return false;
            if (currentFilters.price === '40k-80k' && (discountedPrice < 40000 || discountedPrice > 80000)) return false;
            if (currentFilters.price === 'over80k' && discountedPrice <= 80000) return false;
            
            if (currentFilters.rating !== 'all' && p.rating < parseFloat(currentFilters.rating)) return false;
            return true;
        });

        // Sort Logic
        filtered.sort((a, b) => {
            const priceA = a.price * (1 - a.discount/100);
            const priceB = b.price * (1 - b.discount/100);
            switch(currentSort) {
                case 'price-low': return priceA - priceB;
                case 'price-high': return priceB - priceA;
                case 'rating': return b.rating - a.rating;
                case 'newest': 
                     const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                     const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                     return dateB - dateA;
                default: return (b.reviews * b.rating) - (a.reviews * a.rating);
            }
        });

        // Display
        if (filtered.length === 0) {
            catalogGrid.innerHTML = '';
            noProductsFound.style.display = 'block';
        } else {
            noProductsFound.style.display = 'none';
            // Use different grid gaps for list view
            if (viewMode === 'list') {
                catalogGrid.style.display = 'flex';
                catalogGrid.style.flexDirection = 'column';
                catalogGrid.style.gap = '20px';
            } else {
                catalogGrid.style.display = 'grid';
                catalogGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
                catalogGrid.style.gap = '32px';
            }
            // NO SKELETONS, NO DELAYS - INSTANT LOAD ALL
            catalogGrid.innerHTML = filtered.map(p => createProductCard(p, '', viewMode)).join('');
        }

        
        productCount.textContent = filtered.length;
        renderFilterChips();
    };

    // 4. View Mode Toggles
    gridViewBtn?.addEventListener('click', () => {
        viewMode = 'grid';
        localStorage.setItem('viewMode', 'grid');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        renderProductsPage();
    });

    listViewBtn?.addEventListener('click', () => {
        viewMode = 'list';
        localStorage.setItem('viewMode', 'list');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        renderProductsPage();
    });

    // 5. Debounced Search
    let searchTimeout;
    if (catalogSearch) {
        catalogSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentFilters.search = e.target.value.toLowerCase().trim();
                renderProductsPage();
            }, 300);
        });
    }

    // 6. Other Event Listeners
    priceRadios.forEach(radio => radio.addEventListener('change', (e) => {
        currentFilters.price = e.target.value;
        renderProductsPage();
    }));

    ratingRadios.forEach(radio => radio.addEventListener('change', (e) => {
        currentFilters.rating = e.target.value;
        renderProductsPage();
    }));

    sortSelect?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProductsPage();
    });

    clearAllFiltersBtn?.addEventListener('click', () => clearAllFilters());
    resetFiltersBtn?.addEventListener('click', () => clearAllFilters());

    // Listen for products loaded event from products.js
    document.addEventListener('productsLoaded', () => {
        renderProductsPage();
    });

    // Initial render attempt
    renderProductsPage();
});
