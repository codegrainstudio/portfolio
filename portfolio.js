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

const canvas = document.querySelector('#orb');
const context = canvas.getContext('2d');

if (context) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointCount = 220;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  // A Fibonacci sphere distributes the points evenly over its surface.
  const points = Array.from({ length: pointCount }, (_, index) => {
    const y = 1 - 2 * (index + 0.5) / pointCount;
    const radius = Math.sqrt(1 - y * y);
    const angle = index * goldenAngle;
    return {
      x: Math.cos(angle) * radius,
      y,
      z: Math.sin(angle) * radius,
      phase: index * 2.399,
      motion: 0.025 + index % 5 * 0.006,
      speed: 0.00045 + index % 7 * 0.000035
    };
  });
  const edges = [];
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      const dx = points[first].x - points[second].x;
      const dy = points[first].y - points[second].y;
      const dz = points[first].z - points[second].z;
      if (dx * dx + dy * dy + dz * dz < 0.085) {
        edges.push({ first, second, phase: (first * 17 + second * 31) % 100 / 100 });
      }
    }
  }

  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = true;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    draw(performance.now());
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    const moving = !reducedMotion.matches;
    const angle = moving ? time * 0.00024 : 0.6;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const radius = Math.min(width, height) * 0.34;
    const projected = points.map((point) => {
      const motionX = moving ? Math.cos(time * point.speed + point.phase) * point.motion : 0;
      const motionY = moving ? Math.sin(time * point.speed * 0.83 + point.phase) * point.motion : 0;
      const motionZ = moving ? Math.cos(time * point.speed * 0.67 + point.phase * 1.7) * point.motion : 0;
      const length = Math.hypot(point.x + motionX, point.y + motionY, point.z + motionZ);
      const x = (point.x + motionX) / length;
      const y = (point.y + motionY) / length;
      const z = (point.z + motionZ) / length;
      const rotatedX = x * cosine - z * sine;
      const rotatedZ = x * sine + z * cosine;
      return {
        x: width / 2 + rotatedX * radius,
        y: height * 0.46 + y * radius,
        depth: (rotatedZ + 1) / 2,
        phase: point.phase
      };
    });

    for (const edge of edges) {
      const first = projected[edge.first];
      const second = projected[edge.second];
      const depth = (first.depth + second.depth) / 2;
      const pulse = moving ? 0.5 + 0.5 * Math.sin(time * 0.0012 + edge.phase * Math.PI * 2) : 0;
      context.beginPath();
      context.moveTo(first.x, first.y);
      context.lineTo(second.x, second.y);
      context.strokeStyle = `rgba(141, 240, 220, ${(0.035 + pulse * 0.1) * (0.35 + depth * 0.65)})`;
      context.lineWidth = 0.55 + depth * 0.35;
      context.stroke();
    }

    for (const point of projected) {
      const pulse = moving ? 0.5 + 0.5 * Math.sin(time * 0.0018 + point.phase) : 0;
      context.beginPath();
      context.arc(point.x, point.y, 0.8 + point.depth * 1.25 + pulse * 0.45, 0, 2 * Math.PI);
      context.fillStyle = `rgba(141, 240, 220, ${0.2 + point.depth * 0.68 + pulse * 0.12})`;
      context.fill();
    }
  }

  function animate(time) {
    draw(time);
    frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    if (visible && !reducedMotion.matches) {
      frame = requestAnimationFrame(animate);
    } else {
      draw(performance.now());
    }
  }

  new ResizeObserver(resize).observe(canvas);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    }).observe(canvas);
  }
  reducedMotion.addEventListener('change', syncAnimation);
  resize();
  syncAnimation();
}
