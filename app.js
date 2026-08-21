let posts = [];
let map = null;
let tileLayer = null;
let placeReviews = [];
let ozgurStars = [];
let placeLayer = null;
let placeSearchTimer = null;
let starLayer = null;
let starSearchTimer = null;

const CONTINENT_ORDER = ['turkey', 'europe', 'asia', 'south-america', 'north-america', 'africa', 'global'];
const CONTINENT_LABELS = {
  turkey: 'Türkiye', europe: 'Europe', asia: 'Asia', 'south-america': 'South America',
  'north-america': 'North America', africa: 'Africa', global: 'Misc'
};
const COUNTRY_ALIASES = {
  south_africa: 'south-africa', uk: 'u-k', 'united-kingdom': 'u-k', usa: 'u-s-a'
};
const FLAGS = {
  Turkey: '🇹🇷', Türkiye: '🇹🇷', 'North Cyprus': '🇨🇾', Greece: '🇬🇷', Bulgaria: '🇧🇬',
  Belgium: '🇧🇪', Netherlands: '🇳🇱', Portugal: '🇵🇹', Spain: '🇪🇸', Italy: '🇮🇹',
  France: '🇫🇷', Germany: '🇩🇪', 'U.K.': '🇬🇧', Switzerland: '🇨🇭', Croatia: '🇭🇷',
  Hungary: '🇭🇺', Poland: '🇵🇱', Iceland: '🇮🇸', Finland: '🇫🇮', 'U.S.A.': '🇺🇸',
  Mexico: '🇲🇽', Cuba: '🇨🇺', 'Costa Rica': '🇨🇷', Peru: '🇵🇪', Bolivia: '🇧🇴',
  Chile: '🇨🇱', Argentina: '🇦🇷', Colombia: '🇨🇴', 'Peru / Bolivia': '🇵🇪',
  'South Africa': '🇿🇦', Botswana: '🇧🇼', Morocco: '🇲🇦', Zambia: '🇿🇲', Zimbabwe: '🇿🇼',
  Japan: '🇯🇵', 'Hong Kong': '🇭🇰', Macau: '🇲🇴', Nepal: '🇳🇵', Georgia: '🇬🇪',
  Vietnam: '🇻🇳', Cambodia: '🇰🇭', Singapore: '🇸🇬', Thailand: '🇹🇭'
};
const CATEGORY_LABELS = {
  restaurant: 'Restaurant', cafe: 'Cafe', bar: 'Bar', hotel: 'Hotel', attraction: 'Attraction',
  shop: 'Shop', tour: 'Tour', transport: 'Transport'
};
const RATING_COLORS = {5: '#16a34a', 4: '#65a30d', 3: '#ca8a04', 2: '#ea580c', 1: '#dc2626'};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
}

