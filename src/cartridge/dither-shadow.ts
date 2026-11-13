import type { ShadowMaterial } from 'three';

/** Keep the original soft shadow, with faint ordered stippling in its falloff. */
export function ditherShadow(material:ShadowMaterial) {
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>', `
      #include <common>
      float orderedShadow(vec2 pixel) {
        vec2 p=mod(floor(pixel/2.0),4.0);
        vec4 row=p.y<1.0?vec4(0.0,8.0,2.0,10.0):p.y<2.0?vec4(12.0,4.0,14.0,6.0):p.y<3.0?vec4(3.0,11.0,1.0,9.0):vec4(15.0,7.0,13.0,5.0);
        float rank=p.x<1.0?row.x:p.x<2.0?row.y:p.x<3.0?row.z:row.w;
        return (rank+0.5)/16.0;
      }
    `).replace('#include <tonemapping_fragment>', `
      if (gl_FragColor.a>0.00001) {
        float coverage=gl_FragColor.a/max(opacity,0.0001);
        float stipple=step(orderedShadow(gl_FragCoord.xy),coverage)*opacity;
        gl_FragColor.a=mix(gl_FragColor.a,stipple,0.25);
      }
      #include <tonemapping_fragment>
    `);
  };
  material.customProgramCacheKey=()=> 'ordered-shadow-v1';
  return material;
}
