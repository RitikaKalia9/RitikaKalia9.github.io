/* ============================================================
   PROCEDURAL REALISTIC UNIVERSE (three.js)
   ============================================================ */
(function () {
  if (typeof THREE === 'undefined') {
    console.warn('[universe] three.js not loaded.');
    return;
  }
  const canvas = document.getElementById('webgl');
  if (!canvas) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.6);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      powerPreference: 'high-performance',
      alpha: false
    });
  } catch (e) {
    console.warn('[universe] WebGL unavailable.', e);
    return;
  }
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x04020a, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(0, 0, 900);

  const LIGHT_DIR = new THREE.Vector3(0.36, 0.52, 0.55).normalize();

  /*
 * 3D simplex noise (snoise) by Ian McEwan, Ashima Arts, and Stefan Gustavson.
 * Copyright (C) 2011 Ashima Arts. MIT License.
 * https://github.com/ashima/webgl-noise
 */

  const NOISE_GLSL = `
    vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v){
      const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    float fbm(vec3 p){
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * snoise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }
  `;

  const nebulaVert = `
    varying vec3 vDir;
    void main(){
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const nebulaFrag = NOISE_GLSL + `
    uniform float uTime;
    uniform float uSeed;
    uniform float uIntensity;
    uniform vec3  uColA;
    uniform vec3  uColB;
    uniform vec3  uColC;
    varying vec3 vDir;

    void main(){
      vec3 p = vDir * 2.0;
      float t = uTime * 0.012;

      vec3 warp = vec3(
        fbm(p * 1.4 + vec3(t * 0.06, 0.0, 0.0)),
        fbm(p * 1.4 + vec3(0.0, t * 0.05, 1.7 + uSeed)),
        fbm(p * 1.4 + vec3(5.2, 1.3, t * 0.04))
      );
      vec3 pw = p + warp * 0.62;

      float n1 = fbm(pw * 1.7 + vec3(t, uSeed, -t * 0.7));
      float n2 = fbm(pw * 3.6 + vec3(-t * 0.9, uSeed * 2.0, t * 1.1));
      float n3 = fbm(pw * 6.1 + vec3(uSeed * 3.1, -t * 1.4, 2.0));

      float d = smoothstep(-0.10, 0.95, n1 * 1.15) * (0.55 + n2 * 0.6);
      d = clamp(d, 0.0, 1.0);
      d = pow(d, 1.85);
      d *= 0.85 + n3 * 0.35;

      vec3 col = mix(uColA, uColB, clamp(n1 * 0.8 + 0.5, 0.0, 1.0));
      col = mix(col, uColC, clamp(n2 * 0.7 + 0.5, 0.0, 1.0) * 0.78);

      float hot = pow(clamp(n2 * 0.6 + 0.4, 0.0, 1.0), 6.0);
      col += vec3(1.0, 0.75, 0.95) * hot * 0.28;

      float a = d * uIntensity;
      gl_FragColor = vec4(col * a, a);
    }
  `;

  const skyLayers = [
    { r: 3400, seed: 0.0, intensity: 0.62, a: 0x3b0f6b, b: 0x7c3aed, c: 0x1e3a8a, rot: 0.006 },
    { r: 3000, seed: 13.7, intensity: 0.42, a: 0x0e7490, b: 0x22d3ee, c: 0x831843, rot: -0.009 }
  ];

  const skyGroup = new THREE.Group();
  scene.add(skyGroup);

  skyLayers.forEach((cfg, i) => {
    const geo = new THREE.SphereGeometry(cfg.r, 64, 40);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: cfg.seed },
        uIntensity: { value: cfg.intensity },
        uColA: { value: new THREE.Color(cfg.a) },
        uColB: { value: new THREE.Color(cfg.b) },
        uColC: { value: new THREE.Color(cfg.c) }
      },
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      renderOrder: -100 + i
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.rotSpeed = cfg.rot;
    mesh.userData.mat = mat;
    skyGroup.add(mesh);
  });

  const STAR_VERT = `
    uniform float uTime;
    uniform float uSize;
    uniform float uPixelRatio;
    uniform float uOpacity;
    attribute vec3  aColor;
    attribute float aScale;
    attribute float aTwSpeed;
    attribute float aTwOffset;
    attribute float aBright;
    varying vec3  vColor;
    varying float vAlpha;
    varying float vBright;

    void main(){
      vColor = aColor;
      vBright = aBright;

      float tw = sin(uTime * aTwSpeed + aTwOffset) * 0.5 + 0.5;
      vAlpha = (0.20 + tw * 0.80) * uOpacity;

      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float dist = max(-mv.z, 1.0);

      float sz = uSize * aScale * uPixelRatio * (900.0 / dist);
      sz *= 0.55 + tw * 0.85;

      gl_PointSize = clamp(sz, 0.5, 34.0);
      gl_Position  = projectionMatrix * mv;
    }
  `;

  const STAR_FRAG = `
    varying vec3  vColor;
    varying float vAlpha;
    varying float vBright;

    void main(){
      vec2 p = (gl_PointCoord - 0.5) * 2.0;
      float d = length(p);
      if (d > 1.0) discard;

      float core = pow(smoothstep(1.0, 0.0, d), 2.6);
      float halo = smoothstep(1.0, 0.1, d) * 0.22;

      float spike = 0.0;
      float spikeMask = smoothstep(0.55, 0.95, vBright);
      if (spikeMask > 0.001) {
        float sx = exp(-abs(p.x) * 16.0) * exp(-abs(p.y) * 1.2);
        float sy = exp(-abs(p.y) * 16.0) * exp(-abs(p.x) * 1.2);
        float diag = exp(-abs(p.x - p.y) * 11.0) * exp(-abs(p.x + p.y) * 1.6)
                   + exp(-abs(p.x + p.y) * 11.0) * exp(-abs(p.x - p.y) * 1.6);
        spike = (sx + sy + diag * 0.55) * smoothstep(1.05, 0.0, d);
        spike *= spikeMask;
      }

      float a = clamp((core + halo + spike * 0.75) * vAlpha, 0.0, 1.0);
      vec3 col = vColor + vec3(core * 0.55) + vec3(spike * 0.6);

      gl_FragColor = vec4(col, a);
    }
  `;

  function blackbodyRGB(kelvin) {
    const t = kelvin / 100;
    let r, g, b;
    if (t <= 66) {
      r = 255;
      g = 99.4708025861 * Math.log(t) - 161.1195681661;
    } else {
      r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
      g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    }
    if (t >= 66) b = 255;
    else if (t <= 19) b = 0;
    else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    return [r / 255, g / 255, b / 255].map(v => Math.min(1, Math.max(0, v)));
  }

  function makeStarLayer(count, rMin, rMax, sizeMul, opacity) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    const brights = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = rMin + Math.random() * (rMax - rMin);
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      positions[i * 3] = r * s * Math.cos(th);
      positions[i * 3 + 1] = r * s * Math.sin(th);
      positions[i * 3 + 2] = r * u;

      const kelvin = 2600 + Math.pow(Math.random(), 2.4) * 27000;
      const [cr, cg, cb] = blackbodyRGB(kelvin);
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;

      const br = Math.pow(Math.random(), 6);
      brights[i] = br;

      scales[i] = (0.24 + br * 3.2 + Math.random() * 0.35) * sizeMul;
      speeds[i] = 0.5 + Math.random() * 2.9;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aTwSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aTwOffset', new THREE.BufferAttribute(offsets, 1));
    geo.setAttribute('aBright', new THREE.BufferAttribute(brights, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 6.5 },
        uPixelRatio: { value: DPR },
        uOpacity: { value: opacity }
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    points.userData.mat = mat;
    return points;
  }

  const starGroup = new THREE.Group();
  scene.add(starGroup);

  const starCounts = isMobile
    ? [[2400, 900, 2600, 0.85, 0.95], [1600, 2600, 4200, 1.25, 0.7], [800, 4200, 6200, 1.7, 0.5]]
    : [[7000, 900, 2600, 0.85, 0.95], [4500, 2600, 4200, 1.25, 0.7], [2200, 4200, 6500, 1.75, 0.5]];

  starCounts.forEach(([c, a, b, s, o]) => starGroup.add(makeStarLayer(c, a, b, s, o)));

  const PLANET_VERT = `
    varying vec3 vObjPos;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPos;
    void main(){
      vObjPos      = position;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vec4 wp      = modelMatrix * vec4(position, 1.0);
      vWorldPos    = wp.xyz;
      gl_Position  = projectionMatrix * viewMatrix * wp;
    }
  `;

  const PLANET_FRAG = NOISE_GLSL + `
    uniform float uTime;
    uniform vec3  uLightDir;
    uniform vec3  uOcean;
    uniform vec3  uLandLo;
    uniform vec3  uLandHi;
    uniform vec3  uIce;
    uniform float uSeed;
    uniform float uCloudAmt;

    uniform float uHasRing;
    uniform vec3  uRingCenter;
    uniform vec3  uRingNormal;
    uniform float uRingInner;
    uniform float uRingOuter;

    varying vec3  vObjPos;
    varying vec3  vWorldNormal;
    varying vec3  vWorldPos;

    void main(){
      vec3 p = normalize(vObjPos);
      vec3 q = p * 2.15 + vec3(uSeed);

      float continents = fbm(q + vec3(uTime * 0.004, 0.0, 0.0));
      float detail     = fbm(q * 3.1);
      float h          = continents + detail * 0.28;

      float landMask = smoothstep(0.02, 0.20, h);
      vec3 col = mix(uOcean, uLandLo, landMask);
      col = mix(col, uLandHi, smoothstep(0.16, 0.44, h));

      float lat = abs(p.y);
      col = mix(col, uIce, smoothstep(0.76, 0.95, lat));

      float clouds = fbm(p * 3.0 + vec3(uTime * 0.010, uSeed * 0.5, 0.0));
      float cloudMask = smoothstep(0.18, 0.62, clouds) * uCloudAmt;
      col = mix(col, vec3(1.0), cloudMask);
      col *= (1.0 - cloudMask * 0.28);

      vec3  N = normalize(vWorldNormal);
      vec3  L = normalize(uLightDir);
      float ndl = dot(N, L);

      float diff = smoothstep(-0.35, 0.55, ndl);
      vec3  terminatorGlow = vec3(0.85, 0.42, 0.20) * exp(-abs(ndl) * 3.2) * 0.10;

      vec3 lit = col * (0.035 + 1.22 * diff) + terminatorGlow;

      vec3 V = normalize(cameraPosition - vWorldPos);
      float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.5);
      lit += vec3(0.10, 0.28, 0.55) * rim * (0.25 + diff * 0.9);

      if (uHasRing > 0.5) {
        vec3 PtoCenter = vWorldPos - uRingCenter;
        float denom = dot(L, uRingNormal);
        if (abs(denom) > 0.001) {
          float t = -dot(PtoCenter, uRingNormal) / denom;
          if (t > 0.0) {
            vec3 hit = vWorldPos + L * t;
            vec3 localHit = hit - uRingCenter;
            vec3 inPlane = localHit - uRingNormal * dot(localHit, uRingNormal);
            float rr = length(inPlane);
            float inBand = step(uRingInner, rr) * step(rr, uRingOuter);
            lit *= (1.0 - inBand * 0.55);
          }
        }
      }

      gl_FragColor = vec4(lit, 1.0);
    }
  `;

  const ATMO_FRAG = `
    uniform vec3  uColor;
    uniform vec3  uLightDir;
    uniform float uIntensity;
    varying vec3  vWorldNormal;
    varying vec3  vWorldPos;
    void main(){
      vec3 N = normalize(vWorldNormal);
      vec3 V = normalize(cameraPosition - vWorldPos);
      float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
      float lit  = max(dot(N, normalize(uLightDir)), 0.0);
      float a    = fres * (0.18 + lit * 1.05) * uIntensity;
      gl_FragColor = vec4(uColor * a, a);
    }
  `;

  const CLOUD_FRAG = NOISE_GLSL + `
    uniform float uTime;
    uniform vec3  uLightDir;
    uniform float uAmount;
    varying vec3  vObjPos;
    varying vec3  vWorldNormal;

    void main(){
      vec3 p = normalize(vObjPos);
      float c = fbm(p * 3.4 + vec3(uTime * 0.014, 0.0, uTime * 0.008));
      float a = smoothstep(0.10, 0.60, c) * uAmount;

      vec3 N = normalize(vWorldNormal);
      float lit = smoothstep(-0.25, 0.55, dot(N, normalize(uLightDir)));

      gl_FragColor = vec4(vec3(1.0), a * (0.10 + lit * 0.72));
    }
  `;

  function createAtmosphere(radius, color, intensity) {
    const geo = new THREE.SphereGeometry(radius, 64, 48);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uLightDir: { value: LIGHT_DIR.clone() },
        uIntensity: { value: intensity }
      },
      vertexShader: PLANET_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    return new THREE.Mesh(geo, mat);
  }

  const gasGiant = new THREE.Group();
  gasGiant.position.set(1420, -560, -2400);
  gasGiant.rotation.z = 0.24;
  gasGiant.rotation.x = -0.13;
  scene.add(gasGiant);

  const ggRadius = 300;

  const ggSurface = new THREE.Mesh(
    new THREE.SphereGeometry(ggRadius, 96, 72),
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLightDir: { value: LIGHT_DIR.clone() },
        uOcean: { value: new THREE.Color(0x071a3a) },
        uLandLo: { value: new THREE.Color(0x1d6b52) },
        uLandHi: { value: new THREE.Color(0x8a7a4e) },
        uIce: { value: new THREE.Color(0xdcecff) },
        uSeed: { value: 4.2 },
        uCloudAmt: { value: 0.5 },
        uHasRing: { value: 1.0 },
        uRingCenter: { value: new THREE.Vector3() },
        uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
        uRingInner: { value: ggRadius * 1.5 },
        uRingOuter: { value: ggRadius * 2.5 }
      },
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG
    })
  );
  gasGiant.add(ggSurface);

  const ggClouds = new THREE.Mesh(
    new THREE.SphereGeometry(ggRadius * 1.012, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLightDir: { value: LIGHT_DIR.clone() },
        uAmount: { value: 0.85 }
      },
      vertexShader: PLANET_VERT,
      fragmentShader: CLOUD_FRAG,
      transparent: true,
      depthWrite: false
    })
  );
  gasGiant.add(ggClouds);

  gasGiant.add(createAtmosphere(ggRadius * 1.13, 0x4fb8ff, 1.0));

  const RING_FRAG = `
    uniform float uTime;
    uniform vec3  uLightDir;
    uniform vec3  uPlanetCenter;
    uniform vec3  uRingNormal;
    uniform float uPlanetRadius;
    varying vec2  vUv;
    varying vec3  vWorldPos;

    void main(){
      vec2 c = vUv - 0.5;
      float r = length(c) * 2.0;

      float b1 = sin(r * 130.0) * 0.5 + 0.5;
      float b2 = sin(r * 47.0 + 1.9) * 0.5 + 0.5;
      float b3 = sin(r * 19.0 + 4.3) * 0.5 + 0.5;
      float bands = b1 * 0.5 + b2 * 0.32 + b3 * 0.18;

      float env = smoothstep(0.605, 0.655, r) * (1.0 - smoothstep(0.92, 1.0, r));
      float a = (0.06 + bands * 0.62) * env;
      vec3 col = mix(vec3(0.62, 0.55, 0.78), vec3(0.92, 0.86, 0.72), bands);

      vec3 L = normalize(uLightDir);
      vec3 PtoCenter = vWorldPos - uPlanetCenter;
      vec3 inPlane = PtoCenter - uRingNormal * dot(PtoCenter, uRingNormal);
      vec3 perp = normalize(cross(L, uRingNormal));
      float along = abs(dot(inPlane, perp));
      float behindLight = step(0.0, dot(PtoCenter, -L));
      float inShadow = (1.0 - smoothstep(uPlanetRadius * 0.9, uPlanetRadius * 1.15, along));
      float shadowTerm = inShadow * behindLight;
      shadowTerm *= smoothstep(0.5, 0.65, r);
      col *= (1.0 - shadowTerm * 0.7);
      a *= (1.0 - shadowTerm * 0.35);

      gl_FragColor = vec4(col, a * 0.9);
    }
  `;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ggRadius * 1.5, ggRadius * 2.5, 180, 6),
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLightDir: { value: LIGHT_DIR.clone() },
        uPlanetCenter: { value: gasGiant.position.clone() },
        uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
        uPlanetRadius: { value: ggRadius }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main(){
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: RING_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  ring.rotation.x = -Math.PI / 2;
  gasGiant.add(ring);

  const tealPlanet = new THREE.Mesh(
    new THREE.SphereGeometry(150, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLightDir: { value: LIGHT_DIR.clone() },
        uOcean: { value: new THREE.Color(0x04283a) },
        uLandLo: { value: new THREE.Color(0x0e7490) },
        uLandHi: { value: new THREE.Color(0x67e8f9) },
        uIce: { value: new THREE.Color(0xe0f7ff) },
        uSeed: { value: 21.5 },
        uCloudAmt: { value: 0.35 },
        uHasRing: { value: 0.0 },
        uRingCenter: { value: new THREE.Vector3() },
        uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
        uRingInner: { value: 0.0 },
        uRingOuter: { value: 0.0 }
      },
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG
    })
  );
  tealPlanet.position.set(-1900, 720, -3400);
  scene.add(tealPlanet);

  const tealAtmo = createAtmosphere(150 * 1.18, 0x22d3ee, 0.9);
  tealAtmo.position.copy(tealPlanet.position);
  scene.add(tealAtmo);

  const AURORA_FRAG = NOISE_GLSL + `
    uniform float uTime;
    uniform float uIntensity;
    varying vec2  vUv;
    void main(){
      float theta = vUv.x * 6.2831853;
      float v = vUv.y;

      vec3 p = vec3(cos(theta), v * 6.0, sin(theta)) * 1.6;
      float n = fbm(p + vec3(0.0, uTime * 0.15, 0.0));
      float n2 = fbm(p * 2.3 - vec3(0.0, uTime * 0.10, 0.0));

      float curtain = smoothstep(0.0, 0.7, n * 0.6 + n2 * 0.6);
      float band = smoothstep(0.0, 0.15, v) * (1.0 - smoothstep(0.55, 1.0, v));

      vec3 col = mix(vec3(0.20, 0.95, 0.55), vec3(0.25, 0.55, 1.0), clamp(n2 * 0.6 + 0.5, 0.0, 1.0));
      float a = curtain * band * uIntensity;
      gl_FragColor = vec4(col * a, a);
    }
  `;

  const aurora = new THREE.Mesh(
    new THREE.RingGeometry(150 * 0.55, 150 * 1.05, 128, 4),
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.85 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: AURORA_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  aurora.rotation.x = -Math.PI / 2;
  aurora.position.copy(tealPlanet.position);
  aurora.position.y += 130;
  scene.add(aurora);

  const moonPivot = new THREE.Group();
  moonPivot.position.copy(gasGiant.position);
  moonPivot.rotation.z = 0.24;
  moonPivot.rotation.x = -0.13;
  scene.add(moonPivot);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(52, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLightDir: { value: LIGHT_DIR.clone() },
        uOcean: { value: new THREE.Color(0x3a2c14) },
        uLandLo: { value: new THREE.Color(0xb45309) },
        uLandHi: { value: new THREE.Color(0xfbbf24) },
        uIce: { value: new THREE.Color(0xfef3c7) },
        uSeed: { value: 88.1 },
        uCloudAmt: { value: 0.0 },
        uHasRing: { value: 0.0 },
        uRingCenter: { value: new THREE.Vector3() },
        uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
        uRingInner: { value: 0.0 },
        uRingOuter: { value: 0.0 }
      },
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG
    })
  );
  moon.position.set(760, 120, 0);
  moonPivot.add(moon);

  scene.updateMatrixWorld(true);
  const ggQuat = new THREE.Quaternion();
  gasGiant.getWorldQuaternion(ggQuat);
  const ringNormalWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(ggQuat).normalize();
  const ggWorldPos = new THREE.Vector3();
  gasGiant.getWorldPosition(ggWorldPos);
  ggSurface.material.uniforms.uRingCenter.value.copy(ggWorldPos);
  ggSurface.material.uniforms.uRingNormal.value.copy(ringNormalWorld);
  ring.material.uniforms.uPlanetCenter.value.copy(ggWorldPos);
  ring.material.uniforms.uRingNormal.value.copy(ringNormalWorld);

  const dustCount = isMobile ? 180 : 420;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 900;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 700;
    dustPos[i * 3 + 2] = -Math.random() * 500;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

  const dustMat = new THREE.PointsMaterial({
    size: 1.7,
    color: 0xa8c4ff,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ============================================================
     SPIRAL GALAXY — a real 3D object in the universe
     ============================================================ */
  const galaxy = (function () {
    const R = 3100;                 // galaxy radius (world units)
    const ARM_B = 2.1;                  // spiral tightness
    const ARM_R0 = 0.05;
    const SPIN = 0.006;                // rad / second (very slow)

    const root = new THREE.Group();
    root.position.set(1150, 140, -5900);
    root.rotation.set(0.74, 0, -0.42, 'ZXY');   // tilted disc, like a real galaxy seen at an angle
    scene.add(root);

    /* ---------- 1. diffuse arms + dust + glowing core (analytic shader) ---------- */
    const hazeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 1.0 } },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: NOISE_GLSL + `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        const float B  = ${ARM_B.toFixed(3)};
        const float R0 = ${ARM_R0.toFixed(3)};

        void main(){
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          if (r > 1.0) discard;

          float th  = atan(p.y, p.x);
          float rot = uTime * ${SPIN.toFixed(4)} * (1.4 - 0.5 * r);
          float c = cos(rot), s = sin(rot);
          vec2 pr = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);     // noise rides with the arms

          float ph  = th - rot - B * log(max(r, 0.001) / R0);
          float arm = pow(0.5 + 0.5 * cos(2.0 * ph), 1.5);

          float n  = fbm(vec3(pr * 4.2, 1.7));
          float n2 = fbm(vec3(pr * 9.0, 5.3));
          float clump = smoothstep(-0.25, 0.75, n * 0.8 + n2 * 0.5);

          float fall = exp(-r * 2.7);
          float edge = 1.0 - smoothstep(0.72, 1.0, r);
          float disk = (0.10 + arm * 0.95) * (0.45 + clump * 0.85) * fall * edge;

          vec3 armCol   = mix(vec3(0.30, 0.24, 0.80), vec3(0.58, 0.34, 0.92), clamp(n * 0.7 + 0.5, 0.0, 1.0));
          vec3 pinkTint = vec3(0.95, 0.40, 0.72) * smoothstep(0.35, 0.85, n2 * 0.8 + 0.4) * arm * smoothstep(0.2, 0.6, r) * 0.55;
          vec3 col = armCol * disk * 1.25 + pinkTint * disk * 1.3;

          // dusty lanes lightly pull the glow down between clumps
          col *= 0.75 + 0.25 * smoothstep(-0.4, 0.5, n2);

          // bulge + nucleus
          float bulge   = exp(-r * 8.5);
          float nucleus = exp(-r * 38.0);
          col += vec3(1.00, 0.80, 0.48) * bulge   * 0.26;
          col += vec3(1.00, 0.93, 0.78) * nucleus * 0.42;

          gl_FragColor = vec4(col * uIntensity, 1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const hazePlane = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2, 1, 1), hazeMat);
    hazePlane.rotation.x = -Math.PI / 2;           // lie in the disc plane
    hazePlane.renderOrder = -60;
    root.add(hazePlane);

    /* ---------- 2. individual stars: arms, bulge, halo, pink HII clusters ---------- */
    const NARM = isMobile ? 9000 : 22000;
    const NBULGE = isMobile ? 2400 : 5200;
    const NHALO = isMobile ? 500 : 1400;
    const NHII = isMobile ? 90 : 230;
    const N = NARM + NBULGE + NHALO + NHII;

    const aR = new Float32Array(N);
    const aTheta = new Float32Array(N);
    const aY = new Float32Array(N);
    const aColor = new Float32Array(N * 3);
    const aSize = new Float32Array(N);
    const aTw = new Float32Array(N * 2);
    const pos = new Float32Array(N * 3);          // unused by shader, keeps geometry valid

    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];

    const armPal = [[0.91, 0.90, 0.96], [0.77, 0.71, 0.99], [0.80, 0.88, 1.00], [0.65, 0.95, 0.99], [1.00, 0.91, 0.71], [0.98, 0.66, 0.83]];
    const coreP = [[1.00, 0.91, 0.71], [1.00, 0.85, 0.54], [1.00, 0.95, 0.82], [1.00, 0.78, 0.45]];
    const haloP = [[0.80, 0.85, 1.00], [0.95, 0.92, 0.85], [1.00, 0.88, 0.72]];
    const hiiP = [[0.98, 0.66, 0.83], [0.91, 0.47, 0.98], [0.99, 0.55, 0.75]];

    let k = 0;
    function put(r, theta, y, col, size, taper) {
      aR[k] = r; aTheta[k] = theta; aY[k] = y;
      aColor[k * 3] = col[0] * taper;
      aColor[k * 3 + 1] = col[1] * taper;
      aColor[k * 3 + 2] = col[2] * taper;
      aSize[k] = size;
      aTw[k * 2] = 0.4 + Math.random() * 2.6;
      aTw[k * 2 + 1] = Math.random() * 6.2831853;
      k++;
    }

    // spiral arm stars (two arms, tightening toward the core, scatter grows outward)
    for (let i = 0; i < NARM; i++) {
      const r = ARM_R0 + (1 - ARM_R0) * Math.pow(Math.random(), 1.08);
      const arm = Math.random() < 0.5 ? 0 : Math.PI;
      const spread = 0.20 + 0.50 * r;
      const th = arm + ARM_B * Math.log(r / ARM_R0) + gauss() * spread;
      const y = gauss() * 0.018 * (1.2 - r) * R;
      const taper = 1 - Math.min(1, Math.max(0, (r - 0.62) / 0.38)) * 0.85;
      const big = Math.random() < 0.035;
      put(r, th, y, pick(armPal), big ? 22 + Math.random() * 16 : 5 + Math.random() * 9, taper);
    }
    // central bulge: dense warm ellipsoid
    for (let i = 0; i < NBULGE; i++) {
      const r = Math.min(0.30, Math.abs(gauss()) * 0.20 + Math.random() * 0.04);
      const th = Math.random() * 6.2831853;
      const y = gauss() * 0.09 * (1 - r * 1.8) * R * 0.45;
      put(r, th, y, pick(coreP), 5 + Math.random() * 9, 1.0 - r * 0.9);
    }
    // faint, thick halo
    for (let i = 0; i < NHALO; i++) {
      const r = 0.1 + Math.random() * 0.95;
      const th = Math.random() * 6.2831853;
      const y = gauss() * 0.16 * R;
      put(r, th, y, pick(haloP), 4 + Math.random() * 6, 0.45);
    }
    // pink star-forming knots sitting on the arms
    for (let i = 0; i < NHII; i++) {
      const r = 0.22 + Math.random() * 0.62;
      const arm = Math.random() < 0.5 ? 0 : Math.PI;
      const th = arm + ARM_B * Math.log(r / ARM_R0) + gauss() * (0.06 + 0.12 * r);
      put(r, th, gauss() * 0.01 * R, pick(hiiP), 20 + Math.random() * 24, 1.0 - Math.max(0, r - 0.6));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aR', new THREE.BufferAttribute(aR, 1));
    geo.setAttribute('aTheta', new THREE.BufferAttribute(aTheta, 1));
    geo.setAttribute('aY', new THREE.BufferAttribute(aY, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aTw', new THREE.BufferAttribute(aTw, 2));

    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: DPR }, uOpacity: { value: 1.0 } },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uOpacity;
        attribute float aR;
        attribute float aTheta;
        attribute float aY;
        attribute vec3  aColor;
        attribute float aSize;
        attribute vec2  aTw;
        varying vec3  vColor;
        varying float vAlpha;
        void main(){
          float ang = aTheta + uTime * ${SPIN.toFixed(4)} * (1.4 - 0.5 * aR);
          vec3 p = vec3(cos(ang) * aR * ${R.toFixed(1)}, aY, -sin(ang) * aR * ${R.toFixed(1)});
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = max(-mv.z, 1.0);

          float tw = sin(uTime * aTw.x + aTw.y) * 0.5 + 0.5;
          vAlpha = (0.36 + tw * 0.32) * uOpacity;
          vColor = aColor;

          gl_PointSize = clamp(aSize * uPixelRatio * (900.0 / dist) * (0.8 + tw * 0.35), 0.8, 16.0);
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3  vColor;
        varying float vAlpha;
        void main(){
          float d = length(gl_PointCoord - 0.5) * 2.0;
          if (d > 1.0) discard;
          float core = pow(1.0 - d, 2.2);
          gl_FragColor = vec4(vColor + vec3(core * 0.25), core * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const stars = new THREE.Points(geo, starMat);
    stars.frustumCulled = false;
    stars.renderOrder = -59;
    root.add(stars);

    return {
      update(t) {
        hazeMat.uniforms.uTime.value = t;
        starMat.uniforms.uTime.value = t;
      }
    };
  })();

  function makeMeteorTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 512;
    const g = c.getContext('2d');

    const head = g.createRadialGradient(64, 470, 0, 64, 470, 62);
    head.addColorStop(0.00, 'rgba(255,255,255,1)');
    head.addColorStop(0.35, 'rgba(205,228,255,0.65)');
    head.addColorStop(1.00, 'rgba(150,195,255,0)');
    g.fillStyle = head;
    g.fillRect(0, 0, 128, 512);

    const trail = g.createLinearGradient(0, 512, 0, 0);
    trail.addColorStop(0.00, 'rgba(255,255,255,0.95)');
    trail.addColorStop(0.12, 'rgba(196,220,255,0.60)');
    trail.addColorStop(0.45, 'rgba(150,190,255,0.20)');
    trail.addColorStop(1.00, 'rgba(120,160,255,0.00)');
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = trail;
    g.fillRect(46, 0, 36, 512);

    g.globalCompositeOperation = 'destination-in';
    const fade = g.createLinearGradient(0, 0, 128, 0);
    fade.addColorStop(0.00, 'rgba(0,0,0,0)');
    fade.addColorStop(0.50, 'rgba(0,0,0,1)');
    fade.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, 128, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  const meteorTex = makeMeteorTexture();
  const meteorGeo = new THREE.PlaneGeometry(1, 1);
  meteorGeo.translate(0, 0.5, 0);

  const meteorTints = [0xffffff, 0xbfd8ff, 0xffe0b8];
  const meteors = [];
  let spawnTimer = 1.0;
  const MAX_METEORS = isMobile ? 3 : 6;

  const _trailDir = new THREE.Vector3();
  const _viewDir = new THREE.Vector3();
  const _xAxis = new THREE.Vector3();
  const _zAxis = new THREE.Vector3();
  const _basis = new THREE.Matrix4();

  function spawnMeteor() {
    const tint = meteorTints[(Math.random() * meteorTints.length) | 0];
    const mat = new THREE.MeshBasicMaterial({
      map: meteorTex,
      color: tint,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0
    });
    const mesh = new THREE.Mesh(meteorGeo, mat);
    mesh.renderOrder = 20;
    scene.add(mesh);

    const dir = new THREE.Vector3(
      (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.75),
      -(0.35 + Math.random() * 0.65),
      (Math.random() - 0.5) * 0.35
    ).normalize();

    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 5200,
      (Math.random() - 0.3) * 2600,
      -400 - Math.random() * 4200
    );

    meteors.push({
      mesh, mat, pos, dir,
      speed: 1200 + Math.random() * 2400,
      length: 380 + Math.random() * 1000,
      width: 10 + Math.random() * 22,
      life: 0,
      maxLife: 1.1 + Math.random() * 1.1
    });
  }

  function updateMeteors(dt) {
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life += dt;
      if (m.life >= m.maxLife) {
        scene.remove(m.mesh);
        m.mat.dispose();
        meteors.splice(i, 1);
        continue;
      }
      m.pos.addScaledVector(m.dir, m.speed * dt);
      m.mesh.position.copy(m.pos);

      _trailDir.copy(m.dir).negate().normalize();
      _viewDir.copy(camera.position).sub(m.pos).normalize();
      _xAxis.crossVectors(_trailDir, _viewDir);
      if (_xAxis.lengthSq() < 1e-6) _xAxis.set(1, 0, 0);
      _xAxis.normalize();
      _zAxis.crossVectors(_xAxis, _trailDir).normalize();
      _basis.makeBasis(_xAxis, _trailDir, _zAxis);
      m.mesh.quaternion.setFromRotationMatrix(_basis);

      const t = m.life / m.maxLife;
      const fadeIn = Math.min(1, m.life / 0.18);
      const fadeOut = 1 - Math.pow(t, 2.6);
      m.mat.opacity = fadeIn * fadeOut * 0.95;
      m.mesh.scale.set(m.width, m.length * (0.35 + 0.65 * (1 - t)), 1);
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && meteors.length < MAX_METEORS) {
      spawnMeteor();
      spawnTimer = 1.0 + Math.random() * 3.6;
    }
  }

  const passes = {};
  let composer = null;

  try {
    if (typeof THREE.EffectComposer === 'function' && typeof THREE.RenderPass === 'function') {
      composer = new THREE.EffectComposer(renderer);
      composer.setPixelRatio(DPR);
      composer.setSize(window.innerWidth, window.innerHeight);
      composer.addPass(new THREE.RenderPass(scene, camera));

      if (typeof THREE.BokehPass === 'function' && !isMobile) {
        const bokeh = new THREE.BokehPass(scene, camera, {
          focus: 1400.0,
          aperture: 0.000012,
          maxblur: 0.0035
        });
        bokeh.renderToScreen = false;
        composer.addPass(bokeh);
        passes.bokeh = bokeh;
      }

      const GodRayShader = {
        uniforms: {
          tDiffuse: { value: null },
          uLightPos: { value: new THREE.Vector2(0.72, 0.28) },
          uIntensity: { value: 0.55 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2  uLightPos;
          uniform float uIntensity;
          varying vec2  vUv;
          void main(){
            const int SAMPLES = 40;
            vec2 dir = (uLightPos - vUv) / float(SAMPLES);
            vec2 uv = vUv;
            vec3 sum = vec3(0.0);
            float w = 1.0;
            float total = 0.0;
            for (int i = 0; i < SAMPLES; i++) {
              uv += dir;
              vec3 s = texture2D(tDiffuse, uv).rgb;
              s *= w;
              sum += s;
              total += w;
              w *= 0.965;
            }
            vec3 ray = sum / max(total, 0.0001);
            vec3 base = texture2D(tDiffuse, vUv).rgb;
            gl_FragColor = vec4(base + ray * uIntensity * 0.30, 1.0);
          }
        `
      };
      if (typeof THREE.ShaderPass === 'function') {
        const godRay = new THREE.ShaderPass(GodRayShader);
        godRay.renderToScreen = false;
        composer.addPass(godRay);
        passes.godRay = godRay;
      }

      if (typeof THREE.UnrealBloomPass === 'function') {
        const bloom = new THREE.UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.80, 0.72, 0.28
        );
        bloom.renderToScreen = false;
        composer.addPass(bloom);
        passes.bloom = bloom;
      }

      const ChromaticAberrationShader = {
        uniforms: {
          tDiffuse: { value: null },
          uAmount: { value: 0.0018 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uAmount;
          varying vec2 vUv;
          void main(){
            vec2 dir = vUv - 0.5;
            float d = dot(dir, dir);
            float amt = uAmount * (1.0 + d * 3.0);
            vec2 rUv = vUv + dir * amt;
            vec2 bUv = vUv - dir * amt;
            float cr = texture2D(tDiffuse, rUv).r;
            float cg = texture2D(tDiffuse, vUv).g;
            float cb = texture2D(tDiffuse, bUv).b;
            gl_FragColor = vec4(cr, cg, cb, 1.0);
          }
        `
      };
      if (typeof THREE.ShaderPass === 'function') {
        const ca = new THREE.ShaderPass(ChromaticAberrationShader);
        ca.renderToScreen = true;
        composer.addPass(ca);
        passes.ca = ca;
      }
    }
  } catch (e) {
    console.warn('[universe] post-processing unavailable.', e);
    composer = null;
  }

  let mouseX = 0, mouseY = 0;
  let smoothX = 0, smoothY = 0;
  let scrollN = 0, smoothScroll = 0;

  if (!isMobile) {
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollN = max > 0 ? window.scrollY / max : 0;
  }, { passive: true });

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  const clock = new THREE.Clock();
  const skyMats = skyGroup.children.map(c => c.userData.mat);
  const starMats = starGroup.children.map(c => c.userData.mat);
  const planetMats = [
    ggSurface.material,
    ggClouds.material,
    ring.material,
    tealPlanet.material,
    tealAtmo.material,
    moon.material,
    aurora.material
  ];

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsedTime();

    skyMats.forEach(m => { if (m.uniforms.uTime) m.uniforms.uTime.value = t; });
    starMats.forEach(m => { if (m.uniforms.uTime) m.uniforms.uTime.value = t; });
    planetMats.forEach(m => { if (m.uniforms.uTime) m.uniforms.uTime.value = t; });

    galaxy.update(t);

    smoothX += (mouseX - smoothX) * 0.045;
    smoothY += (mouseY - smoothY) * 0.045;
    smoothScroll += (scrollN - smoothScroll) * 0.05;

    if (!reduced) {
      const drift = Math.sin(t * 0.07) * 0.5 + Math.sin(t * 0.031) * 0.5;
      const shakeX = (Math.sin(t * 7.3) + Math.sin(t * 13.1) * 0.5) * 0.8;
      const shakeY = (Math.cos(t * 6.1) + Math.cos(t * 11.7) * 0.5) * 0.8;

      camera.position.x = smoothX * 190 + drift * 40 + shakeX;
      camera.position.y = -smoothY * 120 + Math.cos(t * 0.05) * 22 - smoothScroll * 260 + shakeY;
      camera.position.z = 900 - smoothScroll * 1500;
      camera.lookAt(0, 0, -400 - smoothScroll * 900);
      camera.rotation.z = smoothX * 0.018 + Math.sin(t * 4.2) * 0.0008;
    } else {
      camera.lookAt(0, 0, -400);
    }

    skyGroup.children.forEach((m, i) => {
      m.rotation.y += m.userData.rotSpeed * dt;
      m.rotation.x = Math.sin(t * 0.02 + i) * 0.03;
    });

    starGroup.rotation.y = t * 0.0045;
    starGroup.rotation.x = Math.sin(t * 0.03) * 0.012;

    ggSurface.rotation.y += dt * 0.020;
    ggClouds.rotation.y += dt * 0.033;
    tealPlanet.rotation.y += dt * 0.035;
    moonPivot.rotation.y += dt * 0.055;
    aurora.rotation.z += dt * 0.02;

    dust.position.copy(camera.position);
    dust.rotation.y = t * 0.01;
    dust.rotation.x = Math.sin(t * 0.05) * 0.05;

    updateMeteors(dt);

    if (passes.bokeh && passes.bokeh.uniforms) {
      const f = 1400 - smoothScroll * 900;
      if (passes.bokeh.uniforms['focus']) passes.bokeh.uniforms['focus'].value = f;
    }

    if (passes.godRay && passes.godRay.uniforms) {
      const lx = 0.72 - smoothX * 0.06;
      const ly = 0.28 - smoothY * 0.05;
      passes.godRay.uniforms.uLightPos.value.set(lx, ly);
    }

    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
  }

  animate();
})();
