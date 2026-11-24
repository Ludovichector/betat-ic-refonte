// BETAT-IC · interactions et animations
const html = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const { gsap, ScrollTrigger, Lenis } = window;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } } };

if (!gsap || reduce) {
  html.classList.add('seen', 'is-loaded');
  window.__betatReady = true;
} else {
  html.classList.add('anim');
  gsap.registerPlugin(ScrollTrigger);
}
const animated = html.classList.contains('anim');

/* ---------- Défilement fluide ---------- */
let lenis = null;
if (animated && Lenis) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToEl = (el) => { if (lenis) lenis.scrollTo(el, { offset: -90, duration: 1.4 }); else el.scrollIntoView({ behavior: 'smooth' }); };

/* ---------- Découpage du texte ---------- */
function splitWords(el, cls) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/( +)/).forEach((part) => {
          if (!part) return;
          if (/^ +$/.test(part)) { frag.append(' '); return; }
          const span = document.createElement('span');
          if (cls === 'w') { span.className = 'w'; const inner = document.createElement('span'); inner.className = 'w__in'; inner.style.setProperty('--i', i++); inner.textContent = part; span.append(inner); } else { span.className = cls; span.textContent = part; i++; }
          frag.append(span);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
  return i;
}
if (animated) {
  $$('[data-split]').forEach((el) => splitWords(el, 'w'));
  $$('[data-fill]').forEach((el) => {
    splitWords(el, 'fw');
    const words = $$('.fw', el);
    ScrollTrigger.create({
      trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true,
      onUpdate: (s) => { const k = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('is-on', i < k)); },
    });
  });
}

/* ---------- Apparitions au défilement ---------- */
if (animated) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); } }), { rootMargin: '0px 0px -9% 0px', threshold: 0.05 });
  $$('[data-reveal], [data-split]:not([data-split="load"])').forEach((el) => io.observe(el));
}

/* ---------- Compteurs ---------- */
function count(el, delay = 0) {
  const end = +el.dataset.count; const o = { v: 0 };
  el.textContent = '0';
  gsap.to(o, { v: end, duration: 2.2, delay, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } });
}
if (animated) {
  const cio = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { count(e.target); cio.unobserve(e.target); } }), { threshold: 0.4 });
  $$('[data-count]').forEach((el) => { if (!el.closest('.hero')) cio.observe(el); });
}

/* ---------- Chargement et entrée de page ---------- */
function intro() {
  html.classList.add('is-loaded');
  window.__betatReady = true;
  window.dispatchEvent(new Event('betat:ready'));
  if (!animated) return;
  const linesIn = $$('.line__in');
  gsap.set(linesIn, { y: 0, yPercent: 112 });
  gsap.to(linesIn, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.11 });
  $$('[data-split="load"]').forEach((el) => el.setAttribute('data-in', ''));
  gsap.to('[data-load]', { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.35 });
  $$('.hero [data-count]').forEach((el) => count(el, 0.8));
}
(function boot() {
  const loader = $('[data-loader]');
  if (!animated) { intro(); return; }
  if (store.get('betat-seen') || !loader) { setTimeout(intro, loader ? 420 : 0); store.set('betat-seen', '1'); return; }
  store.set('betat-seen', '1');
  if (lenis) lenis.stop();
  const num = $('[data-loader-count]', loader); const o = { v: 0 };
  const tl = gsap.timeline({ onComplete: () => { loader.style.display = 'none'; html.classList.add('seen'); if (lenis) lenis.start(); } });
  tl.to($$('.ring__a', loader), { strokeDashoffset: 0, duration: 1.7, ease: 'power3.inOut', stagger: 0.12 }, 0)
    .to(o, { v: 100, duration: 2.1, ease: 'power2.inOut', onUpdate: () => { num.textContent = Math.round(o.v); } }, 0)
    .to('.loader__in, .loader__txt', { opacity: 0, y: -30, duration: 0.5, ease: 'power2.in' }, 2.2)
    .to(loader, { yPercent: -100, duration: 0.95, ease: 'expo.inOut' }, 2.5)
    .add(intro, 2.75);
})();

