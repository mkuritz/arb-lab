(()=>{'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls={get:(k,d)=>{try{const v=localStorage.getItem('arb.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem('arb.'+k,JSON.stringify(v))}catch(e){}}};
const D={};
const S={
 page:'overview',
 sport:ls.get('sport','all'),
 sort:ls.get('sort','profit'),
 bankroll:ls.get('bankroll',1000),
 kelly:ls.get('kelly',0.25),
 bank:ls.get('bank',100),
 scanTab:ls.get('scanTab','arbs'),
 edgeTab:ls.get('edgeTab','all'),
 fb:ls.get('fb',25),
 boost:ls.get('boost',25),
 bstake:ls.get('bstake',25),
 nsr:ls.get('nsr',70)
};
const PAGES=[['overview','Dashboard','◎'],['compare','Market Compare','⇄'],['bvm','Book vs Market','⚖'],['arbs','Arb Scanner','⚡'],['calc','Stake Calculator','∑'],['promos','Promo Tracker','★'],['convert','Promo Converter','↻'],['edges','Edges & Middles','△'],['method','How it works & caveats','ⓘ']];
const SPORTS=[['all','All'],['nfl','NFL'],['ncaaf','CFB'],['nhl','NHL'],['nba','NBA'],['mlb','MLB']];
const KELLY_OPTS=[[0.25,'0.25x'],[0.5,'0.5x'],[1,'1.0x'],['flat','Flat']];
const LOGO=`<svg width="30" height="30" viewBox="0 0 34 34"><rect x="1" y="1" width="32" height="32" rx="8" fill="#121c2a" stroke="#22d3ee" stroke-opacity=".5"/><path d="M8 22l6-10 6 6 6-9" stroke="#22d3ee" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 26h18" stroke="#5ed26a" stroke-width="2" stroke-linecap="round"/></svg>`;
const pct=(x,d=1)=>x==null||isNaN(x)?'—':(x*100).toFixed(d)+'%';
const usd=x=>x==null||isNaN(x)?'—':(x<0?'-$':'$')+Math.abs(x).toFixed(2);
const amer=d=>!d?'—':d>=2?'+'+Math.round((d-1)*100):String(Math.round(-100/(d-1)));
const et=s=>{try{return new Date(s).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET'}catch(e){return s}};
const ago=s=>{const m=(Date.now()-new Date(s))/6e4;return m<1?'just now':m<60?Math.round(m)+' min ago':m<1440?(m/60).toFixed(1)+' h ago':Math.round(m/1440)+' d ago'};
const vname=v=>v;
const vchip=v=>`<span class="chip ${v==='Exchange A'?'k':v==='Exchange B'?'p':/^Exchange /.test(v||'')?'k':v==='Sharp book'||v==='Book Y'||v==='Book X'||v==='Book M'?'p':'b'}">${esc(vname(v))}</span>`;
const isoET=t=>String(t||'').replace(/\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:?\d\d)?/g,m=>et(m));
const legPx=l=>l.type==='book'||l.dec?`${l.am||amer(l.dec)} (${(l.dec||0).toFixed(3)})`:`${Math.round(l.price*100)}¢ + fee`;
const sf=x=>S.sport==='all'||x.sport===S.sport;
const empty=(t,b)=>`<div class="empty"><b>${esc(t)}</b>${b||''}</div>`;

async function load(){
 const f=n=>fetch('data/'+n+'?t='+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null);
 [D.m,D.a,D.p,D.o,D.meta,D.e]=await Promise.all(['markets.json','arbs.json','promos.json','overlap.json','meta.json','edges.json'].map(f));
 D.e=D.e||{middles:[],outliers:[],stale:[],priced_in:[],clv:{}};
 cleanArbs();route();
}

/* Honesty filter: Moneyline arbs checked against markets.json 3+ venues and lone-outlier log-odds gap;
   Spread/Total arbs require books_n >= 3 from engine multi-book scan. */
function cleanArbs(){
 const byId={},byName={};
 (D.m.games||[]).forEach(g=>{byId[g.id]=g;byName[(g.sport||'')+'|'+(g.name||'').toLowerCase()]=g});
 const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
 const ok=a=>{
  if(a.market&&a.market!=='Moneyline')return (a.books_n||4)>=3;
  const g=byId[a.id]||byName[(a.sport||'')+'|'+(a.game||'').toLowerCase()];
  if(!g)return (a.books_n||0)>=3;
  const V=g.venues||{};if(Object.keys(V).length<3)return false;
  return a.legs.every(l=>{
   const side=l.side==='home'||l.side==='away'?l.side:(l.side==='a'?'home':'away');
   const me=V[l.venue];const others=Object.entries(V).filter(([k])=>k!==l.venue).map(([,x])=>x[side]).filter(x=>x!=null);
   if(!me||me[side]==null||others.length<2)return true;
   const p=me[side];
   const lg=x=>Math.log(Math.min(Math.max(x,1e-4),1-1e-4)/(1-Math.min(Math.max(x,1e-4),1-1e-4)));
   return !(Math.abs(lg(p)-lg(med(others)))>=.3&&others.every(o=>Math.abs(lg(o)-lg(p))>=.15))
  });
 };
 D.a.raw=(D.a.arbs||[]).length;
 D.a.arbs=(D.a.arbs||[]).filter(ok);
 D.a.near=(D.a.near||[]).filter(ok);
 D.m.games=(D.m.games||[]).map(g=>Object.keys(g.venues||{}).length>=3?g:{...g,gap:0,thin:true});
}

const FREE_ARBS=2,isFree=()=>document.documentElement.getAttribute('data-sl-tier')==='free';
new MutationObserver(()=>{if(D.a&&typeof route==='function')route()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-sl-tier']});
const arbCount=n=>isFree()&&n>FREE_ARBS?`${FREE_ARBS} free · ${n-FREE_ARBS} with Pro`:String(n);

/* ---------- SVG sparkline & line-movement helpers ---------- */
function sparkSvg(arr,color='#22d3ee',w=48,h=15){
 if(!Array.isArray(arr)||arr.length<2)return '';
 const lo=Math.min(...arr),hi=Math.max(...arr),rng=hi-lo;
 const pts=arr.map((v,i)=>{
  const x=(i/(arr.length-1))*w;
  const y=rng<1e-6?h/2:h-2-((v-lo)/rng)*(h-4);
  return `${x.toFixed(1)},${y.toFixed(1)}`;
 }).join(' ');
 const last=pts.split(' ').pop().split(',');
 return `<span class="spark" title="Line history (${arr.length} snapshots)"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/><circle cx="${last[0]}" cy="${last[1]}" r="2.1" fill="${color}"/></svg></span>`;
}

function moveBadge(mv){
 if(!mv)return '';
 const parts=[];
 if(mv.steam)parts.push(`<span class="chip w" title="${esc(mv.summary||'Multi-book line movement')}">🔥 Steam</span>`);
 const spk=mv.spark_spread&&mv.spark_spread.length>=2?mv.spark_spread:(mv.spark_total&&mv.spark_total.length>=2?mv.spark_total:mv.spark_prob);
 const col=mv.steam?'#f5b942':'#22d3ee';
 if(mv.summary)parts.push(`<span class="small muted">${sparkSvg(spk,col)} ${esc(mv.summary)}</span>`);
 else if(spk&&spk.length>=2)parts.push(sparkSvg(spk,col));
 return parts.join(' ');
}

/* ---------- Persistent Bankroll & Fractional Kelly Sizer ---------- */
function kellyStake(item){
 const bk=Math.max(10,+S.bankroll||1000);
 if(S.kelly==='flat'){
  const st=Math.max(1,Math.min(bk*0.05,+S.bank||100));
  return {stake:st,pct:st/bk,evDollar:st*(item.ev||item.ev_pct||0),mode:'Flat'};
 }
 const mult=+S.kelly||0.25;
 const p=item.fair||0.5;
 const cost=item.cost||(item.dec?1/item.dec:0.5);
 const effDec=1/cost;
 const b=effDec-1;
 let f=0;
 if(item.kelly_quarter!=null&&mult===0.25)f=item.kelly_quarter;
 else if(item.kelly_half!=null&&mult===0.5)f=item.kelly_half;
 else if(item.kelly_full!=null&&mult===1)f=item.kelly_full;
 else if(b>0)f=Math.max(0,(p*b-(1-p))/b)*mult;
 const cap=mult===1?0.05:mult===0.5?0.035:0.025;
 const pctBk=Math.max(0,Math.min(cap,f));
 const stake=Math.round(bk*pctBk*100)/100;
 return {stake,pct:pctBk,evDollar:stake*(item.ev||item.ev_pct||0),mode:`${mult}x Kelly`};
}

function bankrollBar(){
 return `<div class="bk-bar" id="bkBar">
  <div class="bk-group">
   <label class="bk-lbl">Bankroll ($)<input class="bk-inp" id="gBankroll" type="number" min="50" step="50" value="${S.bankroll}"></label>
   <div class="bk-lbl">Kelly Sizing <div class="seg" id="gKellySeg">${KELLY_OPTS.map(k=>`<button type="button" data-kelly="${k[0]}" aria-pressed="${String(S.kelly)===String(k[0])}">${k[1]}</button>`).join('')}</div></div>
  </div>
  <div class="bk-group">
   <label class="bk-lbl">Arb / Middle Stake ($)<input class="bk-inp" id="gArbStake" type="number" min="10" step="10" value="${S.bank}"></label>
   <span class="small muted">Auto-calculates exact $ stakes & 2-leg splits</span>
  </div>
 </div>`;
}

function bindBankrollBar(){
 const br=$('#gBankroll'),as=$('#gArbStake');
 if(br)br.onchange=e=>{S.bankroll=Math.max(10,+e.target.value||1000);ls.set('bankroll',S.bankroll);route()};
 if(as)as.onchange=e=>{S.bank=Math.max(1,+e.target.value||100);ls.set('bank',S.bank);route()};
 document.querySelectorAll('#gKellySeg [data-kelly]').forEach(b=>b.onclick=()=>{
  const v=b.dataset.kelly;S.kelly=v==='flat'?'flat':+v;ls.set('kelly',S.kelly);route();
 });
 document.querySelectorAll('[data-hedge-btn]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.hedgeBtn,box=document.getElementById('hbox-'+id);
  if(box)box.classList.toggle('open');
 });
 document.querySelectorAll('[data-hedge-l1]').forEach(inp=>inp.oninput=e=>{
  const id=inp.dataset.hedgeL1,c1=+inp.dataset.c1,c2=+inp.dataset.c2,s1=Math.max(0,+e.target.value||0);
  const pay1=s1/c1,s2=pay1*c2,tot=s1+s2,prof=pay1-tot;
  const out=document.getElementById('hout-'+id);
  if(out)out.innerHTML=`Leg 2 Hedge: <b>${usd(s2)}</b> · Total Staked: <b>${usd(tot)}</b> ·Equalized Payout: <b>${usd(pay1)}</b> · Net: <b class="${prof>=0?'pos':'warn'}">${ (prof>=0?'+':'')+usd(prof) } (${pct(prof/(tot||1),2)})</b>`;
 });
}

function shell(){
 const cur=PAGES.find(p=>p[0]===S.page)||PAGES[0];
 const mCount=((D.e||{}).middles||[]).length;
 const eCount=((D.e||{}).outliers||[]).length;
 $('#app').innerHTML=`<aside class="sidebar" id="sidebar"><div class="brand">${LOGO}<div><div class="brand-name">Arb Lab</div><div class="brand-sub">Arbs · Middles · +EV</div></div></div>
 <nav class="nav"><div class="nav-label">Scanner</div>${PAGES.slice(0,5).map(p=>navb(p,p[0]==='arbs'&&mCount?`${mCount} mid`:'')).join('')}<div class="nav-label">Promos</div>${PAGES.slice(5,7).map(p=>navb(p,'')).join('')}<div class="nav-label">More</div>${PAGES.slice(7).map(p=>navb(p,p[0]==='edges'&&(mCount+eCount)?`${mCount+eCount}`:'')).join('')}
 <a class="nav-btn" href="https://betlab.sportslabshq.com/" style="text-decoration:none"><span class="ic">↗</span>Bet Lab</a><a class="nav-btn" href="https://sportslabshq.com/" style="text-decoration:none"><span class="ic">↗</span>Sports Labs</a></nav>
 <div class="sidebar-foot">Sportsbook and exchange lines<br>Prices are a snapshot, not live. Re-check every price before you place anything. Not financial advice. Bet and trade responsibly; 21+ where legal.</div></aside>
 <header class="header"><button class="btn ghost menu-btn" id="menuBtn" aria-label="Menu">☰</button><div><h1>${esc(cur[1])}</h1><div class="crumb">${D.meta?'Data updated '+esc(ago(D.meta.updated))+' · '+esc(et(D.meta.updated)):'Loading…'}</div></div>
 <div class="header-actions"><button class="btn sm" id="goMiddlesBtn" title="Jump to Middles Scanner">🎯 Middles (${mCount})</button><a class="btn sm hide-m" href="#method">Caveats</a></div></header>
 <main class="main" id="main"></main>`;
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.page;document.body.classList.remove('sidebar-open')});
 document.querySelectorAll('[data-sport]').forEach(b=>b.onclick=()=>{S.sport=b.dataset.sport;ls.set('sport',S.sport);route()});
 const gm=$('#goMiddlesBtn');if(gm)gm.onclick=()=>{S.scanTab='middles';ls.set('scanTab','middles');if(S.page==='arbs')route();else location.hash='arbs'};
 $('#menuBtn').onclick=()=>document.body.classList.toggle('sidebar-open');$('#scrim').onclick=()=>document.body.classList.remove('sidebar-open');
}

