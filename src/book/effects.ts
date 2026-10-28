import * as THREE from "three";

/** Shadow-only fade prevents the canvas edge from reading as a horizontal rule. */
export function softenShadowEdges(material: THREE.ShadowMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec4 vShadowClip;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvShadowClip = gl_Position;",
      );
    shader.fragmentShader =
      "varying vec4 vShadowClip;\n" +
      shader.fragmentShader.replace(
        "#include <premultiplied_alpha_fragment>",
        "vec2 edgeDistance = 1.0 - abs(vShadowClip.xy / vShadowClip.w);\ngl_FragColor.a *= smoothstep(0.0, 0.18, min(edgeDistance.x, edgeDistance.y));\n#include <premultiplied_alpha_fragment>",
      );
  };
  material.customProgramCacheKey = () => "soft-viewport-shadow-1";
  return material;
}
/** A soft, static studio shadow under the paper edition. */
export function contactShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!,
    g = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
  g.addColorStop(0, "rgba(41,36,29,.18)");
  g.addColorStop(0.5, "rgba(41,36,29,.07)");
  g.addColorStop(1, "rgba(37,28,17,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas),
    material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 1,
    });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 6.8), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.175;
  mesh.renderOrder = 1;
  return { mesh, texture };
}
