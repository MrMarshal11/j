// =====================================================
// Cinematic valentine (auto-play, ends)
// Persistent center light (dim -> brighter), AU + KR lights enter,
// energy pulses fire to center, center flares, rose draws + blooms,
// bottom-left micro text changes, then final Korean message.
// =====================================================

const T = {
  skyIntro: 6000,
  sideLightsIn: 5500,
  pulsesToCenter: 3200,
  roseDraw: 7800,
  roseBloom: 6200,
  finalHold: 6000,
};
const TOTAL = Object.values(T).reduce((a, b) => a + b, 0);

const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d", { alpha: true });

const roseShell = document.getElementById("roseShell");
const bloomGlow = document.getElementById("bloomGlow");
const finalEl = document.getElementById("final");
const microText = document.getElementById("microText");

const roseSvg = document.getElementById("rose");
const strokePaths = Array.from(roseSvg.querySelectorAll(".stroke"));
const fillPaths = Array.from(roseSvg.querySelectorAll(".fill"));

let ended = false;
let rafId = null;
let start = null;

let W = 0,
  H = 0,
  DPR = 1;

function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);
  W = canvas.width = Math.floor(window.innerWidth * DPR);
  H = canvas.height = Math.floor(window.innerHeight * DPR);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const easeInOut = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function setMicro(text, on = true) {
  microText.textContent = text;
  if (on) microText.classList.add("on");
  else microText.classList.remove("on");
}
setMicro("hey…", true);

// ---- Stars ----
const stars = [];
function seedStars() {
  stars.length = 0;
  const count = Math.min(260, Math.floor(window.innerWidth * 0.22));
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      r: rand(0.5, 1.9),
      a: rand(0.1, 0.9),
      tw: rand(0.0016, 0.0055),
      sp: rand(0.03, 0.13),
    });
  }
}
seedStars();
window.addEventListener("resize", seedStars);