function applySavedTheme() {
  if (localStorage.getItem('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  const button = document.getElementById('themeToggle');
  if (button) button.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? 'Light' : 'Dark';
}

function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (dark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
  applySavedTheme();
  replaceMapTiles();
}

function tileUrl() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
}

function makeMap(elementId, center = [25, 20], zoom = 2) {
  map = L.map(elementId, {scrollWheelZoom: true}).setView(center, zoom);
  tileLayer = L.tileLayer(tileUrl(), {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
  return map;
}

function replaceMapTiles() {
  if (!map || typeof L === 'undefined') return;
  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(tileUrl(), {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
  tileLayer.bringToBack();
}

async function fetchJson(url) {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

async function loadPlacesData() {
  try {
    return await fetchJson('places.json');
  } catch (error) {
    return fetchJson('gmaps_reviews.json');
  }
}

async function init() {
  applySavedTheme();
  const page = document.body.dataset.page || 'list';
  if (page === 'list') {
    const legacyView = new URLSearchParams(window.location.search).get('view');
    if (legacyView === 'map' || legacyView === 'timeline') {
      window.location.replace(legacyView === 'map' ? 'map.html' : 'timeline.html');
      return;
    }
    posts = await fetchJson('data.json');
    renderStats();
    renderList();
    renderFeaturedPosts();
    restoreListState();
    document.getElementById('searchInput')?.addEventListener('input', event => renderList(event.target.value));
    document.getElementById('shuffleFeatured')?.addEventListener('click', renderFeaturedPosts);
    return;
  }
  if (page === 'map') {
    posts = await fetchJson('data.json');
    initTravelMap();
    return;
  }
  if (page === 'timeline') {
    posts = await fetchJson('data.json');
    renderTimeline();
    return;
  }
  if (page === 'places') {
    placeReviews = await loadPlacesData();
    initPlacesMap();
    return;
  }
  if (page === 'stars') {
    ozgurStars = await fetchJson('stars.json');
    initStarsMap();
  }
}

function renderStats() {
  const countries = new Set(posts.filter(post => post.country && post.country !== 'global').map(post => post.country)).size;
  const cities = new Set(posts.filter(post => post.city && post.city !== 'General').map(post => `${post.country}:${post.city}`)).size;
  const bar = document.getElementById('statsBar');
  bar.innerHTML = `
    <div class="stat"><span class="stat-num">6</span><span class="stat-label">Continents</span></div>
    <div class="stat"><span class="stat-num">${countries}</span><span class="stat-label">Countries</span></div>
    <div class="stat"><span class="stat-num">${cities}</span><span class="stat-label">Cities</span></div>
    <div class="stat"><span class="stat-num">${posts.length}</span><span class="stat-label">Posts</span></div>
    <div class="stat"><span class="stat-num" id="reviewCountStat">—</span><span class="stat-label">Place Reviews</span></div>`;
  loadPlacesData().then(reviews => {
    const node = document.getElementById('reviewCountStat');
    if (node) node.textContent = reviews.length;
  }).catch(() => {});
}

function randomSample(items, count) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy.slice(0, count);
}

function renderFeaturedPosts() {
  const container = document.getElementById('featuredLinks');
  if (!container) return;
  const candidates = posts.filter(post => {
    const type = (post.post_type || '').toLowerCase();
    return !type.includes('airline') && !type.includes('transport') && type !== 'country overview';
  });
  container.innerHTML = randomSample(candidates, 5).map(post =>
    `<a href="posts/${encodeURIComponent(post.slug)}.html">${escapeHtml(post.title)}</a>`
  ).join('');
}

function canonicalCountrySlug(post) {
  if (post.turkey_city || post.country === 'turkey') return 'turkey';
  return COUNTRY_ALIASES[post.country] || post.country || '';
}

function countryHeading(post, name, flag) {
  const slug = canonicalCountrySlug(post);
  const label = `${flag ? `${flag} ` : ''}${escapeHtml(name)}`;
  if (!slug || slug === 'global') return `<span class="country-name">${label}</span>`;
  return `<span class="country-name"><a href="countries/${encodeURIComponent(slug)}.html" class="country-page-link" onclick="event.stopPropagation()">${label}</a></span>`;
}

function renderList(filter = '') {
  const content = document.getElementById('listContent');
  const query = filter.trim().toLocaleLowerCase('en');
  const grouped = {};
  CONTINENT_ORDER.forEach(key => { grouped[key] = {}; });
  posts.forEach(post => {
    const haystack = [post.title, post.country_display, post.city, post.turkey_city, post.body].join(' ').toLocaleLowerCase('en');
    if (query && !haystack.includes(query)) return;
    const continent = CONTINENT_ORDER.includes(post.continent) ? post.continent : 'global';
    const country = continent === 'turkey' ? 'Türkiye' : (post.country_display || 'Other');
    if (!grouped[continent][country]) grouped[continent][country] = [];
    grouped[continent][country].push(post);
  });

  let html = '';
  CONTINENT_ORDER.forEach(continent => {
    const countries = grouped[continent];
    const names = Object.keys(countries).sort((left, right) => left.localeCompare(right, 'en'));
    if (!names.length) return;
    const total = names.reduce((sum, name) => sum + countries[name].length, 0);
    html += `<section class="continent-group${query ? ' open' : ''}" data-continent="${continent}">
      <div class="continent-header" role="button" tabindex="0" onclick="toggleGroup(this)" onkeydown="toggleGroupKey(event,this)">
        <div class="continent-header-main"><span class="continent-name">${CONTINENT_LABELS[continent]}</span>
        <span class="continent-count">${names.length} ${names.length === 1 ? 'group' : 'countries'} &middot; ${total} posts</span></div>
        <span class="continent-chevron" aria-hidden="true">&#9654;</span>
      </div><div class="continent-body">`;
    names.forEach(name => {
      const countryPosts = countries[name];
      if (continent === 'turkey' && name === 'Türkiye') html += renderTurkey(countryPosts, query);
      else if (name === 'U.S.A.') html += renderUSA(countryPosts, query);
      else html += renderCountry(countryPosts, name, query);
    });
    html += '</div></section>';
  });
  content.innerHTML = html || '<p class="empty-state">No travel notes match that search.</p>';
}

function toggleGroup(header) { header.parentElement.classList.toggle('open'); }
function toggleGroupKey(event, header) {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleGroup(header); }
}

function renderCountry(countryPosts, name, query) {
  const flag = FLAGS[name] || '';
  let html = `<section class="country-group${query ? ' open' : ''}" data-country="${escapeHtml(name)}">
    <div class="country-header" role="button" tabindex="0" onclick="toggleGroup(this)" onkeydown="toggleGroupKey(event,this)">
      ${countryHeading(countryPosts[0], name, flag)}<span class="country-count">${countryPosts.length}</span>
    </div><div class="country-body">`;
  countryPosts.filter(post => !post.city || post.city === 'General').forEach(post => { html += postCard(post); });
  countryPosts.filter(post => post.city && post.city !== 'General').forEach(post => { html += postCard(post); });
  return `${html}</div></section>`;
}

function renderTurkey(countryPosts, query) {
  const cities = {};
  countryPosts.forEach(post => {
    const city = post.turkey_city || post.city || 'Other';
    if (!cities[city]) cities[city] = [];
    cities[city].push(post);
  });
  let html = `<section class="country-group${query ? ' open' : ''}" data-country="Türkiye">
    <div class="country-header" role="button" tabindex="0" onclick="toggleGroup(this)" onkeydown="toggleGroupKey(event,this)">
      ${countryHeading(countryPosts[0], 'Türkiye', '🇹🇷')}<span class="country-count">${countryPosts.length}</span>
    </div><div class="country-body">`;
  Object.entries(cities).sort((left, right) => left[0].localeCompare(right[0], 'tr')).forEach(([city, cityPosts]) => {
    html += `<div class="state-group"><div class="state-label">${escapeHtml(city)}</div>`;
    cityPosts.forEach(post => { html += postCard(post); });
    html += '</div>';
  });
  return `${html}</div></section>`;
}

function renderUSA(countryPosts, query) {
  const states = {};
  countryPosts.forEach(post => {
    const state = post.state || 'Other';
    if (!states[state]) states[state] = [];
    states[state].push(post);
  });
  let html = `<section class="country-group${query ? ' open' : ''}" data-country="U.S.A.">
    <div class="country-header" role="button" tabindex="0" onclick="toggleGroup(this)" onkeydown="toggleGroupKey(event,this)">
      ${countryHeading(countryPosts[0], 'U.S.A.', '🇺🇸')}<span class="country-count">${countryPosts.length}</span>
    </div><div class="country-body">`;
  Object.entries(states).sort().forEach(([state, statePosts]) => {
    html += `<div class="state-group"><div class="state-label">${escapeHtml(state)}</div>`;
    statePosts.forEach(post => { html += postCard(post); });
    html += '</div>';
  });
  return `${html}</div></section>`;
}

function postCard(post) {
  let title = escapeHtml(post.title);
  if (post.review_num > 0) title += ` (Review ${post.review_num})`;
  const type = post.post_type || '';
  const date = post.visit_date_label || formatDate(post.date);
  const wine = post.has_wine ? '<span class="wine-badge" title="Wine content">🍷</span>' : '';
  const rating = post.rating != null ? `<span class="rating-badge" title="Rating: ${post.rating}/10">${post.rating}/10</span>` : '';
  return `<a class="post-card" href="posts/${encodeURIComponent(post.slug)}.html" onclick="saveListState()">
    <span class="post-dot"></span><span class="post-info">
      <span class="post-title">${title} ${wine}${rating}</span>
      <span class="post-meta">${type ? `<span class="post-type-badge">${escapeHtml(type)}</span> &middot; ` : ''}${escapeHtml(date)} &middot; ${post.reading_time || 1} min</span>
    </span></a>`;
}

function saveListState() {
  const continents = [...document.querySelectorAll('.continent-group.open')].map(node => node.dataset.continent);
  const countries = [...document.querySelectorAll('.country-group.open')].map(node => node.dataset.country);
  sessionStorage.setItem('travelListState', JSON.stringify({scroll: window.scrollY, continents, countries}));
}

function restoreListState() {
  const raw = sessionStorage.getItem('travelListState');
  if (!raw) return;
  sessionStorage.removeItem('travelListState');
  try {
    const state = JSON.parse(raw);
    state.continents?.forEach(value => document.querySelector(`.continent-group[data-continent="${CSS.escape(value)}"]`)?.classList.add('open'));
    state.countries?.forEach(value => document.querySelector(`.country-group[data-country="${CSS.escape(value)}"]`)?.classList.add('open'));
    if (state.scroll) setTimeout(() => window.scrollTo(0, state.scroll), 50);
  } catch (error) {}
}

function initTravelMap() {
  makeMap('map');
  const icon = L.divIcon({
    className: 'custom-marker',
    html: '<div class="travel-marker-dot"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8]
  });
  const locations = {};
  posts.forEach(post => {
    if (post.show_on_map === false || post.lat == null || post.lng == null) return;
    const key = `${Number(post.lat).toFixed(1)},${Number(post.lng).toFixed(1)}`;
    if (!locations[key]) locations[key] = [];
    locations[key].push(post);
  });
  Object.values(locations).forEach(group => {
    const first = group[0];
    const popup = group.map(post =>
      `<a class="popup-link popup-link-block" href="posts/${encodeURIComponent(post.slug)}.html">${escapeHtml(post.title)} &rarr;</a>`
    ).join('');
    L.marker([first.lat, first.lng], {icon}).bindPopup(popup, {maxWidth: 290}).addTo(map);
  });
}

function reviewPopup(review, starred = false) {
  const numericRating = Number(review.rating);
  const stars = !starred && Number.isInteger(numericRating) && numericRating >= 1 && numericRating <= 5
    ? `<span class="review-stars">${'★'.repeat(numericRating)}${'☆'.repeat(5 - numericRating)}</span>`
    : '';
  const reviewText = !starred && review.text ? `<div class="review-popup-text">${escapeHtml(review.text)}</div>` : '';
  const starNote = starred && review.ozgur_star_note
    ? `<div class="ozgur-star-note">${escapeHtml(review.ozgur_star_note)}</div>` : '';
  const address = review.address ? `<div class="review-popup-address">${escapeHtml(review.address)}</div>` : '';
  const reviewDate = !starred && review.date
    ? `<span class="review-popup-date">Reviewed ${escapeHtml(review.date)}</span>`
    : (starred ? '' : '<span class="review-popup-date review-popup-date-missing">Review date unavailable</span>');
  const category = CATEGORY_LABELS[review.category] || review.category || 'Place';
  const mapsLink = /^https:\/\//.test(review.maps_url || '')
    ? `<a class="popup-link popup-link-block" href="${escapeHtml(review.maps_url)}" target="_blank" rel="noopener">Open place on Google Maps &rarr;</a>` : '';
  const coordinatesLink = /^https:\/\//.test(review.maps_coordinates_url || '')
    ? `<a class="popup-coordinate-link" href="${escapeHtml(review.maps_coordinates_url)}" target="_blank" rel="noopener">Exact coordinates</a>` : '';
  const badge = starred ? '<span class="ozgur-star-badge">Ozgur Star</span>' : `<span class="place-category-badge">${escapeHtml(category)}</span>`;
  return `<div class="review-popup"><div class="review-popup-heading">${escapeHtml(review.name)}</div>
    <div class="review-popup-meta">${stars}${badge}</div>${reviewDate}${starNote}${reviewText}${address}${mapsLink}${coordinatesLink}</div>`;
}

function reviewMarker(review, starred = false) {
  const color = starred ? '#d97706' : (RATING_COLORS[review.rating] || '#78716c');
  const markerClass = starred ? 'ozgur-star-marker' : 'place-marker-dot';
  const symbol = starred ? '★' : '';
  const size = starred ? 22 : 12;
  const icon = L.divIcon({
    className: 'place-marker',
    html: `<div class="${markerClass}" style="--marker-color:${color}">${symbol}</div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -(size / 2)]
  });
  return L.marker([review.lat, review.lng], {icon}).bindPopup(reviewPopup(review, starred), {maxWidth: 310});
}

function initPlacesMap() {
  makeMap('placesMap');
  placeLayer = typeof L.markerClusterGroup === 'function'
    ? L.markerClusterGroup({showCoverageOnHover: false, maxClusterRadius: 48})
    : L.layerGroup();
  placeLayer.addTo(map);
  populatePlaceFilters();
  bindPlaceFilters();
  applyPlaceFilters(true);
}

function populatePlaceFilters() {
  const countrySelect = document.getElementById('placeCountry');
  const countries = [...new Map(placeReviews
    .filter(review => review.country_slug && review.country_display)
    .map(review => [review.country_slug, review.country_display])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'en'));
  countries.forEach(([slug, name]) => {
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = name;
    countrySelect.appendChild(option);
  });
  const counts = placeReviews.reduce((result, review) => {
    result[review.category] = (result[review.category] || 0) + 1;
    return result;
  }, {});
  document.querySelector('[data-category-count="all"]').textContent = placeReviews.length;
  ['restaurant', 'hotel', 'cafe', 'bar'].forEach(category => {
    const node = document.querySelector(`[data-category-count="${category}"]`);
    if (node) node.textContent = counts[category] || 0;
  });
  document.querySelector('[data-rating-count="5"]').textContent = placeReviews.filter(review => review.rating === 5).length;

  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const rating = params.get('rating');
  const country = params.get('country');
  if (category && document.querySelector(`#placeCategory option[value="${CSS.escape(category)}"]`)) document.getElementById('placeCategory').value = category;
  if (rating && ['3', '4', '5'].includes(rating)) document.getElementById('placeRating').value = rating;
  if (country && document.querySelector(`#placeCountry option[value="${CSS.escape(country)}"]`)) countrySelect.value = country;
}

function bindPlaceFilters() {
  ['placeCategory', 'placeRating', 'placeCountry'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => applyPlaceFilters(true));
  });
  document.getElementById('placeSearch').addEventListener('input', () => {
    clearTimeout(placeSearchTimer);
    placeSearchTimer = setTimeout(() => applyPlaceFilters(false), 160);
  });
  document.getElementById('categoryShortcuts').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.category) {
      document.getElementById('placeCategory').value = button.dataset.category;
      document.getElementById('placeRating').value = 'all';
    }
    if (button.dataset.rating) {
      document.getElementById('placeRating').value = button.dataset.rating;
      document.getElementById('placeCategory').value = 'all';
    }
    applyPlaceFilters(true);
  });
  document.getElementById('resetPlaceFilters').addEventListener('click', () => {
    document.getElementById('placeSearch').value = '';
    document.getElementById('placeCategory').value = 'all';
    document.getElementById('placeRating').value = 'all';
    document.getElementById('placeCountry').value = 'all';
    applyPlaceFilters(true);
  });
}

function applyPlaceFilters(fitMap) {
  const search = document.getElementById('placeSearch').value.trim().toLocaleLowerCase('en');
  const category = document.getElementById('placeCategory').value;
  const rating = document.getElementById('placeRating').value;
  const country = document.getElementById('placeCountry').value;
  const filtered = placeReviews.filter(review => {
    if (category !== 'all' && review.category !== category) return false;
    if (rating !== 'all' && Number(review.rating) < Number(rating)) return false;
    if (country !== 'all' && review.country_slug !== country) return false;
    if (search) {
      const haystack = [review.name, review.text, review.address, review.subcategory].join(' ').toLocaleLowerCase('en');
      if (!haystack.includes(search)) return false;
    }
    return review.lat != null && review.lng != null;
  });

  placeLayer.clearLayers();
  filtered.forEach(review => placeLayer.addLayer(reviewMarker(review)));
  document.getElementById('placeSummary').innerHTML = `<strong>${filtered.length}</strong> of ${placeReviews.length} place reviews shown`;
  document.querySelectorAll('#categoryShortcuts button').forEach(button => {
    const activeCategory = button.dataset.category && button.dataset.category === category && rating === 'all';
    const activeRating = button.dataset.rating && button.dataset.rating === rating && category === 'all';
    button.classList.toggle('active', Boolean(activeCategory || activeRating));
  });
  if (fitMap && filtered.length) {
    const bounds = L.latLngBounds(filtered.map(review => [review.lat, review.lng]));
    map.fitBounds(bounds, {padding: [24, 24], maxZoom: 13});
  }
  const params = new URLSearchParams();
  if (category !== 'all') params.set('category', category);
  if (rating !== 'all') params.set('rating', rating);
  if (country !== 'all') params.set('country', country);
  if (search) params.set('q', search);
  history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
}

function initStarsMap() {
  makeMap('starsMap');
  starLayer = L.layerGroup().addTo(map);
  populateStarFilters();
  bindStarFilters();
  applyStarFilters(true);
}

function populateStarFilters() {
  const countrySelect = document.getElementById('starCountry');
  const countries = [...new Map(ozgurStars
    .filter(review => review.country_slug && review.country_display)
    .map(review => [review.country_slug, review.country_display])).entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'en'));
  countries.forEach(([slug, name]) => {
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = name;
    countrySelect.appendChild(option);
  });

  const counts = ozgurStars.reduce((result, review) => {
    result[review.category] = (result[review.category] || 0) + 1;
    return result;
  }, {});
  document.querySelector('[data-star-category-count="all"]').textContent = ozgurStars.length;
  ['restaurant', 'hotel', 'cafe', 'bar'].forEach(category => {
    const node = document.querySelector(`[data-star-category-count="${category}"]`);
    if (node) node.textContent = counts[category] || 0;
  });

  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const country = params.get('country');
  const search = params.get('q');
  if (category && document.querySelector(`#starCategory option[value="${CSS.escape(category)}"]`)) {
    document.getElementById('starCategory').value = category;
  }
  if (country && document.querySelector(`#starCountry option[value="${CSS.escape(country)}"]`)) {
    countrySelect.value = country;
  }
  if (search) document.getElementById('starSearch').value = search;
}

