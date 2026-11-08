import * as THREE from 'three';
import './style.css';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#78c2fb');
scene.fog = new THREE.Fog('#78c2fb', 52, 90);

const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
const homePosition = new THREE.Vector3(13, 7.8, 13);
const cameraFocus = new THREE.Vector3(0, 0.25, 0);
camera.position.copy(homePosition);
camera.lookAt(cameraFocus);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.08;

scene.add(new THREE.HemisphereLight(0xe8f5ff, 0x68452d, 1.15));
const sun = new THREE.DirectionalLight(0xfff1d7, 2.7);
sun.position.set(-8, 15, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13 });
sun.shadow.bias = -0.00035;
scene.add(sun);

const material = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness });
const M = {
  grass: material('#76c936'), grassLight: material('#9bdc4b'), grassDark: material('#4c9d24'),
  soil: material('#9a5728'), soilDark: material('#784019'), soilShade: material('#593015'),
  bark: material('#986440'), barkLight: material('#b77b4c'),
  leaf: material('#3b9b19'), leafLight: material('#70c52b'), leafDark: material('#176c26'),
  stone: material('#9baaa2'), stoneLight: material('#c4cec3'),
  water: material('#43b6c6', 0.3), waterLight: material('#8cddd5', 0.3),
  pink: material('#f49cbe'), yellow: material('#ffe08b'), cream: material('#fff2d8'),
  pet: material('#fff8ed'), petLight: material('#ffffff'), petDark: material('#e8dfd2'),
  nose: material('#202329'), blush: material('#f49aab')
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

// Measured target footprint: 20 cells left of the visual center and 26 right.
// Approximate depth is 32 cells. The rear-left corner is intentionally clipped.
// A 0.30 world-unit voxel keeps the larger 46x32 grid in the existing diorama scale.
const island = group();
const islandCells = [];
const VOXEL = 0.30;
const X_MIN = -20, X_MAX = 25, Z_MIN = -16, Z_MAX = 15;
function isIslandCell(x, z) {
  // Cut away a stepped triangular notch at the rear-left corner.
  if (z <= -14 && x <= -17 + (z + 16) * 2) return false;
  return true;
}
// Batch repeated terrain cubes into InstancedMeshes to reduce draw calls.
const terrainItems = new Map();
const addTerrain = (mat, x, y, z, sx, sy, sz) => {
  if (!terrainItems.has(mat)) terrainItems.set(mat, []);
  terrainItems.get(mat).push([x, y, z, sx, sy, sz]);
};
for (let x = X_MIN; x <= X_MAX; x++) {
  for (let z = Z_MIN; z <= Z_MAX; z++) {
    if (!isIslandCell(x, z)) continue;
    const wx = x * VOXEL, wz = z * VOXEL;
    islandCells.push([wx, wz]);
    const edge = x === X_MIN || x === X_MAX || z === Z_MIN || z === Z_MAX ||
      !isIslandCell(x - 1, z) || !isIslandCell(x + 1, z) ||
      !isIslandCell(x, z - 1) || !isIslandCell(x, z + 1);
    const topMat = ((x * 3 + z * 5) % 11 === 0) ? M.grassLight : (edge ? M.grassDark : M.grass);
    addTerrain(topMat, wx, -0.02, wz, VOXEL, 0.18, VOXEL);
    const soilMat = ((x * 7 + z * 3) % 5 === 0) ? M.soilDark : M.soil;
    addTerrain(soilMat, wx, -0.23, wz, VOXEL, 0.24, VOXEL);
  }
}
for (let x = X_MIN + 1; x < X_MAX; x++) {
  for (let z = Z_MIN + 1; z < Z_MAX; z++) {
    const edgeDistance = Math.min(x - X_MIN, X_MAX - x, z - Z_MIN, Z_MAX - z);
    if (edgeDistance > 3 || !isIslandCell(x, z)) continue;
    const hash = Math.abs((x * 17 + z * 29 + x * z * 3) % 7);
    if (hash < 3) continue;
    const depth = hash === 6 ? 0.42 : 0.30;
    addTerrain(hash % 2 ? M.soilDark : M.soilShade, x * VOXEL, -0.48 - depth * 0.18, z * VOXEL, 0.27, depth, 0.27);
  }
}
const terrainDummy = new THREE.Object3D();
for (const [mat, items] of terrainItems) {
  const batch = new THREE.InstancedMesh(cube, mat, items.length);
  batch.castShadow = true;
  batch.receiveShadow = true;
  items.forEach(([x, y, z, sx, sy, sz], index) => {
    terrainDummy.position.set(x, y, z);
    terrainDummy.scale.set(sx, sy, sz);
    terrainDummy.updateMatrix();
    batch.setMatrixAt(index, terrainDummy.matrix);
  });
  batch.instanceMatrix.needsUpdate = true;
  batch.computeBoundingSphere();
  island.add(batch);
}
// Rounded apple tree with a thick trunk and a stepped spherical canopy.
function makeTree(x,z,scale=1) {
 const t=group(island,x,0,z);
 block(t,0,.95*scale,0,.72*scale,1.9*scale,.72*scale,M.bark);
 block(t,-.19*scale,.95*scale,-.39*scale,.15*scale,1.45*scale,.08*scale,M.barkLight);
 const crown=[
  [0,2.45,0,2.5,1.05,2.35],[0,3.15,0,2.15,.9,2.1],
  [-.55,3.65,0,1.55,.8,1.65],[.5,3.62,.05,1.55,.8,1.6],
  [0,4.02,0,1.35,.65,1.4],[-.85,3.05,0,.85,1.1,1.5],[.85,3.05,0,.85,1.1,1.5]
 ];
 crown.forEach(([x,y,z,sx,sy,sz],i)=>block(t,x*scale,y*scale,z*scale,sx*scale,sy*scale,sz*scale,i%3===0?M.leafLight:M.leaf));
 const apple=material('#ef5545');
 [[-.75,3.45,.8],[.72,2.9,.83],[.15,3.85,.68]].forEach(([ax,ay,az])=>block(t,ax*scale,ay*scale,az*scale,.42*scale,.43*scale,.35*scale,apple));
}
makeTree(-3.6,-2.0,1.0);
function makeBush(x, z, s = 1) {
  const b = group(island, x, 0, z);
  block(b, 0, 0.48 * s, 0, 0.8 * s, 0.68 * s, 0.8 * s, M.leaf);
  block(b, 0.38 * s, 0.62 * s, 0.1 * s, 0.55 * s, 0.6 * s, 0.55 * s, M.leafLight);
  block(b, -0.34 * s, 0.59 * s, -0.16 * s, 0.55 * s, 0.58 * s, 0.55 * s, M.leafDark);
}
makeBush(-5.1,1.1,0.9); makeBush(5.2,-2.3,0.95); makeBush(4.8,1.2,0.85); makeBush(-1.5,4.8,0.7);

function makeRock(x, z, s = 1) {
  const r = group(island, x, 0, z);
  block(r, 0, 0.38 * s, 0, 0.85 * s, 0.62 * s, 0.75 * s, M.stone);
  block(r, -0.12 * s, 0.75 * s, -0.08 * s, 0.48 * s, 0.34 * s, 0.5 * s, M.stoneLight);
}
makeRock(-2.1,3.4,0.7); makeRock(4.3,2.7,0.8);

// Cream cottage with a deep-blue stepped voxel roof, door, chimney and fence.
const house=group(island,3.35,0,-1.55);
block(house,0,1.25,0,3.0,2.5,2.65,material('#f4dfb6'));
block(house,0,1.25,1.34,3.0,2.5,.12,material('#f8e8c9'));
block(house,-.35,.82,1.43,.85,1.62,.16,material('#754321'));
block(house,-.35,.85,1.54,.12,.12,.06,material('#f4c44f'));
block(house,.92,1.55,1.45,.68,.78,.16,material('#81502c'));
block(house,.92,1.55,1.55,.43,.52,.05,material('#55a9dc'));
const roofBlue=material('#2868d5');
for(let row=0;row<4;row++){
 const width=3.9-row*.42, depth=3.25-row*.42;
 block(house,0,2.55+row*.38,-.05,width,.42,depth,roofBlue);
 for(let x=-Math.floor(width);x<=Math.floor(width);x+=.72) block(house,x*.42,2.79+row*.38,1.35-row*.42,.38,.36,.42,roofBlue);
}
block(house,1.05,4.25,-.25,.55,.9,.55,material('#9a5728'));
for(let i=0;i<3;i++) block(house,1.05,4.85+i*.27,-.25,.23,.22,.23,M.cream);
for(let i=0;i<5;i++) block(house,1.0+i*.48,.55,1.95,.25,.8,.25,material('#bd9565'));
block(house,1.95,.8,1.95,1.9,.16,.18,material('#bd9565'));
// A little pale stepping-stone path leads from the cottage door to the kitten.
block(island,2.6,.205,0.25,.72,.035,.58,material('#d8bd91'),false);
block(island,2.05,.205,1,.72,.035,.58,material('#d8bd91'),false);
block(island,1.5,.205,1.75,.72,.035,.58,material('#d8bd91'),false);
block(island,0.95,.205,2.5,.72,.035,.58,material('#d8bd91'),false);
block(island,0.3999999999999999,.205,3.25,.72,.035,.58,material('#d8bd91'),false);
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
[[-5,0,M.pink],[-2,4,M.yellow],[1,4,M.pink],[4,1,M.pink],[5,-1,M.cream],[0,-5,M.yellow],[-5,-3,M.cream],[3,-4,M.pink],[-1,2,M.yellow]].forEach(([x, z, c]) => makeFlower(x, z, c));
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
const clouds = [makeCloud(-9, 6.5, -5, 1.1), makeCloud(8, 7.2, 1, 0.85), makeCloud(-6, 5.8, 7, 0.72)];

// White voxel kitten with pointed ears, pink nose and tiny paws.
const pet = group(scene, 0.25, 0.23, 2.7);
pet.rotation.y = Math.PI;
const p=(x,y,z,sx,sy,sz,m)=>block(pet,x,y,z,sx,sy,sz,m);
p(0,.48,0,.9,.7,.78,M.petLight);
p(0,1.12,-.28,.9,.82,.72,M.petLight);
p(-.32,1.73,-.22,.28,.72,.28,M.petLight);
p(.32,1.73,-.22,.28,.72,.28,M.petLight);
p(-.32,1.76,-.38,.12,.42,.05,M.blush);
p(.32,1.76,-.38,.12,.42,.05,M.blush);
p(-.2,1.2,-.67,.11,.15,.05,M.nose);
p(.2,1.2,-.67,.11,.15,.05,M.nose);
p(0,1.0,-.72,.13,.1,.06,M.blush);
p(-.34,.98,-.66,.14,.09,.05,M.blush);
p(.34,.98,-.66,.14,.09,.05,M.blush);
const tail=group(pet,.45,.55,.3);
block(tail,.12,.2,.25,.25,.35,.25,M.petLight);
block(tail,.12,.42,.42,.25,.18,.25,M.petLight);
const legs = [];
for (const x of [-0.3, 0.3]) for (const z of [-0.25, 0.25]) {
  const leg = group(pet, x, 0.19, z);
  block(leg, 0, 0, 0, 0.23, 0.4, 0.24, M.petLight);
  legs.push(leg);
}
const petShadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), new THREE.MeshBasicMaterial({ color: '#476a49', transparent: true, opacity: 0.19 }));
petShadow.rotation.x = -Math.PI / 2; petShadow.position.y = 0.025; pet.add(petShadow);

