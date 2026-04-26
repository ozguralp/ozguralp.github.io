let posts = [];
let map = null;
let currentView = 'list';

const CONTINENT_ORDER = ['turkey','europe','asia','south-america','north-america','africa','global'];
const CONTINENT_LABELS = {
  'turkey':'Türkiye','europe':'Europe','asia':'Asia','south-america':'South America',
  'north-america':'North America','africa':'Africa','global':'Misc'
};
const FLAGS = {
  'Turkey':'\u{1F1F9}\u{1F1F7}','North Cyprus':'\u{1F1E8}\u{1F1FE}',
  'Greece':'\u{1F1EC}\u{1F1F7}','Bulgaria':'\u{1F1E7}\u{1F1EC}',
  'Belgium':'\u{1F1E7}\u{1F1EA}','Netherlands':'\u{1F1F3}\u{1F1F1}',
  'Portugal':'\u{1F1F5}\u{1F1F9}','Spain':'\u{1F1EA}\u{1F1F8}',
  'Italy':'\u{1F1EE}\u{1F1F9}','France':'\u{1F1EB}\u{1F1F7}',
  'Germany':'\u{1F1E9}\u{1F1EA}','U.K.':'\u{1F1EC}\u{1F1E7}',
  'Switzerland':'\u{1F1E8}\u{1F1ED}','Croatia':'\u{1F1ED}\u{1F1F7}',
  'Hungary':'\u{1F1ED}\u{1F1FA}','Poland':'\u{1F1F5}\u{1F1F1}',
  'Iceland':'\u{1F1EE}\u{1F1F8}','Finland':'\u{1F1EB}\u{1F1EE}',
  'U.S.A.':'\u{1F1FA}\u{1F1F8}','Mexico':'\u{1F1F2}\u{1F1FD}',
  'Cuba':'\u{1F1E8}\u{1F1FA}','Costa Rica':'\u{1F1E8}\u{1F1F7}',
  'Peru':'\u{1F1F5}\u{1F1EA}','Bolivia':'\u{1F1E7}\u{1F1F4}',
  'Chile':'\u{1F1E8}\u{1F1F1}','Argentina':'\u{1F1E6}\u{1F1F7}',
  'Colombia':'\u{1F1E8}\u{1F1F4}','Peru / Bolivia':'\u{1F1F5}\u{1F1EA}',
  'South Africa':'\u{1F1FF}\u{1F1E6}','Botswana':'\u{1F1E7}\u{1F1FC}',
  'Morocco':'\u{1F1F2}\u{1F1E6}','Zambia':'\u{1F1FF}\u{1F1F2}',
  'Zimbabwe':'\u{1F1FF}\u{1F1FC}',
  'Japan':'\u{1F1EF}\u{1F1F5}','Hong Kong':'\u{1F1ED}\u{1F1F0}',
  'Macau':'\u{1F1F2}\u{1F1F4}','Nepal':'\u{1F1F3}\u{1F1F5}',
  'Georgia':'\u{1F1EC}\u{1F1EA}',
};

function formatDate(d){if(!d)return'';const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const p=d.split('-');return p.length===3?`${months[+p[1]-1]} ${+p[2]}, ${p[0]}`:d;}

// ─── INIT ───
async function init(){
  const r=await fetch('data.json');
  posts=await r.json();
  renderStats();
  renderList();
  // Check for ?view= param (from country/post page navigation)
  const params=new URLSearchParams(window.location.search);
  const viewParam=params.get('view');
  if(viewParam&&['list','map','timeline'].includes(viewParam)){switchView(viewParam);}
  else{restoreState();}
}

