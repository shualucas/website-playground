import {useEffect} from 'react';

// Keep the photo/project effects separate from these native navigation controls.
const targets='.profile-links a,.case-study-nav a,.case-study-nav button:not(.theme-toggle),.zine-header a,.zine-header button:not(.theme-toggle),.resume-home-link,.resume-page-back';

/** Navigation uses print registration marks; footer links share one traveling dot. */
export function useLinkHovers(){
 useEffect(()=>{
  const pointer=matchMedia('(hover:hover) and (pointer:fine)'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const links=new Set(),marks=new Map(),groups=new Map();
  let hovered=null,focused=null,current=null,currentDot=null;
  const size=new ResizeObserver(()=>place());
  const mode=host=>{const preview=new URLSearchParams(location.search).get('hover');return ['marks','dot'].includes(preview)?preview:host.closest('.profile-links')?'dot':'marks'};
  const allowed=host=>host?.isConnected&&!host.closest('[inert],[hidden],[aria-hidden="true"]')&&!host.matches(':disabled');
  const label=host=>host.querySelector('.link-copy')||host.querySelector(':scope > span')||host;
  const markFor=host=>{
   let marker=marks.get(host);if(marker)return marker;
   marker=document.createElement('span');marker.className='registration-marks control-hover-indicator';marker.setAttribute('aria-hidden','true');
   for(let i=0;i<4;i++)marker.append(document.createElement('i'));
   host.append(marker);marks.set(host,marker);return marker;
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
   if(current.dataset.hoverKind==='marks'){
    const host=current.getBoundingClientRect(),marker=markFor(current);
    Object.assign(marker.style,{left:rect.left-host.left-6+'px',top:rect.top-host.top-4+'px',width:rect.width+12+'px',height:rect.height+8+'px'});
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
   if(current!==next){
    if(current)current.dataset.hoverActive='false';if(currentDot)currentDot.dataset.active='false';size.disconnect();current=next||null;
    if(current){current.dataset.hoverKind=mode(current);current.dataset.hoverActive='true';size.observe(current);const copy=label(current);if(copy!==current)size.observe(copy)}
   }
   if(current)place();
  };
  const scan=()=>{
   const preview=new URLSearchParams(location.search).get('hover');document.documentElement.dataset.linkHover=['marks','dot'].includes(preview)?preview:'mixed';
   for(const link of document.querySelectorAll(targets))if(!links.has(link)){links.add(link);link.classList.add('control-hover-target');link.dataset.hoverKind=mode(link);link.dataset.hoverActive='false'}
   for(const link of links)if(!link.isConnected){marks.get(link)?.remove();marks.delete(link);links.delete(link)}
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
   observer.disconnect();size.disconnect();marks.forEach(marker=>marker.remove());groups.forEach(state=>{state.dot.remove();state.group.style.position=state.position});
   links.forEach(link=>{link.classList.remove('control-hover-target');delete link.dataset.hoverKind;delete link.dataset.hoverActive;link.style.removeProperty('--control-ink')});
   document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',blur);document.removeEventListener('visibilitychange',visibility);
   window.removeEventListener('resize',place);window.removeEventListener('popstate',scan);pointer.removeEventListener('change',preference);reduce.removeEventListener('change',preference);
   delete document.documentElement.dataset.linkHover;
  };
 },[]);
}
