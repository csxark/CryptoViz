(function () {
  try {
    var stored = localStorage.getItem('theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : systemDark;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
