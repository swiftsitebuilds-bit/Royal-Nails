// Shared across all pages: footer year, mobile nav, scroll reveal.
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  initHeroShadeRotator();
});

// Rotating featured-shade card in the hero (home page only — safely does
// nothing if the card isn't on the page). Auto-cycles through a few shades,
// pauses on hover/focus, and respects reduced-motion preference.
function initHeroShadeRotator() {
  const card = document.getElementById('heroShadeCard');
  if (!card) return;

  const colorEl = document.getElementById('heroShadeColor');
  const nameEl = document.getElementById('heroShadeName');
  const codeEl = document.getElementById('heroShadeCode');

  const shades = [
    { name: 'Terracotta Hour', code: 'N\u00B004', color: '#D8AFA0' },
    { name: 'Monroe Wine',     code: 'N\u00B011', color: '#7A2E3B' },
    { name: 'Champagne Toast', code: 'N\u00B002', color: '#EAD9B8' },
    { name: 'First Frost Red', code: 'N\u00B009', color: '#B8482F' },
    { name: 'Espresso Bar',    code: 'N\u00B014', color: '#3C3532' },
    { name: 'Wild Berry',      code: 'N\u00B008', color: '#B24A63' },
  ];
  let idx = 0;

  function show(i) {
    colorEl.style.backgroundColor = shades[i].color;
    nameEl.textContent = shades[i].name;
    codeEl.textContent = shades[i].code;
  }
  show(0);

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  let timer;
  function tick() {
    idx = (idx + 1) % shades.length;
    nameEl.style.opacity = 0;
    codeEl.style.opacity = 0;
    setTimeout(() => { show(idx); nameEl.style.opacity = 1; codeEl.style.opacity = 1; }, 350);
  }
  function start() { timer = setInterval(tick, 3200); }
  function stop() { clearInterval(timer); }

  start();
  card.addEventListener('mouseenter', stop);
  card.addEventListener('mouseleave', start);
  card.addEventListener('focus', stop);
  card.addEventListener('blur', start);
}
