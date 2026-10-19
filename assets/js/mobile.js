/* Сжатая мобильная версия (≤768px): карусели, «Подробнее», липкая кнопка заявки. Десктоп не трогаем. */
(function () {
  var mq = matchMedia('(max-width: 768px)');
  var rm = matchMedia('(prefers-reduced-motion: reduce)');
  var uid = 0;

  /* ---- карусели ---- */
  var cars = [].slice.call(document.querySelectorAll('[data-m-carousel]')).map(function (el) {
    var nav = document.createElement('div');
    nav.className = 'mc__nav';
    nav.innerHTML = '<button type="button" class="mc__arrow mc__prev" aria-label="Предыдущая карточка">←</button><div class="mc__dots"></div><button type="button" class="mc__arrow mc__next" aria-label="Следующая карточка">→</button>';
    var dots = nav.querySelector('.mc__dots');
    var items = function () { return [].slice.call(el.children).filter(function (c) { return c.nodeType === 1 && getComputedStyle(c).display !== 'none'; }); };
    var cur = 0;
    function go(i) {
      var it = items(); i = Math.max(0, Math.min(it.length - 1, i));
      el.scrollTo({ left: it[i].offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || 0), behavior: rm.matches ? 'auto' : 'smooth' });
    }
    function mark() {
      var it = items(), sl = el.scrollLeft, best = 0, bd = 1e9;
      it.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || 0) - sl); if (d < bd) { bd = d; best = i; } });
      cur = best;
      [].forEach.call(dots.children, function (d, i) { d.setAttribute('aria-current', i === best ? 'true' : 'false'); });
      nav.querySelector('.mc__prev').disabled = best === 0;
      nav.querySelector('.mc__next').disabled = best === it.length - 1;
    }
    var raf = 0;
    function onScroll() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; mark(); }); }
    nav.querySelector('.mc__prev').addEventListener('click', function () { go(cur - 1); });
    nav.querySelector('.mc__next').addEventListener('click', function () { go(cur + 1); });
    function on() {
      el.classList.add('mc');
      el.setAttribute('role', 'region'); el.setAttribute('aria-roledescription', 'карусель'); el.setAttribute('aria-label', el.dataset.mCarousel);
      el.tabIndex = 0;
      dots.innerHTML = '';
      items().forEach(function (c, i, a) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'mc__dot';
        b.setAttribute('aria-label', 'Карточка ' + (i + 1) + ' из ' + a.length);
        b.addEventListener('click', function () { go(i); });
        dots.appendChild(b);
      });
      el.after(nav); el.addEventListener('scroll', onScroll, { passive: true }); mark();
    }
    function off() {
      el.classList.remove('mc'); ['role', 'aria-roledescription', 'aria-label', 'tabindex'].forEach(function (a) { el.removeAttribute(a); });
      el.removeEventListener('scroll', onScroll); nav.remove();
    }
    return { on: on, off: off };
  });

  /* ---- «Подробнее» ---- */
  var mores = [].slice.call(document.querySelectorAll('[data-m-more]')).map(function (el) {
    if (!el.id) el.id = 'mm-' + (++uid);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'm-more'; b.setAttribute('aria-controls', el.id); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span>' + el.dataset.mMore + '</span><i aria-hidden="true"></i>';
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open)); el.classList.toggle('m-collapsed', !open);
      if (open) { el.classList.add('is-in'); [].forEach.call(el.querySelectorAll('[data-reveal]'), function (r) { r.classList.add('is-in'); }); }
    });
    return {
      on: function () { ('mAfter' in el.dataset ? el.after(b) : el.before(b)); b.setAttribute('aria-expanded', 'false'); el.classList.add('m-collapsed'); },
      off: function () { b.remove(); el.classList.remove('m-collapsed'); }
    };
  });

  var active = null;
  function apply() {
    var m = mq.matches; if (m === active) return; active = m;
    cars.forEach(function (c) { m ? c.on() : c.off(); });
    mores.forEach(function (c) { m ? c.on() : c.off(); });
  }
  apply();
  (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));

  /* ---- липкая кнопка «Оставить заявку» ---- */
  var cta = document.querySelector('.m-cta'), contact = document.getElementById('contact'), hero = document.querySelector('.hero');
  if (cta && 'IntersectionObserver' in window) {
    var inContact = false, pastHero = false;
    var upd = function () { cta.classList.toggle('show', pastHero && !inContact); };
    new IntersectionObserver(function (e) { inContact = e[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(contact);
    new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting; upd(); }, { rootMargin: '-40% 0px 0px 0px' }).observe(hero);
  }
})();
