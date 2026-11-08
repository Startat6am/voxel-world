import * as THREE from 'three';
import './style.css';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9dfe7');
scene.fog = new THREE.Fog('#b9dfe7', 20, 43);

const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
const homePosition = new THREE.Vector3(12, 15, 12);
camera.position.copy(homePosition);
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

scene.add(new THREE.HemisphereLight(0xe9fff0, 0x80644c, 2.1));
const sun = new THREE.DirectionalLight(0xfff1d8, 3.2);
sun.position.set(-8, 15, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13 });
sun.shadow.bias = -0.00035;
scene.add(sun);

const material = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness });
const M = {
  grass: material('#8bcf70'), grassLight: material('#a7df83'), grassDark: material('#6ab45d'),
  soil: material('#a47750'), soilDark: material('#805638'), soilShade: material('#684b38'),
  bark: material('#986440'), barkLight: material('#b77b4c'),
  leaf: material('#469c59'), leafLight: material('#65b96a'), leafDark: material('#347e4b'),
  stone: material('#9baaa2'), stoneLight: material('#c4cec3'),
  water: material('#73c9d0', 0.3), waterLight: material('#a5e1dc', 0.3),
  pink: material('#f49cbe'), yellow: material('#ffe08b'), cream: material('#fff2d8'),
  pet: material('#e8a45f'), petLight: material('#f4c68e'), petDark: material('#bd7548'),
  nose: material('#493d39'), blush: material('#e98f8c')
};
const cube = new THREE.BoxGeometry(1, 1, 1);
const worldObjects = [];
function block(parent, x, y, z, sx, sy, sz, mat, cast = true) {
  const mesh = new THREE.Mesh(cube, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  worldObjects.push(mesh);
  return mesh;
}
function group(parent = scene, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// A floating diamond-shaped meadow, built from individual chunky voxel tiles.
const island = group();
const islandCells = [];
for (let x = -6; x <= 6; x++) {
  for (let z = -6; z <= 6; z++) {
    const distance = Math.abs(x) + Math.abs(z) * 0.92;
    if (distance > 10.6) continue;
    islandCells.push([x, z]);
    const edge = distance > 9.1;
    block(island, x, -0.04, z, 1, 0.46, 1, edge ? M.grassDark : M.grass);
    if (distance > 7.3) {
      block(island, x, -0.49, z, 1, 0.52, 1, M.soil);
      if ((x * 7 + z * 11) % 4 === 0) block(island, x, -0.94, z, 1, 0.38, 1, M.soilDark);
    }
  }
}
// Tapered, rocky underside makes the island feel suspended in the sky.
for (let layer = 0; layer < 4; layer++) {
  const radius = 4.9 - layer * 0.85;
  const y = -1.28 - layer * 0.39;
  const count = Math.round(22 - layer * 3);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    block(island, x, y, z, 1.12 - layer * 0.12, 0.78, 1.12 - layer * 0.12, layer > 1 ? M.soilShade : M.soilDark);
  }
}
for (let i = 0; i < 12; i++) {
  const a = i / 12 * Math.PI * 2;
  block(island, Math.cos(a) * 2.3, -2.48, Math.sin(a) * 2.3, 0.9, 0.52, 0.9, M.soilShade);
}

// A small clear pond with a blocky pebble shoreline.
const pond = group(island, -2.35, 0.205, -2.15);
block(pond, 0, 0, 0, 2.65, 0.055, 1.95, M.water, false);
block(pond, -0.35, 0.035, -0.15, 1.65, 0.018, 1.05, M.waterLight, false);
[[-1.55, -0.65], [-1.3, 0.72], [-0.6, 1.05], [0.65, 0.96], [1.3, 0.45], [1.3, -0.6], [0.7, -1.0], [-0.8, -1.0]].forEach(([x, z], i) => {
  block(pond, x, 0.08, z, 0.55, 0.2, 0.5, i % 2 ? M.stone : M.stoneLight);
});

// Trees: trunks and layered cubic crowns, with a few sunlit leaf cubes.
function makeTree(x, z, scale = 1) {
  const t = group(island, x, 0, z);
  block(t, 0, 0.77 * scale, 0, 0.42 * scale, 1.55 * scale, 0.42 * scale, M.bark);
  block(t, -0.03 * scale, 0.9 * scale, -0.22 * scale, 0.13 * scale, 1.15 * scale, 0.08 * scale, M.barkLight);
  const tiers = [
    { y: 1.8, r: 1.25, mat: M.leaf },
    { y: 2.42, r: 0.98, mat: M.leafLight },
    { y: 3.03, r: 0.66, mat: M.leafDark }
  ];
  tiers.forEach(({ y, r, mat }, tier) => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > 2) continue;
      block(t, dx * r * 0.57 * scale, y * scale, dz * r * 0.57 * scale, r * scale, 0.82 * scale, r * scale, mat);
    }
    if (tier === 0) block(t, -0.65 * scale, 1.9 * scale, -0.22 * scale, 0.5 * scale, 0.48 * scale, 0.5 * scale, M.leafLight);
  });
}
makeTree(-4.65, 1.55, 1.02);
makeTree(4.35, -3.55, 0.92);
makeTree(4.5, 2.15, 0.78);

