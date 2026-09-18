/* ===================================================
   ZWCH Shop — script.js
   - Countdown timer (Sept 25 2026, 23:59:59)
   - Navbar scroll behavior
   - FAQ accordion
   - Floating particle canvas
   - Scroll reveal animations
   - GA4 event tracking
   =================================================== */

'use strict';

// ── GA4 Tracking ─────────────────────────────────────
function trackBotClick(source) {
  if (typeof gtag === 'function') {
    gtag('event', 'telegram_bot_click', {
      event_category: 'CTA',
      event_label: source,
      value: 1
    });
  }
}
window.trackBotClick = trackBotClick;

// ── Countdown Timer ───────────────────────────────────
(function initCountdown() {
  // Sept 25 2026 23:59:59 UTC+2 (Europe/Rome)
  // That equals Sept 25 2026 21:59:59 UTC
  const TARGET = new Date('2026-09-25T21:59:59Z').getTime();

  const elDays  = document.getElementById('cd-days');
  const elHours = document.getElementById('cd-hours');
  const elMins  = document.getElementById('cd-mins');
  const elSecs  = document.getElementById('cd-secs');
  const elTimer = document.getElementById('countdown');
  const elExpir = document.getElementById('countdown-expired');

  if (!elDays) return;

  function pad(n) { return String(n).padStart(2, '0'); }

  function setUrgentStyle(urgent) {
    [elDays, elHours, elMins, elSecs].forEach(el => {
      if (urgent) el.classList.add('urgent');
      else        el.classList.remove('urgent');
    });
  }

  function tick() {
    const now   = Date.now();
    const diff  = TARGET - now;

    if (diff <= 0) {
      // Expired
      elTimer.classList.add('hidden');
      elExpir.classList.remove('hidden');
      return;
    }

    const totalSecs  = Math.floor(diff / 1000);
    const days       = Math.floor(totalSecs / 86400);
    const hours      = Math.floor((totalSecs % 86400) / 3600);
    const mins       = Math.floor((totalSecs % 3600)  / 60);
    const secs       = totalSecs % 60;

    elDays.textContent  = pad(days);
    elHours.textContent = pad(hours);
    elMins.textContent  = pad(mins);
    elSecs.textContent  = pad(secs);

    // Turn red when under 24 hours
    setUrgentStyle(diff < 86400 * 1000);

    // GA4 track when timer hits 1 hour remaining
    if (diff < 3600 * 1000 && diff > 3599 * 1000) {
      if (typeof gtag === 'function') {
        gtag('event', 'countdown_under_1h', { event_category: 'Engagement' });
      }
    }
  }

  tick();
  setInterval(tick, 1000);
})();

// ── Navbar scroll ─────────────────────────────────────
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  function onScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── FAQ Accordion ─────────────────────────────────────
(function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-q');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.faq-q');
        if (b) b.setAttribute('aria-expanded', 'false');
      });

      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');

        // GA4 event
        if (typeof gtag === 'function') {
          gtag('event', 'faq_open', {
            event_category: 'FAQ',
            event_label: btn.textContent.trim().slice(0, 60)
          });
        }
      }
    });
  });
})();

// ── Scroll Reveal ─────────────────────────────────────
(function initReveal() {
  const targets = document.querySelectorAll(
    '.step-card, .feature-card, .trust-list li, .faq-item, .offer-card, .how-badge, .trust-card-big'
  );

  targets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        // Staggered delay based on sibling index
        const siblings = Array.from(entry.target.parentElement?.children || []);
        const i = siblings.indexOf(entry.target);
        entry.target.style.transitionDelay = `${Math.min(i * 80, 320)}ms`;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -30px 0px'
  });

  targets.forEach(el => observer.observe(el));
})();

