(()=>{'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls={get:(k,d)=>{try{const v=localStorage.getItem('arb.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem('arb.'+k,JSON.stringify(v))}catch(e){}}};
const D={};const S={page:'overview',sport:ls.get('sport','all'),sort:'profit',bank:ls.get('bank',100),fb:ls.get('fb',25),boost:ls.get('boost',25),bstake:ls.get('bstake',25),nsr:ls.get('nsr',70)};
const PAGES=[['overview','Dashboard','◎'],['compare','Market Compare','⇄'],['bvm','Book vs Market','⚖'],['arbs','Arb Scanner','⚡'],['calc','Stake Calculator','∑'],['promos','Promo Tracker','★'],['convert','Promo Converter','↻'],['edges','Edges & Middles','△'],['method','How it works & caveats','ⓘ']];
const SPORTS=[['all','All'],['nfl','NFL'],['ncaaf','CFB'],['nhl','NHL'],['nba','NBA'],['mlb','MLB']];
const LOGO=`<svg width="30" height="30" viewBox="0 0 34 34"><rect x="1" y="1" width="32" height="32" rx="8" fill="#121c2a" stroke="#22d3ee" stroke-opacity=".5"/><path d="M8 22l6-10 6 6 6-9" stroke="#22d3ee" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 26h18" stroke="#5ed26a" stroke-width="2" stroke-linecap="round"/></svg>`;
const pct=(x,d=1)=>x==null||isNaN(x)?'—':(x*100).toFixed(d)+'%';
const usd=x=>x==null||isNaN(x)?'—':(x<0?'-$':'$')+Math.abs(x).toFixed(2);
const amer=d=>!d?'—':d>=2?'+'+Math.round((d-1)*100):String(Math.round(-100/(d-1)));
const et=s=>{try{return new Date(s).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET'}catch(e){return s}};
const ago=s=>{const m=(Date.now()-new Date(s))/6e4;return m<1?'just now':m<60?Math.round(m)+' min ago':m<1440?(m/60).toFixed(1)+' h ago':Math.round(m/1440)+' d ago'};
const vname=v=>v;
const vchip=v=>`<span class="chip ${v==='Exchange A'?'k':v==='Exchange B'?'p':'b'}">${esc(vname(v))}</span>`;
const isoET=t=>String(t||'').replace(/\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:?\d\d)?/g,m=>et(m));
const legPx=l=>l.type==='book'?`${l.am||amer(l.dec)} (${(l.dec||0).toFixed(3)})`:`${Math.round(l.price*100)}¢ + fee`;
const sf=x=>S.sport==='all'||x.sport===S.sport;
const empty=(t,b)=>`<div class="empty"><b>${esc(t)}</b>${b||''}</div>`;
async function load(){const f=n=>fetch('data/'+n+'?t='+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null);
 [D.m,D.a,D.p,D.o,D.meta,D.e]=await Promise.all(['markets.json','arbs.json','promos.json','overlap.json','meta.json','edges.json'].map(f));D.e=D.e||null;cleanArbs();route()}
/* Honesty filter: an arb needs 3+ venues on the game, and no leg may rest on a lone outlier price
   (a venue whose no-vig price for that side sits well off every other venue (log-odds gap 0.3+ vs the median, none within 0.15)). */
function cleanArbs(){const byId={};(D.m.games||[]).forEach(g=>byId[g.id]=g);
 const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
 const ok=a=>{const g=byId[a.id];if(!g)return false;const V=g.venues||{};if(Object.keys(V).length<3)return false;
  return a.legs.every(l=>{const me=V[l.venue];const others=Object.entries(V).filter(([k])=>k!==l.venue).map(([,x])=>x[l.side]).filter(x=>x!=null);
   if(!me||me[l.side]==null||others.length<2)return false;const p=me[l.side];
   const lg=x=>Math.log(Math.min(Math.max(x,1e-4),1-1e-4)/(1-Math.min(Math.max(x,1e-4),1-1e-4)));
   return !(Math.abs(lg(p)-lg(med(others)))>=.3&&others.every(o=>Math.abs(lg(o)-lg(p))>=.15))})};
 D.a.raw=D.a.arbs.length;D.a.arbs=D.a.arbs.filter(ok);D.a.near=(D.a.near||[]).filter(ok);
 D.m.games=(D.m.games||[]).map(g=>Object.keys(g.venues||{}).length>=3?g:{...g,gap:0,thin:true})}
const FREE_ARBS=2,isFree=()=>document.documentElement.getAttribute('data-sl-tier')==='free';
new MutationObserver(()=>{if(D.a&&typeof route==='function')route()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-sl-tier']});   // re-count when the plan is known
const arbCount=n=>isFree()&&n>FREE_ARBS?`${FREE_ARBS} free · ${n-FREE_ARBS} with Pro`:String(n);
function shell(){const cur=PAGES.find(p=>p[0]===S.page)||PAGES[0];
 $('#app').innerHTML=`<aside class="sidebar" id="sidebar"><div class="brand">${LOGO}<div><div class="brand-name">Arb Lab</div><div class="brand-sub">Arbs · Promos · Beta</div></div></div>
 <nav class="nav"><div class="nav-label">Scanner</div>${PAGES.slice(0,5).map(navb).join('')}<div class="nav-label">Promos</div>${PAGES.slice(5,7).map(navb).join('')}<div class="nav-label">More</div>${PAGES.slice(7).map(navb).join('')}
 <a class="nav-btn" href="https://betlab.sportslabshq.com/" style="text-decoration:none"><span class="ic">↗</span>Bet Lab</a><a class="nav-btn" href="https://sportslabshq.com/" style="text-decoration:none"><span class="ic">↗</span>Sports Labs</a></nav>
 <div class="sidebar-foot">Sportsbook and exchange lines<br>Prices are a snapshot, not live. Re-check every price before you place anything. Not financial advice. Bet and trade responsibly; 21+ where legal.</div></aside>
 <header class="header"><button class="btn ghost menu-btn" id="menuBtn" aria-label="Menu">☰</button><div><h1>${esc(cur[1])}</h1><div class="crumb">${D.meta?'Data updated '+esc(ago(D.meta.updated))+' · '+esc(et(D.meta.updated)):'Loading…'}</div></div>
 <div class="header-actions"><a class="btn sm hide-m" href="#method">Caveats</a></div></header>
 <main class="main" id="main"></main>`;
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.page;document.body.classList.remove('sidebar-open')});
 document.querySelectorAll('[data-sport]').forEach(b=>b.onclick=()=>{S.sport=b.dataset.sport;ls.set('sport',S.sport);route()});
 $('#menuBtn').onclick=()=>document.body.classList.toggle('sidebar-open');$('#scrim').onclick=()=>document.body.classList.remove('sidebar-open');}
function meter(){return ''}
const navb=p=>`<button class="nav-btn" data-page="${p[0]}" ${S.page===p[0]?'aria-current="page"':''}><span class="ic">${p[1]&&p[2]}</span>${esc(p[1])}</button>`;
const sportSel=()=>`<div class="seg" style="margin-bottom:12px">${SPORTS.map(s=>`<button data-sport="${s[0]}" aria-pressed="${S.sport===s[0]}">${s[1]}</button>`).join('')}</div>`;
function route(){S.page=(location.hash||'#overview').slice(1).split('/')[0];if(!PAGES.some(p=>p[0]===S.page))S.page='overview';shell();
 const m=$('#main');if(!D.meta){m.innerHTML=empty('No data yet','The first refresh has not run. Check back shortly.');return}
 m.innerHTML=({overview,compare,bvm,arbs,calc,promos,convert,edges,overlap,method}[S.page])();(AFTER[S.page]||(()=>{}))();
 document.querySelectorAll('#main [data-sport]').forEach(b=>b.onclick=()=>{S.sport=b.dataset.sport;ls.set('sport',S.sport);route()});m.scrollTop=0}
const AFTER={};
/* ---------- arb math ---------- */
function split(a,T){const sum=a.legs.reduce((s,l)=>s+l.cost,0),P=T/sum;
 return {P,sum,profit:P-T,round:a.legs.filter(l=>l.type==='xa').length*0.01,legs:a.legs.map(l=>({...l,stake:P*l.cost,units:l.type==='book'?null:P,fee:l.type==='book'?0:P*(l.cost-l.price)}))}}
function arbCard(a,i,live){const T=S.bank,s=split(a,T);
 const capT=a.max_cost!=null?a.max_cost:null;
 return `<div class="arb ${live?'live':''}"><div class="arb-top"><div><h3>${esc(a.game)}</h3><div class="small muted">${esc(a.league)} · ${esc(et(a.start))} · ${esc((a.market||'moneyline').toLowerCase())}${a.fetched?' · odds pulled '+esc(ago(a.fetched)):''}${a.stale_snapshot?' <span class="chip w">snapshot too old to trust</span>':''}</div></div>
 <div style="text-align:right"><div class="big ${live?'pos':'warn'}">${live?'+'+pct(a.profit_pct,2):(a.sum*100).toFixed(2)+'¢'}</div><div class="small muted">${live?'locked return before rounding':a.sum<1?'per $1 payout; only ~'+Math.floor(a.max_units||0)+' contracts deep, so fee rounding erases it':'per $1 payout, '+pct(1/a.sum-1,2)+' if locked'}</div></div></div>
 <div class="legs"${i<FREE_ARBS?' data-sl-public':''}>${s.legs.map(l=>`<div class="leg">${vchip(l.venue)} <b>${esc(l.label||l.team+' to win')}</b><div class="small muted">${esc(legPx(l))} · all-in ${(l.cost*100).toFixed(2)}¢ per $1 payout</div>
  <div style="margin-top:6px">Stake <b class="mono" style="display:inline">${usd(l.stake)}</b>${l.units!=null?` <span class="small muted">≈ ${l.units.toFixed(1)} contracts, fee ${usd(l.fee)}</span>`:''}</div></div>`).join('')}</div>
 ${live?`<div class="range" style="margin-top:10px"><div><small>Total stake</small><b>${usd(T)}</b></div><div><small>Payout either way</small><b>${usd(s.P)}</b></div><div><small>Guaranteed range</small><b class="pos">${usd(s.profit-s.round)} to ${usd(s.profit)}</b></div>
 <div><small>Max size at quoted depth</small><b>${a.book_limited?'Book limit':''}${a.max_units!=null?`${a.book_limited?' / ':''}${Math.floor(a.max_units).toLocaleString()} ct`:''}</b><small>${a.max_cost!=null?`${usd(capT)} in, ${usd(a.max_profit)} locked`:'sportsbook limits apply'}</small></div></div>`:''}
 <div class="small muted" style="margin-top:8px">${a.tie_risk?'<span class="chip w">Tie risk</span> NFL ties settle differently by venue (some grade 50-50, sportsbooks usually void the moneyline). ':''}${a.book_limited?'<span class="chip w">Book leg</span> Book prices come from '+(a.legs.some(l=>l.src==="ESPN")?"Book A":"a multi-book snapshot")+' and may have moved. ':''}</div></div>`}
/* ---------- pages ---------- */
function overview(){const G=D.m.games.filter(sf),A=D.a.arbs.filter(sf),N=D.a.near.filter(sf);
 const venues=new Set();G.forEach(g=>Object.keys(g.venues).forEach(v=>venues.add(v)));
 const gaps=[...G].filter(g=>Object.keys(g.venues).length>=3).sort((a,b)=>b.gap-a.gap).slice(0,6);
 const src=D.meta.sources;
 return `${sportSel()}<div class="grid kpis"><div class="card kpi"><div class="kpi-label">Games matched</div><div class="kpi-value">${G.length}</div><div class="kpi-delta">${G.filter(g=>Object.keys(g.venues).length>=3).length} on 3 venues</div></div>
 <div class="card kpi"><div class="kpi-label">Live arbs (after fees)</div><div class="kpi-value ${A.length?'pos':''}" style="${isFree()&&A.length>FREE_ARBS?'font-size:var(--t-md)':''}">${arbCount(A.length)}</div><div class="kpi-delta">${A.length?'best +'+pct(A[0].profit_pct,2):'none right now'}</div></div>
 <div class="card kpi"><div class="kpi-label">Biggest fair-prob gap</div><div class="kpi-value warn">${gaps[0]?pct(gaps[0].gap):'—'}</div><div class="kpi-delta">${gaps[0]?esc(gaps[0].away.abbr+' @ '+gaps[0].home.abbr):''}</div></div>
 <div class="card kpi"><div class="kpi-label">Promos found</div><div class="kpi-value">${D.p.promos.length}</div><div class="kpi-delta">${D.p.attempts.length} book pages checked</div></div></div>
 <div class="grid two" style="margin-top:16px"><div class="card"><div class="card-head"><h2>Top arbitrage</h2><a href="#arbs" class="sub">Open scanner →</a></div>
 ${A.length?A.slice(0,2).map((a,i)=>arbCard(a,i,true)).join(''):empty('No guaranteed-profit combos right now','0 right now. After every venue fee and exchange commission and using only prices under 20 minutes old, no combination locks a profit. That is the normal state; real arbs are rare and close fast.'+((D.a.stale||[]).length?' '+D.a.stale.length+' more would be arbs on older prices, so they are not shown.':''))+(N[0]?`<p class="small muted" style="margin-top:10px">Closest: ${esc(N[0].game)} at ${(N[0].sum*100).toFixed(2)}¢ per $1 (${vchip(N[0].legs[0].venue)}+${vchip(N[0].legs[1].venue)}).</p>`:'')}</div>
 <div class="card"><div class="card-head"><h2>Biggest cross-venue gaps</h2><a href="#compare" class="sub">Compare all →</a></div>${gaps.length?gaps.map(gapRow).join(''):empty('No multi-venue games','')}</div></div>
 <div class="card" style="margin-top:16px"><div class="card-head"><h2>Sources this run</h2><span class="sub">${esc(et(D.meta.updated))}</span></div><div class="table-wrap"><table><tr><th>Sport</th><th class="num">Upcoming games</th><th class="num">With Book A line</th><th>Multi-book</th></tr>
 ${src.map(s=>`<tr><td>${esc(s.sport)}</td><td class="num">${s.games}</td><td class="num">${s.with_lines}</td><td class="small ${(s.books||s.books||'').startsWith('ok')?'pos':'muted'}">${(s.books||s.books)==='no key'?'Multi-book prices off':esc(isoET(s.books||s.books||''))}</td></tr>`).join('')}</table></div></div>`}
function gapRow(g){const v=g.venues,ks=Object.keys(v);return `<div style="margin:10px 0"><div class="row" style="justify-content:space-between"><b>${esc(g.away.full)} @ ${esc(g.home.full)}</b><span class="small muted">${esc(g.league)} · gap <b class="warn">${pct(g.gap)}</b></span></div>
 ${ks.map(k=>`<div class="pb"><span>${vchip(k)}</span><div class="bar"><i style="left:0;width:${(v[k].home*100).toFixed(1)}%;background:${k==='Exchange A'?'#22d3ee':k==='Exchange B'?'#818cf8':'#5ed26a'}"></i></div><span class="mono">${pct(v[k].home)}</span></div>`).join('')}
 <div class="small muted">${esc(g.home.abbr)} win probability, no-vig</div></div>`}
function compare(){const G=D.m.games.filter(sf);if(!G.length)return sportSel()+empty('No upcoming games found for this sport','');
 const q=ls.get('q','');
 return `${sportSel()}<div class="note info">Fair probability removes the bookmaker's margin: each side's implied probability divided by the sum of both. A gap is only shown when 3 or more venues price the game. The gap is the spread between the highest and lowest venue for the home team.</div>
 <div class="card"><div class="card-head"><h2>${G.length} games</h2><input class="inp" id="q" placeholder="Filter team…" value="${esc(q)}" style="width:180px"></div><div class="table-wrap"><table id="ct"><tr><th>Game</th><th>Start</th><th class="num">Book A (no-vig)</th><th class="num">Gap</th><th>Prices (away / home)</th></tr>
 ${G.map(g=>{const v=g.venues,c=k=>v[k]?pct(v[k].home):'<span class="muted">—</span>';const lo=Math.min(...Object.values(v).map(x=>x.home)),hi=Math.max(...Object.values(v).map(x=>x.home));
 return `<tr data-t="${esc((g.name+' '+g.home.abbr+' '+g.away.abbr).toLowerCase())}"><td><b>${esc(g.away.abbr)} @ ${esc(g.home.abbr)}</b><div class="small muted">${esc(g.league)}</div></td><td class="small">${esc(et(g.start))}</td><td class="num">${c('Book A')}</td>
 <td class="num ${g.gap>=.03&&!g.thin?'warn':''}">${Object.keys(v).length>=3?pct(g.gap):'<span class="small muted">needs 3+ books</span>'}</td><td class="small">${Object.entries(v).map(([k,x])=>`${vchip(k)}${x.kind==='book'?esc(x.away_px)+' / '+esc(x.home_px):(x.away_px!=null?Math.round(x.away_px*100)+'¢':'—')+' / '+(x.home_px!=null?Math.round(x.home_px*100)+'¢':'—')}`).join(' ')}
</td></tr>`}).join('')}</table></div>
 <p class="small muted">Home-team win probability shown. Exchange prices are the cost to buy that side (ask). ${esc(((D.meta||{}).fees||{}).xa)}</p></div>`}
AFTER.compare=()=>{const f=()=>{const v=$('#q').value.toLowerCase();ls.set('q',v);document.querySelectorAll('#ct tr[data-t]').forEach(r=>r.style.display=r.dataset.t.includes(v)?'':'none')};$('#q').oninput=f;f()};
function arbs(){let A=D.a.arbs.filter(sf);const N=D.a.near.filter(sf);
 A=[...A].sort(S.sort==='volume'?(a,b)=>(b.max_profit||0)-(a.max_profit||0):(a,b)=>b.profit_pct-a.profit_pct);
 return `${sportSel()}<div class="card" style="margin-bottom:14px"><div class="row"><label class="f">Total stake ($)<input class="inp" id="bank" type="number" min="1" value="${S.bank}"></label>
 <div class="seg"><button data-sort="profit" aria-pressed="${S.sort==='profit'}">Rank by profit %</button><button data-sort="volume" aria-pressed="${S.sort==='volume'}">Rank by max volume</button></div>
 <span class="small muted" style="flex:1;min-width:220px">Costs include each venue's fees and commissions. Max size walks the live order book until the combined price reaches $1.</span></div></div>
 ${A.length?`<h2 style="font-size:var(--t-md);margin:0 0 10px">${A.length} live arb${A.length===1?'':'s'}${isFree()&&A.length>FREE_ARBS?` <span class="small muted">· ${arbCount(A.length)}</span>`:''}</h2>`:''}${A.length?A.map((a,i)=>arbCard(a,i,true)).join(''):empty('No guaranteed-profit combos right now','0 right now. Every combination costs at least $1 per $1 of payout after all venue fees, or uses a price over 20 minutes old. Checked '+esc(ago(D.a.updated))+'.'+((D.a.stale||[]).length?' '+D.a.stale.length+' more would be arbs on older prices, so they are not shown.':''))}
 <h2 style="font-size:var(--t-md);margin:22px 0 4px">Closest to an arb</h2><p class="small muted" style="margin:0 0 10px">These are <b>not</b> profitable. They show how close the market is, which is where an odds boost or a free bet can tip the result into a lock (see Promo Converter).</p>
 ${N.length?N.slice(0,8).map((a,i)=>arbCard(a,i,false)).join(''):empty('Nothing close','')}`}
AFTER.arbs=()=>{$('#bank').onchange=e=>{S.bank=Math.max(1,+e.target.value||100);ls.set('bank',S.bank);route()};document.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{S.sort=b.dataset.sort;route()})};
/* ---------- manual calculator ---------- */
const VT=[['am','Sportsbook (American)'],['dec','Sportsbook (decimal)']];
function legIn(n,d){return `<div class="leg"><b>Outcome ${n}</b><div class="row" style="margin-top:6px"><label class="f">Venue<select class="inp" id="t${n}" style="width:190px">${VT.map(v=>`<option value="${v[0]}" ${d.t===v[0]?'selected':''}>${v[1]}</option>`).join('')}</select></label>
 <label class="f">Price / odds<input class="inp" id="p${n}" value="${d.p}"></label><label class="f">Poly fee rate<input class="inp" id="r${n}" value="${d.r}" style="width:80px"></label></div></div>`}
