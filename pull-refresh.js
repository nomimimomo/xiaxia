// Scroll normally until the lower boundary; then show resistance and release feedback.
export function installPullRefresh(root,{key,busy,refresh,error,log}){
 let g=null;
 const reset=()=>{if(g){g.el.style.removeProperty('--shr-pull');const h=g.el.querySelector('.shr-pull-hint');if(h){h.textContent='上拉刷新 · 也可点此刷新';h.classList.remove('ready');}}g=null;};
 root.addEventListener('touchstart',e=>{reset();const el=e.target.closest('[data-pull-refresh]');if(!el||e.touches.length!==1||busy())return;const t=e.touches[0];g={el,x:t.clientX,y:t.clientY,anchor:el.scrollHeight-el.scrollTop-el.clientHeight<=8?t.clientY:null,distance:0,type:el.dataset.pullRefresh,key:key()};},{passive:true});
 root.addEventListener('touchmove',e=>{if(!g)return;if(e.touches.length!==1||!g.el.isConnected||g.key!==key()){reset();return;}const t=e.touches[0];if(Math.abs(t.clientX-g.x)>50){reset();return;}const bottom=g.el.scrollHeight-g.el.scrollTop-g.el.clientHeight<=8;if(!bottom){g.anchor=null;g.distance=0;return;}if(g.anchor===null)g.anchor=t.clientY;g.distance=Math.max(0,g.anchor-t.clientY);if(g.distance>0){if(e.cancelable)e.preventDefault();g.el.style.setProperty('--shr-pull',Math.min(72,g.distance*.5)+'px');const h=g.el.querySelector('.shr-pull-hint');if(h){h.textContent=g.distance>=55?'松开刷新':'继续上拉刷新';h.classList.toggle('ready',g.distance>=55);}}},{passive:false});
 root.addEventListener('touchend',()=>{const current=g;reset();if(!current||current.distance<55||!current.el.isConnected||current.key!==key()||busy())return;log('feed.pull',{operation:current.type});Promise.resolve(refresh(current.type)).catch(error);},{passive:true});
 root.addEventListener('touchcancel',reset,{passive:true});
}
