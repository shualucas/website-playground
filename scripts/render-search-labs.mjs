import {chromium} from '@playwright/test';
import {browserOptions} from './browser-config.mjs';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {parseArgs} from 'node:util';

// The GIF and the comp must share one logical clock. Never capture a live GIF
// while stepping __setTime: slow screenshot/export time aliases its animation.
const {values:args}=parseArgs({options:{source:{type:'string'},output:{type:'string',default:'public/videos/search-labs'}}});
if(!args.source)throw new Error('Pass --source /path/to/extracted/latest-zip');
const output=resolve(args.output),temporary=await mkdtemp(join(tmpdir(),'search-labs-sync-'));
const clips=[{file:'search-labs-v0-sizzle.html',name:'hero',poster:3},{file:'search-labs-v5-kit-sizzle.html',name:'kit',poster:20.5}];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sources=new Map();
for(const clip of clips)sources.set('/'+clip.file,await readFile(join(args.source,clip.file),'utf8'));
const beaker=Buffer.from(sources.get('/'+clips[0].file).match(/data:image\/gif;base64,([A-Za-z0-9+/=]+)/)[1],'base64');
for(const html of sources.values())if(sha(Buffer.from(html.match(/data:image\/gif;base64,([A-Za-z0-9+/=]+)/)[1],'base64'))!==sha(beaker))throw new Error('Expected the same beaker GIF in both comps.');
await writeFile(join(temporary,'beaker.gif'),beaker);await mkdir(join(temporary,'frames'));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',join(temporary,'beaker.gif'),'-fps_mode','passthrough','-start_number','0',join(temporary,'frames','%03d.png')]);
const timing=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time,duration_time','-of','json',join(temporary,'beaker.gif')])).frames;
const starts=timing.map(frame=>Number(frame.best_effort_timestamp_time)),period=starts.at(-1)+Number(timing.at(-1).duration_time);
const frameAt=time=>{const local=((time%period)+period)%period;return starts.findLastIndex(start=>start<=local+1e-7)};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(sources.has(path)){res.setHeader('Content-Type','text/html');res.end(sources.get(path));return}
  const match=path.match(/^\/beaker-frames\/(\d{3})\.png$/);
  if(match&&Number(match[1])<starts.length){res.setHeader('Content-Type','image/png');res.end(await readFile(join(temporary,'frames',match[1]+'.png')));return}
  res.writeHead(404);res.end();
 }catch{res.writeHead(500);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
// CSS comps use CPU compositing; keep their native 1600 × 1000 framing.
const browser=await chromium.launch({...browserOptions,args:browserOptions.args.filter(arg=>!arg.includes('swiftshader')).concat('--disable-gpu')});
let encoder;
try{
 await mkdir(output,{recursive:true});
 for(const clip of clips){
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  const cdp=await page.context().newCDPSession(page),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  await page.goto(base+'/'+clip.file+'?mode=capture');
  await page.evaluate(async()=>{
   await document.fonts.ready;
   window.__exportBeakers=[...document.images].filter(img=>img.src.startsWith('data:image/gif;'));
   if(!window.__exportBeakers.length)throw Error('No animated beaker images found');
   for(const img of window.__exportBeakers){img.src='/beaker-frames/000.png';img.dataset.exportBeaker='true'}
   await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  });
  const sourceDuration=await page.evaluate(()=>__getDuration());
  // Preserve the GIF's actual timing. Hold the finished, bare-beaker outro just
  // long enough to finish a whole GIF cycle, keeping the MP4 loop seamless.
  const duration=Math.ceil(sourceDuration/period)*period,fps=30,count=Math.round(duration*fps);
  const draw=async time=>{
   const frame=String(frameAt(time)).padStart(3,'0');
   await page.evaluate(async({sceneTime,frame})=>{
    await __setTime(sceneTime);
    await Promise.all(window.__exportBeakers.map(async img=>{const src='/beaker-frames/'+frame+'.png';if(!img.src.endsWith(src)){img.src=src;await img.decode()}}));
    await new Promise(requestAnimationFrame);
   },{sceneTime:Math.min(time,sourceDuration-1/fps),frame});
  };
  await draw(clip.poster);await page.screenshot({path:join(output,`search-labs-${clip.name}-sync-poster.jpg`),type:'jpeg',quality:95});
  const full=join(output,`search-labs-${clip.name}-sync-1600.mp4`);
  encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',full],{stdio:['pipe','inherit','inherit']});
  const finished=once(encoder,'exit');
  for(let frame=0;frame<count;frame++){
   await draw(frame/fps);
   const bytes=Buffer.from((await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:95,fromSurface:true})).data,'base64');
   if(!encoder.stdin.write(bytes))await once(encoder.stdin,'drain');
   if(frame%90===0)console.log(`${clip.name}: ${frame}/${count}, beaker frame ${frameAt(frame/fps)}`);
  }
  encoder.stdin.end();const [code]=await finished;if(code!==0)throw Error('Video encoding failed');encoder=null;
  const small=join(output,`search-labs-${clip.name}-sync-1280.mp4`);
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',full,'-vf','scale=1280:800','-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',small]);
  if(errors.length)throw Error(errors.join('\n'));
  console.log(`${clip.name} complete: ${sourceDuration}s scene, ${count/fps}s export, ${period}s native GIF cycle`);
  await writeFile(join(output,`search-labs-${clip.name}-sync-render.json`),JSON.stringify({source:clip.file,sourceSha256:sha(sources.get('/'+clip.file)),gifSha256:sha(beaker),gifFrames:starts.length,gifPeriod:period,sourceDuration,exportDuration:count/fps,fps,videoSha256:sha(await readFile(full))},null,2)+'\n');
  await page.close();
 }
}finally{
 encoder?.stdin.destroy();encoder?.kill('SIGTERM');await browser.close();await new Promise(resolve=>server.close(resolve));await rm(temporary,{recursive:true,force:true});
}