/* ---------- En-tête, thème et progression ---------- */
const header = $('[data-header]');
const themed = $$('main > [data-theme], .footer');
const progress = $('[data-progress]');
let lastY = window.scrollY;
function onScroll() {
  const y = window.scrollY;
  const probe = 46;
  let theme = 'dark';
  for (const el of themed) { const r = el.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) theme = el.dataset.theme; }
  if (html.dataset.nav !== theme) html.dataset.nav = theme;
  if (header) {
    header.classList.toggle('is-solid', y > 60);
    if (!$('[data-menu].is-open')) header.classList.toggle('is-hidden', y > 500 && y > lastY + 2);
    if (y < lastY - 2) header.classList.remove('is-hidden');
    html.classList.toggle('head-hidden', header.classList.contains('is-hidden'));
  }
  if (progress) progress.style.transform = `scaleY(${Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))})`;
  lastY = y;
}
let ticking = false;
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
onScroll();

/* ---------- Menu latéral ---------- */
const menu = $('[data-menu]');
function setMenu(open) {
  if (!menu) return;
  const wasOpen = menu.classList.contains('is-open');
  if (open === wasOpen) return;
  // Menu ouvert : le reste de la page devient inerte (clavier et lecteurs d'écran restent dans le menu),
  // puis le focus revient sur le bouton d'origine à la fermeture.
  if (open) setMenu.from = document.activeElement;
  $$('main, .footer, .header, .dock, .rail').forEach((el) => { el.inert = open; });
  if (!open && setMenu.from && setMenu.from.focus) setMenu.from.focus({ preventScroll: true });
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  $$('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', String(open)));
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open) setTimeout(() => $('.menu__close', menu)?.focus(), 80);
}
$$('[data-menu-open]').forEach((b) => b.addEventListener('click', () => setMenu(true)));
$$('[data-menu-close]').forEach((b) => b.addEventListener('click', () => setMenu(false)));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setMenu(false); closeLightbox(); } });

/* ---------- Transitions entre pages et ancres ---------- */
const curtain = $('[data-curtain]');
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || a.target === '_blank' || a.hasAttribute('data-lightbox') || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname && url.hash) {
    const el = document.getElementById(url.hash.slice(1));
    if (el) { e.preventDefault(); setMenu(false); scrollToEl(el); history.replaceState(null, '', url.hash); }
    return;
  }
  if (url.pathname === location.pathname && !url.hash) { e.preventDefault(); setMenu(false); if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (!animated || !curtain) return;
  e.preventDefault();
  curtain.classList.add('is-leaving');
  setTimeout(() => { location.href = a.href; }, 640);
});
window.addEventListener('pageshow', (e) => { if (e.persisted && curtain) curtain.classList.remove('is-leaving'); });
if (location.hash) window.addEventListener('load', () => { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => scrollToEl(el), 700); });

/* ---------- Curseur, boutons magnétiques, inclinaison 3D ---------- */
if (animated && fine) {
  const cursor = $('[data-cursor]'); const dot = $('span', cursor);
  const mx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' }); const my = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { mx(e.clientX); my(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]:not(.cursor)');
    const link = e.target.closest('a, button, input, select, textarea, label');
    cursor.classList.toggle('is-label', !!lab);
    cursor.classList.toggle('is-link', !lab && !!link);
    dot.textContent = lab ? lab.dataset.cursor : '';
  });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));

  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }); const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.28); y((e.clientY - r.top - r.height / 2) * 0.4); });
    el.addEventListener('pointerleave', () => { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }); });
  });

  $$('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 1000 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }); const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 9); rx(-((e.clientY - r.top) / r.height - 0.5) * 9); });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

}

