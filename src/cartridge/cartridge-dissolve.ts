import { Color, Vector2, type Material } from 'three';

/** A screen-space ordered dissolve, evaluated by the existing material shaders and scene clock. */
export class CartridgeDissolve {
  readonly progress={value:0};
  readonly pixelSize={value:2};
  readonly ink={value:new Color('#6988d8')};
  readonly persistent={value:0};
  readonly resolve={value:1};
  readonly range={value:new Vector2(0,1)};
  private applied=new WeakSet<Material>();

  apply(material:Material,ditherSurface=true) {
    if(this.applied.has(material))return;this.applied.add(material);
    const compile=material.onBeforeCompile,cache=material.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
      compile.call(material,shader,renderer);
      shader.uniforms.uCartridgeReveal=this.progress;
      shader.uniforms.uCartridgePixel=this.pixelSize;
      shader.uniforms.uCartridgeInk=this.ink;
      shader.uniforms.uCartridgePersistent=this.persistent;
      shader.uniforms.uCartridgeRange=this.range;
      shader.uniforms.uCartridgeResolve=this.resolve;
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`
        #include <common>
        uniform float uCartridgeReveal;
        uniform float uCartridgePixel;
        uniform vec3 uCartridgeInk;
        uniform float uCartridgePersistent;
        uniform vec2 uCartridgeRange;
        uniform float uCartridgeResolve;
        float cartridgeRank(vec2 cell) {
          vec2 p=mod(cell,4.0);
          vec4 row=p.y<1.0?vec4(0.0,8.0,2.0,10.0):p.y<2.0?vec4(12.0,4.0,14.0,6.0):p.y<3.0?vec4(3.0,11.0,1.0,9.0):vec4(15.0,7.0,13.0,5.0);
          float rank=p.x<1.0?row.x:p.x<2.0?row.y:p.x<3.0?row.z:row.w;
          vec2 quadrant=mod(floor(cell/4.0),2.0);
          float sub=quadrant.y<1.0?(quadrant.x<1.0?0.0:2.0):(quadrant.x<1.0?3.0:1.0);
          return (rank*4.0+sub+0.5)/64.0;
        }
      `).replace('#include <logdepthbuf_fragment>',`
        #include <logdepthbuf_fragment>
        float rank=cartridgeRank(floor(gl_FragCoord.xy/uCartridgePixel));
        if (rank<uCartridgeRange.x || rank>=uCartridgeRange.y || rank>uCartridgeReveal) discard;
      `).replace('#include <tonemapping_fragment>',`
        if (uCartridgeReveal<1.0) gl_FragColor.rgb=mix(uCartridgeInk,gl_FragColor.rgb,smoothstep(0.25,1.0,uCartridgeReveal));
        #include <tonemapping_fragment>
        ${ditherSurface?`
          float dither=max(uCartridgePersistent,1.0-uCartridgeResolve);
          if (dither>0.0) {
            float light=clamp(dot(normalize(normal),normalize(vec3(-0.35,0.55,1.0))),0.0,1.0);
            if (cartridgeRank(floor(gl_FragCoord.xy/uCartridgePixel))>mix(1.0,0.22+0.58*light,dither)) discard;
            vec3 ink=uCartridgeInk*mix(0.48,1.0,smoothstep(0.0,0.7,light));
            gl_FragColor.rgb=mix(gl_FragColor.rgb,ink,dither);
          }
        `:''}
      `);
    };
    material.customProgramCacheKey=()=>`${cache}|cartridge-dissolve-v4-${ditherSurface}`;
    material.needsUpdate=true;
  }
}
