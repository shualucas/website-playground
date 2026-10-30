import type { PaperMaterial } from "./leaf";

/** Matte ink may darken in shadow, but bright studio light must not bleach the art. */
export function preservePrintColors<T extends PaperMaterial>(material:T):T {
  material.toneMapped=false;
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace("#include <opaque_fragment>",`
      vec3 printIllumination = outgoingLight / max(diffuseColor.rgb, vec3(0.001));
      float printBrightness = dot(printIllumination, vec3(0.2126, 0.7152, 0.0722));
      outgoingLight = diffuseColor.rgb * clamp(printBrightness, 0.0, 1.0);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=>"source-matte-print-v1";
  return material;
}