// A little golden voxel fish hovering between the tree and cottage.
const fish=group(scene,.25,2.05,-.15);
fish.rotation.y = Math.PI;
const fishGold=material('#ffb51e'), fishLight=material('#ffd34c'), fishOrange=material('#f28b16');
block(fish,0,0,0,.95,.62,.5,fishGold);
block(fish,-.53,.02,0,.42,.48,.42,fishLight);
block(fish,.65,0,0,.38,.42,.42,fishOrange);
block(fish,.9,.28,0,.35,.25,.35,fishOrange);
block(fish,-.16,.18,-.28,.13,.15,.06,M.nose);
block(fish,-.22,.2,-.32,.04,.05,.025,M.cream);
block(fish,.18,-.22,-.05,.3,.25,.18,fishLight);
const marker = new THREE.Group(); marker.position.y = 2.75; pet.add(marker);
const markerDot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: '#fff4c2' }));
marker.add(markerDot);

// Invisible walkable plane, clipped to the meadow's diamond silhouette.
const walkPlane = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 9.6), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
walkPlane.rotation.x = -Math.PI / 2; walkPlane.position.set(0.75, 0.205, -0.15); scene.add(walkPlane);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let target = null, elapsed = 0, walkTime = 0, foodObject = null, foodAge = 0;
let hunger = 78, happiness = 92, apples = 5, selectedSnack = 'apple';
let toastTimer = 0, idleTimer = 0, cameraTween = 0, soundOn = false;
let cameraDragEnabled = false, petClickEnabled = true, activeCameraPointer = null;
const cameraDragStart = { x: 0, y: 0 };

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
  target = new THREE.Vector3(THREE.MathUtils.clamp(x, -5.7, 7.5), 0.23, THREE.MathUtils.clamp(z, -4.5, 4.5));
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
const cameraModeButton = $('camera-pan-mode');
const petModeButton = $('pet-click-mode');
function setInteractionMode(mode) {
  cameraDragEnabled = mode === 'camera';
  petClickEnabled = mode === 'pet';
  cameraModeButton.classList.toggle('active', cameraDragEnabled);
  petModeButton.classList.toggle('active', petClickEnabled);
  cameraModeButton.setAttribute('aria-pressed', String(cameraDragEnabled));
  petModeButton.setAttribute('aria-pressed', String(petClickEnabled));
  canvas.style.cursor = cameraDragEnabled ? 'grab' : 'crosshair';
  $('scene-tip').textContent = cameraDragEnabled ? '✥ Drag to move the camera' : '🐾 Tap the island to move Mochi';
}
cameraModeButton.addEventListener('click', () => setInteractionMode(cameraDragEnabled ? 'pet' : 'camera'));
petModeButton.addEventListener('click', () => setInteractionMode(petClickEnabled ? 'camera' : 'pet'));
setInteractionMode('pet');
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
  if (cameraDragEnabled) {
    activeCameraPointer = event.pointerId;
    cameraDragStart.x = event.clientX;
    cameraDragStart.y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    return;
  }
  if (!petClickEnabled) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(walkPlane)[0];
  if (!hit) return;
  const { x, z } = hit.point;
  if (x < -6.15 || x > 7.65 || z < -4.95 || z > 4.65) return;
  movePet(x, z);
});
canvas.addEventListener('pointermove', (event) => {
  if (activeCameraPointer !== event.pointerId) return;
  const dx = event.clientX - cameraDragStart.x;
  const dy = event.clientY - cameraDragStart.y;
  cameraDragStart.x = event.clientX;
  cameraDragStart.y = event.clientY;
  const worldPerPixel = (camera.top - camera.bottom) / Math.max(canvas.clientHeight, 1);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const forward = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
  right.y = 0; forward.y = 0; right.normalize(); forward.normalize();
  const shift = right.multiplyScalar(-dx * worldPerPixel).add(forward.multiplyScalar(dy * worldPerPixel));
  camera.position.add(shift);
  cameraFocus.add(shift);
  camera.lookAt(cameraFocus);
});
function finishCameraDrag(event) {
  if (activeCameraPointer !== event.pointerId) return;
  activeCameraPointer = null;
  canvas.style.cursor = cameraDragEnabled ? 'grab' : 'crosshair';
}
canvas.addEventListener('pointerup', finishCameraDrag);
canvas.addEventListener('pointercancel', finishCameraDrag);

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  const aspect = width / height, halfH = 9.4;
  camera.left = -halfH * aspect; camera.right = halfH * aspect;
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
const observer = new ResizeObserver(resize);
observer.observe(canvas);
resize();

