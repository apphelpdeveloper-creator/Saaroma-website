/* ============================================================
   SAAROMA FX — advanced graphics + transitions
   Additive only. Never edits copy, fonts, or layout.
   Loads after saaroma.js on every page.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  var EASE = 'cubic-bezier(.22,.7,.24,1)';

  function el(tag, id) { var n = document.createElement(tag); if (id) n.id = id; return n; }

  /* ---------------------------------------------------------
     1. WebGL aurora — layered fbm nebula, gold + plum,
        reacts to pointer and scroll. Falls back silently.
     --------------------------------------------------------- */
  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res; uniform float u_t; uniform vec2 u_m; uniform float u_s;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,-.6,.6,.8);',
    ' for(int i=0;i<6;i++){v+=a*noise(p);p=r*p*2.02;a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/u_res.xy;',
    ' vec2 q=uv; q.x*=u_res.x/u_res.y;',
    ' float t=u_t*0.045;',
    ' vec2 warp=vec2(fbm(q*1.6+vec2(t,t*.7)),fbm(q*1.6+vec2(5.2-t*.6,1.3+t)));',
    ' float n=fbm(q*2.1+warp*1.9+vec2(0.,-t*1.4+u_s*0.9));',
    ' float veil=fbm(q*0.9-warp*1.1+vec2(t*.5,u_s*.4));',
    ' vec2 md=(uv-u_m); md.x*=u_res.x/u_res.y;',
    ' float halo=exp(-dot(md,md)*7.0);',
    ' float bandA=smoothstep(.30,.80,n)*smoothstep(1.15,.10,uv.y+ n*.30);',
    ' float bandB=smoothstep(.34,.92,veil);',
    ' vec3 gold=vec3(.91,.72,.29);',
    ' vec3 plum=vec3(.42,.16,.66);',
    ' vec3 deep=vec3(.10,.05,.20);',
    ' vec3 col=deep*bandB*0.55;',
    ' col+=plum*bandB*0.5;',
    ' col+=gold*bandA*0.32;',
    ' float ribbon=smoothstep(.58,.98,fbm(vec2(q.x*1.1+t*.6,q.y*3.2-t*.9)));',
    ' col+=mix(gold,plum,0.45)*ribbon*0.18*smoothstep(0.05,0.9,uv.y);',
    ' col+=gold*halo*0.16;',
    ' col+=plum*halo*0.12;',
    ' float grain=hash(gl_FragCoord.xy+u_t)*0.025;',
    ' col+=grain;',
    ' float vig=smoothstep(1.25,.25,length(uv-.5));',
    ' col*=mix(0.55,1.0,vig);',
    ' col=pow(col,vec3(1.15))*1.05;',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function aurora() {
    if (reduce) return;
    var c = el('canvas', 'aurora');
    body.insertBefore(c, body.firstChild);
    var gl = c.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' })
          || c.getContext('experimental-webgl');
    if (!gl) { c.remove(); return; }

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { c.remove(); return; }
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { c.remove(); return; }
    gl.useProgram(pr);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(pr, 'u_res'),
        uT = gl.getUniformLocation(pr, 'u_t'),
        uM = gl.getUniformLocation(pr, 'u_m'),
        uS = gl.getUniformLocation(pr, 'u_s');

    var scale = window.innerWidth < 760 ? 0.45 : 0.6;
    function size() {
      c.width = Math.max(1, Math.floor(c.clientWidth * scale));
      c.height = Math.max(1, Math.floor(c.clientHeight * scale));
      gl.viewport(0, 0, c.width, c.height);
    }
    size();
    window.addEventListener('resize', size, { passive: true });

    var mx = 0.5, my = 0.55, tx = 0.5, ty = 0.55, sp = 0, tsp = 0, run = true, raf;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX / window.innerWidth;
      ty = 1 - e.clientY / window.innerHeight;
    }, { passive: true });
    window.addEventListener('scroll', function () {
      var h = document.body.scrollHeight - window.innerHeight;
      tsp = h > 0 ? (window.pageYOffset || 0) / h : 0;
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      run = !document.hidden;
      if (run) raf = requestAnimationFrame(draw); else cancelAnimationFrame(raf);
    });

    function draw(ts) {
      if (!run) return;
      mx += (tx - mx) * 0.045; my += (ty - my) * 0.045; sp += (tsp - sp) * 0.06;
      gl.uniform2f(uRes, c.width, c.height);
      gl.uniform1f(uT, ts * 0.001);
      gl.uniform2f(uM, mx, my);
      gl.uniform1f(uS, sp);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    requestAnimationFrame(function () { c.classList.add('on'); });
  }

  /* ---------------------------------------------------------
     2. Overlays: grain, vignette, cursor spotlight, progress
     --------------------------------------------------------- */
  function overlays() {
    if (!reduce) body.appendChild(el('div', 'fx-grain'));
    body.appendChild(el('div', 'fx-vignette'));

    var bar = el('div', 'fx-progress');
    body.appendChild(bar);
    var barRaf;
    function prog() {
      barRaf = 0;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, (window.pageYOffset || 0) / h) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    window.addEventListener('scroll', function () { if (!barRaf) barRaf = requestAnimationFrame(prog); }, { passive: true });
    prog();

    if (reduce || window.matchMedia('(hover: none)').matches) return;
    var spot = el('div', 'fx-spot');
    body.appendChild(spot);
    var px = window.innerWidth / 2, py = window.innerHeight / 2, sx = px, sy = py, moving = false;
    window.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!moving) { moving = true; spot.classList.add('on'); }
    }, { passive: true });
    (function loop() {
      sx += (px - sx) * 0.12; sy += (py - sy) * 0.12;
      spot.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------------------------------------------------
     3. Headline word reveal (splits on spaces only — the
        exact same words, never rewritten)
     --------------------------------------------------------- */
  function splitHeads() {
    if (reduce) return;
    var sel = '.legal-hero h1, .page-hero h1, .story-section h2, .doc h2, .sec-title, .problem h2, .answer .copy h2, .closing h2';
    var nodes = document.querySelectorAll(sel);
    Array.prototype.forEach.call(nodes, function (h) {
      if (h.dataset.fxSplit) return;
      // only split when the heading is pure text or simple inline spans
      var ok = Array.prototype.every.call(h.childNodes, function (n) {
        return n.nodeType === 3 || (n.nodeType === 1 && /^(SPAN|EM|STRONG|B|I)$/.test(n.tagName) && n.children.length === 0);
      });
      if (!ok || !h.textContent.trim()) return;
      h.dataset.fxSplit = '1';

      var frag = document.createDocumentFragment();
      var idx = 0;
      Array.prototype.forEach.call(Array.prototype.slice.call(h.childNodes), function (n) {
        var isEl = n.nodeType === 1;
        var text = n.textContent;
        var parts = text.split(/(\s+)/);
        parts.forEach(function (part) {
          if (part === '') return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span');
          w.className = 'fx-w';
          w.style.transitionDelay = Math.min(idx * 0.045, 0.9) + 's';
          idx++;
          if (isEl) {
            var clone = n.cloneNode(false);
            clone.textContent = part;
            w.appendChild(clone);
          } else {
            w.textContent = part;
          }
          frag.appendChild(w);
        });
      });
      h.textContent = '';
      h.appendChild(frag);
    });
  }

  /* ---------------------------------------------------------
     4. Scroll observers: headline reveal + section rise
     --------------------------------------------------------- */
  function observers() {
    if (!('IntersectionObserver' in window) || reduce) {
      document.querySelectorAll('[data-fx-split], .fx-rise').forEach(function (n) { n.classList.add('fx-in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('fx-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' });

    // failsafe: nothing may stay hidden/soft if an observer never fires
    setTimeout(function () {
      document.querySelectorAll('[data-fx-split], .fx-rise').forEach(function (n) { n.classList.add('fx-in'); });
    }, 2200);

    document.querySelectorAll('[data-fx-split]').forEach(function (n) { io.observe(n); });

    var riseSel = '.timeline-item, .stat-cell, .mode-card, .memory-card, .step, .do-card, .dont-card, .honest-card, .crisis-note, .pull-quote, .founder-note, .list-item';
    document.querySelectorAll(riseSel).forEach(function (n) {
      if (n.hasAttribute('data-reveal')) return; // site already animates it
      n.classList.add('fx-rise');
      io.observe(n);
    });
  }

  /* ---------------------------------------------------------
     5. 3D tilt + glare on card surfaces
     --------------------------------------------------------- */
  function tilt() {
    if (reduce || window.matchMedia('(hover: none)').matches) return;
    var sel = '.glass, .section-card, .highlight-card, .mode-card, .memory-card, .honest-card, .do-card, .dont-card, .stat-cell, .timeline-content, .chat, .crisis-note, .founder-note';
    document.querySelectorAll(sel).forEach(function (card) {
      card.classList.add('fx-tilt', 'fx-edge');
      var raf = 0, rx = 0, ry = 0;
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--fx-x', (x * 100).toFixed(2) + '%');
        card.style.setProperty('--fx-y', (y * 100).toFixed(2) + '%');
        ry = (x - 0.5) * 9; rx = (0.5 - y) * 9;
        if (!raf) raf = requestAnimationFrame(function () {
          raf = 0;
          card.classList.add('fx-live');
          card.style.transform = 'perspective(1100px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-6px)';
        });
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('fx-live');
        card.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------
     6. Magnetic buttons + link sweeps
     --------------------------------------------------------- */
  function magnetic() {
    var btns = document.querySelectorAll('.btn-app, .btn-danger, .btn-cancel, .cta-link, .about-cta a, .cta a');
    btns.forEach(function (b) {
      b.classList.add('fx-mag');
      if (reduce || window.matchMedia('(hover: none)').matches) return;
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = 'translate(' + (dx * 12).toFixed(1) + 'px,' + (dy * 8).toFixed(1) + 'px) scale(1.04)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
    document.querySelectorAll('.footer-links a, .doc a[href^="mailto"], .story a').forEach(function (a) {
      a.classList.add('fx-link');
    });
  }

  /* ---------------------------------------------------------
     7. Gold shimmer on accent words
     --------------------------------------------------------- */
  function shimmer() {
    if (reduce) return;
    document.querySelectorAll('h1 .g, h2 .g, h1 .gold, h2 .gold, .hero-em').forEach(function (n) {
      n.classList.add('fx-shimmer');
    });
  }

  /* ---------------------------------------------------------
     8. Parallax drift for hero + decorative blocks
     --------------------------------------------------------- */
  function parallax() {
    if (reduce) return;
    var layers = [];
    document.querySelectorAll('.hero, .page-hero, .legal-hero').forEach(function (n) {
      layers.push({ node: n, k: 0.12 });
    });
    if (!layers.length) return;
    var raf = 0;
    function upd() {
      raf = 0;
      var y = window.pageYOffset || 0;
      layers.forEach(function (l) {
        l.node.style.transform = 'translate3d(0,' + (y * l.k).toFixed(1) + 'px,0)';
        l.node.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 1.15)));
      });
    }
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
  }

  /* ---------------------------------------------------------
     9. Cinematic page transition between pages
     --------------------------------------------------------- */
  function transition() {
    if (reduce) return;
    var veil = el('div', 'fx-veil');
    body.appendChild(veil);
    requestAnimationFrame(function () { veil.classList.remove('on'); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank' || href.charAt(0) === '#' || href.indexOf('mailto:') === 0) return;
      if (a.host !== location.host) return;
      if (!/\.html($|[?#])|\/$/.test(href)) return;
      if (document.getElementById('veil')) return; // site veil already handles it
      e.preventDefault();
      veil.classList.add('on');
      setTimeout(function () { location.href = a.href; }, 460);
    });
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) veil.classList.remove('on');
    });
  }

  function boot() {
    aurora();
    overlays();
    splitHeads();
    document.querySelectorAll('.fx-w').forEach(function (w) {
      var h = w.closest('h1,h2,h3,.sec-title');
      if (h) h.setAttribute('data-fx-split', '1');
    });
    observers();
    tilt();
    magnetic();
    shimmer();
    parallax();
    transition();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
