/* Remember the actual same-tab entry, not an unrelated external referrer. */
(() => {
  const root = new URL('.', document.currentScript.src);
  const key = 'travel-return-target';
  const inTravel = url => url.origin === root.origin && url.pathname.startsWith(root.pathname);
  const current = location.pathname + location.search + location.hash;
  const read = () => { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } };
  const write = value => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be disabled. */ } };
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    const destination = new URL(anchor.href);
    if (!inTravel(destination) || destination.pathname === location.pathname) return;
    write({from: location.pathname + location.search + location.hash, to: destination.pathname + destination.search + destination.hash, label: document.querySelector('h1')?.textContent.trim() || 'Travel Notes'});
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (!/\/(posts|countries)\/[^/]+\.html$/.test(location.pathname)) return;
    const link = document.querySelector('.back-link');
    if (!link) return;
    const saved = read();
    let target;
    let sameTab = false;
    if (saved?.to === current) {
      target = new URL(saved.from, root);
      sameTab = true;
    } else if (document.referrer) {
      target = new URL(document.referrer);
    }
    if (!target || !inTravel(target) || target.pathname === location.pathname) return;
    const labels = {'timeline.html': 'Trip Timeline', 'map.html': 'Travel Map', 'places.html': 'Place Reviews', 'favorites.html': 'Favorite Places', 'ozgur-stars.html': 'Ozgur Stars', 'index.html': 'Travel Notes', '': 'Travel Notes'};
    const leaf = target.pathname.split('/').pop();
    link.href = target.href;
    link.textContent = `← ${labels[leaf] || (sameTab ? saved.label : 'Previous page')}`;
    link.addEventListener('click', event => {
      if (!sameTab || history.length < 2 || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.back();
    });
  });
})();
