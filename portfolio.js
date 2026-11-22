const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themeKey = 'khalid-portfolio-theme';

function applyTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

try {
  applyTheme(localStorage.getItem(themeKey) === 'light' ? 'light' : 'dark');
} catch {
  applyTheme('dark');
}
themeToggle.hidden = false;

themeToggle.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try {
    localStorage.setItem(themeKey, theme);
  } catch {
    // The toggle still works when the browser blocks local storage.
  }
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.querySelector('#orb');
const context = canvas?.getContext('2d');
const replay = document.querySelector('#orb-replay');

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const sections = document.querySelectorAll('.section-heading, .project, .about');
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    }
  }, { threshold: 0.1 });

  for (const section of sections) {
    section.classList.add('reveal');
    reveal.observe(section);
  }
  root.classList.add('reveal-ready');
}

if (context) {
  const count = 300;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const points = Array.from({ length: count }, (_, index) => {
    const y = 1 - 2 * (index + 0.5) / count;
    const ring = Math.sqrt(1 - y * y);
    const angle = index * goldenAngle;
    const originAngle = index * 1.827;
    const distance = 1.25 + (index % 23) / 22;
    return {
      x: Math.cos(angle) * ring,
      y,
      z: Math.sin(angle) * ring,
      originX: Math.cos(originAngle) * distance,
      originY: Math.sin(originAngle) * distance,
      delay: (index % 31) * 15,
      color: index % 7 < 3 ? '187,149,255' : '135,255,218'
    };
  });
  const edges = [];
  for (let first = 0; first < count; first += 1) {
    for (let second = first + 1; second < count; second += 1) {
      const a = points[first];
      const b = points[second];
      const distance = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (distance < 0.056) edges.push({ first, second });
    }
  }

  let width = 0;
  let height = 0;
  let frame = 0;
  let elapsed = 0;
  let previousTime = null;
  let visible = true;
  let tiltX = 0;
  let tiltY = 0;
  let targetX = 0;
  let targetY = 0;

  function draw() {
    context.clearRect(0, 0, width, height);
    const staticView = reducedMotion.matches;
    const time = staticView ? 3000 : elapsed;
    const angle = 0.55 + time * 0.00026 + (staticView ? 0 : tiltX);
    const pitch = 0.22 + (staticView ? 0 : tiltY);
    const radius = Math.min(width, height) * 0.35;
    const projected = points.map((point) => {
      const progress = Math.min(1, Math.max(0, (time - point.delay) / 1900));
      const settle = 1 - (1 - progress) ** 3;
      const x = point.x * Math.cos(angle) - point.z * Math.sin(angle);
      const z = point.x * Math.sin(angle) + point.z * Math.cos(angle);
      const y = point.y * Math.cos(pitch) - z * Math.sin(pitch);
      const depth = (point.y * Math.sin(pitch) + z * Math.cos(pitch) + 1) / 2;
      const perspective = 0.88 + depth * 0.22;
      return {
        x: width / 2 + radius * (point.originX * (1 - settle) + x * perspective * settle),
        y: height * 0.48 + radius * (point.originY * (1 - settle) + y * perspective * settle),
        depth,
        settle,
        color: point.color
      };
    });

    for (const [index, edge] of edges.entries()) {
      const from = projected[edge.first];
      const to = projected[edge.second];
      const depth = (from.depth + to.depth) / 2;
      const opacity = Math.min(from.settle, to.settle) ** 5 * (0.05 + depth * 0.37);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.lineWidth = 0.45 + depth * 0.55;
      context.strokeStyle = `rgba(${from.color},${opacity})`;
      context.stroke();

      if (index % 23 === 0 && !staticView && time > 1300) {
        const pulse = (time / 780 + index * 0.027) % 1;
        context.beginPath();
        context.arc(from.x + (to.x - from.x) * pulse, from.y + (to.y - from.y) * pulse, 1 + depth, 0, Math.PI * 2);
        context.fillStyle = `rgba(226,246,255,${opacity * 2})`;
        context.fill();
      }
    }

    for (const point of projected) {
      const size = 0.75 + point.depth * 1.85;
      context.beginPath();
      context.arc(point.x, point.y, size * 2.65, 0, Math.PI * 2);
      context.fillStyle = `rgba(${point.color},${0.05 + point.depth * 0.09})`;
      context.fill();
      context.beginPath();
      context.arc(point.x, point.y, size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${point.color},${0.43 + point.depth * 0.55})`;
      context.fill();
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const scale = Math.min(devicePixelRatio || 1, width < 500 ? 1.5 : 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    draw();
  }

  function animate(time) {
    const interval = width < 500 ? 30 : 12;
    if (previousTime === null) previousTime = time;
    if (time - previousTime >= interval) {
      elapsed += Math.min(time - previousTime, 70);
      previousTime = time;
      tiltX += (targetX - tiltX) * 0.075;
      tiltY += (targetY - tiltY) * 0.075;
      draw();
    }
    frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    previousTime = null;
    replay.hidden = reducedMotion.matches;
    if (visible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(animate);
    else draw();
  }

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = canvas.getBoundingClientRect();
    targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.85;
    targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.65;
  });
  canvas.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
  replay.addEventListener('click', () => { elapsed = 0; draw(); });
  new ResizeObserver(resize).observe(canvas);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) root.classList.remove('reveal-ready');
    syncAnimation();
  });
  resize();
  syncAnimation();
}
