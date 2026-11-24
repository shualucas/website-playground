// Ribcage visual study (Luis Bizarro, https://webgpu.toys/ribcage/).
// Original photo-scene shaders: the reference's 4×4 Bayer order, nine tonal
// steps, 360-row pixel grid and 24 Hz film grain, plus a pointer-driven wake.
export const screenVertex=`varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const fluidFragment=`precision highp float;
varying vec2 vUv;
uniform sampler2D previous;
uniform vec2 texel,pointer,lastPointer;
uniform float dt,aspect,deposit;
void main(){
 vec4 here=texture2D(previous,vUv);
 vec2 uv=vUv-here.xy*dt*.65;
 vec4 center=texture2D(previous,uv);
 vec4 neighbors=(texture2D(previous,uv+vec2(texel.x,0.))+texture2D(previous,uv-vec2(texel.x,0.))+texture2D(previous,uv+vec2(0.,texel.y))+texture2D(previous,uv-vec2(0.,texel.y)))*.25;
 vec4 field=mix(center,neighbors,min(dt*7.,.24));
 field.xy*=exp(-dt*1.2);field.z*=exp(-dt*.8);
 vec2 p=vUv*vec2(aspect,1.),a=lastPointer*vec2(aspect,1.),b=pointer*vec2(aspect,1.);
 vec2 line=b-a;float h=clamp(dot(p-a,line)/max(dot(line,line),.00001),0.,1.);
 float ink=exp(-dot(p-a-line*h,p-a-line*h)/.0022)*deposit;
 vec2 velocity=clamp((pointer-lastPointer)/max(dt,.016),vec2(-3.),vec2(3.));
 field.xy+=velocity*ink*.3;
 // A small curl turns a straight brush stroke into an advected, fading wake.
 field.xy+=vec2(-(p-b).y,(p-b).x)*ink*2.;
 field.z=min(3.,field.z+ink*.8);
 gl_FragColor=field;
}`;
export const photoFragment=`precision highp float;
varying vec2 vUv;
uniform sampler2D sceneTexture,flow;
uniform vec2 resolution,pointer,focus;
uniform vec3 background,ramp0,ramp1,ramp2,ramp3,ramp4;
uniform float time,aspect,reduced,hasFocus,hovering;
float bayer(vec2 cell){
 int x=int(mod(cell.x,4.)),y=int(mod(cell.y,4.));int i=y*4+x;
 float m=0.;
 if(i==1)m=8.;else if(i==2)m=2.;else if(i==3)m=10.;else if(i==4)m=12.;else if(i==5)m=4.;else if(i==6)m=14.;else if(i==7)m=6.;else if(i==8)m=3.;else if(i==9)m=11.;else if(i==10)m=1.;else if(i==11)m=9.;else if(i==12)m=15.;else if(i==13)m=7.;else if(i==14)m=13.;else if(i==15)m=5.;
 return (m+.5)/16.;
}
vec3 ramp(float t){float x=clamp(t,0.,1.)*4.;if(x<1.)return mix(ramp0,ramp1,x);if(x<2.)return mix(ramp1,ramp2,x-1.);if(x<3.)return mix(ramp2,ramp3,x-2.);return mix(ramp3,ramp4,x-3.);}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 float cellSize=max(1.,resolution.y/360.);vec2 cell=floor(gl_FragCoord.xy/cellSize),uv=(cell+.5)*cellSize/resolution;
 vec4 wake=texture2D(flow,uv);
 vec2 distortion=wake.xy*.012*(1.-reduced);
 vec4 sampleColor=texture2D(sceneTexture,clamp(uv-distortion,0.,1.));
 float alpha=sampleColor.a;
 vec3 original=srgb(sampleColor.rgb);
 float value=dot(original,vec3(.299,.587,.114));
 float grain=(hash(cell+floor(time*24.))-.5)*.035*(.6+value);
 float threshold=mix(.5,bayer(cell),.9),levels=9.;
 float stepped=clamp(floor((value+grain)*levels+threshold)/levels,0.,1.);
 vec2 near=(uv-pointer)*vec2(aspect,1.);
 float lens=smoothstep(.14,.025,length(near))*hovering;
 float reveal=max(smoothstep(.08,.55,1.-exp(-wake.z*2.2)),lens);
 reveal=max(reveal,smoothstep(.2,.04,length((uv-focus)*vec2(aspect,1.)))*hasFocus);
 vec3 color=ramp(stepped);
 vec3 painted=clamp(floor((original+grain)*levels+threshold)/levels,0.,1.);
 color=mix(color,painted,step(bayer(cell),reveal));
 gl_FragColor=vec4(mix(background,color,alpha),1.);
}`;
