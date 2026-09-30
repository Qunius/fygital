(() => {
  'use strict';
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  const panelsRoot = document.querySelector('.room-panels');
  const camera = document.querySelector('.room-camera');
  const intro = document.querySelector('.intro');
  const introMark = document.querySelector('.intro-mark');
  const headerMark = document.querySelector('.wordmark');
  const timer = document.querySelector('.countdown');
  const units = [...document.querySelectorAll('.unit')];
  const panels = Array.from({ length: 6 }, (_, i) => {
    const panel = document.createElement('div');
    panel.className = 'room-panel';
    panel.style.setProperty('--i', i);
    const image = document.createElement('img');
    image.src = 'assets/room.png';
    image.alt = '';
    image.draggable = false;
    panel.append(image);
    panelsRoot.append(panel);
    return panel;
  });
  for (const unit of units) {
    const number = unit.querySelector('.number');
    const characters = number.textContent.trim();
    number.textContent = '';
    for (const char of characters) {
      const digit = document.createElement('span');
      digit.className = 'digit';
      digit.dataset.value = char;
      const face = document.createElement('span');
      face.className = 'digit-face';
      face.textContent = char;
      digit.append(face);
      number.append(digit);
    }
  }

  // Six calendar years from 30 September 2026, 23:50:02 in Stockholm.
  // The shared deadline is fixed in the source, so reloads and new visitors
  // keep counting toward the same instant without cookies or local storage.
  const launchAt = Date.parse('2032-09-30T23:50:02+02:00');
  timer.dataset.deadline = new Date(launchAt).toISOString();
  let entering = false;
  let entranceRun = 0;
  let entranceStartedAt = 0;
  let entranceAnimations = [];
  const digitAnimations = new WeakMap();
  let pointerFrame = 0;
  const easing = 'cubic-bezier(.19,1,.22,1)';

  function animate(element, frames, duration, delay = 0) {
    const animation = element.animate(frames, { duration, delay, easing, fill: 'both' });
    entranceAnimations.push(animation);
    return animation;
  }

  function settle() {
    body.classList.remove('is-entering');
    entering = false;
    intro.hidden = true;
    for (const animation of entranceAnimations) animation.cancel();
    entranceAnimations = [];
  }

  async function playEntrance() {
    const run = ++entranceRun;
    for (const animation of entranceAnimations) animation.cancel();
    entranceAnimations = [];
    entering = true;
    entranceStartedAt = performance.now();
    body.classList.add('is-entering');
    intro.hidden = false;
    if (reducedQuery.matches) { settle(); return; }
    const width = innerWidth;
    const startWidth = Math.min(width * .7, 980);
    const rect = headerMark.getBoundingClientRect();
    const introHeight = startWidth * 38 / 324;
    animate(introMark, [
      { opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'translateY(16px)' },
      { opacity: 1, clipPath: 'inset(0 0% 0 0)', transform: 'translateY(0)' }
    ], 1300);
    const logoTravel = animate(introMark, [
      { left: `${(width - startWidth) / 2}px`, top: `${innerHeight / 2 - introHeight / 2}px`, width: `${startWidth}px` },
      { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px` }
    ], 1650, 1200);
    const sequence = [4, 2, 0, 1, 3, 5];
    panels.forEach((panel, i) => {
      animate(panel, [
        { opacity: 0, transform: `translateY(${i % 2 ? -18 : 18}%) rotateY(${i < 3 ? 30 : -30}deg) scale(.82)`, filter: 'brightness(.35)' },
        { opacity: 1, transform: 'translateY(0) rotateY(0deg) scale(1)', filter: 'brightness(1)' }
      ], 2450, 1350 + sequence[i] * 130);
    });
    animate(document.querySelector('.room-shade'), [{ opacity: 0 }, { opacity: 1 }], 2200, 2300);
    logoTravel.finished.then(() => {
      if (run === entranceRun) { headerMark.style.opacity = '1'; intro.hidden = true; }
    }).catch(() => {});
    animate(document.querySelector('.countdown-title'), [
      { opacity: 0, transform: 'translateY(14px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], 1100, 3000);
    units.forEach((unit, i) => {
      animate(unit, [{ opacity: 0 }, { opacity: 1 }], 750, 3100 + i * 95);
      [...unit.querySelectorAll('.digit')].forEach((digit, j) => {
        animate(digit, [
          { opacity: 0, transform: 'translateY(90%) rotateX(-65deg)', filter: 'blur(5px)' },
          { opacity: 1, transform: 'translateY(0) rotateX(0deg)', filter: 'blur(0)' }
        ], 1400, 3200 + i * 95 + j * 65);
      });
      animate(unit.querySelector('.unit-label'), [
        { opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }
      ], 1000, 3600 + i * 100);
    });
    try { await Promise.all(entranceAnimations.map(animation => animation.finished)); } catch { return; }
    if (run === entranceRun) { headerMark.style.opacity = ''; settle(); }
  }

  function displayDigit(digit, value, useMotion) {
    if (digit.dataset.value === value) return;
    const previousAnimation = digitAnimations.get(digit);
    if (previousAnimation) previousAnimation.cancel();
    digit.dataset.value = value;
    // Reuse one numeral layer. Correctness never depends on an animation's
    // finished promise, which may be delayed while the tab is in the background.
    const face = digit.firstElementChild;
    digit.replaceChildren(face);
    face.textContent = value;
    if (!useMotion) return;
    const change = face.animate([
      { transform: 'translateY(7%)', opacity: .72 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 220, easing });
    digitAnimations.set(digit, change);
  }

  function remainingTime(nowMs) {
    if (nowMs >= launchAt) return [0, 0, 0, 0, 0];
    const now = new Date(nowMs);
    const end = new Date(launchAt);
    let years = end.getUTCFullYear() - now.getUTCFullYear();
    const anniversary = new Date(now);
    anniversary.setUTCFullYear(now.getUTCFullYear() + years);
    if (anniversary.getTime() > launchAt) {
      years--;
      anniversary.setTime(nowMs);
      anniversary.setUTCFullYear(now.getUTCFullYear() + years);
    }
    let rest = Math.max(0, Math.floor((launchAt - anniversary.getTime()) / 1000));
    const days = Math.floor(rest / 86400); rest %= 86400;
    const hours = Math.floor(rest / 3600); rest %= 3600;
    const minutes = Math.floor(rest / 60);
    const seconds = rest % 60;
    return [Math.max(0, years), days, hours, minutes, seconds];
  }

  function updateClock() {
    const values = remainingTime(Date.now());
    units.forEach((unit, i) => {
      const digits = [...unit.querySelectorAll('.digit')];
      const value = String(values[i]).padStart(digits.length, '0');
      digits.forEach((digit, j) => displayDigit(digit, value[j], !reducedQuery.matches && !document.hidden && !entering));
    });
    const labels = ['year', 'day', 'hour', 'minute', 'second'];
    const remaining = values.map((value, index) => `${value} ${labels[index]}${value === 1 ? '' : 's'}`);
    timer.setAttribute('aria-label', `${remaining.join(', ')} until opening`);
  }

  window.addEventListener('pointermove', (event) => {
    if (reducedQuery.matches || entering || document.hidden || event.pointerType === 'touch') return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      const x = (event.clientX / innerWidth - .5) * 11;
      const y = (event.clientY / innerHeight - .5) * 8;
      camera.style.transition = 'transform 1500ms cubic-bezier(.19,1,.22,1)';
      camera.style.transform = `scale(1.04) translate(${-x}px, ${-y}px)`;
    });
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (entering && performance.now() - entranceStartedAt > 6000) {
        entranceRun++;
        headerMark.style.opacity = '';
        settle();
      }
      updateClock();
    }
  });
  reducedQuery.addEventListener('change', () => {
    entranceRun++;
    settle();
    camera.style.transform = '';
    updateClock();
  });
  updateClock();
  setInterval(updateClock, 1000);
  Promise.all([document.fonts.ready, panels[0].querySelector('img').decode().catch(() => {})]).then(playEntrance);
})();