const navb=(p,bdg)=>`<button class="nav-btn" data-page="${p[0]}" ${S.page===p[0]?'aria-current="page"':''}><span class="ic">${p[1]&&p[2]}</span>${esc(p[1])}${bdg?`<span class="badge ok">${esc(bdg)}</span>`:''}</button>`;
const sportSel=()=>`<div class="seg" style="margin-bottom:10px">${SPORTS.map(s=>`<button data-sport="${s[0]}" aria-pressed="${S.sport===s[0]}">${s[1]}</button>`).join('')}</div>`;

function route(){
 const rawHash=(location.hash||'#overview').slice(1);
 const parts=rawHash.split('/');
 S.page=parts[0];
 if(parts[1]&&['arbs','middles','ev','lowhold'].includes(parts[1])){S.scanTab=parts[1];ls.set('scanTab',S.scanTab)}
 if(!PAGES.some(p=>p[0]===S.page))S.page='overview';
 shell();
 const m=$('#main');if(!D.meta){m.innerHTML=empty('No data yet','The first refresh has not run. Check back shortly.');return}
 m.innerHTML=({overview,compare,bvm,arbs,calc,promos,convert,edges,overlap,method}[S.page])();
 bindBankrollBar();
 (AFTER[S.page]||(()=>{}))();
 document.querySelectorAll('#main [data-sport]').forEach(b=>b.onclick=()=>{S.sport=b.dataset.sport;ls.set('sport',S.sport);route()});
 m.scrollTop=0;
}
const AFTER={};

/* ---------- Arb, Middle & +EV Cards ---------- */
function split(a,T){
 const sum=a.legs.reduce((s,l)=>s+l.cost,0),P=T/sum;
 return {P,sum,profit:P-T,round:a.legs.filter(l=>l.type==='xa').length*0.01,legs:a.legs.map(l=>({...l,stake:P*l.cost,units:l.type==='book'?null:P,fee:l.type==='book'?0:P*(l.cost-(l.price||l.cost))}))};
}

function hedgeDrawerHtml(uid,l0,l1,s0,s1,P,T){
 const prof=P-T;
 return `<div class="hedge-box" id="hbox-${uid}">
  <div class="row" style="justify-content:space-between">
   <label class="bk-lbl">Custom Leg 1 Stake ($) at ${esc(vname(l0.venue))}<input class="bk-inp" type="number" step="5" value="${s0.toFixed(2)}" data-hedge-l1="${uid}" data-c1="${l0.cost}" data-c2="${l1.cost}"></label>
   <div class="small" id="hout-${uid}">Leg 2 Hedge: <b>${usd(s1)}</b> · Total Staked: <b>${usd(T)}</b> · Equalized Payout: <b>${usd(P)}</b> · Net: <b class="${prof>=0?'pos':'warn'}">${(prof>=0?'+':'')+usd(prof)} (${pct(prof/(T||1),2)})</b></div>
  </div>
 </div>`;
}

function arbCard(a,i,live){
 const T=Math.max(1,+S.bank||100),s=split(a,T);
 const capT=a.max_cost!=null?a.max_cost:null;
 const l0=s.legs[0],l1=s.legs[1]||s.legs[0];
 const uid=`arb-${i}-${(a.id||'x').slice(0,6)}`;
 const holdPct=(a.sum-1);
 return `<div class="arb ${live?'live':''}">
  <div class="arb-top">
   <div>
    <h3>${esc(a.game)}</h3>
    <div class="small muted">${esc(a.league)} · ${esc(et(a.start))} · ${esc((a.market||'Moneyline'))}${a.books_n?` · ${a.books_n} books`:''}${a.fetched?' · pulled '+esc(ago(a.fetched)):''}${a.stale_snapshot?' <span class="chip w">snapshot >20m old</span>':''} ${moveBadge(a.move)}</div>
   </div>
   <div style="text-align:right">
    <div class="big ${live?'pos':'warn'}">${live?'+'+pct(a.profit_pct,2):(a.sum*100).toFixed(2)+'¢'}</div>
    <div class="small muted">${live?'locked return before rounding':`per $1 payout (${holdPct<=0?'0.00%':pct(holdPct,2)} synthetic hold)`}</div>
   </div>
  </div>
  <div class="legs"${i<FREE_ARBS?' data-sl-public':''}>${s.legs.map((l,idx)=>`<div class="leg">${vchip(l.venue)} <b>${esc(l.label||l.team+' to win')}</b><div class="small muted">${esc(legPx(l))} · all-in ${(l.cost*100).toFixed(2)}¢ per $1 payout</div>
   <div style="margin-top:6px">Leg ${idx+1} Stake: <b class="mono" style="display:inline">${usd(l.stake)}</b> → Payout <b class="mono" style="display:inline">${usd(s.P)}</b></div></div>`).join('')}</div>
  <div class="split-banner">
   <div><b>2-Leg Dollar Split (${usd(T)} total):</b> Leg 1: <b class="mono">${usd(l0.stake)}</b> at ${vchip(l0.venue)} • Leg 2: <b class="mono">${usd(l1.stake)}</b> at ${vchip(l1.venue)} → ${live?`<b class="pos">Estimated +${usd(s.profit)} (${pct(a.profit_pct,2)})</b>`:`<span class="warn">Worst-case ${usd(s.profit)} (${pct(1/a.sum-1,2)} hold)</span>`}</div>
   <button type="button" class="btn sm" data-hedge-btn="${uid}">⇄ 1-Tap Hedge Calc</button>
  </div>
  ${hedgeDrawerHtml(uid,l0,l1,l0.stake,l1.stake,s.P,T)}
  ${live?`<div class="range" style="margin-top:10px"><div><small>Total stake</small><b>${usd(T)}</b></div><div><small>Payout either way</small><b>${usd(s.P)}</b></div><div><small>Estimated return</small><b class="pos">${usd(s.profit-s.round)} to ${usd(s.profit)}</b></div>
  <div><small>Max size at quoted depth</small><b>${a.book_limited?'Book limit':''}${a.max_units!=null?`${a.book_limited?' / ':''}${Math.floor(a.max_units).toLocaleString()} ct`:''}</b><small>${a.max_cost!=null?`${usd(capT)} in, ${usd(a.max_profit)} net`:'sportsbook limits apply'}</small></div></div>`:''}
  <div class="small muted" style="margin-top:8px">${a.tie_risk?'<span class="chip w">Tie risk</span> NFL ties settle differently by venue (some grade 50-50, sportsbooks usually void the moneyline). ':''}${a.book_limited?'<span class="chip w">Book leg</span> Book prices come from '+(a.legs.some(l=>l.src==="Book A")?"Book A":"a multi-book snapshot")+' and may have moved. ':''}</div>
 </div>`;
}

