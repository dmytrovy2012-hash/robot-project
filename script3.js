import * as THREE from '//cdn.skypack.dev/three@0.129.0?min'
import { OrbitControls } from '//cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls?min'
import { EffectComposer } from '//cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/EffectComposer?min'
import { ShaderPass } from '//cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/ShaderPass?min'
import { gsap } from '//cdn.skypack.dev/gsap@3.7.0?min'

// ----
// main
// ----

const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 2, .1, 100);
const controls = new OrbitControls(camera, renderer.domElement);

scene.background = new THREE.Color('lightgray');
camera.position.set(1, 4, 3);
controls.enableDamping = true;
renderer.shadowMap.enabled = true;

// ----
// light
// ----

const light = new THREE.DirectionalLight('white', 1);
light.position.set(5, 5, 0);
light.shadow.mapSize.setScalar(2048);
light.shadow.camera.near = 0;
light.shadow.camera.far = 20;
light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
light.shadow.radius = 1;
light.shadow.bias = 0.0001;
light.castShadow = true;
const lightTn = new THREE.Group();
lightTn.add(light);
scene.add(lightTn);

const helper = new THREE.DirectionalLightHelper(light);
scene.add(helper);
scene.add(new THREE.AmbientLight('white', .5));

gsap.timeline({ repeat: -1 }).to(lightTn.rotation, {
  y: -Math.PI * 2,
  duration: 10,
  ease: 'none',
  onUpdate() {
    helper.update();
  }
});

// ----
// map
// ----

// Photo by Bence Balla-Schottner - https://unsplash.com/photos/NGjhQUyCQ0U
const tex0 = new THREE.TextureLoader().load('https://images.unsplash.com/photo-1563042744-31191a2315bb?ixid=MnwxMjA3fDB8MHxzZWFyY2h8NTV8fHNlYSUyMGRyb21lfGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=60');
tex0.magFilter = THREE.LinearFilter;
tex0.minFilter = THREE.LinearMipMapLinearFilter;
tex0.wrapS = THREE.MirroredRepeatWrapping;
tex0.wrapT = THREE.MirroredRepeatWrapping;
tex0.repeat.set(2, 2);

// ----
// gen disp map - .r
// ----

const dMapRt = new THREE.WebGLRenderTarget(2048, 2048);
dMapRt.texture.repeat.copy(tex0.repeat);
dMapRt.texture.wrapS = tex0.wrapS;
dMapRt.texture.wrapT = tex0.wrapT;
const dMapComposer = new EffectComposer(renderer, dMapRt);
dMapComposer.renderToScreen = false;
const dMapPass = new ShaderPass({
  uniforms: {
    tMap: { value: tex0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform sampler2D tMap;
    varying vec2 vUv;
    void main() {
      vec4 tx = texture2D(tMap, vUv);
      gl_FragColor = vec4(tx.r, 0., 0., 1.);
   }
  `
});
dMapComposer.addPass(dMapPass);

// ----
// norm map - tangent space; from disp map
// ----

const nMapRt = dMapRt.clone();
const nMapComposer = new EffectComposer(renderer, nMapRt);
nMapComposer.renderToScreen = false;
const nMapPass = new ShaderPass({
  uniforms: {
    tDMap: { value: null }, // =dMapComposer readbuffer tex
    uDims: { value: new THREE.Vector2(innerWidth, innerHeight) }
  },
  vertexShader: `
    varying highp vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    uniform sampler2D tDMap;
    uniform vec2 uDims;
    varying highp vec2 vUv;
    void main() {

      vec2 uv = vUv;
      vec3 v0 = vec3(uv, texture2D(tDMap, uv).r);

      float EPS = 0.1;
      vec2 uv1 = uv;
      uv1.y += EPS;
      vec3 vYY = vec3(uv1, texture2D(tDMap, uv1).r);

      vec2 uv2 = uv;
      uv2.x += EPS * uDims.x / uDims.y;
      vec3 vXX = vec3(uv2, texture2D(tDMap, uv2).r);

      vec3 toX = normalize(vXX - v0);
      vec3 toY = normalize(vYY - v0);
      vec3 n = normalize(cross( toX, toY )) * .5 + .5;
      gl_FragColor = vec4(n, 1.);
   }
  `
});
nMapComposer.addPass(nMapPass);

// ----
// consume
// ----

const geom = new THREE.SphereGeometry(2, 512, 512);
const mat = new THREE.MeshStandardMaterial({
  map: tex0,
  normalMapType: THREE.TangentSpaceNormalMap,
  displacementScale: 1,
});
const mesh = new THREE.Mesh(geom, mat);
mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
  depthPacking: THREE.RGBADepthPacking,
  displacementScale: mat.displacementScale,
});
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);

// ----
// render
// ----

renderer.setAnimationLoop((t) => {
  // ---- tex0
  tex0.offset.y += (0.001);
  dMapComposer.readBuffer.texture.offset.copy(tex0.offset);
  // ---- disp map
  dMapPass.uniforms.tMap.value = tex0;
  dMapComposer.render();
  mesh.material.displacementMap =
    mesh.customDepthMaterial.displacementMap = dMapComposer.readBuffer.texture;
  // ---- norm map
  renderer.getSize(nMapPass.uniforms.uDims.value);
  nMapPass.uniforms.tDMap.value = dMapComposer.readBuffer.texture;
  nMapComposer.render();
  mesh.material.normalMap = nMapComposer.readBuffer.texture;

  renderer.render(scene, camera);
  controls.update();
});

// ----
// view
// ----

function resize(w, h, dpr = devicePixelRatio) {
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', () => resize(innerWidth, innerHeight));
dispatchEvent(new Event('resize'));
document.body.prepend(renderer.domElement);