/* ---------- Parallaxe, bandeaux, défilement horizontal ---------- */
if (animated) {
  $$('[data-parallax]').forEach((el) => {
    const box = el.parentElement;
    const r = el.offsetHeight / (box.offsetHeight || 1);
    const max = r > 1.01 ? ((r - 1) / r) * 100 : 12;
    gsap.fromTo(el, { yPercent: 0 }, { yPercent: -max, ease: 'none', scrollTrigger: { trigger: box, start: box.closest('.phero') ? 'top top' : 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Bandeaux défilants : sens par rangée, accélération et inclinaison selon la vitesse de défilement,
  // ralenti au survol.
  const marquees = $$('[data-marquee]').map((m) => {
    const row = $('.marquee__row', m);
    const dir = +m.dataset.marqueeDir || 1;
    const tw = gsap.fromTo(row, { xPercent: dir > 0 ? 0 : -50 }, { xPercent: dir > 0 ? -50 : 0, duration: +m.dataset.marquee || 40, ease: 'none', repeat: -1 });
    const st = { tw, dir, hover: false, scale: 1, skew: gsap.quickSetter(row, 'skewX', 'deg') };
    m.addEventListener('pointerenter', () => { st.hover = true; });
    m.addEventListener('pointerleave', () => { st.hover = false; });
    return st;
  });
  let vel = 0;
  gsap.ticker.add(() => {
    vel += ((lenis ? lenis.velocity : 0) - vel) * 0.1;
    const boost = Math.min(Math.abs(vel) * 0.12, 5);
    marquees.forEach((s) => {
      s.scale += ((s.hover ? 0.1 : 1 + boost) - s.scale) * 0.08;
      s.tw.timeScale(s.scale);
      s.skew(Math.max(-7, Math.min(7, -vel * 0.16 * s.dir)));
    });
  });

  $$('[data-scrub-x]').forEach((el) => {
    const vertical = () => window.innerWidth <= 900;
    gsap.fromTo(el, { scaleX: () => (vertical() ? 1 : 0), scaleY: () => (vertical() ? 0 : 1) }, { scaleX: 1, scaleY: 1, ease: 'none', scrollTrigger: { trigger: el.closest('.process__track'), start: 'top 78%', end: 'bottom 62%', scrub: 0.6, invalidateOnRefresh: true } });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* ---------- Navigation latérale des services ---------- */
const spy = $('[data-spy]');
if (spy) {
  const links = $$('[data-spy-link]', spy);
  const sio = new IntersectionObserver((entries) => entries.forEach((e) => { if (!e.isIntersecting) return; links.forEach((l) => { const on = l.dataset.spyLink === e.target.id; l.classList.toggle('is-active', on); const bar = l.parentElement; if (on && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: l.offsetLeft - bar.clientWidth / 2 + l.offsetWidth / 2, behavior: 'smooth' }); }); }), { rootMargin: '-25% 0px -65% 0px' });
  $$('[data-spy-target]').forEach((t) => sio.observe(t));
}

/* ---------- Filtres des projets ---------- */
const grid = $('[data-filter-grid]');
if (grid) {
  const cards = $$('.pcard', grid); const countEl = $('[data-filter-count]');
  $$('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.classList.contains('is-active')) return;
    $$('[data-filter]').forEach((b) => b.classList.toggle('is-active', b === btn));
    const f = btn.dataset.filter;
    const show = cards.filter((c) => f === '*' || c.dataset.cat === f);
    const apply = () => {
      cards.forEach((c) => { c.classList.toggle('is-out', !show.includes(c)); c.setAttribute('data-in', ''); });
      if (countEl) countEl.textContent = show.length;
      if (gsap) { gsap.fromTo(show, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05, clearProps: 'opacity,transform' }); ScrollTrigger.refresh(); }
    };
    if (gsap && animated) gsap.to(cards.filter((c) => !c.classList.contains('is-out')), { opacity: 0, y: 20, duration: 0.25, onComplete: apply }); else apply();
  }));
}

/* ---------- Visionneuse d'images ---------- */
let lb = null; let lbItems = []; let lbIndex = 0;
function showLb(i) { lbIndex = (i + lbItems.length) % lbItems.length; $('img', lb).src = lbItems[lbIndex].href; $('.lightbox__n', lb).textContent = `${String(lbIndex + 1).padStart(2, '0')} / ${String(lbItems.length).padStart(2, '0')}`; }
function closeLightbox() { if (lb) { lb.classList.remove('is-open'); if (lenis) lenis.start(); } }
lbItems = $$('[data-lightbox]');
if (lbItems.length) {
  const arrow = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Visionneuse');
  lb.innerHTML = `<img alt=""><button type="button" data-lb="close" aria-label="Fermer"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>${lbItems.length > 1 ? `<button type="button" data-lb="prev" aria-label="Précédente">${arrow}</button><button type="button" data-lb="next" aria-label="Suivante">${arrow}</button>` : ''}<p class="lightbox__n"></p>`;
  document.body.append(lb);
  lbItems.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); showLb(i); lb.classList.add('is-open'); if (lenis) lenis.stop(); }));
  lb.addEventListener('click', (e) => { const b = e.target.closest('[data-lb]'); if (!b && e.target.tagName !== 'IMG') closeLightbox(); else if (b?.dataset.lb === 'close') closeLightbox(); else if (b?.dataset.lb === 'prev') showLb(lbIndex - 1); else if (b?.dataset.lb === 'next') showLb(lbIndex + 1); });
  window.addEventListener('keydown', (e) => { if (!lb.classList.contains('is-open')) return; if (e.key === 'ArrowLeft') showLb(lbIndex - 1); if (e.key === 'ArrowRight') showLb(lbIndex + 1); });
}