/* ---------- Interactive SVG Middle Number-Line & +EV Consensus Gauge ---------- */
function middleVizSvg(m,s,T){
 const l0=s.legs[0]||{},l1=s.legs[1]||l0;
 const maxRisk=T*(m.worst||0);
 const jackpot=T*(m.best||0);
 const pWin=m.p_window||m.p_hit||0;
 const isTotal=(m.market||'').toLowerCase()==='total';
 let wLo=0,wHi=1,thLeftLbl='',thRightLbl='',flip=1;
 const p0=+(l0.point??0),p1=+(l1.point??0);
 if(isTotal){
  wLo=Math.min(p0,p1);wHi=Math.max(p0,p1);
  thLeftLbl='Over '+wLo;thRightLbl='Under '+wHi;
 }else{
  const th0=l0.side==='home'?-p0:p0;
  const th1=l1.side==='home'?-p1:p1;
  if(th0<=0&&th1<=0)flip=-1;
  wLo=Math.min(th0*flip,th1*flip);wHi=Math.max(th0*flip,th1*flip);
  const f0=(wLo>0?'+':'')+wLo,f1=(wHi>0?'+':'')+wHi;
  thLeftLbl=esc((l0.label||'Leg 1').replace(/\s+[+-]?\d+(\.\d+)?$/,''))+' ('+f0+')';
  thRightLbl=esc((l1.label||'Leg 2').replace(/\s+[+-]?\d+(\.\d+)?$/,''))+' ('+f1+')';
 }
 const hitsSet=new Set((m.hits||[]).map(x=>isTotal?+x:(+x)*flip));
 const pushSet=new Set((m.push_wins||[]).map(x=>isTotal?+x:(+x)*flip));
 const isFb=m.sport==='nfl'||m.sport==='ncaaf';
 const keyNums=new Set([...(m.key_numbers||[]).map(x=>Math.abs(+x)),...(!isTotal&&isFb?[3,7,6,10,14]:[])]);
 const cMid=(wLo+wHi)/2,cInt=Math.round(cMid);
 const ticks=[];
 for(let d=-3;d<=3;d++)ticks.push(cInt+d);
 const span=Math.max(0.5,wHi-wLo);
 const xOf=t=>{
  if(t>=wLo&&t<=wHi){
   if(Math.abs(wHi-wLo)<1e-6)return 230;
   return 148+((t-wLo)/span)*164;
  }
  if(t<wLo)return Math.max(22,144-(wLo-t)*38);
  return Math.min(438,316+(t-wHi)*38);
 };
 const tickEls=ticks.map(t=>{
  const x=xOf(t);
  const inWin=t>=wLo-1e-6&&t<=wHi+1e-6;
  const isHit=hitsSet.has(t);
  const isPush=pushSet.has(t)||(inWin&&(Math.abs(t-wLo)<1e-6||Math.abs(t-wHi)<1e-6));
  const isKey=keyNums.has(Math.abs(t))||(!isTotal&&t===0&&inWin);
  const tLbl=(!isTotal&&t>0?'+':'')+t;
  if(inWin||isHit||isPush){
   const col=isKey?'#f5b942':isHit?'#5ed26a':'#22d3ee';
   const bg=isKey?'rgba(245,185,66,0.22)':isHit?'rgba(94,210,106,0.24)':'rgba(34,211,238,0.22)';
   const tag=isKey?`★ ${tLbl}`:tLbl;
   const pw=Math.max(22,tag.length*6.2+8);
   return `<g transform="translate(${x.toFixed(1)},58)">
    <line x1="0" y1="-8" x2="0" y2="-2" stroke="${col}" stroke-width="1.8"/>
    <circle cx="0" cy="-8" r="3" fill="${col}"/>
    <rect x="${(-pw/2).toFixed(1)}" y="0" width="${pw.toFixed(1)}" height="14" rx="7" fill="${bg}" stroke="${col}" stroke-width="1.1"/>
    <text x="0" y="10" text-anchor="middle" font-size="9.2" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="800" fill="${col}">${esc(tag)}</text>
   </g>`;
  }
  const nearKey=keyNums.has(Math.abs(t));
  return `<g transform="translate(${x.toFixed(1)},58)">
   <line x1="0" y1="-6" x2="0" y2="0" stroke="${nearKey?'#f5b942':'#475569'}" stroke-width="1.2"/>
   <text x="0" y="10" text-anchor="middle" font-size="8.8" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="${nearKey?'700':'500'}" fill="${nearKey?'#fcd34d':'#64748b'}">${nearKey?'★'+tLbl:tLbl}</text>
  </g>`;
 }).join('');
 const wLoStr=(!isTotal&&wLo>0?'+':'')+wLo;
 const wHiStr=(!isTotal&&wHi>0?'+':'')+wHi;
 return `<div class="mid-viz" aria-label="Middle number-line and double-win jackpot window">
  <svg viewBox="0 0 460 74" width="100%" role="img">
   <defs>
    <linearGradient id="midJackGrad" x1="0" y1="0" x2="1" y2="0">
     <stop offset="0%" stop-color="#059669" stop-opacity="0.34"/>
     <stop offset="50%" stop-color="#10b981" stop-opacity="0.48"/>
     <stop offset="100%" stop-color="#059669" stop-opacity="0.34"/>
    </linearGradient>
    <filter id="midGlow" x="-10%" y="-20%" width="120%" height="140%">
     <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#5ed26a" flood-opacity="0.45"/>
    </filter>
   </defs>
   <!-- Left Zone: Leg 1 Win / Leg 2 Loss -->
   <rect x="6" y="12" width="136" height="36" rx="6" fill="#152235" stroke="#2c3e58" stroke-width="1"/>
   <text x="74" y="25" text-anchor="middle" font-size="8.8" font-weight="600" fill="#94a3b8">Leg 1 Win / Leg 2 Loss</text>
   <text x="74" y="39" text-anchor="middle" font-size="10.2" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="700" fill="#f5b942">${esc(usd(maxRisk))} (${esc(pct(m.worst,1))})</text>
   <!-- Center Highlighted Emerald Jackpot Window -->
   <rect x="146" y="8" width="168" height="42" rx="7" fill="url(#midJackGrad)" stroke="#5ed26a" stroke-width="1.6" filter="url(#midGlow)"/>
   <text x="230" y="21" text-anchor="middle" font-size="8.8" font-weight="800" letter-spacing="0.04em" fill="#86efac">🎯 DOUBLE-WIN JACKPOT (${esc(wLoStr)} to ${esc(wHiStr)})</text>
   <text x="230" y="36" text-anchor="middle" font-size="11.2" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="800" fill="#ffffff">+${esc(usd(jackpot).replace(/^\+?\$/,'$'))} · Hit Prob: ${esc(pct(pWin,1))}</text>
   <!-- Right Zone: Leg 2 Win / Leg 1 Loss -->
   <rect x="318" y="12" width="136" height="36" rx="6" fill="#152235" stroke="#2c3e58" stroke-width="1"/>
   <text x="386" y="25" text-anchor="middle" font-size="8.8" font-weight="600" fill="#94a3b8">Leg 2 Win / Leg 1 Loss</text>
   <text x="386" y="39" text-anchor="middle" font-size="10.2" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="700" fill="#f5b942">${esc(usd(maxRisk))} (${esc(pct(m.worst,1))})</text>
   <!-- Number-Line Axis & Boundary Connectors -->
   <line x1="16" y1="52" x2="444" y2="52" stroke="#334155" stroke-width="1.5"/>
   <line x1="146" y1="52" x2="314" y2="52" stroke="#5ed26a" stroke-width="2.6"/>
   <line x1="146" y1="48" x2="146" y2="56" stroke="#22d3ee" stroke-width="2"/>
   <line x1="314" y1="48" x2="314" y2="56" stroke="#22d3ee" stroke-width="2"/>
   ${tickEls}
  </svg>
 </div>`;
}