function makeBush(x, z, s = 1) {
  const b = group(island, x, 0, z);
  block(b, 0, 0.48 * s, 0, 0.8 * s, 0.68 * s, 0.8 * s, M.leaf);
  block(b, 0.38 * s, 0.62 * s, 0.1 * s, 0.55 * s, 0.6 * s, 0.55 * s, M.leafLight);
  block(b, -0.34 * s, 0.59 * s, -0.16 * s, 0.55 * s, 0.58 * s, 0.55 * s, M.leafDark);
}
makeBush(-4.1, -1.15, 0.8); makeBush(2.8, 4.15, 0.85); makeBush(-0.9, 4.45, 0.72); makeBush(4.8, 0.25, 0.65);

function makeRock(x, z, s = 1) {
  const r = group(island, x, 0, z);
  block(r, 0, 0.38 * s, 0, 0.85 * s, 0.62 * s, 0.75 * s, M.stone);
  block(r, -0.12 * s, 0.75 * s, -0.08 * s, 0.48 * s, 0.34 * s, 0.5 * s, M.stoneLight);
}
makeRock(2.65, -1.1, 0.82); makeRock(-1.3, 3.85, 0.7); makeRock(4.8, 1.1, 0.55);

// Tiny voxel flowers and individual grass tufts.
function makeFlower(x, z, petalMat) {
  const f = group(island, x, 0, z);
  block(f, 0, 0.34, 0, 0.075, 0.45, 0.075, M.leafDark);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    block(f, Math.cos(a) * 0.13, 0.62, Math.sin(a) * 0.13, 0.19, 0.16, 0.19, petalMat);
  }
  block(f, 0, 0.67, 0, 0.12, 0.12, 0.12, M.yellow);
}
[[-5, -2, M.pink], [-3, 3, M.yellow], [0, 4, M.pink], [3, 3, M.cream], [5, -1, M.pink], [1, -4, M.yellow], [-5, 0, M.cream], [3, -4, M.pink], [-1, 1, M.yellow]].forEach(([x, z, c]) => makeFlower(x, z, c));
for (let i = 0; i < 34; i++) {
  const [x, z] = islandCells[(i * 37 + 11) % islandCells.length];
  if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
  const tuft = block(island, x + 0.26, 0.27, z + 0.18, 0.075, 0.3, 0.075, M.grassLight);
  tuft.rotation.z = i % 2 ? 0.2 : -0.2;
}

// Puffy voxel clouds drift slowly in the pastel sky.
function makeCloud(x, y, z, s) {
  const c = group(scene, x, y, z);
  [[0, 0, 0, 1], [0.7, 0.08, 0, 0.85], [-0.68, 0.04, 0.04, 0.9], [0.15, 0.4, 0, 0.75]].forEach(([a, b, d, k]) => {
    block(c, a * s, b * s, d * s, k * s, 0.4 * s, 0.55 * s, M.cream, false);
  });
  return c;
}
const clouds = [makeCloud(-9, 5.5, -5, 1.1), makeCloud(8, 6.3, 1, 0.85), makeCloud(-6, 4.6, 7, 0.72)];