function renderStats(){
  const countries=new Set(posts.map(p=>p.country_display).filter(Boolean)).size;
  const cities=new Set(posts.filter(p=>p.city&&p.city!=='General'&&p.city!=='').map(p=>p.city)).size;
  document.getElementById('statsBar').innerHTML=`
    <div class="stat"><span class="stat-num">6</span><span class="stat-label">Continents</span></div>
    <div class="stat"><span class="stat-num">${countries}</span><span class="stat-label">Countries</span></div>
    <div class="stat"><span class="stat-num">${cities}</span><span class="stat-label">Cities</span></div>
    <div class="stat"><span class="stat-num">${posts.length}</span><span class="stat-label">Posts</span></div>
    <div class="stat"><span class="stat-num" id="reviewCountStat">-</span><span class="stat-label">Place Reviews</span></div>`;
  // Load review count async
  fetch('gmaps_reviews.json').then(r=>r.json()).then(d=>{document.getElementById('reviewCountStat').textContent=d.length;}).catch(()=>{});
}

// ─── VIEW SWITCHING ───
function switchView(view){
  currentView=view;
  document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  document.getElementById('listView').style.display=view==='list'?'block':'none';
  document.getElementById('mapView').style.display=view==='map'?'block':'none';
  document.getElementById('timelineView').style.display=view==='timeline'?'block':'none';
  if(view==='map'){initMap();setTimeout(()=>map.invalidateSize(),100);}
  if(view==='timeline')renderTimeline();
}

// ─── LIST VIEW ───
function renderList(filter=''){
  const c=document.getElementById('listContent');
  const lc=filter.toLowerCase();
  const grouped={};
  CONTINENT_ORDER.forEach(k=>grouped[k]={});
  posts.forEach(p=>{
    if(lc&&!p.title.toLowerCase().includes(lc)&&!(p.country_display||'').toLowerCase().includes(lc)&&!(p.city||'').toLowerCase().includes(lc)&&!(p.body||'').toLowerCase().includes(lc))return;
    const cont=CONTINENT_ORDER.includes(p.continent)?p.continent:'global';
    if(!grouped[cont])grouped[cont]={};
    const ck=p.country_display||'Other';
    if(!grouped[cont][ck])grouped[cont][ck]=[];
    grouped[cont][ck].push(p);
  });
  let html='';
  for(const cont of CONTINENT_ORDER){
    const countries=grouped[cont]||{};
    const keys=Object.keys(countries).sort();
    if(!keys.length)continue;
    const total=keys.reduce((s,k)=>s+countries[k].length,0);
    const isOpen=lc?' open':'';
    html+=`<div class="continent-group${isOpen}" data-continent="${cont}">
      <div class="continent-header" onclick="this.parentElement.classList.toggle('open')">
        <div style="display:flex;align-items:center;gap:.75rem">
          <span class="continent-name">${CONTINENT_LABELS[cont]||cont}</span>
          <span class="continent-count">${keys.length} countries &middot; ${total} posts</span>
        </div><span class="continent-chevron">&#9654;</span>
      </div><div class="continent-body">`;
    for(const cn of keys){
      const cp=countries[cn];
      const flag=FLAGS[cn]||'';
      if(cn==='U.S.A.'){html+=renderUSA(cp,lc);continue;}
      if(cont==='turkey'&&cn==='Türkiye'){html+=renderTurkey(cp,lc);continue;}
      html+=`<div class="country-group${lc?' open':''}" data-country="${cn}">
        <div class="country-header" onclick="this.parentElement.classList.toggle('open')">
          <span class="country-name">${flag?flag+' ':''}<a href="countries/${cn.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'')}.html" class="country-page-link" onclick="event.stopPropagation()">${cn}</a></span>
          <span class="country-count">${cp.length}</span>
        </div><div class="country-body">`;
      cp.filter(p=>!p.city||p.city==='General'||p.city==='').forEach(p=>html+=postCard(p));
      cp.filter(p=>p.city&&p.city!=='General'&&p.city!=='').forEach(p=>html+=postCard(p));
      html+=`</div></div>`;
    }
    html+=`</div></div>`;
  }
  c.innerHTML=html;
}

