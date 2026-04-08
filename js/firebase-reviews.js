// firebase-reviews.js - Customer Review System with Image Upload support
const reviewsDB = db.collection('reviews');

/**
 * Saves a new review to Firestore
 * @param {Object} reviewData - { productId, name, rating, text, imageBase64 }
 */
async function postReview(reviewData) {
    try {
        console.log("📤 Posting review to Firebase...", reviewData);
        
        let timestamp;
        try {
            timestamp = firebase.firestore.FieldValue.serverTimestamp();
        } catch(e) {
            timestamp = new Date();
        }

        await reviewsDB.add({
            ...reviewData,
            timestamp: timestamp,
            status: 'approved'
        });
        
        return true;
    } catch (error) {
        console.error("❌ Error posting review:", error);
        showToast("⚠️ Review Error: " + error.message, "error");
        return false;
    }
}

// Ensure global scope
window.postReview = postReview;

/**
 * Fetches reviews for a specific product
 * @param {string} productId 
 * @param {function} callback 
 */
function listenForReviews(productId, callback) {
    return reviewsDB
        .where('productId', '==', productId)
        .where('status', '==', 'approved')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            const reviews = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(reviews);
        });
}

/**
 * Renders a clean "Customer Gallery" of images uploaded by users
 * @param {string} containerId 
 */
async function renderSocialGallery(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const snapshot = await reviewsDB.where('image', '!=', null).limit(8).get();
        if (snapshot.empty) {
            container.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">Be the first to share your purchase!</p>';
            return;
        }

        container.innerHTML = snapshot.docs.map(doc => {
            const r = doc.data();
            return `
                <div class="gallery-item glass" style="border-radius:16px; overflow:hidden; position:relative; aspect-ratio: 1/1;">
                    <img src="${r.image}" style="width:100%; height:100%; object-fit:cover;" alt="Review Image">
                    <div class="gallery-overlay" style="position:absolute; bottom:0; padding:15px; background:linear-gradient(transparent, rgba(0,0,0,0.8)); color:white; width:100%; opacity:0; transition:0.3s;">
                        <p style="font-weight:700; font-size:0.8rem; margin:0;">${r.name || 'Verified Buyer'}</p>
                        <p style="font-size:0.75rem; margin:0;">${'⭐'.repeat(r.rating)}</p>
                    </div>
                </div>
            `;
        }).join('');

        // Trigger hover effects via CSS
        const style = document.createElement('style');
        style.textContent = `
            .gallery-item:hover .gallery-overlay { opacity: 1 !important; }
            .gallery-item:hover img { transform: scale(1.1); transition: 0.5s; }
        `;
        document.head.appendChild(style);
        
    } catch (error) {
        console.error("❌ Error fetching social gallery:", error);
    }
}

