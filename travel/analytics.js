(function () {
  const GA_ID = 'G-741B7SHYRQ';

  function ensureFavoriteDestinationLink() {
    document.querySelectorAll('.nav-menu-content').forEach(menu => {
      if (menu.querySelector('a[href$="favorites.html"]')) return;
      const firstLink = menu.querySelector('a[href]');
      const prefix = firstLink?.getAttribute('href')?.startsWith('../') ? '../' : '';
      const link = document.createElement('a');
      link.href = `${prefix}favorites.html`;
      link.textContent = 'Favorite Destinations';
      const starsLink = menu.querySelector('a[href$="ozgur-stars.html"]');
      menu.insertBefore(link, starsLink || null);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureFavoriteDestinationLink);
  } else {
    ensureFavoriteDestinationLink();
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
  document.head.appendChild(script);
}());
