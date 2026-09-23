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

// ── Countdown Timer (Evergreen — resets every 7 days) ─
(function initCountdown() {
  const DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const STORAGE_KEY = 'zwch_offer_expiry';

  // Get or create expiry timestamp
  function getExpiry() {
    let stored = localStorage.getItem(STORAGE_KEY);
    let expiry = stored ? parseInt(stored, 10) : NaN;
    // If missing or already expired, set a fresh 7-day window
    if (isNaN(expiry) || Date.now() >= expiry) {
      expiry = Date.now() + DURATION_MS;
      localStorage.setItem(STORAGE_KEY, expiry);
    }
    return expiry;
  }

  let TARGET = getExpiry();

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
    const now  = Date.now();
    const diff = TARGET - now;

    if (diff <= 0) {
      // Reset for another 7 days
      TARGET = Date.now() + DURATION_MS;
      localStorage.setItem(STORAGE_KEY, TARGET);
      return;
    }

    const totalSecs = Math.floor(diff / 1000);
    elDays.textContent  = pad(Math.floor(totalSecs / 86400));
    elHours.textContent = pad(Math.floor((totalSecs % 86400) / 3600));
    elMins.textContent  = pad(Math.floor((totalSecs % 3600) / 60));
    elSecs.textContent  = pad(totalSecs % 60);

    setUrgentStyle(diff < 86400 * 1000);
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

  function isMobile() { return window.innerWidth < 768; }

  function getConfig() {
    if (isMobile()) {
      return { count: 45, maxDist: 100, attract: false };
    }
    return { count: 160, maxDist: 148, attract: true };
  }

  let cfg = getConfig();
  let MAX_DIST_SQ = cfg.maxDist * cfg.maxDist;

  const MOUSE_RADIUS  = 180;
  const MOUSE_RAD_SQ  = MOUSE_RADIUS * MOUSE_RADIUS;
  const ATTRACT_FORCE = 0.012;
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

  function init() { resize(); nodes = Array.from({ length: cfg.count }, makeNode); }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // Update positions
    for (const n of nodes) {
      // Mouse attraction (desktop only)
      if (cfg.attract && mouse.inside) {
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
    cfg = getConfig();
    MAX_DIST_SQ = cfg.maxDist * cfg.maxDist;
    resize();
    nodes = Array.from({ length: cfg.count }, makeNode);
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

// ═══════════════════════════════════════════════════════════════════
// ZWCH WEB SHOP — Modal, Shop, Auth, Orders modules
// ═══════════════════════════════════════════════════════════════════

const API = 'https://bot.zwch.store';
const TOKEN_KEY = 'zwch_auth_token';
const EMAIL_KEY = 'zwch_auth_email';

// ── ZWCHModal ─────────────────────────────────────────────────────
const ZWCHModal = (() => {
  function open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
    el.addEventListener('click', _backdropClose);
  }

  function close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active');
    document.body.style.overflow = '';
    el.removeEventListener('click', _backdropClose);
  }

  function _backdropClose(e) {
    if (e.target === e.currentTarget) close(e.currentTarget.id);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => close(m.id));
    }
  });

  return { open, close };
})();

