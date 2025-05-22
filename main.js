/* Panoramic view version 0.1.1 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.167.1/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(
    60, // Field of view (degrees)
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);
camera.position.set(0, 0, 0.1); // Small offset to avoid control issues

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Enhance sharpness on high-DPI displays
renderer.outputColorSpace = THREE.SRGBColorSpace; // <<< Add this line
document.body.appendChild(renderer.domElement);

// Create a cylindrical panorama instead of a sphere
// This will give a more flat view for wide panoramic images
const radius = 500;
const widthSegments = 60;
const heightSegments = 40;

const geometry = new THREE.CylinderGeometry(
    radius, // top radius
    radius, // bottom radius
    radius * 1.2, // height (adjust based on your aspect ratio)
    widthSegments,
    heightSegments,
    true // open-ended cylinder
);

// Modify UVs to properly map the panoramic image
const uvAttribute = geometry.attributes.uv;
for (let i = 0; i < uvAttribute.count; i++) {
    let u = uvAttribute.getX(i);
    // Flip and adjust UVs for proper mapping
    uvAttribute.setX(i, 1 - u);
}

// Material with texture mapped to the inside
const material = new THREE.MeshBasicMaterial({
	side: THREE.BackSide
});

// Create and add mesh to the scene
const cylinder = new THREE.Mesh(geometry, material);
scene.add(cylinder);

// Create a group for hotspots and infospots
const hotspotsGroup = new THREE.Group();

scene.add(hotspotsGroup);

// Define panoramas with hotspots
const hostpotRadius = 50;

// Texture loader
const textureLoader = new THREE.TextureLoader();

const iconTexture = textureLoader.load('./location.svg', (texture) => {
    console.log('Icon loaded successfully');
    
    // Once texture is loaded, create initial hotspots
    // loadPanorama(1);
}, undefined, (err) => {
    console.error('Error loading hotspot icon:', err);
});

// Create sprite material with the icon texture
const spriteMaterial = new THREE.SpriteMaterial({ 
    map: iconTexture,
    transparent: true,
    depthTest: false,  // Ensures sprite renders on top of other objects
    depthWrite: false, // Prevents depth buffer writes
    // sizeAttenuation: false // Maintains consistent size regardless of distance
});

// Function to compute 3D position from UV coordinates for a cylinder
function computePosition(u, v) {
    const phi = (1 - u) * 2 * Math.PI; // Horizontal angle (0 to 2π)
    const height = radius * 1.2; // Match cylinder height
    
    // For cylindrical mapping
    const x = radius * Math.sin(phi);
    const y = height * (v - 0.5); // Map v from 0-1 to -height/2 to height/2
    const z = radius * Math.cos(phi);
    
    return new THREE.Vector3(x, y, z);
}

const hotspots = [
    { position: { u: 0.4, v: 0.4 }, target: 1 },
    { position: { u: 0.5, v: 0.4 }, target: 2}
];

// Function to create hotspots
function createHotspots(hotspots) {
    hotspotsGroup.remove(...hotspotsGroup.children);
    
    hotspots.forEach(hotspot => {
        const position = computePosition(hotspot.position.u, hotspot.position.v, hostpotRadius);
        const sprite = new THREE.Sprite(spriteMaterial.clone());
        sprite.position.copy(position);

        sprite.scale.copy(new THREE.Vector2(50, 50));
        sprite.material.color = new THREE.Color(0xffffff);
        
        sprite.userData = { 
            target: hotspot.target
        };
        hotspotsGroup.add(sprite);
    });
}

// Load new texture and update scene
textureLoader.load('./mapa/1.jpg', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;

    if (renderer.capabilities.getMaxAnisotropy) {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    
    // Filtering and mipmapping for high-res textures
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    
    cylinder.material.map = texture;
    cylinder.material.needsUpdate = true;

    createHotspots(hotspots);
});

// Track mouse position for hover effects
const mouse = new THREE.Vector2();

// Set up OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

// Limit vertical rotation to avoid seeing the top/bottom edges
controls.minPolarAngle = Math.PI * 0.50; // Restrict looking too far up
controls.maxPolarAngle = Math.PI * 0.50; // Restrict looking too far down

// Limit horizontal rotation to -45° to +45° (convert degrees to radians)
controls.minAzimuthAngle = THREE.MathUtils.degToRad(-130);
controls.maxAzimuthAngle = THREE.MathUtils.degToRad(130);

controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Make hotspots always face the camera
    hotspotsGroup.children.forEach(sprite => {
        sprite.lookAt(camera.position);
    });    

    renderer.render(scene, camera);
}
animate();

function handleInteraction(event) {
    // Prevent default behavior to avoid any unwanted navigation
    event.preventDefault();
    
    // Get the correct coordinates based on event type
    let x, y;
    
    if (event.type.startsWith('touch')) {
        // Touch event (mobile)
        if (event.touches.length > 0) {
            x = event.touches[0].clientX;
            y = event.touches[0].clientY;
        } else {
            // If no touches are available (e.g., touchend)
            return;
        }
    } else {
        // Mouse event (desktop)
        x = event.clientX;
        y = event.clientY;
    }
    
    // Convert to normalized device coordinates (-1 to +1)
    const mouse = new THREE.Vector2();
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hotspotsGroup.children);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        console.log('Clicked on:', object.userData.target);

        // Visual feedback
        intersects[0].object.scale.multiplyScalar(1.2);
        setTimeout(() => {
            if (intersects[0].object) {
                intersects[0].object.scale.divideScalar(1.2);
            }
        }, 200);
    }
    else {
        console.log('Nothing clicked');
    }
}
// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Update mouse position on move
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('click', handleInteraction);
window.addEventListener('touchend', handleInteraction);