// ── Geometric Canvas Particles ────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, nodes, raf;
  const NODE_COUNT    = 160;
  const MAX_DIST      = 148;
  const MAX_DIST_SQ   = MAX_DIST * MAX_DIST;
  const MOUSE_RADIUS  = 180;
  const MOUSE_RAD_SQ  = MOUSE_RADIUS * MOUSE_RADIUS;
  const ATTRACT_FORCE = 0.012; // gentle pull toward cursor
  const MAX_SPEED     = 2.2;

  // Mouse position (off-canvas by default)
  const mouse = { x: -9999, y: -9999, inside: false };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
  function rand(a, b) { return Math.random() * (b - a) + a; }

  function makeNode() {
    return {
      x:    rand(0, W),
      y:    rand(0, H),
      vx:   rand(-0.35, 0.35),
      vy:   rand(-0.28, 0.28),
      r:    rand(1, 2.4),
      cyan: Math.random() > 0.22,
      alpha: rand(0.28, 0.72),
    };
  }

  function init() { resize(); nodes = Array.from({ length: NODE_COUNT }, makeNode); }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // Update positions
    for (const n of nodes) {
      // Mouse attraction
      if (mouse.inside) {
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const dSq = dx*dx + dy*dy;
        if (dSq < MOUSE_RAD_SQ && dSq > 0.01) {
          const dist = Math.sqrt(dSq);
          const t = 1 - dist / MOUSE_RADIUS;
          n.vx += (dx / dist) * ATTRACT_FORCE * t * 6;
          n.vy += (dy / dist) * ATTRACT_FORCE * t * 6;
        }
      }

      // Speed cap
      const spd = Math.sqrt(n.vx*n.vx + n.vy*n.vy);
      if (spd > MAX_SPEED) { n.vx = (n.vx/spd)*MAX_SPEED; n.vy = (n.vy/spd)*MAX_SPEED; }

      // Gentle friction so they drift back
      n.vx *= 0.992;
      n.vy *= 0.992;

      n.x += n.vx;
      n.y += n.vy;

      // Wrap edges
      if (n.x < -20)  n.x = W + 20;
      if (n.x > W+20) n.x = -20;
      if (n.y < -20)  n.y = H + 20;
      if (n.y > H+20) n.y = -20;
    }

    // Node–node lines
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dSq = dx*dx + dy*dy;
        if (dSq < MAX_DIST_SQ) {
          const t = 1 - dSq / MAX_DIST_SQ;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = (a.cyan && b.cyan)
            ? `rgba(0,212,255,${(t * 0.16).toFixed(3)})`
            : `rgba(124,58,237,${(t * 0.11).toFixed(3)})`;
          ctx.lineWidth = t * 0.7;
          ctx.stroke();
        }
      }
    }

    // Mouse–node lines (highlighted)
    if (mouse.inside) {
      for (const n of nodes) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const dSq = dx*dx + dy*dy;
        if (dSq < MOUSE_RAD_SQ) {
          const t = 1 - dSq / MOUSE_RAD_SQ;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(0,212,255,${(t * 0.42).toFixed(3)})`;
          ctx.lineWidth = t * 1.2;
          ctx.stroke();
        }
      }

      // Mouse dot
      const gr = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 18);
      gr.addColorStop(0, 'rgba(0,212,255,0.35)');
      gr.addColorStop(1, 'rgba(0,212,255,0)');
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();
    }

    // Dots
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.cyan
        ? `rgba(0,212,255,${n.alpha.toFixed(2)})`
        : `rgba(124,58,237,${n.alpha.toFixed(2)})`;
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  }

  init();
  frame();

  // Mouse tracking — document level (works across all sections)
  document.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.inside = true;
  }, { passive: true });

  document.addEventListener('mouseleave', () => { mouse.inside = false; }, { passive: true });

  // Touch support
  document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.inside = true;
  }, { passive: true });

  document.addEventListener('touchend', () => { mouse.inside = false; }, { passive: true });

  window.addEventListener('resize', () => {
    resize();
    nodes = Array.from({ length: NODE_COUNT }, makeNode);
  }, { passive: true });
})();

// ── Sticky CTA hide when footer visible ───────────────
(function initStickyHide() {
  const sticky = document.getElementById('sticky-cta');
  const footer = document.getElementById('footer');
  if (!sticky || !footer) return;

  const observer = new IntersectionObserver(([entry]) => {
    sticky.style.opacity = entry.isIntersecting ? '0' : '1';
    sticky.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
  }, { threshold: 0.1 });

  observer.observe(footer);
})();

// ── Time on page tracking ─────────────────────────────
(function initTimeTracking() {
  const milestones = [30, 60, 120, 300];
  const fired = new Set();
  const start = Date.now();

  setInterval(() => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    milestones.forEach(m => {
      if (elapsed >= m && !fired.has(m)) {
        fired.add(m);
        if (typeof gtag === 'function') {
          gtag('event', 'time_on_page', {
            event_category: 'Engagement',
            event_label: `${m}s`
          });
        }
      }
    });
  }, 5000);
})();
