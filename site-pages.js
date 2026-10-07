(function () {
  const langButton = document.getElementById('lang-toggle');
  const themeButton = document.getElementById('theme-toggle');
  if (!langButton || !themeButton) return;

  function applyLang(lang) {
    document.documentElement.lang = lang;
    langButton.textContent = lang === 'en' ? 'TR' : 'EN';
    langButton.setAttribute('aria-label', lang === 'en' ? 'Türkçeye geç' : 'Switch to English');
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeButton.textContent = theme === 'dark' ? '☀' : '☽';
    themeButton.setAttribute('aria-label', theme === 'dark' ? 'Use light theme' : 'Use dark theme');
  }

  applyLang(localStorage.getItem('lang') === 'tr' ? 'tr' : 'en');
  applyTheme(localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  langButton.addEventListener('click', function () {
    const next = document.documentElement.lang === 'en' ? 'tr' : 'en';
    localStorage.setItem('lang', next);
    applyLang(next);
  });
  themeButton.addEventListener('click', function () {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
})();
