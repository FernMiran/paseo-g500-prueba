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
const infospotsGroup = new THREE.Group();

scene.add(hotspotsGroup);
scene.add(infospotsGroup);

// Define panoramas with hotspots
const hostpotRadius = radius - 10;
const panoramas = [
    {
        id: 1,
        image: './mapa/1.jpg',
        music: './audio/1.m4a',
        hotspots: [
            { position: { u: 0.4, v: 0.35 }, target: 3 },
            { position: { u: 0.5, v: 0.35 }, target: 2 },
        ],
        infospots: [             
            { 
                position: { u: 0.3, v: 0.2 }, 
                image: [ './mapa/1/1a.jpg' ],
                title: 'Bienvenido al paseo virtual de la Básilica de Guadalupe', 
                description: 'Para navegar por el recorrido, utiliza el mouse o el touchpad. Haz clic en los puntos de interés para obtener más información.'
            }
        ]
    },
    {
        id: 2,
        image: './mapa/2.jpg',
        music: './audio/7.m4a', // './audio/14.m4a',
        hotspots: [
            { position: { u: 0.17, v: 0.4 }, target: 1 },
            { position: { u: 0.35, v: 0.4 }, target: 3 }

        ],
        infospots: [
            { 
                position: { u: 0.45, v: 0.4 }, 
                image: [ './mapa/2/2a.jpg', './mapa/2/2b.jpg'],
                title: '', 
                description: ''
            }
        ]
    },    
	{
        id: 3,
        image: './mapa/3.jpg',
        music: './audio/3.m4a',
        hotspots: [
            { position: { u: 0.1, v: 0.4 }, target: 1 },
            { position: { u: 0.62, v: 0.4 }, target: 2}
        ],
        infospots: [
        ]
    }
    // Add more panoramas as needed
];

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Load info icon texture
const infoTexture = textureLoader.load('./info.svg');
const infoSpriteMaterial = new THREE.SpriteMaterial({
    map: infoTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false
});

