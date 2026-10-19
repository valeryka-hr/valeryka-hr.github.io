/* Валерия Кравченко — interactions.
   Calm motion: Lenis smooth scroll + one rAF loop (header state, floating CTA) and an
   IntersectionObserver that adds .is-in to [data-reveal] / #route once. No scroll-jacking, no parallax. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    try { lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 0.9 }); } catch (e) { lenis = null; }
  }
  function scrollToEl(target) {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: target.id === 'top' ? 0 : -76, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- menu ---------- */
  const burger = $('.burger'), nav = $('#nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); burger.focus(); } });

  /* ---------- anchors ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    if (nav.classList.contains('open')) setMenu(false);
    scrollToEl(target);
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  /* ---------- service → form topic ---------- */
  const topic = $('#f-topic');
  function setTopic(val) {
    if (!val || !topic) return;
    if (![...topic.options].some((o) => o.value === val)) topic.add(new Option(val, val));
    topic.value = val;
  }
  // /?topic=…#contact (links from article pages) preselects the form topic
  try { const t = new URLSearchParams(location.search).get('topic'); if (t) setTopic(t.slice(0, 60)); } catch (e) {}
  $$('[data-request]').forEach((el) => el.addEventListener('click', () => {
    setTopic(el.dataset.request);
    const msg = $('#f-message');
    if (el.dataset.message && msg && !msg.value.trim()) msg.value = el.dataset.message;
    topic.closest('.field').animate?.([{ boxShadow: '0 0 0 0 rgba(205,182,246,0)' }, { boxShadow: '0 0 0 6px rgba(205,182,246,.25)' }, { boxShadow: '0 0 0 0 rgba(205,182,246,0)' }], { duration: 1200, delay: 700 });
    scrollToEl($('#contact'));
    setTimeout(() => $('#f-name').focus({ preventScroll: true }), reduce ? 0 : 1300);
  }));

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  // stagger siblings inside grids
  $$('.pains, .cases__list, .cards, .pillars, .faq__list, .reviews, .tg-cards, .bento, .reads__grid').forEach((g) => {
    $$('[data-reveal]', g).forEach((el, i) => el.style.setProperty('--rd', (i % 6) * 0.08 + 's'));
  });
  $$('[data-reveal]').forEach((el) => io.observe(el));

  /* ---------- hover glow follows pointer ---------- */
  $$('.pain, .card').forEach((el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* ---------- scroll-linked effects ---------- */
  const header = $('.header'), hero = $('.hero'), floatCta = $('.float-cta'), contact = $('#contact');
  // Steps: light the stages once the route enters the viewport
  const route = $('#route');
  if (route) {
    if (reduce || !('IntersectionObserver' in window)) route.classList.add('is-in');
    else { const ro = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { route.classList.add('is-in'); ro.disconnect(); } }), { rootMargin: '0px 0px -20% 0px' }); ro.observe(route); }
  }
  // flow rails: the glowing point travels the rail's own height
  const sizeRails = () => $$('.rail').forEach((r) => r.style.setProperty('--rail-h', Math.max(0, r.offsetHeight - 22) + 'px'));
  sizeRails();

  let lastY = -1;
  function frameTick() {
    const y = window.scrollY;
    if (y !== lastY) {
      lastY = y;
      header.classList.toggle('is-scrolled', y > 24);
      const heroH = hero.offsetHeight;
      const cr = contact.getBoundingClientRect();
      floatCta.classList.toggle('show', y > heroH * 0.7 && cr.top > innerHeight * 0.6);
    }
  }
  function loop(time) { if (lenis) lenis.raf(time); frameTick(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  window.addEventListener('resize', () => { lastY = -1; sizeRails(); }, { passive: true });

  /* ---------- form ---------- */
  const form = $('#leadForm'), status = $('#formStatus'), submit = $('.form__submit'), label = $('.form__label');
  const startedAt = Date.now();
  const TG_DM = 'https://t.me/valeryka76';
  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Напишите, как к вам обращаться'),
    contact: (v) => {
      const s = v.trim();
      if (!s) return 'Укажите, куда вам ответить';
      const tg = /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(s) || /^(https?:\/\/)?t\.me\/[a-zA-Z0-9_]{5,32}$/i.test(s);
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
      const phone = /^\+?[\d\s()\-]{10,20}$/.test(s) && s.replace(/\D/g, '').length >= 10;
      return tg || email || phone ? '' : 'Нужен @username в Telegram, телефон или email';
    },
    message: (v) => (v.trim().length >= 10 ? '' : 'Опишите ситуацию хотя бы в паре фраз'),
    // optional: checked only when filled
    phone: (v) => { const s = v.trim(); if (!s) return ''; const n = s.replace(/\D/g, '').length; return /^\+?[\d\s()\-]+$/.test(s) && n >= 10 && n <= 15 ? '' : 'Похоже, в номере опечатка — или оставьте поле пустым'; },
  };
  function setErr(name, msg) {
    const input = form.elements[name], err = $('#e-' + name);
    if (err) err.textContent = msg;
    if (input) { input.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (err) input.setAttribute('aria-describedby', 'e-' + name); input.closest('.field')?.classList.toggle('invalid', !!msg); }
  }
  function validate() {
    let first = null;
    Object.keys(rules).forEach((k) => { const m = rules[k](form.elements[k].value); setErr(k, m); if (m && !first) first = form.elements[k]; });
    const c = form.elements.consent;
    $('#e-consent').textContent = c.checked ? '' : 'Нужно согласие на обработку данных';
    if (!c.checked && !first) first = c;
    return first;
  }
  Object.keys(rules).forEach((k) => form.elements[k].addEventListener('blur', (e) => { if (e.target.value) setErr(k, rules[k](e.target.value)); }));
  Object.keys(rules).forEach((k) => form.elements[k].addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') setErr(k, rules[k](e.target.value)); }));
  // time chips: quick-fill the free-text field (toggle; keeps anything typed after a dash)
  const timeIn = form.elements.time, chips = form.querySelectorAll('.chip[data-time]');
  const syncChips = () => chips.forEach((c) => c.setAttribute('aria-pressed', timeIn.value.split(/[,;—-]/)[0].trim().toLowerCase() === c.dataset.time.toLowerCase() ? 'true' : 'false'));
  chips.forEach((c) => c.addEventListener('click', () => {
    const on = c.getAttribute('aria-pressed') === 'true';
    const rest = timeIn.value.replace(/^\s*(утро|день|вечер)\s*([,;—-]\s*)?/i, '');
    timeIn.value = on ? rest : (rest ? `${c.dataset.time}, ${rest}` : c.dataset.time);
    syncChips();
    if (!on) { timeIn.focus({ preventScroll: true }); const n = timeIn.value.length; timeIn.setSelectionRange(n, n); }
  }));
  timeIn.addEventListener('input', syncChips); form.addEventListener('reset', () => setTimeout(syncChips)); syncChips();
  form.elements.consent.addEventListener('change', (e) => { if (e.target.checked) $('#e-consent').textContent = ''; });

  const MAX_DM = 'https://max.ru/u/f9LHodD0cOIwpxF9evns1kuNnlMz68FhQ0i15wEXceoac5neuPNSAZJEvV4';
  const MAIL = 'tophr@yandex.ru';
  const leadText = (d) => `Здравствуйте, Валерия! Меня зовут ${d.name}.\nТема: ${d.topic}\n${d.message}${d.phone ? `\nТелефон: ${d.phone}` : ''}${d.time ? `\nУдобное время для связи: ${d.time}` : ''}\nКонтакт: ${d.contact}`.slice(0, 900);
  const tgLink = (d) => TG_DM + '?text=' + encodeURIComponent(leadText(d));
  const mailLink = (d) => `mailto:${MAIL}?subject=${encodeURIComponent('Запрос с сайта: ' + d.topic)}&body=${encodeURIComponent(leadText(d))}`;
  // MAX links can't carry prefilled text, so copy it to the clipboard on click.
  status.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-copy]'); if (!a) return;
    const t = a.dataset.copy;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => { const h = $('#copyHint'); if (h) h.textContent = 'Текст скопирован — вставьте его в чат MAX.'; }).catch(() => {});
  });
  function show(kind, html) { status.className = 'form__status ' + kind; status.innerHTML = html; }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form__status'; status.textContent = '';
    const bad = validate();
    if (bad) { bad.focus(); show('err', 'Проверьте, пожалуйста, отмеченные поля.'); return; }
    const d = Object.fromEntries(new FormData(form).entries());
    // honeypot: bots fill hidden fields — pretend success, send nothing
    if (d.website) { form.reset(); show('ok', 'Спасибо! Запрос отправлен.'); return; }
    const payload = { name: d.name.trim(), contact: d.contact.trim(), topic: d.topic, company: (d.company || '').trim(), phone: (d.phone || '').trim(), time: (d.time || '').trim(), message: d.message.trim(), website: '', elapsed: Date.now() - startedAt, page: location.href };
    form.classList.add('is-sending'); submit.disabled = true; label.textContent = 'Отправляю…';
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 12000);
    try {
      // data-endpoint holds the Apps Script /exec URL; the __PLACEHOLDER__ (not yet replaced) is ignored.
      const ep = form.dataset.endpoint || '';
      const url = ep && !ep.startsWith('__') ? ep : form.getAttribute('action');
      // Google Apps Script web apps don't answer CORS preflights → send as text/plain (a "simple" request).
      const ct = /script\.google\.com/.test(url) ? 'text/plain;charset=utf-8' : 'application/json';
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': ct }, body: JSON.stringify(payload), signal: ctrl.signal, redirect: 'follow' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'HTTP ' + res.status);
      form.reset();
      show('ok', '<b>Спасибо, запрос у меня.</b> Отвечу в течение рабочего дня по указанному контакту.');
    } catch (err) {
      const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      show('err', `Не получилось отправить форму — так бывает. Ваш текст не потерян, отправьте его удобным способом: <span class="fallback"><a href="${tgLink(payload)}" target="_blank" rel="noopener">Telegram</a><a href="${MAX_DM}" target="_blank" rel="noopener" data-copy="${esc(leadText(payload))}">MAX</a><a href="${mailLink(payload)}">Почта</a></span><small id="copyHint"></small>`);
    } finally {
      clearTimeout(to); form.classList.remove('is-sending'); submit.disabled = false; label.textContent = 'Отправить запрос';
    }
  });

  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