// ---- Themed orb lights ----
// AU: deep blue glow + hints of red/white sparkle
function drawAULight(x, y, baseRadius, strength, alpha = 1) {
  strength *= alpha;

  // blue outer glow
  let g = ctx.createRadialGradient(x, y, 0, x, y, baseRadius);
  g.addColorStop(0, `rgba(20,80,255,${0.22 * strength})`);
  g.addColorStop(0.45, `rgba(10,40,160,${0.14 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // red accent ring (subtle)
  g = ctx.createRadialGradient(
    x,
    y,
    baseRadius * 0.15,
    x,
    y,
    baseRadius * 0.62,
  );
  g.addColorStop(0, `rgba(255,45,85,${0.06 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // white star-like speckles
  const specks = Math.floor(6 + strength * 10);
  for (let i = 0; i < specks; i++) {
    const ang = rand(0, Math.PI * 2);
    const r = rand(baseRadius * 0.1, baseRadius * 0.55);
    const sx = x + Math.cos(ang) * r;
    const sy = y + Math.sin(ang) * r;
    ctx.fillStyle = `rgba(255,255,255,${0.03 * strength})`;
    ctx.beginPath();
    ctx.arc(sx, sy, rand(0.5, 1.3), 0, Math.PI * 2);
    ctx.fill();
  }

  // core
  ctx.fillStyle = `rgba(255,255,255,${0.16 * strength})`;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

// KR: soft white glow with red/blue taeguk-like core
function drawKRLight(x, y, baseRadius, strength, alpha = 1) {
  strength *= alpha;

  // white outer glow
  let g = ctx.createRadialGradient(x, y, 0, x, y, baseRadius);
  g.addColorStop(0, `rgba(255,255,255,${0.18 * strength})`);
  g.addColorStop(0.5, `rgba(255,255,255,${0.1 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // taeguk-ish red/blue split core (very subtle)
  const coreR = baseRadius * 0.22;

  g = ctx.createRadialGradient(
    x - coreR * 0.3,
    y - coreR * 0.2,
    0,
    x,
    y,
    coreR,
  );
  g.addColorStop(0, `rgba(255,45,85,${0.2 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, coreR, 0, Math.PI * 2);
  ctx.fill();

  g = ctx.createRadialGradient(
    x + coreR * 0.3,
    y + coreR * 0.2,
    0,
    x,
    y,
    coreR,
  );
  g.addColorStop(0, `rgba(40,120,255,${0.18 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, coreR, 0, Math.PI * 2);
  ctx.fill();

  // faint dark rim suggestion (trigrams vibe without drawing them)
  g = ctx.createRadialGradient(
    x,
    y,
    baseRadius * 0.55,
    x,
    y,
    baseRadius * 0.95,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.18 * strength})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // core
  ctx.fillStyle = `rgba(255,255,255,${0.14 * strength})`;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawCenterLight(x, y, baseRadius, strength) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, baseRadius);
  g.addColorStop(0, `rgba(255,45,85,${0.3 * strength})`);
  g.addColorStop(0.35, `rgba(255,45,85,${0.14 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${0.16 * strength})`;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeam(x1, y1, x2, y2, rgb, intensity) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;

  const w = 10 + intensity * 20;
  const ax = x1 + nx * w;
  const ay = y1 + ny * w;
  const bx = x1 - nx * w;
  const by = y1 - ny * w;
  const cx = x2 - nx * w;
  const cy = y2 - ny * w;
  const dxp = x2 + nx * w;
  const dyp = y2 + ny * w;

  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, `rgba(${rgb}, 0.0)`);
  grad.addColorStop(0.18, `rgba(${rgb}, ${0.18 * intensity})`);
  grad.addColorStop(0.52, `rgba(${rgb}, ${0.3 * intensity})`);
  grad.addColorStop(0.85, `rgba(${rgb}, ${0.12 * intensity})`);
  grad.addColorStop(1, `rgba(${rgb}, 0.0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(dxp, dyp);
  ctx.lineTo(cx, cy);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fill();

  const sparks = Math.floor(6 + intensity * 22);
  for (let i = 0; i < sparks; i++) {
    const p = rand(0.15, 0.92);
    const sx = x1 + dx * p + rand(-6, 6);
    const sy = y1 + dy * p + rand(-6, 6);
    ctx.fillStyle = `rgba(255,255,255,${0.05 + intensity * 0.14})`;
    ctx.beginPath();
    ctx.arc(sx, sy, rand(0.6, 1.6), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- Rose stroke setup ----
const lengths = strokePaths.map((p) => p.getTotalLength());
const totalLen = lengths.reduce((a, b) => a + b, 0);

function resetRose() {
  for (const p of strokePaths) {
    p.style.transition = "none";
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    void p.getBoundingClientRect();
  }
  for (const f of fillPaths) f.classList.remove("on");
  roseShell.classList.remove("on");
  bloomGlow.classList.remove("on");
  finalEl.classList.remove("on");
}
resetRose();

function setDrawProgress(p) {
  let remaining = totalLen * clamp(p, 0, 1);
  for (let i = 0; i < strokePaths.length; i++) {
    const len = lengths[i];
    const shown = clamp(remaining / len, 0, 1);
    strokePaths[i].style.strokeDashoffset = `${len * (1 - shown)}`;
    remaining -= len;
  }
}

// ---- Animation ----
function render(now) {
  if (ended) return;
  if (!start) start = now;
  const t = now - start;

  const p0 = 0;
  const p1 = p0 + T.skyIntro;
  const p2 = p1 + T.sideLightsIn;
  const p3 = p2 + T.pulsesToCenter;
  const p4 = p3 + T.roseDraw;
  const p5 = p4 + T.roseBloom;
  const p6 = p5 + T.finalHold;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // vignette tint
  const vg = ctx.createRadialGradient(
    window.innerWidth * 0.5,
    window.innerHeight * 0.45,
    120,
    window.innerWidth * 0.5,
    window.innerHeight * 0.45,
    Math.max(window.innerWidth, window.innerHeight),
  );
  vg.addColorStop(0, "rgba(255,45,85,0.05)");
  vg.addColorStop(0.6, "rgba(25,255,135,0.02)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // stars fade in during intro
  const skyP = clamp(t / p1, 0, 1);
  const skyA = easeInOut(skyP);

  for (const st of stars) {
    st.y += st.sp;
    if (st.y > window.innerHeight + 10) {
      st.y = -10;
      st.x = rand(0, window.innerWidth);
    }
    const tw = Math.sin(now * st.tw + st.x * 0.02) * 0.04;
    const a = clamp(st.a + tw, 0.05, 0.95) * skyA;

    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }

  const cx = window.innerWidth * 0.5;
  const cy = window.innerHeight * 0.44;

  // center light: always present, slowly brightens through p2
  let centerStrength = 0.14 + 0.4 * easeInOut(clamp(t / p2, 0, 1));
  if (t >= p2 && t < p3) {
    const pp = clamp((t - p2) / (p3 - p2), 0, 1);
    const flare = Math.sin(pp * Math.PI) * 0.6;
    centerStrength += flare;
  }
  if (t >= p3) centerStrength = Math.max(centerStrength, 0.78);

  drawCenterLight(cx, cy, 220, centerStrength * skyA);

  // Side lights + pulses
  if (t >= p1 && t < p4) {
    setMicro("even though we’re far apart…", true);

    const inP = clamp((t - p1) / (p2 - p1), 0, 1);
    const e = easeInOut(inP);

    // positions: start off-screen -> stop
    const stopDx = window.innerWidth * 0.19;
    const ly = cy + 6;
    const ry = cy - 6;

    const lx =
      -window.innerWidth * 0.15 + (cx - stopDx - -window.innerWidth * 0.15) * e;
    const rx =
      window.innerWidth * 1.15 + (cx + stopDx - window.innerWidth * 1.15) * e;

    // smooth fade out during rose draw start (no popping)
    // fade window: first ~1200ms of roseDraw
    let sideAlpha = 1;
    if (t >= p3) {
      const fadeP = clamp((t - p3) / 1200, 0, 1);
      sideAlpha = 1 - easeOutCubic(fadeP);
    }

    const sideStrength = 0.55 + 0.35 * e;

    // AU on left, KR on right (you can swap if you want)
    drawAULight(lx, ly, 195, sideStrength, sideAlpha);
    drawKRLight(rx, ry, 195, sideStrength, sideAlpha);

    // pulses phase: beams to center
    if (t >= p2 && t < p3) {
      const pp = clamp((t - p2) / (p3 - p2), 0, 1);

      // two pulses
      const pulse1 = Math.exp(-Math.pow((pp - 0.25) / 0.09, 2));
      const pulse2 = Math.exp(-Math.pow((pp - 0.65) / 0.09, 2));
      const pulse = clamp(pulse1 + pulse2, 0, 1);

      if (pulse > 0.02) {
        // AU beam slightly bluish-white; KR beam slightly red/blue
        drawBeam(lx, ly, cx, cy, "180,210,255", pulse); // AU-ish
        drawBeam(rx, ry, cx, cy, "255,120,180", pulse); // KR-ish

        // center sparkle
        const sparks = Math.floor(16 + pulse * 64);
        for (let i = 0; i < sparks; i++) {
          const r = rand(6, 75) * pulse;
          const ang = rand(0, Math.PI * 2);
          const sx = cx + Math.cos(ang) * r;
          const sy = cy + Math.sin(ang) * r;
          ctx.fillStyle = `rgba(255,255,255,${0.05 + pulse * 0.18})`;
          ctx.beginPath();
          ctx.arc(sx, sy, rand(0.6, 1.8), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Rose draw
  if (t >= p3 && t < p4) {
    if (!roseShell.classList.contains("on")) roseShell.classList.add("on");

    const dp = clamp((t - p3) / (p4 - p3), 0, 1);
    setDrawProgress(easeOutCubic(dp));

    drawCenterLight(cx, cy, 250, 0.9);
  }

  // Bloom
  if (t >= p4 && t < p5) {
    setDrawProgress(1);
    roseShell.classList.add("on");

    const bp = clamp((t - p4) / (p5 - p4), 0, 1);
    const e = easeInOut(bp);

    const leafFills = fillPaths.filter((x) => x.classList.contains("leafFill"));
    const petalFills = fillPaths.filter((x) =>
      x.classList.contains("petalFill"),
    );

    if (e > 0.12) for (const f of leafFills) f.classList.add("on");
    if (e > 0.28) for (const f of petalFills) f.classList.add("on");
    if (e > 0.32) bloomGlow.classList.add("on");

    drawCenterLight(cx, cy, 290, 0.95 + e * 0.18);
  }

  // Final
  if (t >= p5 && t < p6) {
    setDrawProgress(1);
    roseShell.classList.add("on");
    bloomGlow.classList.add("on");
    for (const f of fillPaths) f.classList.add("on");

    microText.classList.remove("on");
    if (t - p5 > 600) finalEl.classList.add("on");

    drawCenterLight(cx, cy, 290, 0.98);
  }

  // End
  if (t >= TOTAL) {
    setDrawProgress(1);
    roseShell.classList.add("on");
    bloomGlow.classList.add("on");
    for (const f of fillPaths) f.classList.add("on");
    finalEl.classList.add("on");
    microText.classList.remove("on");

    ended = true;
    if (rafId) cancelAnimationFrame(rafId);
    return;
  }

  rafId = requestAnimationFrame(render);
}

rafId = requestAnimationFrame(render);