function bindStarFilters() {
  ['starCategory', 'starCountry'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => applyStarFilters(true));
  });
  document.getElementById('starSearch').addEventListener('input', () => {
    clearTimeout(starSearchTimer);
    starSearchTimer = setTimeout(() => applyStarFilters(false), 160);
  });
  document.getElementById('starCategoryShortcuts').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button?.dataset.category) return;
    document.getElementById('starCategory').value = button.dataset.category;
    applyStarFilters(true);
  });
  document.getElementById('resetStarFilters').addEventListener('click', () => {
    document.getElementById('starSearch').value = '';
    document.getElementById('starCategory').value = 'all';
    document.getElementById('starCountry').value = 'all';
    applyStarFilters(true);
  });
}

function applyStarFilters(fitMap) {
  const search = document.getElementById('starSearch').value.trim().toLocaleLowerCase('en');
  const category = document.getElementById('starCategory').value;
  const country = document.getElementById('starCountry').value;
  const filtered = ozgurStars.filter(review => {
    if (!review.ozgur_star || review.lat == null || review.lng == null) return false;
    if (category !== 'all' && review.category !== category) return false;
    if (country !== 'all' && review.country_slug !== country) return false;
    if (search) {
      const haystack = [review.name, review.ozgur_star_note, review.address, review.country_display,
        CATEGORY_LABELS[review.category] || review.category].join(' ').toLocaleLowerCase('en');
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  starLayer.clearLayers();
  filtered.forEach(review => starLayer.addLayer(reviewMarker(review, true)));
  document.getElementById('starSummary').innerHTML = `<strong>${filtered.length}</strong> of ${ozgurStars.length} Ozgur Stars shown`;
  document.querySelectorAll('#starCategoryShortcuts button').forEach(button => {
    button.classList.toggle('active', button.dataset.category === category);
  });
  if (fitMap && filtered.length) {
    map.fitBounds(L.latLngBounds(filtered.map(review => [review.lat, review.lng])), {padding: [30, 30], maxZoom: 12});
  }

  const list = document.getElementById('starsList');
  list.innerHTML = filtered.length ? filtered.map(review => `<article class="star-card">
    <div><span class="ozgur-star-card-icon">★</span><strong>${escapeHtml(review.name)}</strong></div>
    <span>${escapeHtml(review.country_display || '')} &middot; ${escapeHtml(CATEGORY_LABELS[review.category] || review.category)}</span>
    <p class="star-card-note">${escapeHtml(review.ozgur_star_note || '')}</p>
  </article>`).join('') : '<p class="empty-state">No Ozgur Stars match these filters.</p>';

  const params = new URLSearchParams();
  if (category !== 'all') params.set('category', category);
  if (country !== 'all') params.set('country', country);
  if (search) params.set('q', search);
  history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
}

function isTimelinePlace(post) {
  const type = (post.post_type || '').toLowerCase();
  return post.trip_id && !post.exclude_from_timeline && !type.includes('airline') && !type.includes('transport');
}

function groupTimelineStops(sortedPosts) {
  const stops = [];
  const byKey = new Map();
  sortedPosts.forEach(post => {
    const key = post.timeline_group ? `group:${post.timeline_group}` : `post:${post.slug}`;
    if (!byKey.has(key)) {
      const stop = {key, posts: []};
      byKey.set(key, stop);
      stops.push(stop);
    }
    byKey.get(key).posts.push(post);
  });
  return stops;
}

function renderTimeline() {
  const content = document.getElementById('timelineContent');
  const trips = {};
  posts.filter(isTimelinePlace).forEach(post => {
    if (!trips[post.trip_id]) trips[post.trip_id] = {name: post.trip_name, posts: []};
    trips[post.trip_id].posts.push(post);
  });
  const sortedTrips = Object.values(trips).sort((left, right) => {
    const leftDate = left.posts.map(post => post.date || '').sort()[0] || '';
    const rightDate = right.posts.map(post => post.date || '').sort()[0] || '';
    return rightDate.localeCompare(leftDate);
  });
  content.innerHTML = sortedTrips.map(trip => {
    const tripPosts = trip.posts.sort((left, right) => (left.date || '').localeCompare(right.date || ''));
    const stops = groupTimelineStops(tripPosts);
    const period = tripPosts[0]?.trip_dates || formatDate(tripPosts[0]?.date);
    const route = stops.map((stop, index) => {
      const first = stop.posts[0];
      const flag = FLAGS[first.country_display] || (first.continent === 'turkey' ? '🇹🇷' : '');
      let titles;
      if (stop.key === 'group:siem-reap-and-angkor') {
        const primary = stop.posts.find(post => post.slug === 'siem-reap') || first;
        const related = stop.posts.filter(post => post !== primary).map(post =>
          `<a href="posts/${encodeURIComponent(post.slug)}.html">${escapeHtml(post.title)}</a>`
        ).join('<span class="timeline-amp">, </span>');
        titles = `<a href="posts/${encodeURIComponent(primary.slug)}.html">${escapeHtml(primary.title)}</a>${related ? ` <span class="timeline-parenthetical">(${related})</span>` : ''}`;
      } else {
        titles = stop.posts.map(post =>
          `<a href="posts/${encodeURIComponent(post.slug)}.html">${escapeHtml(post.title)}</a>`
        ).join('<span class="timeline-amp"> &amp; </span>');
      }
      const places = [...new Set(stop.posts.map(post => post.country_display).filter(Boolean))].join(' / ');
      return `<div class="timeline-stop-row"><span class="timeline-stop">
          <span class="timeline-dot"></span><span class="timeline-stop-info">
            <span class="timeline-stop-title">${flag} ${titles}</span>
            <span class="timeline-stop-date">${escapeHtml(places)}</span>
          </span></span>${index < stops.length - 1 ? '<span class="timeline-connector"></span>' : ''}</div>`;
    }).join('');
    const stopLabel = stops.length === 1 ? 'stop' : 'stops';
    return `<section class="timeline-trip"><div class="timeline-trip-header">
      <h2>${escapeHtml(trip.name)}</h2><span class="timeline-meta">${escapeHtml(period)} &middot; ${stops.length} ${stopLabel}</span>
      </div><div class="timeline-route">${route}</div></section>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(error => {
    console.error(error);
    const target = document.querySelector('main');
    if (target) target.insertAdjacentHTML('afterbegin', '<p class="error-state">This section could not be loaded. Please refresh the page.</p>');
  });
});