// Mochi, a tiny warm-colored bear/fox friend made from soft voxel shapes.
const pet = group(scene, 0.55, 0.23, 0.55);
const p = (x, y, z, sx, sy, sz, m) => block(pet, x, y, z, sx, sy, sz, m);
p(0, 0.54, 0.02, 0.94, 0.76, 0.82, M.pet);
p(0, 0.28, -0.03, 0.68, 0.28, 0.7, M.petLight);
p(0, 1.18, -0.34, 0.94, 0.88, 0.84, M.pet);
p(0, 0.96, -0.77, 0.62, 0.35, 0.28, M.cream);
// Ears with warm pink inner pixels.
p(-0.34, 1.78, -0.28, 0.31, 0.55, 0.34, M.petDark);
p(-0.34, 1.79, -0.47, 0.16, 0.35, 0.06, M.blush);
p(0.34, 1.78, -0.28, 0.31, 0.55, 0.34, M.petDark);
p(0.34, 1.79, -0.47, 0.16, 0.35, 0.06, M.blush);
// Eyes, tiny highlights, nose and rosy cheeks.
p(-0.205, 1.27, -0.785, 0.105, 0.15, 0.055, M.nose);
p(0.205, 1.27, -0.785, 0.105, 0.15, 0.055, M.nose);
p(-0.23, 1.32, -0.818, 0.035, 0.045, 0.018, M.cream);
p(0.18, 1.32, -0.818, 0.035, 0.045, 0.018, M.cream);
p(0, 1.08, -0.94, 0.14, 0.105, 0.07, M.nose);
p(-0.39, 1.03, -0.73, 0.16, 0.1, 0.04, M.blush);
p(0.39, 1.03, -0.73, 0.16, 0.1, 0.04, M.blush);

const legs = [];
for (const x of [-0.3, 0.3]) for (const z of [-0.25, 0.25]) {
  const leg = group(pet, x, 0.19, z);
  block(leg, 0, 0, 0, 0.23, 0.4, 0.24, M.petDark);
  legs.push(leg);
}
const tail = group(pet, 0.37, 0.72, 0.35);
block(tail, 0.12, 0.17, 0.28, 0.28, 0.3, 0.48, M.pet);
block(tail, 0.12, 0.3, 0.51, 0.3, 0.27, 0.25, M.cream);
const petShadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), new THREE.MeshBasicMaterial({ color: '#476a49', transparent: true, opacity: 0.19 }));
petShadow.rotation.x = -Math.PI / 2; petShadow.position.y = 0.025; pet.add(petShadow);
const marker = new THREE.Group(); marker.position.y = 2.75; pet.add(marker);
const markerDot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: '#fff4c2' }));
marker.add(markerDot);

// Invisible walkable plane, clipped to the meadow's diamond silhouette.
const walkPlane = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 12.5), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
walkPlane.rotation.x = -Math.PI / 2; walkPlane.position.y = 0.205; scene.add(walkPlane);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let target = null, elapsed = 0, walkTime = 0, foodObject = null, foodAge = 0;
let hunger = 78, happiness = 92, apples = 5, selectedSnack = 'apple';
let toastTimer = 0, idleTimer = 0, cameraTween = 0, soundOn = false;

function say(message) {
  const bubble = $('bubble');
  bubble.textContent = message;
  bubble.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => bubble.classList.remove('show'), 1900);
}
function updateStats() {
  $('hunger-label').textContent = Math.round(hunger) + '%';
  $('happy-label').textContent = Math.round(happiness) + '%';
  $('hunger-meter').style.width = hunger + '%';
  $('happy-meter').style.width = happiness + '%';
  $('mood-tag').textContent = hunger < 25 ? '♡ A little hungry' : happiness > 75 ? '♡ Feeling cozy' : '♡ Wants to play';
}
function movePet(x, z) {
  target = new THREE.Vector3(THREE.MathUtils.clamp(x, -5.25, 5.25), 0.23, THREE.MathUtils.clamp(z, -5.25, 5.25));
  $('scene-tip').textContent = '🐾 Mochi is on the move!';
}
function chooseWalkPoint() {
  const options = islandCells.filter(([x, z]) => Math.abs(x) + Math.abs(z) < 7.5 && !(x < -1 && x > -4 && z < -1 && z > -3));
  const [x, z] = options[Math.floor(Math.random() * options.length)];
  movePet(x, z);
}
function feed() {
  if (apples <= 0) { say('No more apples — let’s find some!'); return; }
  apples--;
  $('feed').disabled = true;
  const fruit = group(scene, pet.position.x + 0.7, 0.7, pet.position.z + 0.4);
  const appleMat = material('#e94f50');
  block(fruit, 0, 0.16, 0, 0.34, 0.34, 0.34, appleMat);
  block(fruit, 0.07, 0.39, 0, 0.09, 0.16, 0.09, M.leaf);
  foodObject = fruit; foodAge = 0;
  movePet(fruit.position.x, fruit.position.z);
  say('A little apple for Mochi! 🍎');
  $('feed').disabled = false;
}
function play() {
  happiness = Math.min(100, happiness + 12);
  target = null;
  pet.userData.playUntil = elapsed + 2.3;
  say('Mochi is having the best time! ✨');
  updateStats();
}
function cuddle() {
  happiness = Math.min(100, happiness + 8);
  pet.userData.cuddleUntil = elapsed + 1.5;
  say('A warm little cuddle 🤍');
  updateStats();
}
$('feed').addEventListener('click', feed);
$('play').addEventListener('click', play);
$('pet').addEventListener('click', cuddle);
$('camera-home').addEventListener('click', () => { cameraTween = 1; say('A lovely view of your island'); });
$('fullscreen').addEventListener('click', () => {
  const wrap = $('scene-wrap');
  if (!document.fullscreenElement) wrap.requestFullscreen?.();
  else document.exitFullscreen?.();
});
$('sound-toggle').addEventListener('click', () => {
  soundOn = !soundOn;
  $('sound-toggle').textContent = soundOn ? '♫' : '♪';
  say(soundOn ? 'A little birdsong would be lovely' : 'Quiet time 🌿');
});
canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(walkPlane)[0];
  if (!hit) return;
  const { x, z } = hit.point;
  if (Math.abs(x) + Math.abs(z) * 0.92 > 10.15) return;
  movePet(x, z);
});

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  const aspect = width / height, halfH = 8.25;
  camera.left = -halfH * aspect; camera.right = halfH * aspect;
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
const observer = new ResizeObserver(resize);
observer.observe(canvas);
resize();