function evVizSvg(o){
 const bookProb=Math.min(0.95,Math.max(0.05,+(o.cost||(o.dec?1/o.dec:0.5))));
 const fairProb=Math.min(0.97,Math.max(bookProb+0.005,+(o.fair||bookProb+0.02)));
 const evPct=+(o.ev||0);
 const lo=Math.max(0,Math.min(bookProb,fairProb)-0.14);
 const hi=Math.min(1,Math.max(bookProb,fairProb)+0.10);
 const rng=Math.max(0.08,hi-lo);
 const xBook=Math.min(340,Math.max(95,20+((bookProb-lo)/rng)*400));
 const xFair=Math.min(430,Math.max(xBook+46,20+((fairProb-lo)/rng)*400));
 const gapW=Math.max(46,xFair-xBook);
 return `<div class="ev-viz" aria-label="Sharp consensus fair probability versus outlier book implied probability">
  <svg viewBox="0 0 460 44" width="100%" role="img">
   <defs>
    <linearGradient id="evEdgeGrad" x1="0" y1="0" x2="1" y2="0">
     <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.45"/>
     <stop offset="100%" stop-color="#5ed26a" stop-opacity="0.85"/>
    </linearGradient>
   </defs>
   <!-- Track background -->
   <rect x="14" y="18" width="432" height="10" rx="5" fill="#162234" stroke="#283a54" stroke-width="1"/>
   <!-- Outlier Book implied break-even bar -->
   <rect x="14" y="18" width="${(xBook-14).toFixed(1)}" height="10" rx="5" fill="#0e7490" opacity="0.75"/>
   <!-- Green +EV Edge Gap between Book Break-Even and Sharp Fair -->
   <rect x="${xBook.toFixed(1)}" y="16" width="${gapW.toFixed(1)}" height="14" rx="4" fill="url(#evEdgeGrad)" stroke="#5ed26a" stroke-width="1.3"/>
   <!-- Book Marker -->
   <line x1="${xBook.toFixed(1)}" y1="12" x2="${xBook.toFixed(1)}" y2="34" stroke="#22d3ee" stroke-width="2"/>
   <circle cx="${xBook.toFixed(1)}" cy="23" r="3.2" fill="#22d3ee"/>
   <text x="${Math.max(54,xBook-4).toFixed(1)}" y="11" text-anchor="end" font-size="9.2" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="700" fill="#67e8f9">Book ${esc(pct(bookProb,1))} (${esc(amer(o.dec))})</text>
   <!-- Sharp Fair Marker -->
   <line x1="${(xBook+gapW).toFixed(1)}" y1="12" x2="${(xBook+gapW).toFixed(1)}" y2="34" stroke="#5ed26a" stroke-width="2.2"/>
   <circle cx="${(xBook+gapW).toFixed(1)}" cy="23" r="3.5" fill="#5ed26a"/>
   <text x="${Math.min(448,xBook+gapW+4).toFixed(1)}" y="11" text-anchor="start" font-size="9.2" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="800" fill="#86efac">Fair ${esc(pct(fairProb,1))} (${esc(amer(o.fair_dec||(1/fairProb)))})</text>
   <!-- Bottom Edge Callout -->
   <text x="${(xBook+gapW/2).toFixed(1)}" y="41" text-anchor="middle" font-size="9.2" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="800" fill="#5ed26a">▲ +${esc(pct(evPct,2))} EV Edge (+${((fairProb-bookProb)*100).toFixed(1)} pts prob gap)</text>
  </svg>
 </div>`;
}

function middleCard(m,i){
 const T=Math.max(1,+S.bank||100),s=split(m,T);
 const l0=s.legs[0],l1=s.legs[1]||s.legs[0];
 const uid=`mid-${i}-${(m.id||'x').slice(0,6)}`;
 const maxRisk=T*m.worst; // negative or small positive
 const jackpot=T*m.best;  // when both legs win
 const evDollar=T*(m.ev_pct||0);
 const isPosEv=(m.ev_pct||0)>0;
 const hitsStr=(m.hits&&m.hits.length)?`Both win on ${m.hits.join(', ')}`:'';
 const pushStr=(m.push_wins&&m.push_wins.length)?`${hitsStr?' · ':''}Push+Win (+${usd(s.P-l0.stake)} net) on ${m.push_wins.join(', ')}`:'';
 const keyBadges=(m.key_numbers&&m.key_numbers.length)?`<span class="chip k">Key # ${m.key_numbers.map(k=>Math.abs(k)).join(', ')}</span>`:'';
 return `<div class="arb ${isPosEv?'mid-ev':''}"${i<FREE_ARBS?' data-sl-public':''}>
  <div class="arb-top">
   <div>
    <h3>🎯 ${esc(m.game)} <span class="chip b">${esc(m.market)} Middle · ${m.width} pt window</span> ${keyBadges}</h3>
    <div class="small muted">${esc(m.league||m.sport.toUpperCase())} · ${esc(et(m.start))} · ${esc(m.window_label||'')}${m.consensus_mid!=null?` · Consensus mid ${m.consensus_mid}`:''} ${moveBadge(m.move)}</div>
   </div>
   <div style="text-align:right">
    <div class="big ${isPosEv?'pos':'warn'}">${(m.ev_pct>=0?'+':'')+pct(m.ev_pct,2)} EV</div>
    <div class="small muted">Window Hit: <b>${pct(m.p_window||m.p_hit,1)}</b> · Synthetic Hold: <b>${pct(m.hold_pct!=null?m.hold_pct:(m.sum-1),2)}</b></div>
   </div>
  </div>
  <div class="legs"${i<FREE_ARBS?' data-sl-public':''}>
   ${s.legs.map((l,idx)=>`<div class="leg">${vchip(l.venue)} <b>${esc(l.label)}</b><div class="small muted">${esc(legPx(l))} · all-in ${(l.cost*100).toFixed(2)}¢ per $1 payout</div>
    <div style="margin-top:6px">Leg ${idx+1} Stake: <b class="mono" style="display:inline">${usd(l.stake)}</b> → Single-win payout <b class="mono" style="display:inline">${usd(s.P)}</b></div></div>`).join('')}
  </div>
  ${middleVizSvg(m,s,T)}
  <div class="split-banner">
   <div><b>2-Leg Middle Split (${usd(T)} total):</b> Leg 1: <b class="mono">${usd(l0.stake)}</b> at ${vchip(l0.venue)} • Leg 2: <b class="mono">${usd(l1.stake)}</b> at ${vchip(l1.venue)} → Max Risk <b class="warn">${usd(maxRisk)} (${pct(m.worst,2)})</b> / Middle Jackpot <b class="pos">+${usd(jackpot)} (+${pct(m.best,1)})</b></div>
   <button type="button" class="btn sm" data-hedge-btn="${uid}">⇄ 1-Tap Hedge Calc</button>
  </div>
  ${hedgeDrawerHtml(uid,l0,l1,l0.stake,l1.stake,s.P,T)}
  <div class="range" style="margin-top:8px">
   <div><small>Middle Window</small><b>${m.width} pts</b><small>${esc(hitsStr)}${esc(pushStr)}</small></div>
   <div><small>Hit Probability</small><b>${pct(m.p_window||m.p_hit,2)}</b><small>${m.p_hit?pct(m.p_hit,1)+' double-win':''}${m.p_push_win?' + '+pct(m.p_push_win,1)+' push-win':''}</small></div>
   <div><small>If Middle Misses</small><b class="warn">${usd(maxRisk)} (${pct(m.worst,2)})</b><small>1 leg wins, 1 loses</small></div>
   <div><small>Expected Value</small><b class="${isPosEv?'pos':'muted'}">${(evDollar>=0?'+':'')+usd(evDollar)} (${(m.ev_pct>=0?'+':'')+pct(m.ev_pct,2)})</b><small>per ${usd(T)} total staked</small></div>
  </div>
 </div>`;
}

function evCard(o){
 const k=kellyStake(o);
 const devigLbl=(o.devig_method||'power').toUpperCase();
 const edgeKind=o.edge_type==='line_value'?`<span class="chip k" title="Favorable half/full point vs consensus line">+${o.line_edge_pts||0.5} pt Line Edge</span>`:`<span class="chip p" title="De-vigged with ${devigLbl} method across ${o.books_n||4} books (${o.sharp_n||1} sharp)">${devigLbl} Devig · ${o.books_n||4} bks</span>`;
 return `<div class="arb" style="padding:12px 14px;margin-bottom:10px">
  <div class="arb-top">
   <div>
    <h3 style="font-size:15px">${vchip(o.book)} <b>${esc(o.label)}</b> <span class="mono">@ ${amer(o.dec)} (${o.dec})</span> ${edgeKind}</h3>
    <div class="small muted">${esc(o.game)} · ${esc(o.league||o.sport.toUpperCase())} · ${esc(o.market)} · ${esc(et(o.start))}${o.fair_src?` · Ref: ${esc(o.fair_src)}`:''} ${moveBadge(o.move)}</div>
   </div>
   <div style="text-align:right">
    <div class="big pos">+${pct(o.ev,2)} EV</div>
    <div class="small muted">Fair: <b>${pct(o.fair,1)} (${amer(o.fair_dec||(1/o.fair))})</b></div>
   </div>
  </div>
  ${evVizSvg(o)}
  <div class="split-banner" style="margin-top:8px">
   <div><b>${esc(k.mode)} Sizing (${usd(S.bankroll)} bankroll):</b> Stake <b class="mono pos">${usd(k.stake)}</b> (${pct(k.pct,2)} of bankroll) at ${vchip(o.book)} → Expected Profit <b class="mono pos">+${usd(k.evDollar)}</b> <span class="small muted">(If win: +${usd(k.stake*(1/o.cost-1))})</span></div>
   <span class="small muted">${o.age_min!=null?`Updated ${Math.round(o.age_min)}m ago`:''}</span>
  </div>
 </div>`;
}

