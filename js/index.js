// index.js - Home Page Logic

function renderHomePageProducts() {
    const newArrivalsGrid = document.getElementById('newArrivalsGrid');
    const featuredGrid = document.getElementById('featuredGrid');
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    const dealsGrid = document.getElementById('dealsGrid');

    if (!appProducts || appProducts.length === 0) {
        return;
    }

    // 1. Recently Launched (Newest products by timestamp)
    if (newArrivalsGrid) {
        const sorted = [...appProducts].sort((a, b) => {
            const timeA = a.createdAt?.toDate?.() || new Date(0);
            const timeB = b.createdAt?.toDate?.() || new Date(0);
            if (timeB - timeA !== 0) return timeB - timeA;
            return b.id.localeCompare(a.id);
        }).slice(0, 8); // Show 8 items
        
        newArrivalsGrid.innerHTML = sorted.map(p => createProductCard(p, 'pages/')).join('');
    }

    // 2. Specialized Deals
    if (dealsGrid) {
        const deals = [...appProducts]
            .filter(p => p.discount > 0)
            .sort((a, b) => b.discount - a.discount)
            .slice(0, 8);
        
        if (deals.length > 0) {
            dealsGrid.innerHTML = deals.map(p => createProductCard(p, 'pages/')).join('');
            dealsGrid.closest('section').style.display = 'block';
        } else {
            console.warn("No products with discounts found for Sale Section");
        }
    }

    // 3. Trending/Featured Products
    if (featuredGrid) {
        const featured = [...appProducts]
            .filter(p => p.isTrending || p.rating >= 4.5)
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);
            
        featuredGrid.innerHTML = featured.map(p => createProductCard(p, 'pages/')).join('');
    }

    // 4. AI Recommendations Mock
    if (recommendationsGrid) {
        const recs = [...appProducts]
            .filter(p => !p.isTrending && p.rating >= 4.0)
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);
            
        recommendationsGrid.innerHTML = recs.map(p => createProductCard(p, 'pages/')).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const categoriesContainer = document.getElementById('categoriesContainer');

    // 1. Populate Categories
    const categoriesList = [
        { name: "Phones", icon: "fa-mobile-alt" },
        { name: "Laptops", icon: "fa-laptop" },
        { name: "Headphones", icon: "fa-headphones" },
        { name: "Tablets", icon: "fa-tablet-alt" },
        { name: "Gaming", icon: "fa-gamepad" },
        { name: "TVs", icon: "fa-tv" },
        { name: "Appliances", icon: "fa-blender" },
        { name: "Accessories", icon: "fa-keyboard" }
    ];

    if (categoriesContainer) {
        categoriesContainer.innerHTML = categoriesList.map(cat => `
            <a href="pages/products.html?category=${encodeURIComponent(cat.name)}" class="category-pill" style="color:inherit; text-decoration:none;">
                <i class="fas ${cat.icon}" style="color: var(--primary-color);"></i>
                ${cat.name}
            </a>
        `).join('');
    }

    // 2. Initialize Social Proof Gallery
    if (typeof renderSocialGallery === 'function') {
        renderSocialGallery('homeSocialGallery');
    }

    // Single Load Logic: Only render once.
    let productsListRendered = false;
    const initialRender = () => {
        if (!productsListRendered && appProducts && appProducts.length > 0) {
            renderHomePageProducts();
            productsListRendered = true;
        }
    };

    // Listen for products loaded event from products.js
    document.addEventListener('productsLoaded', (e) => {
        appProducts = e.detail;
        renderHomePageProducts();
    });

    // Attempt initial 
    initialRender();

    // Catch the loaded event just in case it wasn't ready
    document.addEventListener('productsLoaded', initialRender);
});
