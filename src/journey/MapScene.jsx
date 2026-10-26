import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const clamp = THREE.MathUtils.clamp;
const coast = (z) => -66 + Math.sin(z * 0.013) * 24 + Math.sin(z * 0.041) * 8;
function elevation(x, z) {
  const distance = x - coast(z);
  if (distance < 0) return -1.2;
  const hills = Math.max(0, (x - 25) / 145);
  return (
    0.5 +
    Math.min(distance / 10, 1) * 0.8 +
    hills *
      (9 +
        Math.sin(z * 0.026 + x * 0.017) * 6 +
        Math.sin(z * 0.071 - x * 0.039) * 3) +
    Math.max(0, Math.sin(x * 0.035 + z * 0.014)) * hills * 7
  );
}
const random = (x, z) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const cameras = [
  { position: [100, 155, 152], target: [5, 0, -14] },
  { position: [32, 81, 56], target: [-17, 0, -48] },
  { position: [105, 77, 29], target: [15, 0, -41] },
  { position: [-35, 91, 100], target: [12, 0, 7] },
  { position: [145, 83, 180], target: [65, 4, 85] },
  { position: [180, 110, -13], target: [75, 4, -82] },
  { position: [20, 140, 146], target: [-12, 0, 0] },
];
function makeLine(points, color, opacity = 1) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}
function MapFallback() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new ResizeObserver(() => fallback(ref.current));
    observer.observe(ref.current);
    fallback(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <canvas
      className="journey-map"
      ref={ref}
      role="img"
      aria-label="A warm-toned coastal map illustration"
    />
  );
}
function fallback(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  ctx.fillStyle = "#39282a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4d3837";
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.45, 0);
  ctx.bezierCurveTo(
    canvas.width * 0.2,
    canvas.height * 0.4,
    canvas.width * 0.6,
    canvas.height * 0.6,
    canvas.width * 0.1,
    canvas.height,
  );
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(canvas.width, 0);
  ctx.fill();
  ctx.strokeStyle = "#82655833";
  ctx.lineWidth = 1;
  for (let i = -15; i < 40; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 65, 0);
    ctx.lineTo(i * 65 + canvas.width * 0.8, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 55);
    ctx.lineTo(canvas.width, i * 55 - canvas.height * 0.4);
    ctx.stroke();
  }
}
export default function MapScene({ progress, reducedMotion, onReady }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef(null),
    control = useRef({ progress, reducedMotion });
  control.current = { progress, reducedMotion };
  useEffect(() => {
    const canvas = ref.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      onReady?.("fallback");
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    renderer.setClearColor("#3a292b");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#3a292b");
    scene.fog = new THREE.FogExp2("#3a292b", 0.0044);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1300);
    scene.add(new THREE.AmbientLight("#bca49c", 1.35));
    const sun = new THREE.DirectionalLight("#f0cbbb", 2.0);
    sun.position.set(-90, 170, -70);
    scene.add(sun);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(1800, 1800),
      new THREE.MeshLambertMaterial({ color: "#35282b" }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.5;
    scene.add(sea);
    // Local, generated terrain. No access tokens, remote map tiles, or invented locations.
    const landGeometry = new THREE.PlaneGeometry(720, 760, 220, 230);
    landGeometry.rotateX(-Math.PI / 2);
    const positions = landGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i);
      positions.setY(i, elevation(x, z));
    }
    landGeometry.computeVertexNormals();
    const land = new THREE.Mesh(
      landGeometry,
      new THREE.MeshLambertMaterial({ color: "#59403d", flatShading: false }),
    );
    scene.add(land);
    const shore = [];
    for (let z = -370; z <= 370; z += 2)
      shore.push(new THREE.Vector3(coast(z), 0.22, z));
    scene.add(makeLine(shore, "#a4826e", 0.2));
    // A fine street network follows the topography; everything is merged into a few draw calls.
    const roadVertices = [];
    function addRoad(points) {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        if (a.x < coast(a.z) + 2 || b.x < coast(b.z) + 2) continue;
        roadVertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let x = -100; x < 260; x += 6.5) {
      const points = [];
      for (let z = -320; z < 320; z += 4) {
        const px = x + Math.sin(z * 0.008) * 5;
        points.push(new THREE.Vector3(px, elevation(px, z) + 0.15, z));
      }
      addRoad(points);
    }
    for (let z = -320; z < 320; z += 7) {
      const points = [];
      for (let x = -110; x < 280; x += 4) {
        const pz = z + Math.sin(x * 0.009) * 5;
        points.push(new THREE.Vector3(x, elevation(x, pz) + 0.16, pz));
      }
      addRoad(points);
    }
    const roadsGeometry = new THREE.BufferGeometry();
    roadsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(roadVertices, 3),
    );
    scene.add(
      new THREE.LineSegments(
        roadsGeometry,
        new THREE.LineBasicMaterial({
          color: "#b89b88",
          transparent: true,
          opacity: 0.105,
        }),
      ),
    );
    // Coastal highways and a few connecting routes make the camera movement legible.
    for (let route = 0; route < 4; route++) {
      const points = [];
      for (let z = -350; z < 350; z += 2) {
        const x = coast(z) + 10 + route * 25 + Math.sin(z * 0.02 + route) * 10;
        points.push(new THREE.Vector3(x, elevation(x, z) + 0.2, z));
      }
      scene.add(makeLine(points, "#b89b87", route === 0 ? 0.28 : 0.13));
    }
    for (let route = 0; route < 3; route++) {
      const points = [];
      for (let x = -90; x < 280; x += 2) {
        const z = (route - 1) * 83 + Math.sin(x * 0.014) * 28;
        points.push(new THREE.Vector3(x, elevation(x, z) + 0.22, z));
      }
      addRoad(points);
      scene.add(
        makeLine(
          points.filter((p) => p.x > coast(p.z) + 3),
          "#b89b87",
          0.18,
        ),
      );
    }
    const buildingParts = [];
    for (let x = -70; x < 125; x += 6.5)
      for (let z = -265; z < 260; z += 7) {
        const rx = x + Math.sin(z * 0.008) * 5 + 2,
          rz = z + Math.sin(x * 0.009) * 5 + 2;
        if (rx < coast(rz) + 7 || elevation(rx, rz) > 8 || random(x, z) > 0.68)
          continue;
        const r = random(x + 1, z),
          high = Math.exp(-((rx - 8) ** 2 + (rz + 35) ** 2) / 1000);
        const h = 0.35 + r * 1.1 + high * r * 3.5;
        const geometry = new THREE.BoxGeometry(
          1.7 + r * 1.7,
          h,
          1.9 + random(z, x) * 2.5,
        );
        geometry.translate(rx, elevation(rx, rz) + h / 2, rz);
        buildingParts.push(geometry);
      }
    const buildingsGeometry = mergeGeometries(buildingParts);
    buildingParts.forEach((g) => g.dispose());
    const buildings = new THREE.Mesh(
      buildingsGeometry,
      new THREE.MeshLambertMaterial({ color: "#5b4440" }),
    );
    scene.add(buildings);
    // Sparse contour lines on the hills keep this close to a muted terrain map.
    const contour = [];
    for (let level = 4; level < 27; level += 4)
      for (let x = 30; x < 295; x += 5)
        for (let z = -300; z < 300; z += 5) {
          const corners = [
              [x, z],
              [x + 5, z],
              [x + 5, z + 5],
              [x, z + 5],
            ],
            hits = [];
          for (let k = 0; k < 4; k++) {
            const a = corners[k],
              b = corners[(k + 1) % 4],
              ha = elevation(...a),
              hb = elevation(...b);
            if (ha < level !== hb < level) {
              const ratio = (level - ha) / (hb - ha);
              hits.push([
                a[0] + (b[0] - a[0]) * ratio,
                level + 0.07,
                a[1] + (b[1] - a[1]) * ratio,
              ]);
            }
          }
          if (hits.length === 2) contour.push(...hits[0], ...hits[1]);
        }
    const contourGeometry = new THREE.BufferGeometry();
    contourGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(contour, 3),
    );
    scene.add(
      new THREE.LineSegments(
        contourGeometry,
        new THREE.LineBasicMaterial({
          color: "#b09682",
          transparent: true,
          opacity: 0.12,
        }),
      ),
    );
    // Labels are deliberately abstract until the actual career journey is provided.
    function label(text, x, z) {
      const tile = document.createElement("canvas");
      tile.width = 512;
      tile.height = 64;
      const ctx = tile.getContext("2d");
      ctx.font = "20px Arial";
      ctx.fillStyle = "#a38c80";
      ctx.textAlign = "center";
      ctx.fillText(text, 256, 38);
      const texture = new THREE.CanvasTexture(tile);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(35, 4.4),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, elevation(x, z) + 0.28, z);
      scene.add(mesh);
    }
    label("N O R T H   S H O R E", -34, -125);
    label("N E W   P E R S P E C T I V E S", 45, -73);
    label("T H E   D E T A I L S", 62, 90);
    label("S T I L L   E X P L O R I N G", 120, 10);
    const marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.45, 48),
      new THREE.MeshBasicMaterial({
        color: "#d2b4a0",
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    marker.add(ring);
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 16),
      new THREE.MeshBasicMaterial({
        color: "#c9a48e",
        transparent: true,
        opacity: 0.7,
      }),
    );
    dot.rotation.x = -Math.PI / 2;
    marker.add(dot);
    scene.add(marker);
    let raf,
      last = 0,
      smooth = control.current.progress,
      pointer = { x: 0, y: 0 },
      frameCount = 0,
      disposed = false,
      dirty = true;
    const look = new THREE.Vector3(),
      position = new THREE.Vector3();
    function render(now) {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const reduced = control.current.reducedMotion;
      const before = smooth;
      smooth = reduced
        ? control.current.progress
        : THREE.MathUtils.damp(smooth, control.current.progress, 5, dt);
      const index = Math.min(
          cameras.length - 2,
          Math.floor(clamp(smooth, 0, cameras.length - 1)),
        ),
        fraction = clamp(smooth - index, 0, 1),
        ease = fraction * fraction * (3 - 2 * fraction);
      const a = cameras[index],
        b = cameras[index + 1];
      position
        .fromArray(a.position)
        .lerp(new THREE.Vector3(...b.position), ease);
      look.fromArray(a.target).lerp(new THREE.Vector3(...b.target), ease);
      if (!reduced) {
        position.x += pointer.x * 2.6;
        position.y += pointer.y * 1.4;
      }
      camera.position.copy(position);
      camera.lookAt(look);
      marker.position.set(look.x, elevation(look.x, look.z) + 0.45, look.z);
      ring.scale.setScalar(1);
      if (dirty || Math.abs(smooth - before) > 0.00001 || frameCount < 3) {
        renderer.render(scene, camera);
        frameCount++;
        dirty = false;
        if (frameCount === 2) onReady?.("webgl");
      }
      raf = requestAnimationFrame(render);
    }
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const move = (e) => {
      pointer.x = e.clientX / innerWidth - 0.5;
      pointer.y = e.clientY / innerHeight - 0.5;
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    raf = requestAnimationFrame(render);
    window.addEventListener("pointermove", move);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
    };
  }, [onReady]);
  if (failed) return <MapFallback />;
  return (
    <canvas
      ref={ref}
      className="journey-map"
      role="img"
      aria-label="An interactive three-dimensional coastal landscape, with hills, streets, and buildings, that changes perspective through each chapter"
    />
  );
}