function renderTurkey(cp,lc){
  const cities={};
  cp.forEach(p=>{const c=p.turkey_city||p.country_display||'Other';if(!cities[c])cities[c]=[];cities[c].push(p);});
  let html=`<div class="country-group${lc?' open':''}" data-country="Türkiye">
    <div class="country-header" onclick="this.parentElement.classList.toggle('open')">
      <span class="country-name">\u{1F1F9}\u{1F1F7} <a href="countries/turkey.html" class="country-page-link" onclick="event.stopPropagation()">Türkiye</a></span>
      <span class="country-count">${cp.length}</span>
    </div><div class="country-body">`;
  for(const[city,sp] of Object.entries(cities).sort((a,b)=>a[0].localeCompare(b[0],'tr'))){
    html+=`<div class="state-group"><div class="state-label">${city}</div>`;
    sp.forEach(p=>html+=postCard(p));
    html+=`</div>`;
  }
  return html+`</div></div>`;
}

function renderUSA(cp,lc){
  const states={};
  cp.forEach(p=>{const s=p.state||'Other';if(!states[s])states[s]=[];states[s].push(p);});
  let html=`<div class="country-group${lc?' open':''}" data-country="U.S.A.">
    <div class="country-header" onclick="this.parentElement.classList.toggle('open')">
      <span class="country-name">\u{1F1FA}\u{1F1F8} U.S.A.</span>
      <span class="country-count">${cp.length}</span>
    </div><div class="country-body">`;
  for(const[state,sp] of Object.entries(states).sort()){
    html+=`<div class="state-group"><div class="state-label">${state}</div>`;
    sp.forEach(p=>html+=postCard(p));
    html+=`</div>`;
  }
  return html+`</div></div>`;
}

function postCard(p){
  let t=p.title;
  if(p.review_num>0)t+=` (Review ${p.review_num})`;
  const type=p.post_type||'';
  const date=formatDate(p.date);
  const wine=p.has_wine?'<span class="wine-badge" title="Wine content">\u{1F377}</span>':'';
  const rating=p.rating?`<span class="rating-badge" title="Rating: ${p.rating}/10">${p.rating}/10</span>`:'';
  return`<a class="post-card" href="posts/${p.slug}.html?from=${currentView}" onclick="saveScrollState()">
    <span class="post-dot"></span>
    <div class="post-info">
      <div class="post-title">${t} ${wine}${rating}</div>
      <div class="post-meta">${type?'<span class="post-type-badge">'+type+'</span> &middot; ':''} ${date} &middot; ${p.reading_time||1} min</div>
    </div></a>`;
}

function filterPosts(){renderList(document.getElementById('searchInput').value);}