/* ---------- Cartes à halo : la lueur suit le pointeur ---------- */
$$('[data-glow]').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
});

/* ---------- Demande d'étude : assistant par étapes ---------- */
const wiz = $('[data-wiz]');
if (wiz) {
  const panes = $$('.wiz__pane', wiz); const stepEls = $$('.wiz__steps li', wiz);
  const bar = $('.wiz__bar i', wiz); const countEl = $('[data-wiz-count]', wiz);
  const prev = $('[data-wiz-prev]', wiz); const next = $('[data-wiz-next]', wiz); const err = $('[data-wiz-error]', wiz);
  const last = panes.length - 1; let step = 0;

  const read = () => { const o = {}; for (const [k, v] of new FormData(wiz)) { if (v) o[k] = o[k] ? `${o[k]}, ${v}` : v; } return o; };
  const join = (...parts) => parts.filter(Boolean).join(' · ');
  const place = (d) => [d.ville, d.pays].filter(Boolean).join(', ');
  const rows = (d) => [['Ouvrage', d.domaine], ['Missions', d.mission], ['Stade du projet', d.stade], ['Localisation', place(d)], ['Échéance', d.delai], ['Demandeur', join(d.nom, d.organisation)], ['Type de structure', d.structure], ['E-mail', d.email], ['Téléphone', d.telephone], ['Précisions', d.message]].filter((r) => r[1]);
  const summary = () => rows(read()).map(([k, v]) => `${k} : ${v}`).join('\n');

  // Fiche de synthèse mise à jour à chaque réponse
  const refresh = () => {
    const d = read();
    const brief = { domaine: d.domaine, mission: d.mission, stade: d.stade, lieu: place(d), delai: d.delai, demandeur: join(d.nom, d.organisation) };
    let done = 0;
    Object.entries(brief).forEach(([k, v]) => { const el = $(`[data-brief="${k}"]`); if (!el) return; el.textContent = v || 'À préciser'; el.classList.toggle('is-set', !!v); if (v) done += 1; });
    const pct = Math.round((done / Object.keys(brief).length) * 100);
    const ringEl = $('[data-brief-ring]'); if (ringEl) ringEl.style.strokeDashoffset = 100 - pct;
    const num = $('[data-brief-pct]'); if (num) num.textContent = pct;
  };

  const valid = () => {
    const pane = panes[step]; let msg = '';
    const groups = [...new Set($$('input[type="radio"][required], input[type="checkbox"][data-required]', pane).map((i) => i.name))];
    if (groups.some((g) => !$(`input[name="${g}"]:checked`, pane))) msg = 'Sélectionnez une option dans chaque rubrique pour continuer.';
    $$('.field input, .field textarea', pane).forEach((f) => { const good = f.checkValidity(); f.closest('.field').classList.toggle('is-error', !good); if (!good) msg = 'Merci de compléter les champs obligatoires.'; });
    err.textContent = msg;
    return !msg;
  };

  const go = (n, silent) => {
    if (n > step && !valid()) return;
    step = Math.max(0, Math.min(last, n)); err.textContent = '';
    panes.forEach((p, i) => p.classList.toggle('is-active', i === step));
    stepEls.forEach((s, i) => { s.classList.toggle('is-active', i === step); s.classList.toggle('is-done', i < step); });
    bar.style.transform = `scaleX(${step / last})`;
    countEl.textContent = step === last ? 'Fiche prête' : `Étape ${step + 1} sur ${last}`;
    prev.hidden = step === 0; next.hidden = step === last;
    $('.btn__label', next).textContent = step === last - 1 ? 'Voir ma fiche' : 'Continuer';
    if (step === last) {
      const d = read(); const list = rows(d); const text = summary();
      const recap = $('[data-wiz-recap]', wiz);
      recap.innerHTML = list.map(() => '<div><dt></dt><dd></dd></div>').join('');
      [...recap.children].forEach((row, i) => { row.children[0].textContent = list[i][0]; row.children[1].textContent = list[i][1]; });
      $('[data-wiz-mail]', wiz).href = `mailto:${wiz.dataset.mail}?subject=${encodeURIComponent(`Demande d'étude · ${d.domaine || 'Projet'}`)}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite une étude personnalisée.\n\n${text}\n`)}`;
      $('[data-wiz-wa]', wiz).href = `${wiz.dataset.wa}?text=${encodeURIComponent(`Demande d'étude BETAT-IC\n\n${text}`)}`;
    }
    if (silent) return;
    if (animated) gsap.fromTo(panes[step], { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity' });
    const top = wiz.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.45) scrollToEl(wiz);
  };

  next.addEventListener('click', () => go(step + 1));
  prev.addEventListener('click', () => go(step - 1));
  stepEls.forEach((s, i) => s.addEventListener('click', () => { if (i < step) go(i); }));
  wiz.addEventListener('input', (e) => { e.target.closest('.field')?.classList.remove('is-error'); err.textContent = ''; refresh(); });
  wiz.addEventListener('change', (e) => { refresh(); if (e.target.name === 'domaine' && step === 0) setTimeout(() => go(1), 380); });
  wiz.addEventListener('submit', (e) => e.preventDefault());
  wiz.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && step < last) { e.preventDefault(); go(step + 1); } });
  $('[data-wiz-copy]', wiz).addEventListener('click', async (e) => {
    const label = $('.btn__label', e.currentTarget);
    try { await navigator.clipboard.writeText(summary()); label.textContent = 'Fiche copiée'; } catch (x) { label.textContent = 'Copie impossible'; }
    setTimeout(() => { label.textContent = 'Copier la fiche'; }, 2400);
  });
  const pre = new URLSearchParams(location.search).get('domaine');
  if (pre) { const hit = $$('input[name="domaine"]', wiz).find((i) => i.dataset.slug === pre); if (hit) hit.checked = true; }
  refresh(); go(0, true);
}

