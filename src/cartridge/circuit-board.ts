import * as THREE from "three";

/** Original board artwork: solder mask, etched traces, ICs and edge contacts. */
export function circuitBoardMaps() {
  const color = document.createElement("canvas"), metal = document.createElement("canvas");
  color.width = metal.width = 512; color.height = metal.height = 256;
  const c = color.getContext("2d")!, m = metal.getContext("2d")!;
  c.fillStyle = "#176342"; c.fillRect(0, 0, 512, 256);
  m.fillStyle = "#161616"; m.fillRect(0, 0, 512, 256);
  const path = (ctx: CanvasRenderingContext2D, x: number, i: number) => {
    ctx.beginPath(); ctx.moveTo(x, 217); ctx.lineTo(x, 181 - i % 4 * 12);
    ctx.lineTo(x + (i % 2 ? 12 : -12), 167 - i % 4 * 12);
    ctx.lineTo(x + (i % 2 ? 12 : -12), 105 - i % 3 * 20); ctx.stroke();
  };
  for (let i = 0; i < 30; i++) {
    const x = 18 + i * 16.4;
    c.strokeStyle = "#83a86a"; c.lineWidth = 1.5; path(c, x, i);
    m.strokeStyle = "#777"; m.lineWidth = 1.5; path(m, x, i);
    c.fillStyle = "#d8b35a"; c.fillRect(x - 6, 211, 12, 45);
    c.fillStyle = "#ebcf80"; c.fillRect(x - 5, 212, 2, 42);
    m.fillStyle = "#fff"; m.fillRect(x - 6, 211, 12, 45);
  }
  for (const [x,y,w,h] of [[65,40,113,70],[274,45,132,65],[211,132,68,37]]) {
    c.fillStyle = "#102c25"; c.fillRect(x,y,w,h);
    for (let i=0;i<8;i++) {
      c.fillStyle = "#c6b77e"; m.fillStyle = "#ccc";
      for (const py of [y-5,y+h]) { c.fillRect(x+8+i*(w-16)/8,py,3,5); m.fillRect(x+8+i*(w-16)/8,py,3,5); }
    }
    c.fillStyle = "#3d5548"; c.fillRect(x+8,y+10,w-16,2);
  }
  c.strokeStyle = "#b3c9a8"; c.lineWidth = 1;
  for (const x of [24,488]) for (const y of [20,190]) { c.beginPath(); c.arc(x,y,4,0,Math.PI*2); c.stroke(); }
  const map = new THREE.CanvasTexture(color); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const metalnessMap = new THREE.CanvasTexture(metal); metalnessMap.anisotropy = 4;
  return { map, metalnessMap };
}

export function mapBoardGeometry(mesh: THREE.Mesh, bounds: THREE.Box3) {
  const position = mesh.geometry.attributes.position, point = new THREE.Vector3(), size = bounds.getSize(new THREE.Vector3());
  const uv = new THREE.Float32BufferAttribute(position.count * 2, 2);
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    uv.setXY(i, (point.x - bounds.min.x) / size.x, (point.y - bounds.min.y) / size.y);
  }
  mesh.geometry.setAttribute("uv", uv);
}