/* ---------- pages ---------- */
function overview(){
 const G=D.m.games.filter(sf),A=D.a.arbs.filter(sf),N=D.a.near.filter(sf);
 const M=((D.e||{}).middles||[]).filter(sf),O=((D.e||{}).outliers||[]).filter(sf);
 const posM=M.filter(m=>(m.ev_pct||0)>0);
 const gaps=[...G].filter(g=>Object.keys(g.venues).length>=3).sort((a,b)=>b.gap-a.gap).slice(0,6);
 const src=D.meta.sources;
 return `${sportSel()}${bankrollBar()}<div class="grid kpis">
  <div class="card kpi"><div class="kpi-label">Games matched</div><div class="kpi-value">${G.length}</div><div class="kpi-delta">${G.filter(g=>Object.keys(g.venues).length>=3).length} on 3+ venues</div></div>
  <div class="card kpi"><div class="kpi-label">Live arbs (after fees)</div><div class="kpi-value ${A.length?'pos':''}" style="${isFree()&&A.length>FREE_ARBS?'font-size:var(--t-md)':''}">${arbCount(A.length)}</div><div class="kpi-delta">${A.length?'best +'+pct(A[0].profit_pct,2):N[0]?'closest '+(N[0].sum*100).toFixed(2)+'¢/$1':'none right now'}</div></div>
  <div class="card kpi"><div class="kpi-label">🎯 Middles & +EV Edges</div><div class="kpi-value pos">${M.length} / ${O.length}</div><div class="kpi-delta">${posM.length} +EV middles · ${O[0]?'top +'+pct(O[0].ev,1)+' EV':'sharp Shin/Power'}</div></div>
  <div class="card kpi"><div class="kpi-label">Biggest fair-prob gap</div><div class="kpi-value warn">${gaps[0]?pct(gaps[0].gap):'—'}</div><div class="kpi-delta">${gaps[0]?esc(gaps[0].away.abbr+' @ '+gaps[0].home.abbr):''}</div></div>
 </div>
 <div class="grid two" style="margin-top:16px">
  <div class="card"><div class="card-head"><h2>Top arbitrage & low-hold</h2><a href="#arbs" class="sub">Open scanner →</a></div>
   ${A.length?A.slice(0,2).map((a,i)=>arbCard(a,i,true)).join(''):empty('No guaranteed-profit combos right now','0 right now. After every venue fee and exchange commission and using only prices under 20 minutes old, no combination locks a return. That is the normal state; real arbs are rare and close fast.'+((D.a.stale||[]).length?' '+D.a.stale.length+' more would be arbs on older prices, so they are not shown.':''))+(N[0]?`<div style="margin-top:10px">${arbCard(N[0],0,false)}</div>`:'')}
  </div>
  <div class="card"><div class="card-head"><h2>🎯 Top Middles & Sharp +EV Outliers</h2><a href="#edges" class="sub">All ${M.length} middles & ${O.length} edges →</a></div>
   ${M.slice(0,1).map((m,i)=>middleCard(m,i)).join('')}
   ${O.slice(0,2).map(evCard).join('')}
   ${!M.length&&!O.length?empty('No middles or outliers for this filter',''):''}
  </div>
 </div>
 <div class="grid two" style="margin-top:16px">
  <div class="card"><div class="card-head"><h2>Biggest cross-venue gaps</h2><a href="#compare" class="sub">Compare all →</a></div>${gaps.length?gaps.map(gapRow).join(''):empty('No multi-venue games','')}</div>
  <div class="card"><div class="card-head"><h2>Sources this run</h2><span class="sub">${esc(et(D.meta.updated))}</span></div><div class="table-wrap"><table><tr><th>Sport</th><th class="num">Upcoming games</th><th class="num">With Book A line</th><th>Multi-book</th></tr>
   ${src.map(s=>`<tr><td>${esc(s.sport)}</td><td class="num">${s.games}</td><td class="num">${s.with_lines}</td><td class="small ${(s.books||'').startsWith('ok')?'pos':'muted'}">${(s.books||'')==='no key'?'Multi-book prices off':esc(isoET(s.books||''))}</td></tr>`).join('')}</table></div></div>
 </div>`;
}

function gapRow(g){
 const v=g.venues,ks=Object.keys(v);
 return `<div style="margin:10px 0"><div class="row" style="justify-content:space-between"><b>${esc(g.away.full)} @ ${esc(g.home.full)}</b><span class="small muted">${esc(g.league)}${g.devig_method?` · ${esc(g.devig_method.toUpperCase())} devig`:''} · gap <b class="warn">${pct(g.gap)}</b> ${moveBadge(g.move)}</span></div>
 ${ks.slice(0,6).map(k=>`<div class="pb"><span>${vchip(k)}</span><div class="bar"><i style="left:0;width:${(v[k].home*100).toFixed(1)}%;background:${k==='Exchange A'?'#22d3ee':k==='Exchange B'?'#818cf8':'#5ed26a'}"></i></div><span class="mono">${pct(v[k].home)}</span></div>`).join('')}
 <div class="small muted">${esc(g.home.abbr)} win probability, adaptive Shin/Power no-vig${ks.length>6?` (+${ks.length-6} more venues)`:''}</div></div>`;
}

function compare(){
 const G=D.m.games.filter(sf);if(!G.length)return sportSel()+empty('No upcoming games found for this sport','');
 const q=ls.get('q','');
 return `${sportSel()}<div class="note info"><b>Execution-Weighted Sharp Consensus & Adaptive Devigging.</b> Each venue's fair probability is de-vigged using <b>Shin's method</b> (high-hold or skewed lines) or <b>Power devigging</b> (balanced 2-way lines). Sharp market makers and low-hold exchanges carry higher execution weight in the consensus fair line.</div>
 <div class="card"><div class="card-head"><h2>${G.length} games</h2><input class="inp" id="q" placeholder="Filter team…" value="${esc(q)}" style="width:180px"></div><div class="table-wrap"><table id="ct"><tr><th>Game</th><th>Start</th><th class="num">Sharp Consensus</th><th class="num">Book A (no-vig)</th><th class="num">Gap</th><th>Move / Steam</th><th>Prices (away / home)</th></tr>
 ${G.map(g=>{
  const v=g.venues,c=k=>v[k]?pct(v[k].home):'<span class="muted">—</span>';
  const sc=g.sharp_consensus!=null?pct(g.sharp_consensus,1):(g.consensus!=null?pct(g.consensus,1):'—');
  return `<tr data-t="${esc((g.name+' '+g.home.abbr+' '+g.away.abbr).toLowerCase())}"><td><b>${esc(g.away.abbr)} @ ${esc(g.home.abbr)}</b><div class="small muted">${esc(g.league)}${g.devig_method?` · ${esc(g.devig_method.toUpperCase())}`:''}</div></td><td class="small">${esc(et(g.start))}</td><td class="num"><b>${sc}</b>${g.sharp_n?`<div class="small muted">${g.sharp_n} sharp</div>`:''}</td><td class="num">${c('Book A')}</td>
  <td class="num ${g.gap>=.03&&!g.thin?'warn':''}">${Object.keys(v).length>=3?pct(g.gap):'<span class="small muted">needs 3+ books</span>'}</td>
  <td class="small">${moveBadge(g.move)||'<span class="muted">—</span>'}</td>
  <td class="small">${Object.entries(v).map(([k,x])=>`${vchip(k)}${x.kind==='book'?esc(x.away_px)+' / '+esc(x.home_px):(x.away_px!=null?Math.round(x.away_px*100)+'¢':'—')+' / '+(x.home_px!=null?Math.round(x.home_px*100)+'¢':'—')}`).join(' ')}</td></tr>`;
 }).join('')}</table></div>
 <p class="small muted">Home-team win probability shown. ${esc(((D.meta||{}).fees||{}).books||'')}</p></div>`;
}
AFTER.compare=()=>{const f=()=>{const v=$('#q').value.toLowerCase();ls.set('q',v);document.querySelectorAll('#ct tr[data-t]').forEach(r=>r.style.display=r.dataset.t.includes(v)?'':'none')};$('#q').oninput=f;f()};