/* ---------- Formulaire de contact (ouvre la messagerie de l'utilisateur) ---------- */
const form = $('[data-form]');
if (form) {
  const note = $('[data-form-note]', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input, select, textarea', form).forEach((f) => { const valid = f.checkValidity(); f.closest('.field').classList.toggle('is-error', !valid); if (!valid) ok = false; });
    if (!ok) { note.textContent = 'Merci de compléter les champs obligatoires.'; note.className = 'form__note is-ko'; return; }
    const d = Object.fromEntries(new FormData(form));
    const body = [`Nom : ${d.nom}`, d.organisation && `Organisation : ${d.organisation}`, `E-mail : ${d.email}`, d.telephone && `Téléphone : ${d.telephone}`, `Domaine : ${d.service}`, '', d.message].filter((l) => l !== undefined && l !== false && l !== null).join('\n');
    location.href = `mailto:${form.dataset.mail}?subject=${encodeURIComponent(`Demande d'étude · ${d.service}`)}&body=${encodeURIComponent(body)}`;
    note.textContent = 'Votre messagerie va s’ouvrir avec la demande pré-remplie. Il ne reste qu’à l’envoyer.'; note.className = 'form__note is-ok';
  });
  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-error'));
}

/* ---------- Services : la grande vue suit la ligne survolée ---------- */
$$('[data-svc]').forEach((list) => {
  const rows = $$('.svc__row', list);
  const slides = $$('.svc__slide', list.closest('.svc__layout'));
  let cur = 0;
  const show = (i) => {
    if (i === cur || !slides[i]) return;
    slides.forEach((sl) => sl.classList.remove('is-prev'));
    slides[cur].classList.remove('is-on'); slides[cur].classList.add('is-prev');
    slides[i].classList.add('is-on');
    rows.forEach((r, k) => r.classList.toggle('is-current', k === i));
    cur = i;
  };
  rows.forEach((r, i) => {
    r.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(i); });
    r.addEventListener('focus', () => show(i));
  });
});