// ─── MAP VIEW ───
function initMap(){
  if(map)return;
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const tileUrl=isDark
    ?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    :'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  map=L.map('map',{scrollWheelZoom:true}).setView([25,20],2);
  L.tileLayer(tileUrl,{attribution:'&copy; OpenStreetMap &copy; CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);

  const icon=L.divIcon({className:'custom-marker',
    html:'<div style="width:12px;height:12px;background:#c2410c;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
    iconSize:[12,12],iconAnchor:[6,6],popupAnchor:[0,-8]});

  const locMap={};
  posts.forEach(p=>{if(!p.lat&&!p.lng)return;const k=`${p.lat.toFixed(1)},${p.lng.toFixed(1)}`;if(!locMap[k])locMap[k]=[];locMap[k].push(p);});

  Object.values(locMap).forEach(group=>{
    const p0=group[0];
    let popup='';
    if(group.length===1){
      const subtitle=p0.title!==p0.country_display?p0.country_display:'';
      popup=`<div class="popup-title">${p0.title}</div>${subtitle?'<div class="popup-meta">'+subtitle+'</div>':''}
        <a class="popup-link" href="posts/${p0.slug}.html?from=map" onclick="saveScrollState()">Read &rarr;</a>`;
    }else{
      const loc=group[0].city&&group[0].city!=='General'?group[0].city:group[0].country_display;
      const metaCountry=loc!==group[0].country_display?group[0].country_display:'';
      popup=`<div class="popup-title">${loc}</div>${metaCountry?'<div class="popup-meta">'+metaCountry+'</div>':''}`;
      const allSame=group.every(g=>g.title===group[0].title);
      group.forEach((p,i)=>{
        const label=allSame&&group.length>1?`Read (${i+1})`:(p.review_num>0?`${p.title} (Review ${p.review_num})`:p.title);
        popup+=`<a class="popup-link" href="posts/${p.slug}.html?from=map" onclick="saveScrollState()" style="display:block">${label} &rarr;</a>`;
      });
    }
    L.marker([p0.lat,p0.lng],{icon}).bindPopup(popup,{maxWidth:280}).addTo(map);
  });

  // Google Maps reviews overlay
  loadGMapsReviews();
}

let gmapsLayer=null;
let gmapsVisible=false;

async function loadGMapsReviews(){
  try{
    const r=await fetch('gmaps_reviews.json');
    const reviews=await r.json();
    if(!reviews.length)return;

    const ratingColors={5:'#16a34a',4:'#65a30d',3:'#ca8a04',2:'#ea580c',1:'#dc2626'};
    const group=L.layerGroup();

    reviews.forEach(rev=>{
      if(!rev.lat||!rev.lng)return;
      const color=ratingColors[rev.rating]||'#9ca3af';
      const rIcon=L.divIcon({className:'gmaps-dot',
        html:`<div style="width:8px;height:8px;background:${color};border:1.5px solid #fff;border-radius:50%;opacity:.7"></div>`,
        iconSize:[8,8],iconAnchor:[4,4],popupAnchor:[0,-6]});
      const stars='★'.repeat(rev.rating)+'☆'.repeat(5-rev.rating);
      const text=rev.text?`<div style="margin:.35rem 0;font-size:.75rem;color:#444;line-height:1.4;max-height:160px;overflow-y:auto">${rev.text}</div>`:'';
      const popup=`<div style="font-family:'DM Sans',sans-serif;font-size:.8125rem;max-width:260px">
        <div style="font-weight:600">${rev.name}</div>
        <div style="color:#ca8a04">${stars}</div>
        ${text}
        <div style="color:#666;font-size:.7rem;margin-top:.25rem">${rev.address.split(',').slice(-2).join(',').trim()}</div>
        ${rev.maps_url?`<a href="${rev.maps_url}" target="_blank" style="color:#c2410c;font-size:.75rem;font-weight:600;display:block;margin-top:.35rem">View on Google Maps &rarr;</a>`:''}
      </div>`;
      L.marker([rev.lat,rev.lng],{icon:rIcon}).bindPopup(popup,{maxWidth:250}).addTo(group);
    });

    gmapsLayer=group;
    // Add toggle button to map
    const btn=L.control({position:'topright'});
    btn.onAdd=function(){
      const div=L.DomUtil.create('div','gmaps-toggle');
      div.innerHTML=`<button onclick="toggleGMaps()" id="gmapsBtn" style="background:var(--card-bg,#f5f5f4);border:1px solid var(--border,#e7e5e4);border-radius:6px;padding:4px 10px;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;color:var(--text-muted,#57534e)">📍 Show Place Reviews (${reviews.length})</button>`;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    btn.addTo(map);
  }catch(e){}
}

function toggleGMaps(){
  if(!gmapsLayer||!map)return;
  gmapsVisible=!gmapsVisible;
  if(gmapsVisible){gmapsLayer.addTo(map);document.getElementById('gmapsBtn').style.borderColor='#c2410c';document.getElementById('gmapsBtn').style.color='#c2410c';}
  else{map.removeLayer(gmapsLayer);document.getElementById('gmapsBtn').style.borderColor='';document.getElementById('gmapsBtn').style.color='';}
}

// ─── TIMELINE VIEW ───
function renderTimeline(){
  const c=document.getElementById('timelineContent');
  const tripsMap={};
  posts.filter(p=>p.trip_id && !p.exclude_from_timeline).forEach(p=>{
    if(!tripsMap[p.trip_id])tripsMap[p.trip_id]={name:p.trip_name,posts:[]};
    tripsMap[p.trip_id].posts.push(p);
  });
  const trips=Object.entries(tripsMap).sort((a,b)=>{
    const da=a[1].posts[0]?.date||'';const db=b[1].posts[0]?.date||'';
    return da<db?1:-1;
  });

  let html='';
  for(const[id,trip] of trips){
    // Sort oldest first within trip (chronological travel order)
    const sorted=trip.posts.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const tripDates=sorted[0]?.trip_dates||'';
    const countries=[...new Set(sorted.map(p=>p.country_display))].filter(Boolean);
    const period=tripDates||formatDate(sorted[0]?.date);

    html+=`<div class="timeline-trip">
      <div class="timeline-trip-header">
        <h3>${trip.name}</h3>
        <span class="timeline-meta">${period} &middot; ${sorted.length} stops</span>
      </div>
      <div class="timeline-route">`;
    sorted.forEach((p,i)=>{
      // Show flag — Turkey gets TR flag too
      let flag=FLAGS[p.country_display]||'';
      if(p.continent==='turkey'&&!flag) flag='\u{1F1F9}\u{1F1F7}';
      // Show city under country name for context
      const tc=p.turkey_city||p.state||'';
      const subtitle=tc&&tc!==p.title?tc:'';
      html+=`<a class="timeline-stop" href="posts/${p.slug}.html?from=timeline" onclick="saveScrollState()">
        <span class="timeline-dot"></span>
        <span class="timeline-stop-info">
          <span class="timeline-stop-title">${flag} ${p.title}</span>
          ${subtitle?'<span class="timeline-stop-date">'+subtitle+'</span>':''}
        </span>
      </a>`;
      if(i<sorted.length-1)html+=`<div class="timeline-connector"></div>`;
    });
    html+=`</div></div>`;
  }
  c.innerHTML=html;
}

// ─── SCROLL STATE ───
function saveScrollState(){
  const oc=[...document.querySelectorAll('.continent-group.open')].map(e=>e.dataset.continent);
  const ok=[...document.querySelectorAll('.country-group.open')].map(e=>e.dataset.country);
  sessionStorage.setItem('travelState',JSON.stringify({view:currentView,scroll:window.scrollY,oc,ok}));
}
function restoreState(){
  const raw=sessionStorage.getItem('travelState');if(!raw)return;
  sessionStorage.removeItem('travelState');
  try{
    const s=JSON.parse(raw);
    if(s.view&&s.view!=='list')switchView(s.view);
    if(s.oc)s.oc.forEach(c=>{const e=document.querySelector(`.continent-group[data-continent="${c}"]`);if(e)e.classList.add('open');});
    if(s.ok)s.ok.forEach(c=>{const e=document.querySelector(`.country-group[data-country="${c}"]`);if(e)e.classList.add('open');});
    if(s.scroll)setTimeout(()=>window.scrollTo(0,s.scroll),50);
  }catch(e){}
}

// ─── THEME ───
function toggleTheme(){
  const b=document.getElementById('themeToggle');
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  if(isDark){document.documentElement.removeAttribute('data-theme');b.textContent='Dark';localStorage.setItem('theme','light');}
  else{document.documentElement.setAttribute('data-theme','dark');b.textContent='Light';localStorage.setItem('theme','dark');}
  // Reload map tiles for dark/light
  if(map){map.remove();map=null;initMap();}
}
(function(){if(localStorage.getItem('theme')==='dark'){document.documentElement.setAttribute('data-theme','dark');document.addEventListener('DOMContentLoaded',()=>{document.getElementById('themeToggle').textContent='Light';});}})();

document.addEventListener('DOMContentLoaded',init);