function arbs(){
 let A=D.a.arbs.filter(sf);
 const N=D.a.near.filter(sf);
 const M=((D.e||{}).middles||[]).filter(sf);
 const O=((D.e||{}).outliers||[]).filter(sf);
 A=[...A].sort(S.sort==='volume'?(a,b)=>(b.max_profit||0)-(a.max_profit||0):(a,b)=>b.profit_pct-a.profit_pct);
 const tab=S.scanTab||'arbs';
 const pills=[
  ['arbs','⚡ Arbitrage',A.length],
  ['middles','🎯 Middles',M.length],
  ['ev','📈 +EV Outliers',O.length],
  ['lowhold','⇄ Low-Hold (<2.5%)',N.length]
 ];
 let body='';
 if(tab==='middles'){
  body=`<div class="note info"><b>🎯 Cross-Book Middles Scanner.</b> A middle pairs Over <i>L₁</i> at one venue with Under <i>L₂</i> at another (<i>L₂ &gt; L₁</i>), or opposite spreads that overlap around key numbers (such as NFL <b>3</b> or <b>7</b>). If the final score lands inside the window, <b>both legs win</b>. Stakes below are auto-split for your <b>${usd(S.bank)}</b> total stake.</div>
  ${M.length?M.map((m,i)=>middleCard(m,i)).join(''):empty('No middles for this sport filter','Try switching sport filter to All.')}`;
 }else if(tab==='ev'){
  body=`<div class="note info"><b>📈 Sharp-Weighted +EV Scanner.</b> Compares every venue against an execution-weighted consensus (using adaptive <b>Shin / Power devigging</b> that weights sharp market makers and low-hold exchanges higher). Recommended dollar stakes use your <b>${usd(S.bankroll)}</b> bankroll and <b>${S.kelly==='flat'?'Flat':S.kelly+'x Kelly'}</b> setting.</div>
  ${O.length?O.map(evCard).join(''):empty('No +EV outliers for this sport filter','Try switching sport filter to All.')}`;
 }else if(tab==='lowhold'){
  body=`<div class="note info"><b>⇄ Low-Hold & Promo-Conversion Lines.</b> These cross-book pairs have near-zero synthetic hold (cost near $1.00 per $1 payout), making them ideal for rolling over bonus bets, profit boosts, or credit-card/rewards volume with minimal friction.</div>
  ${N.length?N.slice(0,25).map((a,i)=>arbCard(a,i,false)).join(''):empty('No low-hold pairs for this sport filter','')}`;
 }else{
  body=`${A.length?`<h2 style="font-size:var(--t-md);margin:0 0 10px">${A.length} live arb${A.length===1?'':'s'}${isFree()&&A.length>FREE_ARBS?` <span class="small muted">· ${arbCount(A.length)}</span>`:''}</h2>`:''}
  ${A.length?A.map((a,i)=>arbCard(a,i,true)).join(''):empty('No guaranteed-profit combos right now','0 right now. Every combination costs at least $1 per $1 of payout after all venue fees, or uses a price over 20 minutes old. Checked '+esc(ago(D.a.updated))+'.'+((D.a.stale||[]).length?' '+D.a.stale.length+' more would be arbs on older prices, so they are not shown.':''))}
  <h2 style="font-size:var(--t-md);margin:22px 0 4px">Closest to an arb (Low-Hold &lt;2.5%)</h2><p class="small muted" style="margin:0 0 10px">These show how tight the cross-book market is, and where an odds boost or free bet tips the result into a lock.</p>
  ${N.length?N.slice(0,10).map((a,i)=>arbCard(a,i,false)).join(''):empty('Nothing close','')}`;
 }
 return `${sportSel()}${bankrollBar()}
 <div class="scan-pills">
  ${pills.map(p=>`<button type="button" class="scan-pill" data-scan-tab="${p[0]}" aria-pressed="${tab===p[0]}">${p[1]} <span class="cnt">${p[2]}</span></button>`).join('')}
 </div>
 ${body}`;
}
AFTER.arbs=()=>{
 document.querySelectorAll('[data-scan-tab]').forEach(b=>b.onclick=()=>{S.scanTab=b.dataset.scanTab;ls.set('scanTab',S.scanTab);route()});
 document.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{S.sort=b.dataset.sort;ls.set('sort',S.sort);route()});
};

/* ---------- manual calculator ---------- */
const VT=[['am','Sportsbook (American)'],['dec','Sportsbook (decimal)']];
function legIn(n,d){return `<div class="leg"><b>Outcome ${n}</b><div class="row" style="margin-top:6px"><label class="f">Venue<select class="inp" id="t${n}" style="width:190px">${VT.map(v=>`<option value="${v[0]}" ${d.t===v[0]?'selected':''}>${v[1]}</option>`).join('')}</select></label>
 <label class="f">Price / odds<input class="inp" id="p${n}" value="${d.p}"></label><label class="f">Commission %<input class="inp" id="r${n}" value="${d.r}" style="width:80px"></label></div></div>`}
function costOf(t,p,r){p=+p;const comm=(+r||0)/100;let dec=t==='am'?(p>0?1+p/100:p<0?1+100/-p:NaN):(p>1?p:NaN);if(!(dec>1))return NaN;const netDec=1+(dec-1)*(1-comm);return 1/netDec}
function calc(){return `${bankrollBar()}<div class="card"><div class="card-head"><h2>Two-way arbitrage and hedge calculator</h2><span class="sub">Enter any two opposite outcomes</span></div>
 <div class="legs">${legIn(1,{t:'am',p:'+115',r:0})}${legIn(2,{t:'am',p:'-108',r:0})}</div><div class="row" style="margin-top:12px"><label class="f">Total stake ($)<input class="inp" id="T" type="number" value="${S.bank}"></label></div><div class="out" id="out"></div></div>
 <div class="note">Use exact rules for both venues. A combo is only an arb if both sides settle on the same event the same way, including overtime, ties, postponements and player withdrawals.</div>`}
AFTER.calc=()=>{const run=()=>{const c1=costOf($('#t1').value,$('#p1').value,$('#r1').value),c2=costOf($('#t2').value,$('#p2').value,$('#r2').value),T=+$('#T').value||0;
 if(!(c1>0&&c2>0)){$('#out').innerHTML='<span class="neg">Enter valid prices.</span>';return}const sum=c1+c2,P=T/sum;
 $('#out').innerHTML=`<div class="range"><div><small>Cost per $1 payout</small><b class="${sum<1?'pos':'neg'}">${(sum*100).toFixed(2)}¢</b></div><div><small>Stake outcome 1</small><b>${usd(P*c1)}</b></div><div><small>Stake outcome 2</small><b>${usd(P*c2)}</b></div><div><small>Payout either way</small><b>${usd(P)}</b></div><div><small>${sum<1?'Estimated return':'Synthetic hold'}</small><b class="${sum<1?'pos':'neg'}">${usd(P-T)} (${pct(1/sum-1,2)})</b></div></div>`};
 document.querySelectorAll('#main input,#main select').forEach(e=>e.oninput=run);run()};

/* ---------- promos ---------- */
function promos(){const P=D.p.promos,M=ls.get('manual',[]);
 return `<div class="note">Eligibility depends on your state and account. Many boosts and bonus bets are targeted, opt-in or limited to new users, and wagering rules vary. Always read the book's terms before counting on a promo.</div>
 <div class="card"><div class="card-head"><h2>Scraped from public promo pages</h2><span class="sub">Checked ${esc(et(D.p.updated))}</span></div>
 ${P.length?`<div class="table-wrap"><table><tr><th>Book</th><th>Promo</th><th>Type</th><th>Source</th><th>Seen</th></tr>${P.map(p=>`<tr><td>${esc(p.book)}</td><td>${esc(p.title)}</td><td>${esc(p.kind.replace('_',' '))}</td><td class="small"><a href="${esc(p.source)}" target="_blank" rel="noopener">page↗</a></td><td class="small">${esc(et(p.seen))}</td></tr>`).join('')}</table></div>`
 :empty('No promos could be read from public pages this run','The major books load promos with JavaScript after a location check, so the public HTML has no offer text. Nothing is shown rather than guessed. Add the offers you see in your own apps below and the converter will rank them.')}
 <h3 style="font-size:var(--t-sm);margin:16px 0 6px">Pages checked</h3><div class="table-wrap"><table><tr><th>Book</th><th>URL</th><th>Status</th><th class="num">Found</th><th>Note</th></tr>${D.p.attempts.map(a=>`<tr><td>${esc(a.book)}</td><td class="small"><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url.replace('https://',''))}</a></td><td class="small">${esc(a.status)}</td><td class="num">${a.found}</td><td class="small muted">${esc(a.note||'')}</td></tr>`).join('')}</table></div></div>
 <div class="card" style="margin-top:16px"><div class="card-head"><h2>Your promos</h2><span class="sub">Saved in this browser only</span></div>
 <div class="row"><label class="f">Book<input class="inp" id="mb" placeholder="Book B"></label><label class="f">Type<select class="inp" id="mk"><option value="free_bet">Free / bonus bet</option><option value="profit_boost">Profit boost</option><option value="no_sweat">No-sweat / 2nd chance</option></select></label>
 <label class="f">Amount ($)<input class="inp" id="ma" type="number" value="25"></label><label class="f">Boost %<input class="inp" id="mp" type="number" value="0"></label><label class="f">Expires<input class="inp" id="me" type="date" style="width:150px"></label><button class="btn primary" id="madd">Add</button></div>
 ${M.length?`<div class="table-wrap" style="margin-top:12px"><table><tr><th>Book</th><th>Type</th><th class="num">Amount</th><th class="num">Boost</th><th>Expires</th><th class="num">Best locked value now</th><th></th></tr>${M.map((m,i)=>{const v=bestFor(m);return `<tr><td>${esc(m.b)}</td><td>${esc(m.k.replace('_',' '))}</td><td class="num">${usd(m.a)}</td><td class="num">${m.p?m.p+'%':'—'}</td><td class="small">${esc(m.e||'—')}</td><td class="num pos">${v?usd(v.locked)+' <span class="small muted">'+esc(v.game)+'</span>':'—'}</td><td><button class="btn sm danger" data-del="${i}">✕</button></td></tr>`}).join('')}</table></div>`:'<p class="small muted">No promos added yet.</p>'}
 <p class="small muted">"Best locked value" assumes the promo bet goes on a Book A-priced side in today's data and the hedge on the best opposite price at any venue. Your book's odds may differ.</p></div>`}
AFTER.promos=()=>{$('#madd').onclick=()=>{const M=ls.get('manual',[]);M.push({b:$('#mb').value||'Book',k:$('#mk').value,a:+$('#ma').value||0,p:+$('#mp').value||0,e:$('#me').value});ls.set('manual',M);route()};
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const M=ls.get('manual',[]);M.splice(+b.dataset.del,1);ls.set('manual',M);route()})};

