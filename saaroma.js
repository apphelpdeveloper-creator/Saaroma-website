/* ============================================================
   SAAROMA — shared world: living galaxy, page transitions, reveals
   Loaded on every page. Each behaviour is guarded by its element,
   so pages that omit a piece simply skip it.
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.SAAROMA_REDUCE = reduce;

  /* ---- page transition: fade in on load, fade-through-dark on internal nav ---- */
  var veil = document.getElementById('veil');
  if (veil) {
    requestAnimationFrame(function () { veil.classList.add('clear'); });
    if (!reduce) {
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a');
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (a.target === '_blank' || href.charAt(0) === '#' || href.indexOf('mailto:') === 0) return;
        if (a.host === location.host && /\.html($|[?#])|\/$/.test(href)) {
          e.preventDefault();
          veil.classList.remove('clear'); veil.classList.add('leaving');
          setTimeout(function () { location.href = a.href; }, 460);
        }
      });
      window.addEventListener('pageshow', function (e) {
        if (e.persisted) { veil.classList.remove('leaving'); veil.classList.add('clear'); }
      });
    }
  }

  /* ---- reveal on scroll ---- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in'); });
    } else {
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
      }, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) {
        var sibs = el.parentElement ? el.parentElement.querySelectorAll(':scope > [data-reveal]') : [el];
        el.style.transitionDelay = (Math.min(Array.prototype.indexOf.call(sibs, el), 6) * 0.08) + 's';
        ro.observe(el);
      });
    }
  }

  /* ---- living galaxy: drifts, reacts to the cursor, gathers on scroll (a breath) ---- */
  var cv = document.getElementById('galaxy');
  if (cv && !reduce) {
    var ctx = cv.getContext('2d'), W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var stars = [], glints = [], mx = -9999, my = -9999, running = true, raf, gather = 0, targetGather = 0;
    function mobile() { return window.innerWidth < 760; }
    function build() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(mobile() ? 60 : 120, Math.round(W * H / 13000));
      stars = [];
      for (var i = 0; i < count; i++) { var bx = Math.random() * W, by = Math.random() * H; stars.push({ bx: bx, by: by, z: Math.random() * .8 + .2, r: Math.random() * 1.1 + .35, tw: Math.random() * 6.283 }); }
      glints = [];
      for (var g = 0; g < (mobile() ? 4 : 8); g++) { glints.push({ bx: Math.random() * W, by: Math.random() * H * .85, r: Math.random() * 1.3 + 1, tw: Math.random() * 6.283, sp: .5 + Math.random() }); }
    }
    function frame(ts) {
      if (!running) return;
      gather += (targetGather - gather) * .05;
      ctx.clearRect(0, 0, W, H);
      var t = ts * .001, cx = W / 2, cy = H * .42;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var gx = s.bx + (cx - s.bx) * gather * .10 * s.z;
        var gy = s.by + (cy - s.by) * gather * .10 * s.z;
        var ddx = mx - gx, ddy = my - gy, dist2 = ddx * ddx + ddy * ddy, R = 190;
        if (dist2 < R * R) { var f = (1 - Math.sqrt(dist2) / R) * 18 * s.z; gx += ddx * 0.006 * f; gy += ddy * 0.006 * f; }
        gx += Math.sin(t * .35 + s.tw) * 3 * s.z;
        var a = (0.32 + 0.42 * (0.5 + 0.5 * Math.sin(t * 1.2 + s.tw))) * s.z;
        ctx.beginPath(); ctx.arc(gx, gy, s.r, 0, 6.283); ctx.fillStyle = 'rgba(244,240,232,' + a.toFixed(3) + ')'; ctx.fill();
      }
      for (var g = 0; g < glints.length; g++) {
        var gl = glints[g];
        var xx = gl.bx + (cx - gl.bx) * gather * .12 + Math.sin(t * .3 + gl.tw) * 5;
        var yy = gl.by + (cy - gl.by) * gather * .12;
        var ga = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(t * gl.sp + gl.tw));
        var grd = ctx.createRadialGradient(xx, yy, 0, xx, yy, gl.r * 6);
        grd.addColorStop(0, 'rgba(232,184,75,' + ga.toFixed(3) + ')'); grd.addColorStop(1, 'rgba(232,184,75,0)');
        ctx.beginPath(); ctx.arc(xx, yy, gl.r * 6, 0, 6.283); ctx.fillStyle = grd; ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    window.addEventListener('mouseout', function () { mx = -9999; my = -9999; }, { passive: true });
    window.addEventListener('scroll', function () { var h = document.body.scrollHeight - window.innerHeight; targetGather = h > 0 ? Math.min(1, (window.pageYOffset || 0) / h * 1.6) : 0; }, { passive: true });
    window.addEventListener('resize', build, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!running) { running = true; raf = requestAnimationFrame(frame); } });
    build(); raf = requestAnimationFrame(frame);
  }
})();
