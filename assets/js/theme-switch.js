/* Light/dark button in the top bar. Uses the theme's own Theme class, so the choice is remembered. */
document.addEventListener('DOMContentLoaded', function () {
  var b = document.getElementById('theme-switch');
  if (!b || typeof Theme === 'undefined') return;
  b.addEventListener('click', function () {
    var mode = document.documentElement.dataset.bsTheme === 'dark' ? 'light' : 'dark';
    Theme.update(mode);
    // keep the theme's own menu in the sidebar in step
    document.querySelectorAll('#mode-toggle + .dropdown-menu .dropdown-item').forEach(function (i) {
      i.classList.toggle('active', i.dataset.themeMode === mode);
    });
  });
});