/* promo math: book leg decimal d, hedge cost c per $1 payout (dB=1/c) */
const fbLock=(F,d,c)=>F*(d-1)*(1-c);
const boostLock=(S_,d,b,c)=>{const db=1+(d-1)*(1+b);return S_*(db*(1-c)-1)};
const nsLock=(S_,d,r,c)=>{const H=S_*(d-r)*c;return S_*(d-1)-H};
const XFEE={'Exchange C':0,'Exchange D':.02,'Exchange H':.02};
const isX=l=>l.type!=='book'||/^Exchange /.test(l.venue||'');
const xc=l=>l.type==='book'&&isX(l)&&l.dec?{...l,cost:1/(1+(l.dec-1)*(1-(XFEE[l.venue]??.02))),price:1/l.dec,fee:XFEE[l.venue]??.02}:l;
const PROMO_BOOK='Book A';
function combos(){const out=[];for(const g of D.m.games.filter(sf)){if(!g.legs)continue;for(const s of ['home','away']){const o=s==='home'?'away':'home';
 for(const L of g.legs[s].filter(l=>l.type==='book'&&l.venue===PROMO_BOOK)){const H=g.legs[o].filter(h=>h.venue!==L.venue).map(xc).sort((a,b)=>a.cost-b.cost)[0];if(!H)continue;
 out.push({game:`${g.away.abbr} @ ${g.home.abbr}`,league:g.league,start:g.start,team:g[s].full,opp:g[o].full,book:L.venue,d:L.dec,am:L.am,h:H})}}}return out}
function bestFor(m){const C=combos();let best=null;for(const x of C){const v=m.k==='free_bet'?fbLock(m.a,x.d,x.h.cost):m.k==='profit_boost'?boostLock(m.a,x.d,(m.p||0)/100,x.h.cost):nsLock(m.a,x.d,S.nsr/100,x.h.cost);if(!best||v>best.locked)best={locked:v,game:x.game}}return best}
function convert(){const C=combos();
 const fb=C.map(x=>({...x,v:fbLock(S.fb,x.d,x.h.cost)})).sort((a,b)=>b.v-a.v).slice(0,10);
 const bo=C.map(x=>({...x,v:boostLock(S.bstake,x.d,S.boost/100,x.h.cost)})).sort((a,b)=>b.v-a.v).slice(0,10);
 const tbl=(R,kind)=>R.length?`<div class="table-wrap"><table><tr><th>Bet (promo)</th><th class="num">Odds</th><th>Hedge</th><th class="num">Hedge stake</th><th class="num">Locked</th><th class="num">${kind==='fb'?'Conversion':'Return'}</th></tr>${R.map(x=>{const dB=1/x.h.cost;
 const hs=kind==='fb'?S.fb*(x.d-1)/dB:S.bstake*(1+(x.d-1)*(1+S.boost/100))/dB;
 return `<tr><td><b>${esc(x.team)}</b><div class="small muted">${esc(x.game)} · ${esc(x.league)} · ${esc(et(x.start))}</div></td><td class="num">${esc(x.am||amer(x.d))}${kind==='bo'?`<div class="small muted">boosted ${amer(1+(x.d-1)*(1+S.boost/100))}</div>`:''}</td><td>${vchip(x.h.venue)} ${esc(x.opp)}<div class="small muted">${x.h.dec?esc(x.h.am||amer(x.h.dec))+(isX(x.h)?' + '+(x.h.fee*100).toFixed(0)+'% commission':''):Math.round(x.h.price*100)+'¢ + fee'}</div></td><td class="num">${usd(hs)}</td><td class="num ${x.v>0?'pos':'neg'}">${usd(x.v)}</td><td class="num">${kind==='fb'?pct(x.v/S.fb):pct(x.v/S.bstake)}</td></tr>`}).join('')}</table></div>`:empty('No sportsbook lines to pair with','Promo conversion needs a sportsbook price on one side. None were available for this filter.');
 return `${sportSel()}<div class="note info">These rank today's real lines for converting a promo into a locked result. The promo bet uses the Book A line; swap in your book's odds with the calculators below. The hedge is the best opposite price at any other venue, fees included.</div>
 <div class="grid two"><div class="card"><div class="card-head"><h2>Free bet (stake not returned)</h2><label class="f">Free bet $<input class="inp" id="fb" type="number" value="${S.fb}"></label></div>${tbl(fb,'fb')}
 <p class="small muted">Formula: locked = F × (d − 1) × (1 − hedge cost). Longer odds convert better, which is why underdogs top the list. 70%+ is excellent, 60–70% typical.</p></div>
 <div class="card"><div class="card-head"><h2>Profit boost</h2><div class="row"><label class="f">Boost %<input class="inp" id="bo" type="number" value="${S.boost}" style="width:80px"></label><label class="f">Max stake $<input class="inp" id="bs" type="number" value="${S.bstake}" style="width:90px"></label></div></div>${tbl(bo,'bo')}
 <p class="small muted">Boosted odds = 1 + (d − 1) × (1 + boost). Negative means the boost isn't big enough to beat the hedge's margin on that game. Most boosts are capped, so the stake limit matters.</p></div></div>
 <div class="card" style="margin-top:16px"><div class="card-head"><h2>Manual promo calculator</h2><span class="sub">Odds boosts, no-sweat bets, any book</span></div>
 <div class="row"><label class="f">Type<select class="inp" id="mt" style="width:170px"><option value="fb">Free bet (SNR)</option><option value="ob">Odds boost (enter boosted odds)</option><option value="ns">No-sweat / refund as bonus</option></select></label>
 <label class="f">Stake / free bet $<input class="inp" id="ms" type="number" value="25"></label><label class="f">Your odds (American)<input class="inp" id="mo" value="+250"></label><label class="f">Hedge odds (American)<input class="inp" id="mh" value="-230"></label><label class="f">Refund conversion %<input class="inp" id="mr" type="number" value="${S.nsr}"></label></div><div class="out" id="mout"></div></div>
 <div class="note">What "lower-variance" really means here: with both bets placed at these prices, every listed outcome locks the amount shown. It is not lower-variance if a price moves before your second bet, a bet is voided or limited, the two venues grade the event differently, or a promo's terms differ from what you assumed. Bonus funds can also take days to credit.</div>`}
AFTER.convert=()=>{$('#fb').onchange=e=>{S.fb=+e.target.value||25;ls.set('fb',S.fb);route()};$('#bo').onchange=e=>{S.boost=+e.target.value||0;ls.set('boost',S.boost);route()};$('#bs').onchange=e=>{S.bstake=+e.target.value||25;ls.set('bstake',S.bstake);route()};
 const am2d=a=>{a=+String(a).replace('+','');return a>0?1+a/100:a<0?1+100/-a:NaN};
 const run=()=>{const t=$('#mt').value,s=+$('#ms').value,d=am2d($('#mo').value),dh=am2d($('#mh').value),r=(+$('#mr').value||0)/100;if(!(d>1&&dh>1&&s>0)){$('#mout').innerHTML='<span class="neg">Enter valid odds.</span>';return}
  let H,a,b;if(t==='fb'){H=s*(d-1)/dh;a=s*(d-1)-H;b=H*(dh-1)}else if(t==='ob'){H=s*d/dh;a=s*(d-1)-H;b=H*(dh-1)-s}else{H=s*(d-r)/dh;a=s*(d-1)-H;b=H*(dh-1)-s+r*s}
  $('#mout').innerHTML=`<div class="range"><div><small>Hedge stake</small><b>${usd(H)}</b></div><div><small>If your bet wins</small><b class="${a>=0?'pos':'neg'}">${usd(a)}</b></div><div><small>If hedge wins</small><b class="${b>=0?'pos':'neg'}">${usd(b)}</b>${t==='ns'?'<small>includes refund valued at '+Math.round(r*100)+'%</small>':''}</div><div><small>${t==='fb'?'Conversion':'Return on stake'}</small><b>${pct(Math.min(a,b)/s)}</b></div></div>`};
 document.querySelectorAll('#mt,#ms,#mo,#mh,#mr').forEach(e=>e.oninput=run);$('#mr').onchange=e=>{S.nsr=+e.target.value||70;ls.set('nsr',S.nsr)};run()};

function overlap(){return `<div class="note">This page is offline for now. The sports tools are unchanged.</div>`}

function method(){const f=D.meta.fees;return `<div class="grid two"><div class="card"><div class="card-head"><h2>What Arb Lab does</h2></div><p>Every refresh pulls upcoming NFL, college football, NHL, NBA and MLB games from a public scoreboard feed, along with published multi-book lines. It then lines up every venue's price for the same game by teams and start time.</p>
 <p><b>Execution-Weighted Sharp Consensus & Shin/Power Devigging.</b> High-hold or skewed lines are de-vigged using <b>Shin's (1993) method</b> (which accounts for favorite-longshot bias), while balanced 2-way markets use <b>Power devigging</b>. Sharp market-making books and low-hold peer exchanges receive higher execution weight so true +EV edges aren't diluted by slow recreational lines.</p>
 <p><b>Middles & Key Numbers.</b> Cross-book spread and total gaps are evaluated against empirical score distributions (preserving NFL key numbers 3, 7, 10 and NHL overtime scoring) to compute exact window hit probability, max loss %, and expected value.</p>
 <p><b>Arbitrage.</b> Each way to buy $1 of payout on each side is costed all-in, including exchange commissions. If the cheapest home cost plus the cheapest away cost is under $1, the difference is locked.</p>
 <h3 style="font-size:var(--t-sm)">Fees used</h3><p class="small">${esc(f.books)}</p></div>
 <div class="card"><div class="card-head"><h2>The honest caveats</h2></div><ul style="padding-left:18px;margin:0;line-height:1.6">
 <li><b>Snapshot, not live.</b> Prices refresh periodically, and arbs often close in seconds. Re-check both prices, then place the less liquid leg first.</li>
 <li><b>Rule differences.</b> Sportsbooks and exchanges can grade the same game differently, for example on ties, postponements, overtime or a change of venue. One mismatch turns a lock into a loss.</li>
 <li><b>Limits and voids.</b> Books limit or void winning arbitrage and promo bettors. Order books can be thinner than shown by the time you trade.</li>
 <li><b>Settlement timing.</b> Venues settle on different schedules, and some take hours or days. Your capital is tied up until then.</li>
 <li><b>Access.</b> Sportsbooks and exchanges are state-dependent, and promo eligibility depends on your state and account.</li>
 <li><b>Rounding and fees.</b> Fees and rounding can make very small arbs vanish. Deposits and withdrawals can carry extra costs.</li></ul></div></div>
 <div class="card" style="margin-top:16px"><div class="card-head"><h2>Data status</h2><span class="sub">${esc(et(D.meta.updated))}</span></div>
 <p>${D.meta.multi_book?'<span class="chip b">Multi-book on</span> Prices from several books are included.':'<span class="chip w">Single book</span> Only Book A lines are available right now.'}</p>
 </div>`}

