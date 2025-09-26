// Vanilla Three.js Lanyard for About section
// Uses existing photo as card texture: assets/img/image.jpg_11zon.jpg
// Lightweight spring motion + mouse parallax. No physics libs.
(function () {
  'use strict';

  const mount = document.getElementById('lanyard-mount');
  if (!mount) return;

  let width = mount.clientWidth || 360;
  let height = mount.clientHeight || 460;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
  camera.position.set(0, 0.8, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);
  

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.65);
  dir.position.set(3, 5, 6);
  scene.add(dir);

  // Card group (will swing slightly)
  const cardGroup = new THREE.Group();
  scene.add(cardGroup);

  // Create rounded ID card via Shape + Extrude
  function makeRoundedCard(w, h, r, depth) {
    const shape = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    const eps = Math.min(r, Math.min(w, h) / 2);
    shape.moveTo(x + eps, y);
    shape.lineTo(x + w - eps, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + eps);
    shape.lineTo(x + w, y + h - eps);
    shape.quadraticCurveTo(x + w, y + h, x + w - eps, y + h);
    shape.lineTo(x + eps, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - eps);
    shape.lineTo(x, y + eps);
    shape.quadraticCurveTo(x, y, x + eps, y);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 18
    });
    geo.center();
    return geo;
  }

  const loader = new THREE.TextureLoader();
  const faceTex = loader.load('assets/img/image.jpg_11zon.jpg');
  faceTex.colorSpace = THREE.SRGBColorSpace;

  const w = 2.0, h = 3.0, radius = 0.18, depth = 0.06;
  const cardGeo = makeRoundedCard(w, h, radius, depth);

  const frontMat = new THREE.MeshPhysicalMaterial({
    map: faceTex,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    roughness: 0.6,
    metalness: 0.2
  });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x0e1424, roughness: 0.8, metalness: 0.1 });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x1b2a4a, roughness: 0.6, metalness: 0.3 });

  // Assign materials by face groups: 0 front, 1 back, 2 sides (approx)
  const cardMesh = new THREE.Mesh(cardGeo, [frontMat, backMat, sideMat]);
  cardMesh.castShadow = false;
  cardMesh.receiveShadow = false;
  cardMesh.rotation.x = -0.05;
  cardGroup.add(cardMesh);

  // Add a small clip geometry on top (metallic)
  const clipGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08);
  const clipMat = new THREE.MeshStandardMaterial({ color: 0xcfd7df, metalness: 0.9, roughness: 0.2 });
  const clip = new THREE.Mesh(clipGeo, clipMat);
  clip.position.set(0, h / 2 + 0.1, 0);
  cardGroup.add(clip);

  // Lanyard band as a tube following a curve
  const bandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, h / 2 + 0.12, 0),
    new THREE.Vector3(0.2, h / 2 + 0.8, -0.4),
    new THREE.Vector3(-0.3, h / 2 + 1.2, -0.5),
    new THREE.Vector3(0, h / 2 + 1.6, 0)
  ]);
  const bandGeo = new THREE.TubeGeometry(bandCurve, 40, 0.03, 12, false);
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0, roughness: 0.5, metalness: 0.1 });
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.position.z = 0.02;
  cardGroup.add(band);

  // Simple spring motion and mouse parallax
  const targetRot = { x: -0.1, y: 0.0 };
  const vel = { x: 0, y: 0 };
  const stiffness = 0.06, damping = 0.12;

  let dragging = false;
  const mouse = new THREE.Vector2(0, 0);

  function onPointerMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouse.set((x - 0.5) * 2, (y - 0.5) * 2);
    if (!dragging) {
      targetRot.x = -0.08 + mouse.y * 0.15;
      targetRot.y = mouse.x * 0.2;
    }
  }
  function onPointerDown() { dragging = true; }
  function onPointerUp() { dragging = false; }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  // Resize handling
  function onResize() {
    width = mount.clientWidth || width;
    height = mount.clientHeight || height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', onResize);

  // Pause when off-screen
  let running = true;
  try {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => { running = entry.isIntersecting; });
    }, { threshold: [0, 0.05] });
    io.observe(mount);
  } catch {}

  // Animate
  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;

    // Spring integrate toward targetRot
    const dx = targetRot.x - cardGroup.rotation.x;
    const dy = targetRot.y - cardGroup.rotation.y;
    vel.x = vel.x * (1 - damping) + dx * stiffness;
    vel.y = vel.y * (1 - damping) + dy * stiffness;
    cardGroup.rotation.x += vel.x;
    cardGroup.rotation.y += vel.y;
    cardGroup.position.y = Math.sin(performance.now() * 0.0012) * 0.05; // tiny idle sway

    renderer.render(scene, camera);
  }

  onResize();
  animate();
})();
