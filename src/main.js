const canvas = document.querySelector('#pond');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { night: false, paused: reducedMotion, sound: false, time: 0, ripples: [], pointer: null, lastPointerRipple: 0, interactions: 0 };
let width = 0, height = 0, lastFrame = 0, audio, soundTimer, activityTimer;
const rand = (min, max) => min + Math.random() * (max - min);
const frogs = [
  { x: .35, y: .42, color: 0, name: 'Fern' },
  { x: .58, y: .31, color: 1, name: 'Moss' },
  { x: .69, y: .61, color: 0, name: 'Clover' },
  { x: .45, y: .71, color: 2, name: 'Pebble' },
  { x: .24, y: .65, color: 1, name: 'Sprout' },
].map((f, i) => ({ ...f, fromX: f.x, fromY: f.y, targetX: f.x, targetY: f.y, hop: 1, nextHop: 3 + i * 2.2, blink: i * 1.7, croak: 0 }));
const pads = [ [.19,.41,1.2], [.37,.27,.8], [.58,.33,1.1], [.78,.38,.8], [.73,.69,1.25], [.44,.73,1.05], [.25,.70,.75] ];
const palette = () => state.night ? {water:'#536b51',faint:'#344c3b',wave:'#7a9168',pad:'#6d8656',padDark:'#4c6545',frog:['#b3c38b','#92ac73','#c3bc8a'],ripple:'#b3c699',flower:'#b6a5ac'} : {water:'#b3bc9f',faint:'#d4d9c5',wave:'#96a780',pad:'#9aab7d',padDark:'#819664',frog:['#516f44','#72804c','#687953'],ripple:'#788f63',flower:'#a68e85'};
function resize() {
  const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
new ResizeObserver(resize).observe(canvas);
function text(lines, x, y, color, size = 10, lineHeight = 11, alpha = 1) {
  ctx.save();ctx.fillStyle = color;ctx.globalAlpha = alpha;ctx.font = `${size}px "Courier New", monospace`;ctx.textAlign = 'center';ctx.textBaseline='middle';
  lines.forEach((line,i) => ctx.fillText(line, x, y + (i - (lines.length-1)/2)*lineHeight));ctx.restore();
}
function draw() {
  if (!width) return;
  ctx.clearRect(0, 0, width, height);
  const p = palette(), t = state.time;
  const cellX = width < 500 ? 7 : 8, cellY = 12;
  ctx.font = '10px "Courier New", monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  for(let y=32;y<height-32;y+=cellY) {
    for(let x=32;x<width-32;x+=cellX) {
      const nx=(x-width*.5)/(width*.435), ny=(y-height*.52)/(height*.43);
      const d=nx*nx+ny*ny;
      const perturb = Math.sin(nx*11+ny*7)*.035 + Math.cos(ny*13-nx*7)*.035;
      if (d > 1+perturb) continue;
      let char=' ', color=p.faint, alpha=.65;
      const wave=Math.sin(x*.037+y*.062+t*.47)+Math.cos(y*.12-x*.015-t*.36);
      const noise = Math.sin(x*127.1+y*311.7)*43758.5453 % 1;
      if(d>.91+perturb) {char = noise>.2 ? '.' : noise<-.4 ? "'" : ' ';color=p.water;alpha=.6;}
      else if(wave>1.64) {char = '~';color=p.water;alpha=.6;}
      else if(noise>.77) {char='·';color=p.water;alpha=.7;}
      else if(noise<-.87) char='.';
      for(const r of state.ripples) {
        const age=t-r.born, distance=Math.hypot(x-r.x,(y-r.y)*1.65);
        const ring=age*43;
        const delta=Math.abs(distance-ring);
        const inner=Math.abs(distance-ring*.65);
        if((delta<5 || (inner<3 && age>.5)) && age<3.8) {
          char = Math.abs(y-r.y)<ring*.22 ? '~' : (x<r.x ? '(' : ')');color=p.ripple;alpha=(1-age/3.8)*.8;
        }
      }
      if(char!==' ') {ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.fillText(char,x,y);}
    }
  }
  ctx.globalAlpha=1;
  const scale = width < 500 ? .72 : 1;
  pads.forEach(([px,py,s],i) => {
    const x=px*width,y=py*height+Math.sin(t*.45+i)*1.6;
    text(['   .-----..  ',' .:;;;;;;;;:.',' :;;;;;  ;;;;:',"  ';;;;;;;;' ","    '----'   "],x,y,p.pad,8*s*scale,7*s*scale,.67);
    text(['   ,','  /'],x+12*s*scale,y-4,p.padDark,8*scale,7*scale,.65);
    if(i===0 || i===4) text([' \|/ ','--*--',' /|\\ '],x-15*s*scale,y-9*s*scale,p.flower,9*scale,7*scale,.8);
  });
  const reeds=[ [.1,.57], [.87,.54], [.82,.24], [.12,.3] ];
  reeds.forEach(([rx,ry],i)=>{
    text(['   |   /',' \\ |  / ',"  \\| /  ", '   |/   ', '---+--- '],rx*width,ry*height,p.padDark,9*scale,9*scale,.5);
    text(['  . .',' . : .',"  ' '"],rx*width+12,ry*height+27,p.water,9*scale,7*scale,.55);
  });
  // Tiny insects leave drifting punctuation above the water.
  for(let i=0;i<4;i++){
    const x=(.22+i*.18)*width+Math.sin(t*.65+i*4)*19,y=(.23+(i%2)*.38)*height+Math.cos(t*.8+i)*11;
    text([i%2?'·-·':"-:-"],x,y,state.night?'#b7be80':p.padDark,8,8,state.night?.65:.4);
  }
  frogs.forEach((f,i)=>{
    const hopping=f.hop<1;
    const lift=hopping?Math.sin(f.hop*Math.PI)*25*scale:0;
    const x=f.x*width,y=f.y*height;
    if(hopping) text(['. . . .'],x,y+19*scale,p.water,9*scale,10,.4);
    ctx.clearRect(x-29*scale,y-lift-22*scale,58*scale,44*scale);
    let eyes=Math.sin(t*.8+f.blink)>.985?' -..- ': ' @..@ ';
    const sprite=hopping?[' \\'+eyes.trim()+'/ ', '  (----)  ',' / (__) \\','v        v']:[eyes,'(----)','( >__< )','^^ ~~ ^^'];
    text(sprite,x,y-lift,p.frog[f.color],11*scale,10*scale);
    if(f.croak>t) text(['ribbit.'],x,y-35*scale,p.frog[f.color],8*scale,9,.7);
    if(state.pointer && Math.hypot(x-state.pointer.x,y-state.pointer.y)<38 && !hopping) text([f.name.toLowerCase()],x,y+33*scale,p.frog[f.color],8*scale,9,.8);
  });
  // A few rings appear quietly even when nobody touches the pond.
  text(['~  ~'],width*.53,height*.53+Math.sin(t)*2,p.water,10,10,.55);
}
function ripple(x,y,quiet=false) {
  state.ripples.push({x,y,born:state.time});
  if(state.ripples.length>14) state.ripples.shift();
  if(!quiet) {
    state.interactions++;
    $('pond-hint').style.opacity='0';
    announce(['a little ripple goes a long way','someone’s coming to say hello','a small moment, just for you'][state.interactions%3]);
    const nearest=[...frogs].filter(f=>f.hop>=1).sort((a,b)=>Math.hypot(a.x*width-x,a.y*height-y)-Math.hypot(b.x*width-x,b.y*height-y)).slice(0,2);
    nearest.forEach((f,i)=>{f.nextHop=state.time+.25+i*.5;f.goal={x:Math.max(.18,Math.min(.81,x/width+rand(-.045,.045))),y:Math.max(.24,Math.min(.76,y/height+rand(-.06,.06)))};});
    if(state.sound) plink();
  }
  if(state.paused) draw();
}
function announce(message){$('activity').textContent=message;clearTimeout(activityTimer);activityTimer=setTimeout(()=>{$('activity').innerHTML='all is well <span class="small-star">✳</span>';},4300);}
function tick(now) {
  const dt=Math.min((now-lastFrame)/1000,.045);lastFrame=now;
  if(!state.paused) {
    state.time+=dt; const t=state.time;
    frogs.forEach(f=>{
      if(f.hop<1) {
        f.hop=Math.min(1,f.hop+dt*1.65);
        const ease=f.hop*f.hop*(3-2*f.hop);
        f.x=f.fromX+(f.targetX-f.fromX)*ease;f.y=f.fromY+(f.targetY-f.fromY)*ease;
        if(f.hop===1) {ripple(f.x*width,f.y*height,true);f.nextHop=t+rand(5,13);}
      } else if(t>f.nextHop) {
        f.fromX=f.x;f.fromY=f.y;
        f.targetX=f.goal?.x ?? Math.max(.18,Math.min(.82,f.x+rand(-.12,.12)));
        f.targetY=f.goal?.y ?? Math.max(.25,Math.min(.76,f.y+rand(-.14,.14)));
        f.goal=null;f.hop=0;
      }
      if(Math.random()<dt*.016){f.croak=t+1.6;if(state.sound) croak();}
    });
    state.ripples=state.ripples.filter(r=>t-r.born<4);
    draw();
  }
  requestAnimationFrame(tick);
}
function point(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener('pointermove',e=>{
  state.pointer=point(e);
  if(!state.paused && state.time-state.lastPointerRipple>.55){ripple(state.pointer.x,state.pointer.y,true);state.lastPointerRipple=state.time;}
});
canvas.addEventListener('pointerleave',()=>state.pointer=null);
canvas.addEventListener('pointerdown',e=>{const pos=point(e);ripple(pos.x,pos.y);canvas.focus({preventScroll:true});});
function togglePause(){state.paused=!state.paused;$('pause-button').setAttribute('aria-pressed',String(state.paused));$('pause-label').textContent=state.paused?'resume':'pause';$('pause-icon').textContent=state.paused?'▷':'Ⅱ';}
if(state.paused){$('pause-button').setAttribute('aria-pressed','true');$('pause-label').textContent='resume';$('pause-icon').textContent='▷';}
$('pause-button').addEventListener('click',togglePause);
document.addEventListener('keydown',e=>{if(e.code==='Space' && !$('about-dialog').open && !['BUTTON','A','INPUT'].includes(document.activeElement.tagName)){e.preventDefault();togglePause();}});
$('theme-button').addEventListener('click',()=>{state.night=!state.night;document.documentElement.classList.toggle('night',state.night);$('theme-button').setAttribute('aria-pressed',String(state.night));$('theme-label').textContent=state.night?'nighttime':'daytime';$('theme-icon').textContent=state.night?'☾':'☼';$('weather').innerHTML=state.night?'17° &nbsp; · &nbsp; under a quiet moon':'22° &nbsp; · &nbsp; a gentle afternoon';document.querySelector('meta[name="theme-color"]').content=state.night?'#171e1b':'#f4f3eb';draw();});
$('about-button').addEventListener('click',()=>$('about-dialog').showModal());
$('close-dialog').addEventListener('click',()=>$('about-dialog').close());
$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)e.target.close();}});
function tone(freq,duration,volume,type='sine',end=freq) {
  if(!audio || audio.state!=='running')return;
  const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(end,1),audio.currentTime+duration);gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(volume,audio.currentTime+.03);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
}
function plink(){tone(540,.5,.035,'sine',190);}
function croak(){tone(145,.21,.035,'triangle',90);setTimeout(()=>{if(state.sound)tone(125,.17,.025,'triangle',80);},140);}
$('sound-button').addEventListener('click',async()=>{
  const enabled=!state.sound;
  if(enabled){
    try{audio??=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();}
    catch{announce('pond sounds aren’t available in this browser');return;}
  }
  state.sound=enabled;$('sound-button').setAttribute('aria-pressed',String(enabled));$('sound-label').textContent=enabled?'sound on':'sound off';$('sound-icon').textContent=enabled?'♫':'♩';
  clearInterval(soundTimer);
  if(enabled){plink();soundTimer=setInterval(()=>{if(!state.paused && !document.hidden){if(Math.random()>.6)croak();else tone(rand(1800,2500),.12,.009,'sine',rand(2200,2900));}},2600);}
  else await audio.suspend();
});
requestAnimationFrame(tick);