let last = 0, fpsFrames = 0, fpsElapsed = 0;
const fpsLabel = $('fps-counter');
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000 || 0, 0.04);
  last = now; elapsed += dt; idleTimer += dt;
  fpsFrames++; fpsElapsed += dt;
  if (fpsElapsed >= 0.5) {
    const fps = Math.round(fpsFrames / fpsElapsed);
    fpsLabel.textContent = `FPS ${fps}`;
    fpsLabel.classList.toggle('low', fps < 30);
    fpsFrames = 0; fpsElapsed = 0;
  }

  fish.position.y = 2.05 + Math.sin(elapsed * 2.1) * 0.12;
  fish.rotation.y = Math.sin(elapsed * 1.2) * 0.08;

  clouds.forEach((cloud, i) => {
    cloud.position.x += dt * (i === 1 ? -0.075 : 0.045);
    if (cloud.position.x > 13) cloud.position.x = -13;
    if (cloud.position.x < -13) cloud.position.x = 13;
  });

  if (cameraTween > 0) {
    cameraTween = Math.max(0, cameraTween - dt * 1.8);
    camera.position.lerp(homePosition, dt * 2.8);
    cameraFocus.lerp(new THREE.Vector3(0, 0.25, 0), dt * 2.8);
    camera.lookAt(cameraFocus);
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