function edges(){
 const E=D.e;if(!E)return empty('No edge data yet','Runs after the next multi-book pull.');
 const c=E.clv||{};
 const M=(E.middles||[]).filter(sf),O=(E.outliers||[]).filter(sf).filter(o=>o&&o.dec!=null),ST=(E.stale||[]).filter(s=>!s.sport||sf(s)),PI=(E.priced_in||[]).filter(sf);
 const etab=S.edgeTab||'all';
 const epills=[
  ['all','All Edges & Middles',M.length+O.length],
  ['middles','🎯 Middles',M.length],
  ['outliers','📈 +EV Outliers',O.length],
  ['steam','🔥 Steam & Stale Moves',ST.length+PI.filter(p=>p.steam).length]
 ];
 return `${sportSel()}${bankrollBar()}<div class="note info"><b>Labels matter.</b> <b>Arb</b> = guaranteed if both prices still stand. <b>Middle</b> = small worst-case hold, both bets win if the final score lands inside the window. <b>Stale line</b> and <b>Outlier</b> = estimated +EV versus an execution-weighted Shin/Power sharp consensus, <b>not guaranteed</b>. Every alert is graded later by closing-line value.</div>
 <div class="grid kpis">
  <div class="card kpi"><div class="kpi-label">🎯 Active Middles</div><div class="kpi-value pos">${M.length}</div><div class="kpi-delta">${M.filter(m=>(m.ev_pct||0)>0).length} positive-EV windows</div></div>
  <div class="card kpi"><div class="kpi-label">📈 +EV Outliers</div><div class="kpi-value pos">${O.length}</div><div class="kpi-delta">${O[0]?'top +'+pct(O[0].ev,1)+' EV':'Shin/Power devig'}</div></div>
  <div class="card kpi"><div class="kpi-label">🔥 Steam / Stale Moves</div><div class="kpi-value warn">${ST.length}</div><div class="kpi-delta">lagging books flagged</div></div>
  <div class="card kpi"><div class="kpi-label">Graded by CLV</div><div class="kpi-value">${c.graded||0} <span class="small muted">/ ${c.alerts||0}</span></div><div class="kpi-delta">${c.avg_clv!=null?'avg CLV '+pct(c.avg_clv,2)+' · beat close '+c.beat_close:'grades after games start'}</div></div>
 </div>
 <div class="scan-pills" style="margin-top:14px">
  ${epills.map(p=>`<button type="button" class="scan-pill" data-edge-tab="${p[0]}" aria-pressed="${etab===p[0]}">${p[1]} <span class="cnt">${p[2]}</span></button>`).join('')}
 </div>
 ${(etab==='all'||etab==='middles')?`<div class="card" style="margin-top:12px"><div class="card-head"><h2>🎯 Middles Scanner (Window Size, Hit Prob, EV & 2-Leg Split)</h2><span class="sub">${esc(ago(E.updated))}</span></div>${M.slice(0,etab==='middles'?50:12).map((m,i)=>middleCard(m,i)).join('')||'<p class="muted small">No middles within 5.5% worst-case hold right now.</p>'}</div>`:''}
 ${(etab==='all'||etab==='outliers')?`<div class="card" style="margin-top:14px"><div class="card-head"><h2>📈 Sharp-Weighted +EV Outliers (Shin / Power Devig + Kelly Sizing)</h2><span class="sub">${S.kelly==='flat'?'Flat sizing':S.kelly+'x Kelly'} on ${usd(S.bankroll)} bankroll</span></div>${O.slice(0,etab==='outliers'?60:15).map(evCard).join('')||'<p class="muted small">None for this filter.</p>'}</div>`:''}
 ${(etab==='all'||etab==='steam')?`<div class="card" style="margin-top:14px"><div class="card-head"><h2>🔥 Stale Lines & Multi-Book Steam</h2><span class="sub">books lagging a market move</span></div>${ST.slice(0,20).map(s=>`<div class="arb" style="padding:10px 12px;margin-bottom:8px"><div class="row" style="justify-content:space-between"><b>${esc(s.game)}</b> <span class="chip w">🔥 ${esc(s.market)} Steam</span></div><div class="small" style="margin-top:4px"><b>Moved:</b> ${s.moved.map(m=>`${vchip(m.book)} ${(m.from_pt??'')}→${(m.to_pt??'')} (${amer(m.from)}→${amer(m.to)})`).join(' · ')}</div><div class="small warn" style="margin-top:4px"><b>Lagging (Still Available):</b> ${s.unmoved.map(u=>`${vchip(u.book)} ${(u.pt??'')} @ ${amer(u.price)} (${u.price})`).join(' · ')}</div></div>`).join('')||'<p class="muted small">No books lagging a market move between the last two pulls.</p>'}</div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>What's priced in (Line History & Sparklines)</h2><span class="sub">open = first line recorded</span></div><div class="table-wrap"><table><tr><th>Game</th><th>Spread open → now</th><th>Total open → now</th><th>Win Prob Trend</th><th>News since open</th></tr>${PI.slice(0,40).map(p=>`<tr><td><b>${esc(p.game)}</b><div class="small muted">${esc(et(p.start))} ${p.steam?'<span class="chip w">🔥 Steam</span>':''}</div></td><td class="small">${sparkSvg(p.spark_spread,'#22d3ee')} ${p.spread_open??'—'} → <b>${p.spread_now??'—'}</b></td><td class="small">${sparkSvg(p.spark_total,'#5ed26a')} ${p.total_open??'—'} → <b>${p.total_now??'—'}</b></td><td class="small">${sparkSvg(p.spark_prob,'#f5b942')} ${p.home_prob_open!=null?pct(p.home_prob_open,1):'—'} → <b>${p.home_prob_now!=null?pct(p.home_prob_now,1):'—'}</b></td><td class="small">${(p.news_since_open||[]).map(n=>esc(et(n.t))+': '+esc(n.h)).join('<br>')||'<span class="muted">no team news logged</span>'}</td></tr>`).join('')}</table></div><p class="small muted">A line that moved after a news item has likely priced that news in. Movement with no news usually indicates sharp action.</p></div>`:''}`;
}
AFTER.edges=()=>{
 document.querySelectorAll('[data-edge-tab]').forEach(b=>b.onclick=()=>{S.edgeTab=b.dataset.edgeTab;ls.set('edgeTab',S.edgeTab);route()});
};

function bvm(){const G=D.m.games.filter(sf).filter(g=>g.legs);const pay=c=>c?usd(100/c-100):'—';
 const rows=[];for(const g of G)for(const s of ['home','away']){const L=g.legs[s];const bk=L.filter(l=>!isX(l)).sort((a,b)=>a.cost-b.cost)[0];const pm=L.filter(isX).map(xc).sort((a,b)=>a.cost-b.cost)[0];if(!bk&&!pm)continue;
  const f=s==='home'?(g.sharp_consensus??g.consensus):(g.sharp_consensus!=null?1-g.sharp_consensus:g.consensus!=null?1-g.consensus:null);
  rows.push({g,s,bk,pm,f,win:bk&&pm?(bk.cost<pm.cost?bk.venue:pm.venue):(bk||pm).venue})}
 return `${sportSel()}<div class="note info"><b>Two kinds of venue.</b> Sportsbooks set prices like the house and build in a margin (vig). Peer-to-peer exchanges are different: you trade against other people, no vig is built in, and you pay a trading fee instead (included below). Profit per $100 = what a $100 stake wins if it hits, after fees. Fair probability = execution-weighted Shin/Power vig-free consensus across venues.</div>
 <div class="card"><div class="table-wrap"><table><tr><th>Outcome</th><th>Best sportsbook</th><th class="num">Wins per $100</th><th>Best exchange (after fee)</th><th class="num">Wins per $100</th><th class="num">Sharp Fair</th><th>Pays more</th></tr>
 ${rows.map(r=>`<tr><td><b>${esc(r.g[r.s].full)}</b> to win<div class="small muted">${esc(r.g.away.abbr)} @ ${esc(r.g.home.abbr)} · ${esc(et(r.g.start))}</div></td><td>${r.bk?vchip(r.bk.venue)+' '+(r.bk.dec||'').toString():'—'}</td><td class="num">${pay(r.bk&&r.bk.cost)}</td><td>${r.pm?vchip(r.pm.venue)+' '+(r.pm.dec?r.pm.dec+' ('+(r.pm.fee*100).toFixed(0)+'% commission)':Math.round(r.pm.price*100)+'¢ (fee '+((r.pm.cost-r.pm.price)*100).toFixed(2)+'¢)'):'—'}</td><td class="num">${pay(r.pm&&r.pm.cost)}</td><td class="num">${r.f!=null?pct(r.f,1):'—'}</td><td>${vchip(r.win)}</td></tr>`).join('')}</table></div>
 <p class="small muted">Prices as of ${esc(et(D.m.updated))}. Cross-venue arbs and low-hold pairs are listed in the Arb Scanner with stake splits.</p></div>`}

window.addEventListener('hashchange',route);load();setInterval(load,10*60*1000);
})();