let last = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000 || 0, 0.04);
  last = now; elapsed += dt; idleTimer += dt;

  clouds.forEach((cloud, i) => {
    cloud.position.x += dt * (i === 1 ? -0.075 : 0.045);
    if (cloud.position.x > 13) cloud.position.x = -13;
    if (cloud.position.x < -13) cloud.position.x = 13;
  });

  if (cameraTween > 0) {
    cameraTween = Math.max(0, cameraTween - dt * 1.8);
    camera.position.lerp(homePosition, dt * 2.8);
    camera.lookAt(0, 0.5, 0);
  }

  const playing = elapsed < (pet.userData.playUntil || 0);
  const cuddling = elapsed < (pet.userData.cuddleUntil || 0);
  if (target) {
    const dx = target.x - pet.position.x, dz = target.z - pet.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.09) {
      pet.position.x += dx / distance * dt * 2.65;
      pet.position.z += dz / distance * dt * 2.65;
      pet.rotation.y = Math.atan2(dx, dz);
      walkTime += dt;
      pet.position.y = 0.23 + Math.abs(Math.sin(walkTime * 12)) * 0.11;
      legs.forEach((leg, i) => { leg.rotation.x = Math.sin(walkTime * 12 + (i % 2) * Math.PI) * 0.42; });
    } else {
      target = null; pet.position.y = 0.23;
      legs.forEach(leg => { leg.rotation.x = 0; });
      $('scene-tip').textContent = '✦ Tap anywhere on the island to explore';
    }
  } else {
    pet.position.y = 0.23 + Math.sin(elapsed * (playing ? 12 : 2.4)) * (playing ? 0.19 : 0.045);
    pet.rotation.z = Math.sin(elapsed * 1.7) * (cuddling ? 0.13 : 0.025);
    tail.rotation.x = Math.sin(elapsed * (playing ? 12 : 4)) * (playing ? 0.7 : 0.35);
    legs.forEach(leg => { leg.rotation.x = playing ? Math.sin(elapsed * 13) * 0.35 : 0; });
  }
  if (foodObject) {
    foodAge += dt;
    foodObject.position.y = 0.65 + Math.sin(elapsed * 5) * 0.08;
    foodObject.rotation.y += dt * 1.8;
    if (foodAge > 1.5) {
      scene.remove(foodObject); foodObject = null;
      hunger = Math.min(100, hunger + 22);
      happiness = Math.min(100, happiness + 5);
      say('Nom nom! So delicious! 🍓');
      updateStats();
    }
  }
  marker.position.y = 2.75 + Math.sin(elapsed * 3) * 0.08;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
window.setInterval(() => {
  hunger = Math.max(0, hunger - 0.15);
  happiness = Math.max(0, happiness - 0.08);
  updateStats();
}, 5000);
updateStats();
$('loading').classList.add('hidden');