function costOf(t,p,r){p=+p;if(t==='am')return p>0?100/(p+100):p<0?-p/(-p+100):NaN;if(t==='dec')return p>1?1/p:NaN;const x=p/100;if(t==='kal')return x+0.07*x*(1-x);return x+(+r||0)*x*(1-x)}
function calc(){return `<div class="card"><div class="card-head"><h2>Two-way arbitrage and hedge calculator</h2><span class="sub">Enter any two opposite outcomes</span></div>
 <div class="legs">${legIn(1,{t:'kal',p:38,r:0.05})}${legIn(2,{t:'poly',p:59,r:0.05})}</div><div class="row" style="margin-top:12px"><label class="f">Total stake ($)<input class="inp" id="T" type="number" value="${S.bank}"></label></div><div class="out" id="out"></div></div>
 <div class="note">Use exact rules for both venues. A combo is only an arb if both sides settle on the same event the same way, including overtime, ties, postponements and player withdrawals.</div>`}
AFTER.calc=()=>{const run=()=>{const c1=costOf($('#t1').value,$('#p1').value,$('#r1').value),c2=costOf($('#t2').value,$('#p2').value,$('#r2').value),T=+$('#T').value||0;
 if(!(c1>0&&c2>0)){$('#out').innerHTML='<span class="neg">Enter valid prices.</span>';return}const sum=c1+c2,P=T/sum,kr=[$('#t1').value,$('#t2').value].filter(x=>x==='kal').length*.01;
 $('#out').innerHTML=`<div class="range"><div><small>Cost per $1 payout</small><b class="${sum<1?'pos':'neg'}">${(sum*100).toFixed(2)}¢</b></div><div><small>Stake outcome 1</small><b>${usd(P*c1)}</b></div><div><small>Stake outcome 2</small><b>${usd(P*c2)}</b></div><div><small>Payout either way</small><b>${usd(P)}</b></div><div><small>${sum<1?'Guaranteed profit':'Guaranteed loss'}</small><b class="${sum<1?'pos':'neg'}">${usd(P-T-kr)}${kr?' to '+usd(P-T):''} (${pct(1/sum-1,2)})</b></div></div>`};
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
const fbLock=(F,d,c)=>F*(d-1)*(1-c);                        // free bet, stake not returned
const boostLock=(S_,d,b,c)=>{const db=1+(d-1)*(1+b);return S_*(db*(1-c)-1)};
const nsLock=(S_,d,r,c)=>{const H=S_*(d-r)*c;return S_*(d-1)-H}; // no-sweat refund as free bet worth r per $
function combos(){const out=[];for(const g of D.m.games.filter(sf)){if(!g.legs)continue;for(const s of ['home','away']){const o=s==='home'?'away':'home';
 for(const L of g.legs[s].filter(l=>l.type==='book')){const H=g.legs[o].filter(h=>h.venue!==L.venue).sort((a,b)=>a.cost-b.cost)[0];if(!H)continue;
 out.push({game:`${g.away.abbr} @ ${g.home.abbr}`,league:g.league,start:g.start,team:g[s].full,opp:g[o].full,book:L.venue,d:L.dec,am:L.am,h:H})}}}return out}
function bestFor(m){const C=combos();let best=null;for(const x of C){const v=m.k==='free_bet'?fbLock(m.a,x.d,x.h.cost):m.k==='profit_boost'?boostLock(m.a,x.d,(m.p||0)/100,x.h.cost):nsLock(m.a,x.d,S.nsr/100,x.h.cost);if(!best||v>best.locked)best={locked:v,game:x.game}}return best}
function convert(){const C=combos();
 const fb=C.map(x=>({...x,v:fbLock(S.fb,x.d,x.h.cost)})).sort((a,b)=>b.v-a.v).slice(0,10);
 const bo=C.map(x=>({...x,v:boostLock(S.bstake,x.d,S.boost/100,x.h.cost)})).sort((a,b)=>b.v-a.v).slice(0,10);
 const tbl=(R,kind)=>R.length?`<div class="table-wrap"><table><tr><th>Bet (promo)</th><th class="num">Odds</th><th>Hedge</th><th class="num">Hedge stake</th><th class="num">Locked</th><th class="num">${kind==='fb'?'Conversion':'Return'}</th></tr>${R.map(x=>{const dB=1/x.h.cost;
 const hs=kind==='fb'?S.fb*(x.d-1)/dB:S.bstake*(1+(x.d-1)*(1+S.boost/100))/dB;
 return `<tr><td><b>${esc(x.team)}</b><div class="small muted">${esc(x.game)} · ${esc(x.league)} · ${esc(et(x.start))}</div></td><td class="num">${esc(x.am||amer(x.d))}${kind==='bo'?`<div class="small muted">boosted ${amer(1+(x.d-1)*(1+S.boost/100))}</div>`:''}</td><td>${vchip(x.h.venue)} ${esc(x.opp)}<div class="small muted">${x.h.type==='book'?esc(x.h.am||amer(x.h.dec)):Math.round(x.h.price*100)+'¢ + fee'}</div></td><td class="num">${usd(hs)}</td><td class="num ${x.v>0?'pos':'neg'}">${usd(x.v)}</td><td class="num">${kind==='fb'?pct(x.v/S.fb):pct(x.v/S.bstake)}</td></tr>`}).join('')}</table></div>`:empty('No sportsbook lines to pair with','Promo conversion needs a sportsbook price on one side. None were available for this filter.');
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
function method(){const f=D.meta.fees;return `<div class="grid two"><div class="card"><div class="card-head"><h2>What Arb Lab does</h2></div><p>Every refresh pulls upcoming NFL, college football, NHL, NBA and MLB games from a public scoreboard feed, along with the published Book A moneyline. It then lines up every venue's price for the same game by teams and start time.</p>
 <p><b>Fair probability.</b> For a sportsbook, each side's implied probability is divided by the two-side total, which removes the vig. For exchanges, the bid/ask midpoint is normalized.</p>
 <p><b>Arbitrage.</b> Each way to buy $1 of payout on each side is costed all-in, including the exchange taker fee. If the cheapest home cost plus the cheapest away cost is under $1, the difference is locked. Max size walks both order books level by level until the combined marginal price reaches $1.</p>
 <h3 style="font-size:var(--t-sm)">Fees used</h3><p class="small">${esc(f.books)}</p></div>
 <div class="card"><div class="card-head"><h2>The honest caveats</h2></div><ul style="padding-left:18px;margin:0;line-height:1.6">
 <li><b>Snapshot, not live.</b> Prices refresh about every 30 minutes, and arbs often close in seconds. Re-check both prices, then place the less liquid leg first.</li>
 <li><b>Rule differences.</b> Sportsbooks and exchanges can grade the same game differently, for example on ties, postponements, overtime or a change of venue. One mismatch turns a lock into a loss.</li>
 <li><b>Limits and voids.</b> Books limit or void winning arbitrage and promo bettors. Order books can be thinner than shown by the time you trade.</li>
 <li><b>Settlement timing.</b> Venues settle on different schedules, and some take hours or days. Your capital is tied up until then.</li>
 <li><b>Access.</b> Sportsbooks and exchanges are state-dependent, and promo eligibility depends on your state and account.</li>
 <li><b>Rounding and fees.</b> Fees and rounding can make very small arbs vanish. Deposits and withdrawals can carry extra costs.</li></ul></div></div>
 <div class="card" style="margin-top:16px"><div class="card-head"><h2>Data status</h2><span class="sub">${esc(et(D.meta.updated))}</span></div>
 <p>${D.meta.multi_book?'<span class="chip b">Multi-book on</span> Prices from several books are included.':'<span class="chip w">Single book</span> Only Book A lines are available right now.'}</p>
 </div>`}

function edges(){const E=D.e;if(!E)return empty('No edge data yet','Runs after the next multi-book pull.');const L=x=>x.legs.map(l=>`${vchip(l.venue)} ${esc(l.label)} @ ${l.dec}`).join(' + ');
 const c=E.clv||{};
 return `${sportSel()}<div class="note info"><b>Labels matter.</b> <b>Arb</b> = guaranteed if both prices still stand. <b>Middle</b> = small worst-case loss, both bets win if the result lands between the numbers. <b>Stale line</b> and <b>Outlier</b> = estimated +EV versus the other books, <b>not guaranteed</b>. Every alert is graded later by closing-line value.</div>
 <div class="grid kpis"><div class="card kpi"><div class="kpi-label">Alerts logged</div><div class="kpi-value">${c.alerts||0}</div></div><div class="card kpi"><div class="kpi-label">Graded by CLV</div><div class="kpi-value">${c.graded||0}</div><div class="kpi-delta">${c.avg_clv!=null?'avg CLV '+pct(c.avg_clv,2)+' · beat close '+c.beat_close:'grades after games start'}</div></div></div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>Middles</h2><span class="sub">${esc(ago(E.updated))}</span></div>${E.middles.filter(sf).slice(0,12).map(m=>`<div style="margin:8px 0"><b>${esc(m.game)}</b> <span class="small muted">${esc(m.market)} · both win on ${(m.hits||[]).join(", ")} · ${esc(et(m.start))}</span><div class="small">${L(m)}</div><div class="small muted">If it misses the middle: ${pct(m.worst,2)} · if it hits: +${pct(m.best,2)}</div></div>`).join('')||'<p class="muted small">No middles within 6% worst-case right now.</p>'}</div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>Stale lines</h2><span class="sub">books that have not moved yet</span></div>${E.stale.slice(0,12).map(s=>`<div style="margin:8px 0"><b>${esc(s.game)}</b> <span class="small muted">${esc(s.market)}</span><div class="small">Moved: ${s.moved.map(m=>esc(m.book)+' '+(m.from_pt??'')+'→'+(m.to_pt??'')+' ('+m.from+'→'+m.to+')').join(', ')}</div><div class="small warn">Not moved: ${s.unmoved.map(u=>esc(u.book)+' '+(u.pt??'')+' @ '+u.price).join(', ')}</div></div>`).join('')||'<p class="muted small">No books lagging a market move between the last two pulls.</p>'}</div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>Outlier prices</h2><span class="sub">estimated edge vs other books</span></div>${E.outliers.filter(o=>o&&o.dec!=null).filter(sf).slice(0,15).map(o=>`<div class="small" style="margin:6px 0"><b>${esc(o.game)}</b> · ${vchip(o.book)} ${esc(o.label)} @ ${o.dec} · consensus fair ${pct(o.fair)} · est. edge <b class="pos">+${pct(o.ev,1)}</b></div>`).join('')||'<p class="muted small">None.</p>'}</div>
 <div class="card" style="margin-top:14px"><div class="card-head"><h2>What's priced in</h2><span class="sub">estimates · open = first line we recorded</span></div><div class="table-wrap"><table><tr><th>Game</th><th>Spread open → now</th><th>Total open → now</th><th>News since open</th></tr>${E.priced_in.filter(sf).slice(0,40).map(p=>`<tr><td><b>${esc(p.game)}</b><div class="small muted">${esc(et(p.start))}</div></td><td class="small">${p.spread_open??'—'} → ${p.spread_now??'—'}</td><td class="small">${p.total_open??'—'} → ${p.total_now??'—'}</td><td class="small">${p.news_since_open.map(n=>esc(et(n.t))+': '+esc(n.h)).join('<br>')||'<span class="muted">no team news logged</span>'}</td></tr>`).join('')}</table></div><p class="small muted">A line that moved after a news item has likely priced that news in. Movement with no news usually means sharp money.</p></div>`}

function bvm(){const G=D.m.games.filter(sf).filter(g=>g.legs);const pay=c=>c?usd(100/c-100):'—';
 const rows=[];for(const g of G)for(const s of ['home','away']){const L=g.legs[s];const bk=L.filter(l=>l.type==='book').sort((a,b)=>a.cost-b.cost)[0];const pm=L.filter(l=>l.type!=='book').sort((a,b)=>a.cost-b.cost)[0];if(!bk&&!pm)continue;
  const fair=Object.values(g.venues).map(v=>v[s]);const f=fair.length?fair.reduce((a,b)=>a+b,0)/fair.length:null;
  rows.push({g,s,bk,pm,f,win:bk&&pm?(bk.cost<pm.cost?bk.venue:pm.venue):(bk||pm).venue})}
 return `${sportSel()}<div class="note info"><b>Two kinds of venue.</b> Sportsbooks set prices like the house and build in a margin (vig). Peer-to-peer exchanges are different: you trade against other people, no vig is built in, and you pay a trading fee instead (included below). Profit per $100 = what a $100 stake wins if it hits, after fees. Fair probability = vig-free average across venues (estimate).</div>
 <div class="card"><div class="table-wrap"><table><tr><th>Outcome</th><th>Best sportsbook</th><th class="num">Wins per $100</th><th>Best exchange (after fee)</th><th class="num">Wins per $100</th><th class="num">Fair prob.</th><th>Pays more</th></tr>
 ${rows.map(r=>`<tr><td><b>${esc(r.g[r.s].full)}</b> to win<div class="small muted">${esc(r.g.away.abbr)} @ ${esc(r.g.home.abbr)} · ${esc(et(r.g.start))}</div></td><td>${r.bk?vchip(r.bk.venue)+' '+(r.bk.dec||'').toString():'—'}</td><td class="num">${pay(r.bk&&r.bk.cost)}</td><td>${r.pm?vchip(r.pm.venue)+' '+Math.round(r.pm.price*100)+'¢ (fee '+((r.pm.cost-r.pm.price)*100).toFixed(2)+'¢)':'—'}</td><td class="num">${pay(r.pm&&r.pm.cost)}</td><td class="num">${r.f!=null?pct(r.f):'—'}</td><td>${vchip(r.win)}</td></tr>`).join('')}</table></div>
 <p class="small muted">Prices as of ${esc(et(D.m.updated))}. ${esc(((D.meta||{}).fees||{}).xa)} ${esc(((D.meta||{}).fees||{}).xb)} Cross-venue arbs (book on one side, exchange on the other) are listed in the Arb Scanner with stake splits. Player props: not covered yet (see How it works).</p></div>`}
window.addEventListener('hashchange',route);load();setInterval(load,10*60*1000);
})();
