// Animacoes fluidas (sem libs) + respeita prefers-reduced-motion

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setActiveMenuLink(){
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  document.querySelectorAll('.menu a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === path) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
}

function setupReveal(){
  if (reduceMotion) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

function setupHeroParallax(){
  if (reduceMotion) return;
  const hero = document.querySelector('.hero');
  const blob = document.querySelector('.hero-blob');
  if (!hero || !blob) return;

  let raf = 0;
  const onMove = (ev) => {
    const r = hero.getBoundingClientRect();
    const x = (ev.clientX - r.left) / Math.max(1, r.width);
    const y = (ev.clientY - r.top) / Math.max(1, r.height);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      blob.style.transform = `translate3d(${(x-0.5)*18}px, ${(y-0.5)*18}px, 0)`;
    });
  };

  hero.addEventListener('mousemove', onMove);
}

function setupAccordion(){
  document.querySelectorAll('[data-accordion] button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-item]');
      const open = item.getAttribute('data-open') === 'true';
      item.setAttribute('data-open', String(!open));
    });
  });
}

function setupFakeForm(){
  const form = document.querySelector('form[data-fake]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const toast = document.querySelector('.toast');
    if (!toast) return;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
    form.reset();
  });
}

setActiveMenuLink();
setupReveal();
setupHeroParallax();
setupAccordion();
setupFakeForm();
