import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('three-container');
  if (!container) return;

  // 1. SCENE & RENDERER SETUP
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#7DD3FC'); // Sky blue

  const width = container.clientWidth || 520;
  const height = container.clientHeight || 420;

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 4, 16);
  camera.lookAt(0, 1.2, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 2. LIGHTS
  const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight('#ffffff', 0.8);
  dirLight.position.set(5, 10, 7);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 25;
  dirLight.shadow.camera.left = -8;
  dirLight.shadow.camera.right = 8;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -8;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // 3. MATERIALS
  const woodMaterial = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.8 });
  const tableMaterial = new THREE.MeshStandardMaterial({ color: '#DDBE86', roughness: 0.7 });
  const groundMaterial = new THREE.MeshStandardMaterial({ color: '#FFE4E6', roughness: 0.9 });
  const skyTreeMaterial = new THREE.MeshStandardMaterial({ color: '#4ADE80', roughness: 0.9 });
  
  const redMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.6 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.5 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.8 });

  // 4. ENVIRONMENT & BACKGROUND
  // Ground
  const groundGeo = new THREE.PlaneGeometry(50, 50);
  const ground = new THREE.Mesh(groundGeo, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Distant Background Trees (stylized spheres)
  const tree1 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), skyTreeMaterial);
  tree1.position.set(6, 2, -5);
  scene.add(tree1);

  const tree2 = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshStandardMaterial({ color: '#22C55E' }));
  tree2.position.set(9, 2.5, -6);
  scene.add(tree2);

  const tree3 = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), skyTreeMaterial);
  tree3.position.set(-8, 1.8, -5);
  scene.add(tree3);

  // 5. TENT & TABLE STRUCTURE
  // Table
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 2), tableMaterial);
  tableTop.position.set(-0.5, 1.3, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  scene.add(tableTop);

  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.3, 8);
  const leg1 = new THREE.Mesh(legGeo, woodMaterial); leg1.position.set(-2.5, 0.65, 0.8); leg1.castShadow = true; scene.add(leg1);
  const leg2 = new THREE.Mesh(legGeo, woodMaterial); leg2.position.set(1.5, 0.65, 0.8); leg2.castShadow = true; scene.add(leg2);
  const leg3 = new THREE.Mesh(legGeo, woodMaterial); leg3.position.set(-2.5, 0.65, -0.8); leg3.castShadow = true; scene.add(leg3);
  const leg4 = new THREE.Mesh(legGeo, woodMaterial); leg4.position.set(1.5, 0.65, -0.8); leg4.castShadow = true; scene.add(leg4);

  // Dark interior back drop
  const backDrop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.5, 0.1), darkMat);
  backDrop.position.set(-0.5, 1.25, -1);
  scene.add(backDrop);

  // Awning / Roof structure (Alternate color panels)
  const roofGroup = new THREE.Group();
  const colors = [redMat, whiteMat, orangeMat, yellowMat];
  const panelWidth = 1.3;
  for (let i = 0; i < 4; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(panelWidth, 0.08, 2.5), colors[i]);
    panel.position.set(-2.45 + i * panelWidth + panelWidth/2, 2.7, 0.1);
    panel.rotation.x = 0.2; // Slanted roof
    panel.castShadow = true;
    roofGroup.add(panel);
  }
  scene.add(roofGroup);

  // Tent bamboo posts
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8);
  const post1 = new THREE.Mesh(postGeo, woodMaterial); post1.position.set(-2.5, 1.4, 1.1); post1.castShadow = true; scene.add(post1);
  const post2 = new THREE.Mesh(postGeo, woodMaterial); post2.position.set(1.5, 1.4, 1.1); post2.castShadow = true; scene.add(post2);

  // 6. FRUIT PYRAMIDS & DISPLAY
  const fruitRadius = 0.09;
  const sphereGeo = new THREE.SphereGeometry(fruitRadius, 8, 8);

  function createFruitPyramid(startX, startY, startZ, rows, material) {
    const group = new THREE.Group();
    for (let r = 0; r < rows; r++) {
      const count = rows - r;
      const offset = r * fruitRadius;
      for (let x = 0; x < count; x++) {
        for (let z = 0; z < count; z++) {
          const fruit = new THREE.Mesh(sphereGeo, material);
          fruit.position.set(
            startX + x * fruitRadius * 2 + offset,
            startY + r * fruitRadius * 1.7,
            startZ + z * fruitRadius * 2 + offset
          );
          fruit.castShadow = true;
          group.add(fruit);
        }
      }
    }
    scene.add(group);
  }

  // Stacks on table
  createFruitPyramid(-2.1, 1.4, -0.6, 4, redMat); // Red apples stack
  createFruitPyramid(-1.1, 1.4, -0.3, 3, yellowMat); // Mangoes stack
  createFruitPyramid(-0.3, 1.4, -0.5, 4, new THREE.MeshStandardMaterial({ color: '#581C87', roughness: 0.5 })); // Mangosteens
  createFruitPyramid(0.7, 1.4, -0.4, 3, orangeMat); // Oranges stack

  // Ground Crates (Grid patterned boxes)
  function createCrate(x, y, z, color, fruitMat) {
    const crateGroup = new THREE.Group();
    const crateGeo = new THREE.BoxGeometry(0.9, 0.5, 0.7);
    const crateMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(0, 0.25, 0);
    crate.castShadow = true;
    crate.receiveShadow = true;
    crateGroup.add(crate);

    // Fill with fruit spheres
    for (let fx = -3; fx <= 3; fx++) {
      for (let fz = -2; fz <= 2; fz++) {
        const fr = new THREE.Mesh(sphereGeo, fruitMat);
        fr.position.set(fx * 0.11, 0.45, fz * 0.11);
        fr.castShadow = true;
        crateGroup.add(fr);
      }
    }

    crateGroup.position.set(x, y, z);
    scene.add(crateGroup);
  }

  createCrate(-2.0, 0, 1.4, '#EF4444', new THREE.MeshStandardMaterial({ color: '#A3E635' })); // Red Crate / Green Guavas
  createCrate(-0.9, 0, 1.5, '#FBBF24', redMat); // Yellow Crate / Apples
  createCrate(0.2, 0, 1.4, '#38BDF8', orangeMat); // Blue Crate / Oranges

  // 7. CHARACTERS
  // Vendor (Behind table)
  const vendor = new THREE.Group();
  // Torso
  const vTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.8, 8), whiteMat);
  vTorso.position.y = 0.4;
  vTorso.castShadow = true;
  vendor.add(vTorso);
  // Head
  const vHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), skinMat);
  vHead.position.y = 0.95;
  vHead.castShadow = true;
  vendor.add(vHead);
  // Turban
  const vTurban = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), whiteMat);
  vTurban.position.set(0, 1.1, 0.02);
  vTurban.scale.set(1.1, 0.7, 1.1);
  vendor.add(vTurban);
  const turbanDot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), redMat);
  turbanDot.position.set(0, 1.1, 0.23);
  vendor.add(turbanDot);

  vendor.position.set(-0.5, 0.9, -0.6);
  scene.add(vendor);

  // WALKING CUSTOMERS CLASS
  class Customer {
    constructor(startX, z, direction, shirtColor, bottomColor, skinColor) {
      this.group = new THREE.Group();
      this.direction = direction; // 1 for Right, -1 for Left
      this.speed = 0.02 + Math.random() * 0.01;
      this.z = z;

      // Torso
      this.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.65, 8), new THREE.MeshStandardMaterial({ color: shirtColor }));
      this.torso.position.y = 0.8;
      this.torso.castShadow = true;
      this.group.add(this.torso);

      // Head
      this.head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshStandardMaterial({ color: skinColor }));
      this.head.position.y = 1.25;
      this.head.castShadow = true;
      this.group.add(this.head);

      // Hair/Bun for women
      if (Math.random() > 0.5) {
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), darkMat);
        hair.position.set(0, 1.25, -0.12);
        this.group.add(hair);
      }

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 8);
      const legMat = new THREE.MeshStandardMaterial({ color: bottomColor });
      this.legL = new THREE.Mesh(legGeo, legMat);
      this.legL.position.set(-0.08, 0.25, 0);
      this.legL.castShadow = true;
      this.group.add(this.legL);

      this.legR = new THREE.Mesh(legGeo, legMat);
      this.legR.position.set(0.08, 0.25, 0);
      this.legR.castShadow = true;
      this.group.add(this.legR);

      // Arms
      const armGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.45, 8);
      const armMat = new THREE.MeshStandardMaterial({ color: skinColor });
      this.armL = new THREE.Mesh(armGeo, armMat);
      this.armL.position.set(-0.25, 0.7, 0);
      this.armL.castShadow = true;
      this.group.add(this.armL);

      this.armR = new THREE.Mesh(armGeo, armMat);
      this.armR.position.set(0.25, 0.7, 0);
      this.armR.castShadow = true;
      this.group.add(this.armR);

      this.group.position.set(startX, 0, z);
      scene.add(this.group);
    }

    update(time) {
      // Walk forward
      this.group.position.x += this.direction * this.speed;

      // Wrap around screen boundaries
      if (this.direction === 1 && this.group.position.x > 7) {
        this.group.position.x = -7;
      } else if (this.direction === -1 && this.group.position.x < -7) {
        this.group.position.x = 7;
      }

      // Face correct walk direction
      this.group.rotation.y = this.direction === 1 ? Math.PI / 2 : -Math.PI / 2;

      // Leg Swing Animation
      const swing = Math.sin(time * 10) * 0.5;
      this.legL.rotation.z = swing;
      this.legR.rotation.z = -swing;

      // Arm Swing Animation
      this.armL.rotation.z = -swing * 0.4;
      this.armR.rotation.z = swing * 0.4;
    }
  }

  // Spawn Customers
  const customers = [
    new Customer(-5, 2.2, 1, '#F97316', '#0D9488', '#D97706'), // Man in orange shirt, green dhoti
    new Customer(5, 2.8, -1, '#F472B6', '#F472B6', '#FBCFE8'), // Woman in pink saree
    new Customer(-2, 3.4, 1, '#3B82F6', '#1E293B', '#FDE68A')   // Man in blue shirt, pants
  ];

  // 8. MOUSE EVENT LISTENERS FOR CAMERA INTERACTION
  let mouseX = 0;
  let mouseY = 0;

  const onMouseMove = (e) => {
    const rect = container.getBoundingClientRect();
    // Normalize coordinates from -0.5 to 0.5
    mouseX = (e.clientX - rect.left) / rect.width - 0.5;
    mouseY = (e.clientY - rect.top) / rect.height - 0.5;
  };

  const onMouseLeave = () => {
    mouseX = 0;
    mouseY = 0;
  };

  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mouseleave', onMouseLeave);

  // 9. ANIMATION LOOP
  const clock = new THREE.Clock();

  const animate = () => {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // Update walking animations
    customers.forEach(customer => customer.update(time));

    // Target Camera positions (mouse pan interpolation)
    const targetCameraX = mouseX * 4;
    const targetCameraY = 4 - mouseY * 2;
    
    // Smooth camera panning
    camera.position.x += (targetCameraX - camera.position.x) * 0.05;
    camera.position.y += (targetCameraY - camera.position.y) * 0.05;
    camera.lookAt(0, 1.2, 0);

    renderer.render(scene, camera);
  };

  animate();

  // 10. RESPONSIVE RESIZE
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
  });
});
 