// Painterly top-down grass: flowing light, curved fine fibers, film grain and dew.
// This is a live procedural scene, not a video or an image overlay.
const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}
`;
const fragmentSource = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_pointer;
uniform vec4 u_wakes[12];

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 hash2(vec2 p){return vec2(hash(p),hash(p+71.37));}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03+17.2)*.29+noise(p*4.11+8.7)*.14;}
float shine(vec2 p,float t){
  vec2 grid=p*8.6,id=floor(grid),local=fract(grid);float light=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 offset=vec2(float(x),float(y)),cell=id+offset;
    float seed=hash(cell+12.3);vec2 point=.14+hash2(cell)*.72;
    vec2 d=local-offset-point;d.x+=sin(t*.35+seed*20.)*.018;
    float pulse=pow(max(0.,sin(t*.83+seed*48.)),4.);
    float gate=smoothstep(.20,.52,seed)*pulse;
    float horizontal=exp(-abs(d.y)*170.-abs(d.x)*12.);
    float vertical=exp(-abs(d.x)*210.-abs(d.y)*20.);
    float core=exp(-length(d)*115.);
    float halo=exp(-dot(d,d)*160.)*.075;
    light+=(horizontal*.62+vertical*.53+core*.85+halo)*gate;
  }
  return light;
}
void main(){
  vec2 uv=vec2(v_uv.x,1.-v_uv.y);float aspect=u_resolution.x/u_resolution.y;
  vec2 p=(uv-.5)*vec2(aspect,1.);float t=u_time;
  vec2 drift=vec2(t*.018,t*.009);
  float broad=fbm(p*3.3+vec2(-t*.065,t*.025));
  float pulse=sin(p.x*3.1+p.y*8.5-t*.65+broad*3.);
  vec2 flow=vec2(sin(p.y*4.2+p.x*2.6-t*.58),cos(p.x*3.3-p.y*2.1-t*.37));
  vec2 q=p+flow*.041+vec2(broad*.14,0.);
  float pressure=0.;
  if(u_pointer.z>.5){vec2 delta=p-u_pointer.xy;float r=length(delta);float falloff=exp(-r*r*90.);q+=delta/(r+.018)*falloff*.048;pressure=falloff;}
  for(int i=0;i<12;i++){
    vec4 wake=u_wakes[i];float age=wake.z;
    if(wake.w>.001&&age<4.5){
      vec2 delta=p-wake.xy;float r=length(delta);
      float decay=exp(-age*1.85)*wake.w;
      float flex=cos(age*3.2)*exp(-r*r*105.);
      q+=delta/(r+.025)*flex*decay*.025;
      pressure+=exp(-r*r*120.)*decay*.18;
    }
  }
  // Fine curved fibers and varied tufts give the surface its grassy structure.
  vec2 fiber=q*vec2(170.,53.);
  float bend=sin(fiber.y*1.6+noise(q*14.)*5.)*.20+noise(vec2(floor(fiber.x),fiber.y*1.2))*.95;
  float strand=pow(max(0.,1.-abs(fract(fiber.x+bend)-.5)*2.),7.);
  float broken=noise(vec2(floor(fiber.x),fiber.y*.9));
  float blades=strand*smoothstep(.39,.78,broken);
  float fine=fbm(q*vec2(75.,135.)+vec2(t*.012,0.));
  float clump=fbm(q*9.-drift);
  float light=fbm(q*2.7+vec2(-t*.04,0.));
  float ribbon=pow(max(0.,1.-abs(pulse)),5.);
  vec3 shade=vec3(.055,.205,.145);
  vec3 green=vec3(.21,.43,.245);
  vec3 sunlit=vec3(.54,.67,.37);
  vec3 color=mix(shade,green,clamp(clump*.85+fine*.4,0.,1.));
  color=mix(color,sunlit,clamp((light-.35)*.65+blades*.22+ribbon*.12,0.,.55));
  color+=vec3(.19,.24,.12)*blades*(.25+light*.5);
  color*=1.-clamp(pressure,0.,1.)*.16;
  // Glancing light travels across the grass in broad, feathered wind ribbons.
  float edge=pow(max(0.,1.-abs(pulse+.28)),14.);
  color+=vec3(.29,.32,.20)*edge*(.10+fine*.18);
  float sparkle=shine(q+vec2(flow.x*.004,flow.y*.003),t);
  color+=vec3(1.0,.92,.70)*sparkle*1.35;
  float grain=hash(gl_FragCoord.xy+floor(t*23.)*vec2(37.1,79.3))-.5;
  color+=grain*.115;
  color+=vec3(grain*.012,grain*.025,grain*.005);
  float vignette=1.-smoothstep(.2,.95,length((uv-.5)*vec2(.85,1.)))*.15;
  color*=vignette;
  color=pow(max(color,vec3(0.)),vec3(.89));
  gl_FragColor=vec4(color,1.);
}
`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw Error(message);
  }
  return shader;
}
function createPainter(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource),
    fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource),
    program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(program));
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(
    ["u_resolution", "u_time", "u_pointer", "u_wakes[0]"].map((name) => [
      name,
      gl.getUniformLocation(program, name),
    ]),
  );
  return {
    render(width, height, time, pointer, wakes) {
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.u_resolution, width, height);
      gl.uniform1f(uniforms.u_time, time);
      gl.uniform3f(
        uniforms.u_pointer,
        pointer.x,
        pointer.y,
        pointer.inside ? 1 : 0,
      );
      gl.uniform4fv(uniforms["u_wakes[0]"], wakes);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
function createFallback(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false }),
    buffer = document.createElement("canvas"),
    paint = buffer.getContext("2d", { alpha: false });
  return {
    render(width, height, time, pointer, wakes) {
      buffer.width = Math.max(1, Math.round(width * 0.5));
      buffer.height = Math.max(1, Math.round(height * 0.5));
      const w = buffer.width,
        h = buffer.height;
      const floor = paint.createLinearGradient(0, 0, w, h);
      floor.addColorStop(0, "#315c3d");
      floor.addColorStop(0.45, "#50774a");
      floor.addColorStop(1, "#284e36");
      paint.fillStyle = floor;
      paint.fillRect(0, 0, w, h);
      for (let band = -2; band < 9; band++) {
        const y = (band / 7 + Math.sin(time * 0.3 + band) * 0.04) * h;
        paint.strokeStyle = band % 2 ? "#a9b47a22" : "#103d3029";
        paint.lineWidth = h * 0.075;
        paint.beginPath();
        paint.moveTo(-50, y);
        paint.bezierCurveTo(
          w * 0.3,
          y + Math.sin(time * 0.3 + band) * h * 0.14,
          w * 0.65,
          y - h * 0.12,
          w + 50,
          y + h * 0.05,
        );
        paint.stroke();
      }
      const image = paint.getImageData(0, 0, w, h),
        data = image.data;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4,
            n =
              Math.sin(x * 127.1 + y * 311.7 + Math.floor(time * 18) * 17.31) *
              43758.5,
            g = (n - Math.floor(n) - 0.5) * 28;
          const fiber =
            Math.pow(
              Math.max(0, Math.sin(x * 0.9 + Math.sin(y * 0.2 - time) * 0.7)),
              6,
            ) * 8;
          const px = ((x / w - 0.5) * w) / h,
            py = y / h - 0.5,
            dist = (px - pointer.x) ** 2 + (py - pointer.y) ** 2,
            pressure = pointer.inside ? Math.exp(-dist * 90) : 0;
          for (let c = 0; c < 3; c++)
            data[i + c] = clamp(
              data[i + c] + g + fiber - pressure * 17,
              0,
              255,
            );
        }
      paint.putImageData(image, 0, 0);
      for (let i = 0; i < 12; i++) {
        const age = wakes[i * 4 + 2],
          strength = wakes[i * 4 + 3] * Math.exp(-age * 1.85);
        if (strength < 0.002) continue;
        const x = (wakes[i * 4] / (w / h) + 0.5) * w,
          y = (wakes[i * 4 + 1] + 0.5) * h,
          r = h * 0.12;
        const wake = paint.createRadialGradient(x, y, 0, x, y, r);
        wake.addColorStop(0, `rgba(9,39,26,${strength * 0.13})`);
        wake.addColorStop(1, "#09271a00");
        paint.fillStyle = wake;
        paint.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 22; i++) {
        const x = ((((Math.sin(i * 127.1) * 43758.5) % 1) + 1) % 1) * w,
          y = ((((Math.sin(i * 311.7) * 31317.2) % 1) + 1) % 1) * h;
        const pulse = Math.pow(
          Math.max(0, Math.sin(time * 0.83 + i * 3.19)),
          8,
        );
        if (pulse < 0.02) continue;
        paint.globalCompositeOperation = "screen";
        paint.strokeStyle = `rgba(255,246,201,${pulse * 0.8})`;
        paint.lineWidth = 0.5;
        paint.beginPath();
        paint.moveTo(x - 7 * pulse, y);
        paint.lineTo(x + 7 * pulse, y);
        paint.moveTo(x, y - 4 * pulse);
        paint.lineTo(x, y + 4 * pulse);
        paint.stroke();
        const glow = paint.createRadialGradient(x, y, 0, x, y, 5);
        glow.addColorStop(0, `rgba(255,248,215,${pulse * 0.7})`);
        glow.addColorStop(1, "#fff7d700");
        paint.fillStyle = glow;
        paint.fillRect(x - 5, y - 5, 10, 10);
        paint.globalCompositeOperation = "source-over";
      }
      ctx.drawImage(buffer, 0, 0, width, height);
    },
    destroy() {},
  };
}
export function createMeadow(canvas, options = {}) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  const painter = gl ? createPainter(gl) : createFallback(canvas);
  let width = 1,
    height = 1,
    cssWidth = 1,
    cssHeight = 1,
    time = 0,
    last = 0,
    lastPaint = 0,
    frame,
    frames = 0,
    paused = Boolean(options.paused),
    disposed = false,
    interactions = 0,
    lastWake = -1;
  const pointer = { x: -10, y: -10, inside: false },
    wakes = Array.from({ length: 12 }, () => ({
      x: -10,
      y: -10,
      born: -100,
      strength: 0,
    })),
    wakeUniforms = new Float32Array(48);
  function draw() {
    let deflection = pointer.inside ? 1000 : 0;
    wakes.forEach((wake, i) => {
      const age = time - wake.born;
      wakeUniforms.set([wake.x, wake.y, age, wake.strength], i * 4);
      deflection += Math.exp(-age * 1.85) * wake.strength * 200;
    });
    painter.render(width, height, time, pointer, wakeUniforms);
    frames++;
    canvas.dataset.frames = String(frames);
    canvas.dataset.time = time.toFixed(3);
    canvas.dataset.deflection = deflection.toFixed(3);
    canvas.dataset.interacting = String(pointer.inside);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssWidth = rect.width;
    cssHeight = rect.height;
    const scale = Math.max(1, cssWidth / 1280, cssHeight / 1000);
    width = Math.max(1, Math.round(cssWidth / scale));
    height = Math.max(1, Math.round(cssHeight / scale));
    canvas.width = width;
    canvas.height = height;
    canvas.dataset.view = "top-down";
    canvas.dataset.rendering = gl ? "painterly-webgl" : "painterly-fallback";
    canvas.dataset.paused = String(paused);
    draw();
    canvas.dataset.ready = "true";
  }
  function tick(now) {
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, 0.08) : 0;
    last = now;
    if (!paused && !document.hidden) {
      time += dt;
      if (now - lastPaint >= 1000 / 30) {
        draw();
        lastPaint = now;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function move(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x =
      (((event.clientX - rect.left) / rect.width - 0.5) * width) / height;
    pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
    pointer.inside = true;
    interactions++;
    canvas.dataset.interactions = String(interactions);
    if (time - lastWake > 0.035 || paused) {
      wakes.shift();
      wakes.push({ x: pointer.x, y: pointer.y, born: time, strength: 0.85 });
      lastWake = time;
    }
    if (paused) draw();
  }
  function leave() {
    pointer.inside = false;
    if (paused) draw();
  }
  const down = (e) => {
      move(e);
      canvas.setPointerCapture?.(e.pointerId);
      draw();
    },
    up = (e) => {
      if (e.pointerType !== "mouse") leave();
      if (canvas.hasPointerCapture?.(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", leave);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(tick);
  return {
    togglePaused() {
      paused = !paused;
      last = performance.now();
      canvas.dataset.paused = String(paused);
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", leave);
      painter.destroy();
    },
  };
}
