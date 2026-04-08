// auth.js - User Authentication Logic with Firebase

document.addEventListener('DOMContentLoaded', () => {
    // Shared User State - Now managed by Firebase
    const userBtn = document.getElementById('userBtn');

    // Listen for Authentication State Changes
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            try {
                // Fetch additional user data from Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userData = userDoc.exists ? userDoc.data() : { firstName: user.email.split('@')[0], role: 'user' };

                // Update Global state if needed (still using some local storage for quick access in other scripts if desired)
                const currentUser = {
                    uid: user.uid,
                    email: user.email,
                    ...userData
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                // Update Header Icon 
                if (userBtn) {
                    const iconColor = currentUser.role === 'admin' ? 'var(--accent-color)' : 'var(--primary-color)';
                    userBtn.innerHTML = `<i class="fas fa-user-shield" style="color:${iconColor};"></i>`;
                    userBtn.title = `Manage: ${currentUser.firstName}`;
                }

                // If on login page and logged in, show profile
                renderUserProfile(currentUser);

            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        } else {
            // User is signed out
            localStorage.setItem('currentUser', JSON.stringify(null));
            if (userBtn) {
                userBtn.innerHTML = `<i class="far fa-user"></i>`;
                userBtn.title = "Login";
            }
        }
    });

    function renderUserProfile(currentUser) {
        const wrapper = document.getElementById('loginFormArea');
        if (wrapper && currentUser) {

            // If admin â€” show admin-specific card
            if (currentUser.role === 'admin') {
                wrapper.innerHTML = `
                    <div style="text-align:center;">
                        <div style="width:80px; height:80px; background:linear-gradient(135deg,var(--primary-color),var(--accent-color)); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 20px; box-shadow:0 8px 25px rgba(99,102,241,0.4);">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h2 style="margin-bottom:5px;">Welcome, Admin!</h2>
                        <p style="color:var(--text-secondary); margin-bottom:25px;">${currentUser.email}</p>
                        <a href="../admin/index.html" class="btn btn-primary" style="width:100%; padding:13px; margin-bottom:12px; font-weight:700; display:block;">
                            <i class="fas fa-tachometer-alt" style="margin-right:8px;"></i>Go to Admin Dashboard
                        </a>
                        <button id="logoutBtn" class="btn btn-outline" style="width:100%; padding:12px;">Sign Out</button>
                    </div>
                `;
            } else {
                wrapper.innerHTML = `
                    <div style="text-align:center;">
                        <div style="width:80px; height:80px; background:var(--primary-color); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.5rem; margin:0 auto 20px;">
                            ${currentUser.firstName.charAt(0)}${currentUser.lastName ? currentUser.lastName.charAt(0) : ''}
                        </div>
                        <h2>Hi, ${currentUser.firstName}!</h2>
                        <p style="color:var(--text-secondary); margin-bottom: 30px;">${currentUser.email}</p>
                        
                        <a href="order-history.html" class="btn btn-outline" style="width:100%; margin-bottom:15px; padding:12px;">View Order History</a>
                        <button id="logoutBtn" class="btn btn-primary" style="width:100%; padding:12px;">Sign Out</button>
                    </div>
                `;
            }

            document.getElementById('logoutBtn').addEventListener('click', () => {
                auth.signOut().then(() => {
                    sessionStorage.removeItem('adminSession');
                    localStorage.removeItem('currentUser');
                    showToast('Logged out successfully', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                });
            });
        }
    }

    // Login Form Logic - Robust Attachment
    function attachLoginListener() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log("ðŸ“¥ Attaching listener to loginForm...");
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('email').value.trim();
                const email = emailInput.toLowerCase();
                const password = document.getElementById('password').value;
                const genericError = document.getElementById('genericError');

                if (genericError) genericError.style.display = 'none';

                // Standard Firebase Login (Admin access should be managed via Firestore 'role' field)

                // Standard Firebase Login
                const rememberMe = document.getElementById('rememberMe')?.checked;
                const persistence = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

                auth.setPersistence(persistence)
                    .then(() => {
                        return auth.signInWithEmailAndPassword(emailInput, password);
                    })
                    .then(() => {
                        showToast(`Welcome back!`, 'success');
                        setTimeout(() => {
                            window.location.href = '../index.html';
                        }, 1000);
                    })
                    .catch((error) => {
                        console.error("Login Error:", error.message);
                        if (genericError) {
                            genericError.textContent = error.message;
                            genericError.style.display = 'block';
                        }
                    });
            });
        }
    }

    // Initial attachment
    attachLoginListener();

    // Signup Form Logic
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPass = document.getElementById('confirmPassword').value;

            const emailError = document.getElementById('regEmailError');
            const matchError = document.getElementById('matchError');

            emailError.style.display = 'none';
            matchError.style.display = 'none';

            // Validate
            if (password !== confirmPass) {
                matchError.style.display = 'block';
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters");
                return;
            }

            // Create user in Firebase Auth
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;

                    // Create user profile in Firestore
                    return db.collection('users').doc(user.uid).set({
                        firstName,
                        lastName,
                        email,
                        role: 'user',
                        joinDate: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    showToast('Account created successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 1000);
                })
                .catch((error) => {
                    console.error("Signup Error:", error.message);
                    emailError.textContent = error.message;
                    emailError.style.display = 'block';
                });
        });
    }

});
