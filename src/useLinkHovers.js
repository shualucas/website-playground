import {useEffect} from 'react';
import {inkStampFrames,inkImpressionFrames} from './ink-stamp';

// Keep the photo/project effects separate from these native navigation controls.
const targets='.profile-links a,.case-study-nav a,.case-study-nav button:not(.theme-toggle),.zine-header a,.zine-header button:not(.theme-toggle),.resume-home-link,.resume-page-back';

/** Print registration marks for navigation; two-pass ink impressions for the footer. */
export function useLinkHovers(){
 useEffect(()=>{
  const pointer=matchMedia('(hover:hover) and (pointer:fine)'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const links=new Set(),marks=new Map(),groups=new Map(),stamps=new Map(),stampAnimations=new Map(),impressions=new Map(),impressionAnimations=new Map();
  let hovered=null,focused=null,current=null,currentDot=null;
  const size=new ResizeObserver(()=>place());
  const mode=host=>{const preview=new URLSearchParams(location.search).get('hover');return ['marks','dot','stamp'].includes(preview)?preview:host.closest('.profile-links')?'impression':'marks'};
  const allowed=host=>host?.isConnected&&!host.closest('[inert],[hidden],[aria-hidden="true"]')&&!host.matches(':disabled');
  const label=host=>host.querySelector('.link-copy')||host.querySelector(':scope > span:not(.control-hover-indicator)')||host.querySelector('svg')||host;
  const markFor=host=>{
   let marker=marks.get(host);if(marker)return marker;
   marker=document.createElement('span');marker.className='registration-marks control-hover-indicator';marker.setAttribute('aria-hidden','true');
   for(let i=0;i<4;i++)marker.append(document.createElement('i'));
   host.append(marker);marks.set(host,marker);return marker;
  };
  const stampFor=host=>{
   let stamp=stamps.get(host);if(stamp)return stamp;
   stamp=document.createElement('span');stamp.className='ink-stamp control-hover-indicator';stamp.setAttribute('aria-hidden','true');host.append(stamp);stamps.set(host,stamp);return stamp;
  };
  const printStamp=(host,entering)=>{
   const stamp=stampFor(host),old=stampAnimations.get(host);
   const motion=stamp.animate(inkStampFrames(entering),{duration:reduce.matches?0:entering?190:130,easing:'linear',fill:'both'});old?.cancel();stampAnimations.set(host,motion);
   stamp.dataset.state=entering?'printing':'dissolving';
   motion.finished.then(()=>{if(stampAnimations.get(host)===motion)stamp.dataset.state=entering?'printed':'hidden'}).catch(()=>{});
  };
  const impressionFor=host=>{
   let plate=impressions.get(host);if(plate)return plate;
   plate=document.createElement('span');plate.className='ink-impression control-hover-indicator';plate.setAttribute('aria-hidden','true');
   for(const pass of ['echo','face']){const layer=document.createElement('i');layer.className='ink-impression-'+pass;plate.append(layer)}
   host.append(plate);impressions.set(host,plate);return plate;
  };
  const printImpression=(host,entering)=>{
   const plate=impressionFor(host),frames=inkImpressionFrames(parseFloat(plate.style.width),parseFloat(plate.style.height),entering);
   impressionAnimations.get(host)?.forEach(animation=>animation.cancel());
   const animations=[...plate.children].map(layer=>layer.animate(frames,{duration:reduce.matches?0:entering?220:140,easing:'linear',fill:'both'}));
   impressionAnimations.set(host,animations);plate.dataset.state=entering?'printing':'dissolving';
   Promise.all(animations.map(animation=>animation.finished)).then(()=>{if(impressionAnimations.get(host)===animations)plate.dataset.state=entering?'printed':'hidden'}).catch(()=>{});
  };
  const dotFor=host=>{
   const group=host.closest('.profile-links,.case-study-nav-inner,.zine-header,.resume-back-nav')||host.parentElement;
   let state=groups.get(group);if(state)return state;
   const position=group.style.position;
   if(getComputedStyle(group).position==='static')group.style.position='relative';
   const dot=document.createElement('span');dot.className='traveling-dot control-hover-indicator';dot.setAttribute('aria-hidden','true');dot.dataset.active='false';group.append(dot);
   state={group,dot,position,placed:false};groups.set(group,state);return state;
  };
  function place(){
   if(!allowed(current))return;
   const ink=current.dataset.hoverColor||current.dataset.ditherColor||'var(--ui-text)',copy=label(current),rect=copy.getBoundingClientRect();
   current.style.setProperty('--control-ink',ink);
   if(current.dataset.hoverKind==='impression'){
    const host=current.getBoundingClientRect(),plate=impressionFor(current);
    Object.assign(plate.style,{left:rect.left-host.left-7+'px',top:rect.top-host.top-5+'px',width:rect.width+14+'px',height:rect.height+10+'px'});
   }else if(current.dataset.hoverKind==='marks'){
    const host=current.getBoundingClientRect(),marker=markFor(current);
    Object.assign(marker.style,{left:rect.left-host.left-6+'px',top:rect.top-host.top-4+'px',width:rect.width+12+'px',height:rect.height+8+'px'});
   }else if(current.dataset.hoverKind==='stamp'){
    const host=current.getBoundingClientRect(),stamp=stampFor(current);
    Object.assign(stamp.style,{left:rect.left-host.left-15+'px',top:rect.top-host.top+rect.height/2-6+'px'});
   }else{
    const state=dotFor(current),bounds=state.group.getBoundingClientRect(),x=rect.left-bounds.left-9,y=rect.top-bounds.top+rect.height/2;
    if(currentDot&&currentDot!==state.dot)currentDot.dataset.active='false';currentDot=state.dot;
    state.dot.style.setProperty('--control-ink',ink);
    if(!state.placed)state.dot.style.transition='none';
    state.dot.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
    if(!state.placed){state.dot.getBoundingClientRect();state.dot.style.transition='';state.placed=true}
    state.dot.dataset.active='true';state.dot.dataset.for=current.textContent.trim();
   }
  }
  const update=()=>{
   const next=!document.hidden&&(allowed(hovered)?hovered:allowed(focused)?focused:null);
   const changed=current!==next;
   if(changed){
    if(current?.isConnected&&current.dataset.hoverKind==='stamp')printStamp(current,false);
    if(current?.isConnected&&current.dataset.hoverKind==='impression')printImpression(current,false);
    if(current)current.dataset.hoverActive='false';if(currentDot)currentDot.dataset.active='false';size.disconnect();current=next||null;
    if(current){current.dataset.hoverKind=mode(current);current.dataset.hoverActive='true';size.observe(current);const copy=label(current);if(copy!==current)size.observe(copy)}
   }
   if(current){place();if(changed&&current.dataset.hoverKind==='stamp')printStamp(current,true);if(changed&&current.dataset.hoverKind==='impression')printImpression(current,true)}
  };
  const scan=()=>{
   const preview=new URLSearchParams(location.search).get('hover');document.documentElement.dataset.linkHover=['marks','dot','stamp'].includes(preview)?preview:'mixed';
   for(const link of document.querySelectorAll(targets))if(!links.has(link)){links.add(link);link.classList.add('control-hover-target');link.dataset.hoverKind=mode(link);link.dataset.hoverActive='false'}
   for(const link of links)if(!link.isConnected){marks.get(link)?.remove();marks.delete(link);stampAnimations.get(link)?.cancel();stampAnimations.delete(link);stamps.get(link)?.remove();stamps.delete(link);impressionAnimations.get(link)?.forEach(animation=>animation.cancel());impressionAnimations.delete(link);impressions.get(link)?.remove();impressions.delete(link);links.delete(link)}
   for(const [group,state] of groups)if(!group.isConnected){state.dot.remove();groups.delete(group)}
   if(current&&current.dataset.hoverKind!==mode(current)){current.dataset.hoverActive='false';current=null}
   update();
  };
  const over=event=>{if(event.pointerType==='touch'||!pointer.matches)return;const next=event.target.closest(targets);if(next&&next!==hovered){hovered=next;update()}};
  const out=event=>{if(hovered?.contains(event.target)&&!hovered.contains(event.relatedTarget)){hovered=null;update()}};
  const focus=event=>{focused=event.target.closest(targets);if(!focused?.matches(':focus-visible'))focused=null;update()};
  const blur=event=>{if(focused?.contains(event.target)&&!focused.contains(event.relatedTarget)){focused=null;update()}};
  const preference=()=>{if(!pointer.matches)hovered=null;update()};
  const visibility=()=>{if(document.hidden)hovered=null;update()};
  const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});scan();
  document.addEventListener('pointerover',over);document.addEventListener('pointerout',out);document.addEventListener('focusin',focus);document.addEventListener('focusout',blur);document.addEventListener('visibilitychange',visibility);
  window.addEventListener('resize',place);window.addEventListener('popstate',scan);pointer.addEventListener('change',preference);reduce.addEventListener('change',preference);
  return()=>{
   observer.disconnect();size.disconnect();stampAnimations.forEach(animation=>animation.cancel());stamps.forEach(stamp=>stamp.remove());impressionAnimations.forEach(animations=>animations.forEach(animation=>animation.cancel()));impressions.forEach(plate=>plate.remove());marks.forEach(marker=>marker.remove());groups.forEach(state=>{state.dot.remove();state.group.style.position=state.position});
   links.forEach(link=>{link.classList.remove('control-hover-target');delete link.dataset.hoverKind;delete link.dataset.hoverActive;link.style.removeProperty('--control-ink')});
   document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',blur);document.removeEventListener('visibilitychange',visibility);
   window.removeEventListener('resize',place);window.removeEventListener('popstate',scan);pointer.removeEventListener('change',preference);reduce.removeEventListener('change',preference);
   delete document.documentElement.dataset.linkHover;
  };
 },[]);
}
