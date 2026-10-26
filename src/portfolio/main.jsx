import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Realm from './Realm.jsx';
import { projects, chapters } from './projects.js';
import './portfolio.css';

const Arrow=()=> <svg className="arrow-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10" stroke="currentColor" strokeWidth="1"/></svg>;
function Compass({className=''}){return <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth=".65"/><path d="m20 1 3.5 15.5L39 20l-15.5 3.5L20 39l-3.5-15.5L1 20l15.5-3.5L20 1Z" stroke="currentColor" strokeWidth=".8"/><path d="m20 7 2.3 10.7L33 20l-10.7 2.3L20 33l-2.3-10.7L7 20l10.7-2.3L20 7Z" fill="currentColor"/><path d="m9 9 7 7m8 8 7 7M31 9l-7 7M16 24l-7 7" stroke="currentColor" strokeWidth=".65"/></svg>}
function ProjectVisual({project}){
  return <div className={`project-visual ${project.theme}`} aria-hidden="true">
    <div className="art-grid"/><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
    {project.motif==='path'&&<><div className="mock-browser"><div className="mock-top"><i/><i/><i/><span>EXPLORER</span><b>+</b></div><div className="mock-content"><div className="mock-sidebar"><span className="mini-mark"><Compass/></span><i/><i/><i/><i/></div><div className="mock-main"><small>A NEW PERSPECTIVE</small><strong>Find your<br/>way forward.</strong><div className="mock-map"><svg viewBox="0 0 260 95"><path d="M0 80Q60-10 95 50T170 30T270 20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="4 4"/><circle cx="95" cy="50" r="5" fill="currentColor"/><circle cx="230" cy="26" r="4" fill="currentColor"/></svg><span className="map-label">YOUR NEXT CHAPTER ↗</span></div></div></div></div><span className="art-caption">MAKE THE COMPLEX FEEL SIMPLE</span></>}
    {project.motif==='system'&&<><div className="system-panel back-panel"><span>THE BIG PICTURE</span><div className="system-lines"><i/><i/><i/></div></div><div className="system-panel front-panel"><span className="system-heading">Everything, connected.<b><Compass/></b></span><div className="node-flow"><span>01</span><i/><span>02</span><i/><span>03</span></div><div className="system-lower"><div><small>THOUGHTFUL BY DESIGN</small><i/><i/></div><div className="check-disc">✓</div></div></div><span className="art-caption">THE DETAILS MAKE THE DIFFERENCE</span></>}
    {project.motif==='player'&&<><div className="player-card"><div className="player-head"><span>PLAYER ONE</span><i>●</i></div><div className="player-symbol"><Compass/></div><strong>Your next<br/>adventure awaits.</strong><div className="player-progress"><i/></div><span className="player-bottom">READY WHEN YOU ARE <b>↗</b></span></div><div className="player-mini"><span>✧</span><div>THE HUMAN ELEMENT<small>Always at the center.</small></div></div><span className="art-caption">PEOPLE FIRST. ALWAYS.</span></>}
  </div>;
}
function CaseStudy({project,onClose}){
  const dialog=useRef(null);
  useEffect(()=>{const el=dialog.current;el.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[]);
  const [chapter,setChapter]=useState(0);
  return <dialog ref={dialog} className="case-dialog" onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose();}} aria-labelledby="case-title">
    <div className="case-shell"><div className="case-toolbar"><span className="mono">FIELD NOTES / {project.id}</span><button onClick={onClose} className="close-button" aria-label="Close case study">CLOSE <span>×</span></button></div>
    <div className="case-header"><span className="eyebrow">CASE STUDY SCAFFOLD · CONTENT TO COME</span><h2 id="case-title">{project.title}</h2><p>{project.description}</p></div>
    <ProjectVisual project={project}/>
    <div className="case-story"><nav aria-label="Case study chapters">{chapters.map((item,i)=><button key={item.title} onClick={()=>setChapter(i)} aria-current={chapter===i?'step':undefined}><span>0{i+1}</span>{item.title}<span>↗</span></button>)}</nav><article key={chapter}><span className="eyebrow">CHAPTER 0{chapter+1} / 05</span><h3>{chapters[chapter].prompt}</h3><p>{chapters[chapter].evidence}</p><div className="evidence-placeholder"><span>+</span><p>A place for the evidence.<small>Research, sketches, interfaces, and the story behind them.</small></p></div><div className="chapter-pagination"><span className="mono">A CLEAR STORY, ONE CHAPTER AT A TIME</span><button onClick={()=>setChapter((chapter+1)%chapters.length)}>{chapter===4?'Back to overview':'Next chapter'} ↗</button></div></article></div>
    </div>
  </dialog>;
}
function About({onClose}){
  const dialog=useRef(null);
  useEffect(()=>{dialog.current.showModal();},[]);
  return <dialog ref={dialog} className="about-dialog" onCancel={onClose} aria-labelledby="about-title"><button className="about-close" onClick={onClose} aria-label="Close about">×</button><Compass className="about-compass"/><span className="eyebrow">A FEW WORDS FROM THE DESIGNER</span><h2 id="about-title">Curious by nature.<br/><em>Designer by choice.</em></h2><p>I’m Josh Lucas, a product and UX designer. This is the beginning of a new home for my work: a place for thoughtful case studies, small experiments, and a little imagination.</p><p>Outside the screen, my interests span fantasy worlds, games, tennis, and RISO printing. You’ll find traces of them here.</p><a className="text-link" href="/pond.html">Visit the frog pond <Arrow/></a></dialog>;
}
function App(){
  const reducedMotion=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const [paused,setPaused]=useState(reducedMotion),[sound,setSound]=useState(false),[selected,setSelected]=useState(null),[about,setAbout]=useState(false),[menu,setMenu]=useState(false);
  const audio=useRef(null),wind=useRef(null);
  const chime=useCallback(()=>{
    const context=audio.current;if(!context||context.state!=='running')return;
    [392,587.33,783.99].forEach((f,i)=>{const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=f;const start=context.currentTime+i*.07;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.025,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+1);osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+1.1);});
  },[]);
  const toggleSound=async()=>{
    if(sound){await audio.current?.suspend();setSound(false);return;}
    try{
      const context=audio.current??new (window.AudioContext||window.webkitAudioContext)();audio.current=context;
      if(!wind.current){
        const buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate),data=buffer.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.04-.02)/1.02;data[i]=previous;}
        const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=480;gain.gain.value=.12;source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();wind.current=source;
      }
      await context.resume();setSound(true);chime();
    }catch{setSound(false);}
  };
  useEffect(()=>{const onKey=e=>{if(e.code==='Space'&&!selected&&!about&&e.target===document.body){e.preventDefault();setPaused(p=>!p);}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[selected,about]);
  useEffect(()=>()=>{audio.current?.close();},[]);
  return <><a className="skip-link" href="#work">Skip to selected work</a><div className="site-wrap">
    <header className="site-header"><a className="brand" href="#" aria-label="Josh Lucas home"><Compass/><span>Josh Lucas<span className="brand-slash">/</span><small>PRODUCT DESIGNER</small></span></a><button className="menu-toggle" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-controls="main-nav">{menu?'Close −':'Menu +'}</button><nav id="main-nav" className={menu?'nav-open':''} aria-label="Main navigation"><a href="#work" onClick={()=>setMenu(false)} className="nav-active">Selected work</a><button onClick={()=>{setAbout(true);setMenu(false);}}>A little about me</button><a href="#contact" onClick={()=>setMenu(false)}>Say hello <Arrow/></a></nav><span className="header-note"><span className="status-dot"/> CURIOSITY IS THE COMPASS</span></header>
    <main><section className="hero" aria-labelledby="hero-title"><Realm paused={paused} reducedMotion={reducedMotion} onRipple={chime}/><div className="hero-copy"><div className="eyebrow"><span className="short-rule"/> STRATEGY. SYSTEMS. A LITTLE MAGIC.</div><h1 id="hero-title">A little imagination.<br/>A lot of <em>intention.</em></h1><p>I’m Josh, a product designer finding the human<br className="desktop-break"/> side of complex problems. And making the<br className="desktop-break"/> journey a little more interesting.</p><div className="hero-actions"><a className="primary-button" href="#work">Explore my work <span className="down-arrow"><Arrow/></span></a><button className="hero-about" onClick={()=>setAbout(true)}>Meet the adventurer <Arrow/></button></div><div className="hero-footnote"><span className="asterisk"><Compass/></span><span>Good design feels intuitive.<br/>Great design makes you feel something.</span></div></div><div className="realm-note"><span>FIG. 01 — A MIND THAT WANDERS</span><div className="note-rule"/><span>THERE’S ALWAYS MORE TO EXPLORE.</span></div><div className="hero-bottom"><div><span className="tiny-cross">+</span> A SMALL WORLD. A FEW BIG IDEAS.</div><div className="realm-controls"><button onClick={toggleSound} aria-pressed={sound} aria-label="Toggle ambient sound"><span aria-hidden="true">{sound?'♫':'♩'}</span> SOUND {sound?'ON':'OFF'}</button><span className="control-rule"/><button onClick={()=>setPaused(!paused)} aria-pressed={paused} aria-label="Pause dragon animation"><span aria-hidden="true">{paused?'>':'||'}</span> {paused?'RESUME':'PAUSE'}</button></div></div></section>
    <section id="work" className="work-section" aria-labelledby="work-title"><div className="section-top"><div><span className="eyebrow">01 / SELECTED WORK</span><h2 id="work-title">Every project has a story.</h2></div><p>A few challenges. Some considered decisions.<br/>A better experience on the other side.</p></div><div className="project-grid">{projects.map(p=><button className="project-card" key={p.id} onClick={()=>setSelected(p)} aria-label={`Explore case study ${p.id}: ${p.title}`}><div className="project-image"><ProjectVisual project={p}/><span className="project-open" aria-hidden="true"><Arrow/></span></div><div className="project-meta"><span>CHAPTER {p.id}</span><span>CASE STUDY SCAFFOLD</span></div><h3>{p.title}</h3><span className="project-category">{p.category}</span></button>)}</div><div className="work-bottom"><span>THE STORIES ARE TAKING SHAPE. THESE ARE THE FIRST PAGES.</span><a href="/pond.html">A side quest: the frog pond <Arrow/></a></div></section>
    <section id="contact" className="contact-section"><div className="contact-art" aria-hidden="true"><Compass/><span>THE NEXT CHAPTER</span></div><div><span className="eyebrow">GOOD WORK STARTS WITH A CONVERSATION</span><h2>What shall we<br/><em>make next?</em></h2><p>This portfolio is a work in progress.<br/>You can find my current work and contact details here.</p><a className="text-link" href="https://joshglucas.com" target="_blank" rel="noreferrer">Visit my current portfolio <Arrow/></a></div><span className="contact-coordinate">IMAGINATION × INTENTION</span></section></main>
    <footer className="site-footer"><span>© {new Date().getFullYear()} JOSH LUCAS</span><span>BUILT WITH CARE. AND A LITTLE CURIOSITY.</span><a href="#">Back to the top ↑</a></footer></div>{selected&&<CaseStudy project={selected} onClose={()=>setSelected(null)}/>} {about&&<About onClose={()=>setAbout(false)}/>}</>;
}
createRoot(document.getElementById('root')).render(<App/>);