const iconTexture = textureLoader.load('./location.svg', (texture) => {
    // FIX: Ensure texture is properly loaded with error handling
    console.log('Hotspot icon loaded successfully');
    
    // Add custom CSS for the canvas to show pointer cursor on hover
    const canvasStyle = document.createElement('style');
    canvasStyle.innerHTML = `
        canvas {
            cursor: grab;
        }
        canvas:active {
            cursor: grabbing;
        }
    `;
    document.head.appendChild(canvasStyle);
    
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

// Animation parameters for hotspots
const hotspotAnimations = {
    baseSize: 30,

    normalScale: new THREE.Vector2(40, 40),
    hoverScale: new THREE.Vector2(90, 90),

    pulseSpeed: 0.3,
    pulseAmount: 0.05,

    rotationSpeed: 0.02,
    rotationAmount: 0.7,

    normalColor: new THREE.Color(0xffffff),
    hoverColor: new THREE.Color(0xC1C1C1),

    lerpSpeed: 0.05
};

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

function createInfospots(infospots) {
    infospotsGroup.remove(...infospotsGroup.children);
    
    infospots.forEach(infospot => {
        const position = computePosition(infospot.position.u, infospot.position.v, hostpotRadius);
        const sprite = new THREE.Sprite(infoSpriteMaterial.clone()); // Clone material to avoid sharing
        sprite.position.copy(position);

        sprite.scale.copy(hotspotAnimations.normalScale);
        // sprite.scale.set(50, 50, 1);
        // sprite.material.color = new THREE.Color(0x00ff00); // Green tint
        // Add visual feedback for debugging
        sprite.material.color = hotspotAnimations.normalColor.clone();
        
        sprite.userData = {
            type: 'infospot',
            title: infospot.title,
            description: infospot.description,
            image: infospot.image,
            
            hovered: false,
            pulsePhase: Math.random() * Math.PI * 2, // Random start phase for pulse animation
            initialYRotation: Math.random() * Math.PI * 2 
        };
        infospotsGroup.add(sprite);
    });
}

// Function to create hotspots
function createHotspots(hotspots) {
    hotspotsGroup.remove(...hotspotsGroup.children);
    
    hotspots.forEach(hotspot => {
        const position = computePosition(hotspot.position.u, hotspot.position.v, hostpotRadius);
        const sprite = new THREE.Sprite(spriteMaterial.clone());
        sprite.position.copy(position);

        sprite.scale.copy(hotspotAnimations.normalScale);
        // sprite.scale.set(50, 50, 1);
        // sprite.material.color = new THREE.Color(0x00ff00); // Green tint
        // Add visual feedback for debugging
        sprite.material.color = hotspotAnimations.normalColor.clone();
        
        sprite.userData = { 
            target: hotspot.target, 
            type: 'hotspot',

            hovered: false,
            pulsePhase: Math.random() * Math.PI * 2, // Random start phase for pulse animation
            initialYRotation: Math.random() * Math.PI * 2  
        };
        hotspotsGroup.add(sprite);
    });
}

// Function to load a panorama by ID
function loadPanorama(panoramaId) {
    const panorama = panoramas.find(p => p.id === panoramaId);
    if (!panorama) return;

    // Remove existing hotspots
    hotspotsGroup.remove(...hotspotsGroup.children);
    infospotsGroup.remove(...infospotsGroup.children);

    // Load new texture and update scene
    textureLoader.load(panorama.image, (texture) => {
		// Apply anisotropic filtering for better quality at oblique angles
        texture.colorSpace = THREE.SRGBColorSpace; // <<< Add this line

		if (renderer.capabilities.getMaxAnisotropy) {
			texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
		}
		
		// Filtering and mipmapping for high-res textures
		texture.minFilter = THREE.LinearMipmapLinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.generateMipmaps = true;
		
        cylinder.material.map = texture;
        cylinder.material.needsUpdate = true;

		// Update audio when texture loads
        if (panorama.music && window.changeAudio) {
            console.log('calling audio change to', panorama.music);
            window.changeAudio(panorama.music);
        }

        // Create new hotspots & infospots for this panorama
        createHotspots(panorama.hotspots);
        createInfospots(panorama.infospots);
    });
}

// Function to extract panorama ID from URL path
function getPanoramaIdFromUrl() {
    // Get path segments (e.g., ["", "22"] for mysite.com/22)
    const pathSegments = window.location.pathname.split('/');
    
    // Get the last numeric segment that's a valid number
    const numericSegments = pathSegments.filter(segment => !isNaN(segment) && segment !== '');
    const lastNumericSegment = numericSegments[numericSegments.length - 1];
    
    // Parse the ID or default to 1
    return lastNumericSegment ? parseInt(lastNumericSegment, 10) : 1;
}

// Track mouse position for hover effects
const mouse = new THREE.Vector2();
let hoveredHotspot = null;

// Hotspot & infospot hover effects
function updateObjectHoverEffects() {
    // Create raycaster from current mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Set raycaster precision for sprites
    raycaster.params.Sprite = { threshold: 0.3 };
    
    // Check for intersections
    const intersects = raycaster.intersectObjects([
        ...hotspotsGroup.children, 
        ...infospotsGroup.children
    ]);

    // Reset previous hover state if different hotspot or no hotspot is hovered
    if (hoveredHotspot && (intersects.length === 0 || intersects[0].object !== hoveredHotspot)) {
        hoveredHotspot.userData.hovered = false;
        hoveredHotspot = null;
        // Change cursor back to default
        document.body.style.cursor = 'grab';
    }
    
    // Set new hovered hotspot
    if (intersects.length > 0) {
        hoveredHotspot = intersects[0].object;
        hoveredHotspot.userData.hovered = true;
        // Change cursor to pointer to indicate clickable element
        document.body.style.cursor = 'pointer';
    }
    
    // Apply animations to all hotspots
    const time = performance.now() * 0.001; // Current time in seconds
    
    // Update hotspots animations
    hotspotsGroup.children.forEach(sprite => {
        updateObjectAnimation(sprite, time, hotspotAnimations);
    });
    
    // Update infospots animations
    infospotsGroup.children.forEach(sprite => {
        updateObjectAnimation(sprite, time, hotspotAnimations);
    });
}

function updateObjectAnimation(object, time, animParams) {
    // Make object always face the camera
    // object.lookAt(camera.position);

    if (object.userData.hovered) {
        // Smooth transition to hover scale
        object.scale.lerp(animParams.hoverScale, animParams.lerpSpeed);
        
        // Smooth color transition to hover color
        object.material.color.lerp(animParams.hoverColor, animParams.lerpSpeed);
        
        // Subtle pulse effect when hovered
        // const hoverPulse = 1 + Math.sin(time * animParams.pulseSpeed * 1.5) * (animParams.pulseAmount * 0.5);
        // object.scale.multiplyScalar(hoverPulse);
    } else {
        // Base scale with subtle pulse
        const baseScale = animParams.normalScale.clone();
        const idlePulse = 1 + Math.sin(time * animParams.pulseSpeed + object.userData.pulsePhase) * animParams.pulseAmount;
        baseScale.multiplyScalar(idlePulse);
        
        // Smooth transition back to normal scale
        object.scale.lerp(baseScale, animParams.lerpSpeed);
        
        // Smooth color transition back to normal
        object.material.color.lerp(animParams.normalColor, animParams.lerpSpeed);
        
        // Subtle rotation animation
        object.rotation.z = Math.sin(time * animParams.rotationSpeed + object.userData.initialRotation) * animParams.rotationAmount;
    }
}

// Set up OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
const overlay = document.getElementById('overlay-label');
const logo = document.getElementById('logo');

// Limit vertical rotation to avoid seeing the top/bottom edges
controls.minPolarAngle = Math.PI * 0.50; // Restrict looking too far up
controls.maxPolarAngle = Math.PI * 0.50; // Restrict looking too far down

// Limit horizontal rotation to -45° to +45° (convert degrees to radians)
controls.minAzimuthAngle = THREE.MathUtils.degToRad(-130);
controls.maxAzimuthAngle = THREE.MathUtils.degToRad(130);

// Zoom settings
controls.enableZoom = true;
controls.minDistance = 1;    // Prevent zooming too close to the center
controls.maxDistance = 50;   // Prevent zooming too far out, keeping the view immersive

controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Update hotspot and infospot animations
    updateObjectHoverEffects();
    
    // Make hotspots always face the camera
    hotspotsGroup.children.forEach(sprite => {
        sprite.lookAt(camera.position);
    });    
    
    infospotsGroup.children.forEach(sprite => {
        sprite.lookAt(camera.position);
    });

    renderer.render(scene, camera);
}
// Create a clock for animation timing
const clock = new THREE.Clock();
animate();

// when the user *starts* interacting…
controls.addEventListener('start', () => {
  overlay.classList.add('to-corner');
//   logo.style.display = 'none';
});

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

// Create a function to handle both mouse clicks and touch events
function handleInteraction(event) {
    // Prevent default behavior to avoid any unwanted navigation
    event.preventDefault();
    
	// Close modal
	const modal = document.getElementById('info-modal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }

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

    const intersects = raycaster.intersectObjects([
        ...hotspotsGroup.children,
        ...infospotsGroup.children
    ]);

    if (intersects.length > 0) {
        // Get target panorama ID from the clicked hotspot
        const target = intersects[0].object.userData.target;
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.type === 'hotspot') 
            {
                loadPanorama(object.userData.target);
            } 
            else if (object.userData.type === 'infospot') 
            {
                const modal = document.getElementById('info-modal');
                const images = Array.isArray(object.userData.image) 
                    ? object.userData.image 
                    : [object.userData.image];
                    
                // Update modal content
                modal.querySelector('#modal-title').textContent = object.userData.title;
                modal.querySelector('#modal-description').textContent = object.userData.description;

                // Handle image container
                const container = modal.querySelector('#modal-image-container');
                container.innerHTML = ''; // Clear previous content

                if (images.length > 1) {
                    // Generate carousel HTML
                    container.innerHTML = `
                        ${images.map((img, i) => `
                        <img src="${img}" class="carousel-image ${i === 0 ? 'active' : ''}">
                        `).join('')}
                        <button class="carousel-prev">❮</button>
                        <button class="carousel-next">❯</button>
                        <div class="carousel-dots">
                        ${images.map((_, i) => `
                            <span class="dot ${i === 0 ? 'active' : ''}"></span>
                        `).join('')}
                        </div>
                    `;

                    // Carousel functionality
                    let currentIndex = 0;
                    const imagesEls = container.querySelectorAll('.carousel-image');
                    const dots = container.querySelectorAll('.dot');

                    const updateCarousel = (newIndex) => {
                        imagesEls[currentIndex].classList.remove('active');
                        dots[currentIndex].classList.remove('active');
                        currentIndex = newIndex;
                        imagesEls[currentIndex].classList.add('active');
                        dots[currentIndex].classList.add('active');
                    };

                    // Navigation handlers
                    container.querySelector('.carousel-prev').addEventListener('click', () => 
                        updateCarousel((currentIndex - 1 + images.length) % images.length));
                    
                    container.querySelector('.carousel-next').addEventListener('click', () => 
                        updateCarousel((currentIndex + 1) % images.length));

                    dots.forEach((dot, index) => {
                        dot.addEventListener('click', () => updateCarousel(index));
                    });
                } 
                else 
                {
                    // Single image display
                    const img = document.createElement('img');
                    img.src = images[0];
                    img.className = 'carousel-image active';
                    container.appendChild(img);
                }

                modal.style.display = 'flex';

                return; // Prevent modal from closing
            }
        }
        // Provide visual feedback (optional)
        intersects[0].object.scale.multiplyScalar(1.2);
        setTimeout(() => {
            if (intersects[0].object) {
                intersects[0].object.scale.divideScalar(1.2);
            }
        }, 200);
    }
}

window.addEventListener('click', handleInteraction);
window.addEventListener('touchend', handleInteraction);

// Add click event listener for hotspots

// Load panorama based on URL or default to 1
loadPanorama(getPanoramaIdFromUrl());