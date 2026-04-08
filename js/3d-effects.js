/**
 * 3d-effects.js
 * Implements immersive 3D background particles, hero animations, and interactive physics.
 */

// Global state for 3D
const scene3D = {
    bg: { scene: null, camera: null, renderer: null, particles: null },
    hero: { scene: null, camera: null, renderer: null, mesh: null }
};

// --- 1. Global Background Particles ---
function initBackgroundParticles() {
    const canvas = document.getElementById('bg-3d-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particle Geometry
    const particlesCount = 800;
    const posArray = new Float32Array(particlesCount * 3);
    
    for(let i=0; i<particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 15;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Particle Material
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.015,
        color: '#6366f1',
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 3;

    // Animation Params
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    const animate = () => {
        requestAnimationFrame(animate);

        const targetX = (mouseX - window.innerWidth / 2) * 0.0001;
        const targetY = (mouseY - window.innerHeight / 2) * 0.0001;

        particlesMesh.rotation.y += 0.001 + targetX;
        particlesMesh.rotation.x += 0.001 + targetY;

        renderer.render(scene, camera);
    };

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
    scene3D.bg = { scene, camera, renderer, mesh: particlesMesh };
}

// --- 2. Hero 3D Object (Abstract Crystal Shape) ---
function initHero3D() {
    const container = document.getElementById('three-canvas-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = ''; // Clear container
    container.appendChild(renderer.domElement);

    // Stylized 3D Tech Device (Mobile Phone)
    const techGroup = new THREE.Group();
    
    // Body (The phone case)
    const bodyGeom = new THREE.BoxGeometry(1.8, 3.2, 0.2);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: '#1e1b4b', 
        metalness: 0.8, 
        roughness: 0.2,
        emissive: '#1e1b4b',
        emissiveIntensity: 0.2
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    techGroup.add(bodyMesh);

    // Screen (The display)
    const screenGeom = new THREE.PlaneGeometry(1.6, 2.8);
    const screenMat = new THREE.MeshStandardMaterial({ 
        color: '#6366f1',
        emissive: '#6366f1',
        emissiveIntensity: 0.8,
        metalness: 0.5,
        roughness: 0.1
    });
    const screenMesh = new THREE.Mesh(screenGeom, screenMat);
    screenMesh.position.z = 0.11; // Slightly in front of body
    techGroup.add(screenMesh);

    // Camera Module (on back)
    const cameraModuleGeom = new THREE.BoxGeometry(0.5, 0.5, 0.05);
    const cameraModuleMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.1 });
    const cameraModule = new THREE.Mesh(cameraModuleGeom, cameraModuleMat);
    cameraModule.position.set(-0.4, 1, -0.11);
    techGroup.add(cameraModule);

    // Lenses
    for (let i=0; i<3; i++) {
        const lensGeom = new THREE.CircleGeometry(0.08, 16);
        const lensMat = new THREE.MeshStandardMaterial({ color: '#000', metalness: 1, roughness: 0 });
        const lens = new THREE.Mesh(lensGeom, lensMat);
        lens.rotation.y = Math.PI;
        lens.position.set(-0.4, 0.85 + (i * 0.15), -0.16);
        techGroup.add(lens);
    }

    // Glowing Logo
    const logoGeom = new THREE.CircleGeometry(0.2, 32);
    const logoMat = new THREE.MeshStandardMaterial({ 
        color: '#6366f1', 
        emissive: '#6366f1',
        emissiveIntensity: 2
    });
    const logoMesh = new THREE.Mesh(logoGeom, logoMat);
    logoMesh.rotation.y = Math.PI;
    logoMesh.position.set(0, 0, -0.11);
    techGroup.add(logoMesh);

    // ⚡ Holographic Ring
    const ringGeom = new THREE.TorusGeometry(2.2, 0.02, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({ 
        color: '#6366f1', 
        emissive: '#6366f1',
        emissiveIntensity: 5,
        transparent: true,
        opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    techGroup.add(ring);

    scene.add(techGroup);
    const mesh = techGroup; // Update reference for animation

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x6366f1, 3);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    camera.position.z = 5;

    // Interaction State
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let time = 0;

    container.addEventListener('mousedown', () => isDragging = true);
    window.addEventListener('mouseup', () => isDragging = false);

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaMove = {
                x: e.offsetX - previousMousePosition.x,
                y: e.offsetY - previousMousePosition.y
            };
            mesh.rotation.y += deltaMove.x * 0.01;
            mesh.rotation.x += deltaMove.y * 0.01;
        }
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });

    const animate = () => {
        requestAnimationFrame(animate);
        time += 0.05;
        
        if (!isDragging) {
            mesh.rotation.y += 0.005;
            mesh.rotation.x = Math.sin(time * 0.5) * 0.1;
        }
        
        // Pulsing Effects
        const pulse = (Math.sin(time) + 1) / 2;
        logoMat.emissiveIntensity = 1 + pulse * 2;
        screenMat.emissiveIntensity = 0.5 + pulse * 0.5;

        renderer.render(scene, camera);
    };

    animate();
    scene3D.hero = { scene, camera, renderer, mesh };
}

// --- 3. Fly-to-Cart 3D Particle Effect ---
window.createFlyToCartEffect = function(x, y) {
    const particlesContainer = document.createElement('div');
    particlesContainer.style.position = 'fixed';
    particlesContainer.style.top = '0';
    particlesContainer.style.left = '0';
    particlesContainer.style.width = '100%';
    particlesContainer.style.height = '100%';
    particlesContainer.style.pointerEvents = 'none';
    particlesContainer.style.zIndex = '9999';
    document.body.appendChild(particlesContainer);

    const cartIcon = document.querySelector('.fa-shopping-cart');
    if (!cartIcon) return;
    const cartRect = cartIcon.getBoundingClientRect();
    const destX = cartRect.left + cartRect.width / 2;
    const destY = cartRect.top + cartRect.height / 2;

    const count = 12;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'cart-particle';
        p.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 8px;
            height: 8px;
            background: #6366f1;
            border-radius: 50%;
            box-shadow: 0 0 10px #6366f1;
            transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            opacity: 0.8;
            transform: scale(${Math.random() + 0.5});
        `;
        particlesContainer.appendChild(p);

        setTimeout(() => {
            p.style.left = `${destX}px`;
            p.style.top = `${destY}px`;
            p.style.transform = `scale(0.1) rotate(${Math.random() * 360}deg)`;
            p.style.opacity = '0';
        }, 10 + (i * 20));
    }

    setTimeout(() => particlesContainer.remove(), 1000);
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initBackgroundParticles();
    initHero3D();
});
