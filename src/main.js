import * as THREE from 'three';
import './style.css';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#78bdf0');
scene.fog = new THREE.Fog('#78bdf0', 34, 65);

const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
const homePosition = new THREE.Vector3(13, 13.5, 13);
camera.position.copy(homePosition);
camera.lookAt(0, 0.25, 0);

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

// Square floating grass island with a clean voxel-cut soil edge.
const island = group();
const islandCells = [];
for (let x = -7; x <= 7; x++) {
  for (let z = -7; z <= 7; z++) {
    const edge = Math.max(Math.abs(x), Math.abs(z)) > 5;
    islandCells.push([x,z]);
    block(island, x, -0.02, z, 1, 0.42, 1, edge ? M.grassDark : M.grass);
    block(island, x, -0.43, z, 1, 0.43, 1, (x+z)%4===0 ? M.soilDark : M.soil);
  }
}
// Chunky underside silhouette, visible below the square platform.
for (let x=-5; x<=5; x++) for (let z=-5; z<=5; z++) {
  if (Math.abs(x)+Math.abs(z)>8 && (x*z)%2!==0) continue;
  if ((x*7+z*11)%3===0) block(island,x,-0.88,z,0.9,0.48,0.9,M.soilDark);
}
// Small turquoise pond in the back-center, edged with pale stone blocks.
const pond = group(island, -0.25, 0.205, -2.2);
block(pond,0,0,0,2.5,0.055,1.75,M.water,false);
block(pond,-0.2,0.035,-0.08,1.45,0.018,0.9,M.waterLight,false);
[[-1.45,-.55],[-1.1,.65],[-.35,.95],[.65,.8],[1.3,.35],[1.2,-.55],[.45,-.9],[-.65,-.9]].forEach(([x,z],i)=>block(pond,x,.08,z,.48,.18,.42,i%2?M.stone:M.stoneLight));
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
// A little pale stepping-stone path leads from the cottage door to the kitten.\nblock(island,2.6,.205,0.25,.72,.035,.58,material('#d8bd91'),false);\nblock(island,2.05,.205,1,.72,.035,.58,material('#d8bd91'),false);\nblock(island,1.5,.205,1.75,.72,.035,.58,material('#d8bd91'),false);\nblock(island,0.95,.205,2.5,.72,.035,.58,material('#d8bd91'),false);\nblock(island,0.3999999999999999,.205,3.25,.72,.035,.58,material('#d8bd91'),false);\n// Tiny voxel flowers and individual grass tufts.
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
const pet = group(scene, 0.25, 0.23, 2.7);\npet.rotation.y = Math.PI;
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
const fish=group(scene,.25,2.05,-.15);\nfish.rotation.y = Math.PI;
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
const walkPlane = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
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
  const aspect = width / height, halfH = 9.4;
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

  fish.position.y = 2.05 + Math.sin(elapsed * 2.1) * 0.12;\n  fish.rotation.y = Math.sin(elapsed * 1.2) * 0.08;\n\n  clouds.forEach((cloud, i) => {
    cloud.position.x += dt * (i === 1 ? -0.075 : 0.045);
    if (cloud.position.x > 13) cloud.position.x = -13;
    if (cloud.position.x < -13) cloud.position.x = 13;
  });

  if (cameraTween > 0) {
    cameraTween = Math.max(0, cameraTween - dt * 1.8);
    camera.position.lerp(homePosition, dt * 2.8);
    camera.lookAt(0, 0.25, 0);
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