// ── ZWCHShop ─────────────────────────────────────────────────────
const ZWCHShop = (() => {
  let _products = [];
  let _selectedProduct = null;

  async function init() {
    try {
      const res = await fetch(`${API}/api/shop/products`);
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      _products = json.data || [];
      _renderCards();
    } catch (err) {
      const grid = document.getElementById('shop-grid');
      if (grid) grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px 0;">Could not load products. Please try again later.</p>';
    }
  }

  function _renderCards() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;

    if (_products.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px 0;">No products available right now.</p>';
      return;
    }

    grid.innerHTML = _products.map(p => {
      const stock = p.stock_count || 0;
      const price = `\u20ac${(p.price_cents / 100).toFixed(2)}`;
      const isOut = stock === 0;
      const isLow = !isOut && stock <= 3;

      let stockClass = 'product-card__stock--available';
      let stockText = `${stock} in stock`;
      if (isLow)  { stockClass = 'product-card__stock--low'; stockText = `Only ${stock} left`; }
      if (isOut)  { stockClass = 'product-card__stock--out'; stockText = 'Sold Out'; }

      return `
        <div class="product-card">
          <div class="product-card__name">${_esc(p.name)}</div>
          <div class="product-card__desc">${_esc(p.description || '')}</div>
          <div class="product-card__price">${price} <span style="font-size: 0.8em; color: var(--text-muted); font-weight: 400;">one-time</span></div>
          <span class="product-card__stock ${stockClass}">${stockText}</span>
          <button class="btn btn-primary product-card__btn"
            ${isOut ? 'disabled' : ''}
            onclick="ZWCHShop.openBuyModal(${p.id})">
            ${isOut ? 'Sold Out' : 'Purchase'}
          </button>
        </div>`;
    }).join('');
  }

  function openBuyModal(productId) {
    _selectedProduct = _products.find(p => p.id === productId);
    if (!_selectedProduct) return;

    document.getElementById('modal-buy-product-name').textContent = _selectedProduct.name;
    document.getElementById('modal-buy-price').textContent = `\u20ac${(_selectedProduct.price_cents / 100).toFixed(2)}`;
    document.getElementById('buy-email').value = localStorage.getItem(EMAIL_KEY) || '';
    _setBuyLoading(false);
    ZWCHModal.open('modal-buy');
    setTimeout(() => document.getElementById('buy-email').focus(), 200);
  }

  async function submitBuy(e) {
    e.preventDefault();
    if (!_selectedProduct) return false;

    const email = document.getElementById('buy-email').value.trim();
    if (!email || !/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(email)) {
      document.getElementById('buy-email').focus();
      return false;
    }

    _setBuyLoading(true);
    try {
      const res = await fetch(`${API}/api/shop/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: _selectedProduct.id, email }),
      });
      const json = await res.json();

      if (res.ok && json.checkout_url) {
        localStorage.setItem(EMAIL_KEY, email);
        window.location.href = json.checkout_url;
      } else {
        _setBuyLoading(false);
        alert(json.error || 'Something went wrong. Please try again.');
      }
    } catch {
      _setBuyLoading(false);
      alert('Network error. Please check your connection.');
    }
    return false;
  }

  function _setBuyLoading(loading) {
    document.getElementById('btn-buy-label').classList.toggle('hidden', loading);
    document.getElementById('btn-buy-loading').classList.toggle('hidden', !loading);
    document.getElementById('btn-buy-submit').disabled = loading;
  }

  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { openBuyModal, submitBuy };
})();

// ── ZWCHAuth ─────────────────────────────────────────────────────
const ZWCHAuth = (() => {
  let _pendingEmail = '';

  function _getToken() { return localStorage.getItem(TOKEN_KEY); }
  function _getEmail() { return localStorage.getItem(EMAIL_KEY); }
  function _isLoggedIn() { return !!_getToken(); }

  function openOrdersFlow() {
    if (_isLoggedIn()) {
      ZWCHOrders.open(_getEmail());
    } else {
      _resetAuthModal();
      ZWCHModal.open('modal-auth');
      setTimeout(() => document.getElementById('auth-email').focus(), 200);
    }
  }

  function _resetAuthModal() {
    document.getElementById('auth-step-1').classList.remove('hidden');
    document.getElementById('auth-step-2').classList.add('hidden');
    document.getElementById('auth-email').value = _getEmail() || '';
    document.getElementById('auth-email-error').classList.add('hidden');
    document.getElementById('auth-otp-error').classList.add('hidden');
    _clearOtpInputs();
  }

  async function sendOtp(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    if (!email) return false;

    const errEl = document.getElementById('auth-email-error');
    errEl.classList.add('hidden');
    _setOtpBtnLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (res.ok) {
        _pendingEmail = email;
        document.getElementById('auth-email-display').textContent = email;
        document.getElementById('auth-step-1').classList.add('hidden');
        document.getElementById('auth-step-2').classList.remove('hidden');
        _initOtpInputs();
        setTimeout(() => document.getElementById('otp-0').focus(), 100);
      } else {
        errEl.textContent = json.error || 'Error sending code. Try again.';
        errEl.classList.remove('hidden');
      }
    } catch {
      errEl.textContent = 'Network error. Please retry.';
      errEl.classList.remove('hidden');
    }
    _setOtpBtnLoading(false);
    return false;
  }

  async function verifyOtp(e) {
    e.preventDefault();
    const code = Array.from(document.querySelectorAll('.otp-digit')).map(i => i.value).join('');
    const errEl = document.getElementById('auth-otp-error');
    errEl.classList.add('hidden');

    if (code.length < 6) {
      errEl.textContent = 'Please enter all 6 digits.';
      errEl.classList.remove('hidden');
      return false;
    }

    _setVerifyBtnLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: _pendingEmail, code }),
      });
      const json = await res.json();

      if (res.ok && json.token) {
        localStorage.setItem(TOKEN_KEY, json.token);
        localStorage.setItem(EMAIL_KEY, json.email);
        ZWCHModal.close('modal-auth');
        ZWCHOrders.open(json.email);
      } else {
        errEl.textContent = json.error || 'Invalid code. Try again.';
        errEl.classList.remove('hidden');
        _clearOtpInputs();
        setTimeout(() => document.getElementById('otp-0').focus(), 50);
      }
    } catch {
      errEl.textContent = 'Network error. Please retry.';
      errEl.classList.remove('hidden');
    }
    _setVerifyBtnLoading(false);
    return false;
  }

  function backToStep1() {
    document.getElementById('auth-step-2').classList.add('hidden');
    document.getElementById('auth-step-1').classList.remove('hidden');
    document.getElementById('auth-email-error').classList.add('hidden');
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    ZWCHModal.close('modal-orders');
  }

  function _initOtpInputs() {
    const inputs = document.querySelectorAll('.otp-digit');
    inputs.forEach((inp, idx) => {
      inp.addEventListener('input', e => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val.slice(-1);
        e.target.classList.toggle('otp-filled', !!val);
        if (val && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value && idx > 0) inputs[idx - 1].focus();
      });
      inp.addEventListener('paste', e => {
        e.preventDefault();
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        pasted.split('').forEach((ch, i) => {
          if (inputs[i]) { inputs[i].value = ch; inputs[i].classList.add('otp-filled'); }
        });
        const focusIdx = Math.min(pasted.length, 5);
        if (inputs[focusIdx]) inputs[focusIdx].focus();
      });
    });
  }

  function _clearOtpInputs() {
    document.querySelectorAll('.otp-digit').forEach(i => {
      i.value = '';
      i.classList.remove('otp-filled');
    });
  }

  function _setOtpBtnLoading(l) {
    document.getElementById('btn-otp-label').classList.toggle('hidden', l);
    document.getElementById('btn-otp-loading').classList.toggle('hidden', !l);
    document.getElementById('btn-send-otp').disabled = l;
  }

  function _setVerifyBtnLoading(l) {
    document.getElementById('btn-verify-label').classList.toggle('hidden', l);
    document.getElementById('btn-verify-loading').classList.toggle('hidden', !l);
    document.getElementById('btn-verify-otp').disabled = l;
  }

  return { openOrdersFlow, sendOtp, verifyOtp, backToStep1, logout };
})();

// ── ZWCHOrders ────────────────────────────────────────────────────
const ZWCHOrders = (() => {
  async function open(email) {
    document.getElementById('orders-email-display').textContent = email || '';
    document.getElementById('orders-list').innerHTML = '<div class="orders-loading">Loading your orders...</div>';
    ZWCHModal.open('modal-orders');

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`${API}/api/user/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        ZWCHModal.close('modal-orders');
        ZWCHAuth.openOrdersFlow();
        return;
      }

      const json = await res.json();
      _renderOrders(json.data || []);
    } catch {
      document.getElementById('orders-list').innerHTML =
        '<div class="orders-loading">Could not load orders. Please try again.</div>';
    }
  }

  function _renderOrders(orders) {
    const container = document.getElementById('orders-list');
    if (!orders.length) {
      container.innerHTML = '<div class="orders-empty">No orders yet.<br/><small>Your purchases will appear here after payment.</small></div>';
      return;
    }

    container.innerHTML = orders.map(o => {
      const date = new Date(o.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
      const amount = `\u20ac${(o.amount_cents / 100).toFixed(2)}`;
      const links = o.links || [];

      const keysHtml = links.length
        ? links.map(link => `
          <div class="order-card__key-wrap">
            <span class="order-card__key" title="${_esc(link)}">${_esc(link)}</span>
            <button class="btn-copy-key" onclick="ZWCHOrders.copyKey(this, '${_esc(link).replace(/'/g, "\\'")}')">📋 Copy</button>
          </div>`).join('')
        : '<div class="order-card__key-wrap"><span class="order-card__key" style="color:var(--text-muted);">Key will be sent to your email.</span></div>';

      return `
        <div class="order-card">
          <div class="order-card__header">
            <div>
              <div class="order-card__name">${_esc(o.product_name)}</div>
              <div class="order-card__meta">Order #${o.order_id} &nbsp;\u00b7&nbsp; ${date}</div>
            </div>
            <div class="order-card__amount">${amount} ${(o.currency || 'EUR').toUpperCase()}</div>
          </div>
          ${keysHtml}
        </div>`;
    }).join('');
  }

  function copyKey(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    });
  }

  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { open, copyKey };
})();