/* ---------- Équipe : volets ---------- */
$$('[data-crew]').forEach((crew) => {
  const items = $$('.crew__item', crew);
  const open = (it) => items.forEach((x) => x.classList.toggle('is-active', x === it));
  items.forEach((it) => {
    it.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') open(it); });
    it.addEventListener('focus', () => open(it));
    it.addEventListener('click', () => open(it));
  });
});

/* ---------- Carrousels tactiles : points de repère ---------- */
$$('[data-swipe]').forEach((box) => {
  const cards = [...box.children];
  if (cards.length < 2) return;
  const dots = document.createElement('div');
  dots.className = 'swipe-dots'; dots.setAttribute('aria-hidden', 'true');
  dots.innerHTML = cards.map((c, i) => `<i${i ? '' : ' class="is-on"'}></i>`).join('');
  box.after(dots);
  let raf = 0;
  box.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const left = box.getBoundingClientRect().left;
      let best = 0; let dist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.getBoundingClientRect().left - left - parseFloat(getComputedStyle(box).paddingLeft)); if (d < dist) { dist = d; best = i; } });
      if (box.scrollLeft + box.clientWidth >= box.scrollWidth - 4) best = cards.length - 1;
      [...dots.children].forEach((d, i) => d.classList.toggle('is-on', i === best));
    });
  }, { passive: true });
});

/* ---------- Carte de présence ---------- */
$$('[data-amap]').forEach((map) => {
  const sec = map.closest('section');
  const ids = $$('.amap__row', sec).map((r) => r.dataset.c);
  let cur = -1; let locked = false;
  const activate = (id) => { cur = ids.indexOf(id); $$('[data-c]', sec).forEach((el) => el.classList.toggle('is-active', el.dataset.c === id)); };
  const start = () => { activate(ids[0]); setInterval(() => { if (!locked && !document.hidden) activate(ids[(cur + 1) % ids.length]); }, 2800); };
  sec.addEventListener('pointerover', (e) => { const t = e.target.closest('[data-c]'); locked = !!t; if (t) activate(t.dataset.c); });
  sec.addEventListener('pointerleave', () => { locked = false; });
  sec.addEventListener('focusin', (e) => { const t = e.target.closest('[data-c]'); if (t) activate(t.dataset.c); });
  const wave = $('[data-amap-wave]', map);
  if (!animated) { sec.setAttribute('data-on', ''); start(); return; }
  wave.setAttribute('r', 0);
  ScrollTrigger.create({
    trigger: map, start: 'top 72%', once: true,
    onEnter: () => {
      sec.setAttribute('data-on', '');
      gsap.to(wave, { attr: { r: 1500 }, duration: 2.6, ease: 'power2.out' });
      setTimeout(start, 2300);
    },
  });
});

/* ---------- Scène 3D ---------- */
const canvas = $('canvas[data-scene]');
if (canvas && !reduce) {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (gl) import('./scene.js').then((m) => m.initScene(canvas, canvas.dataset.scene)).catch(() => {});
}
