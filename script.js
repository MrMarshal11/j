// =====================================================
// Valentine animation (auto-play, loops ambience forever)
// - Persistent center light
// - Two cute chibi characters inside orbs (guy holds milk, girl holds passport)
// - Orbs enter fast then slow-stop, shoot beams with impact ring
// - Rose draws + blooms
// - Brief soft heart burst from corolla (flower center) right after bloom completes
// - After final message, everything gently pulses forever
// =====================================================

const T = {
  skyIntro: 2200,
  sideLightsIn: 1700, // enter fast then ease to stop
  pauseBeforeBeam: 350,
  pulsesToCenter: 1500,
  roseDraw: 3800,
  roseBloom: 2300,
  finalReveal: 900,
  driftOut: 5200, // slow drift away
};

const TOTAL_ONCE =
  T.skyIntro +
  T.sideLightsIn +
  T.pauseBeforeBeam +
  T.pulsesToCenter +
  T.roseDraw +
  T.roseBloom +
  T.finalReveal +
  T.driftOut;

const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d", { alpha: true });

const roseShell = document.getElementById("roseShell");
const bloomGlow = document.getElementById("bloomGlow");
const finalEl = document.getElementById("final");
const microText = document.getElementById("microText");

const roseSvg = document.getElementById("rose");
const strokePaths = Array.from(roseSvg.querySelectorAll(".stroke"));
const fillPaths = Array.from(roseSvg.querySelectorAll(".fill"));

let start = null;
let rafId = null;

let DPR = 1;
function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor(window.innerHeight * DPR);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
const easeInOut = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ------------------ Micro text ------------------
// You said you don't like the "hey / far apart" text.
// So we keep it off by default.
function setMicro(text, on = true) {
  microText.textContent = text;
  if (on) microText.classList.add("on");
  else microText.classList.remove("on");
}
setMicro("", false);

// ------------------ Load PNG assets ------------------
const milkImg = new Image();
milkImg.src = "assets/milk.png";

const passportImg = new Image();
passportImg.src = "assets/passport.png";

// If your filenames differ, change the 2 lines above.

// ------------------ Stars ------------------
const stars = [];
function seedStars() {
  stars.length = 0;
  const count = Math.min(320, Math.floor(window.innerWidth * 0.28));
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      r: rand(0.5, 2.0),
      a: rand(0.12, 0.95),
      tw: rand(0.0014, 0.0052),
      sp: rand(0.02, 0.11),
    });
  }
}
seedStars();
window.addEventListener("resize", seedStars);

// ------------------ Draw helpers ------------------
function drawAmbientMist() {
  const mist = ctx.createRadialGradient(
    window.innerWidth * 0.5,
    window.innerHeight * 0.45,
    120,
    window.innerWidth * 0.5,
    window.innerHeight * 0.45,
    Math.max(window.innerWidth, window.innerHeight),
  );
  mist.addColorStop(0, "rgba(255,45,85,0.06)");
  mist.addColorStop(0.55, "rgba(255,255,255,0.02)");
  mist.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawCenterLight(x, y, baseRadius, strength) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, baseRadius);
  g.addColorStop(0, `rgba(255,45,85,${0.34 * strength})`);
  g.addColorStop(0.35, `rgba(255,45,85,${0.16 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${0.18 * strength})`;
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

  const w = 10 + intensity * 22;
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
  grad.addColorStop(0.18, `rgba(${rgb}, ${0.22 * intensity})`);
  grad.addColorStop(0.52, `rgba(${rgb}, ${0.34 * intensity})`);
  grad.addColorStop(0.85, `rgba(${rgb}, ${0.14 * intensity})`);
  grad.addColorStop(1, `rgba(${rgb}, 0.0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(dxp, dyp);
  ctx.lineTo(cx, cy);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fill();
}

function drawImpactRing(x, y, progress, intensity = 1) {
  const maxRadius = 260;
  const r = maxRadius * progress;
  const alpha = 0.55 * (1 - progress) * intensity;

  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

// ------------------ Cute chibi character drawing ------------------
// Key improvements:
// - clear eyes + mouth + blush
// - softer hair shapes
// - skin tone is stable (not tinted into weird/“scary” by glow)
// - item images are drawn clearly

function drawOrbGlow(x, y, radius, color, strength, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(${color}, ${0.2 * strength * alpha})`);
  g.addColorStop(0.55, `rgba(${color}, ${0.1 * strength * alpha})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // soft core
  ctx.fillStyle = `rgba(255,255,255,${0.14 * strength * alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.085, 0, Math.PI * 2);
  ctx.fill();
}

function drawChibiBase(x, y, r, alpha, time, opts) {
  const bob = Math.sin(time * 2.0 + opts.bobPhase) * (r * 0.015);

  const headR = r * 0.18;
  const headX = x;
  const headY = y - r * 0.1 + bob;

  // Face (stable warm peach)
  ctx.fillStyle = `rgba(255,232,215,${0.92 * alpha})`;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Hair (soft)
  ctx.fillStyle = `rgba(${opts.hairRgb}, ${0.95 * alpha})`;
  ctx.beginPath();
  // top cap
  ctx.arc(headX, headY - headR * 0.18, headR * 1.05, Math.PI, 0);
  // sides
  ctx.quadraticCurveTo(
    headX + headR * 1.05,
    headY + headR * 0.25,
    headX + headR * 0.85,
    headY + headR * 0.95,
  );
  ctx.quadraticCurveTo(
    headX,
    headY + headR * 1.25,
    headX - headR * 0.85,
    headY + headR * 0.95,
  );
  ctx.quadraticCurveTo(
    headX - headR * 1.05,
    headY + headR * 0.25,
    headX - headR * 1.05,
    headY - headR * 0.18,
  );
  ctx.closePath();
  ctx.fill();

  // Eyes
  const eyeY = headY + headR * 0.1;
  const eyeDX = headR * 0.45;

  ctx.fillStyle = `rgba(20,20,24,${0.9 * alpha})`;
  ctx.beginPath();
  ctx.arc(headX - eyeDX, eyeY, headR * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headX + eyeDX, eyeY, headR * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = `rgba(255,255,255,${0.85 * alpha})`;
  ctx.beginPath();
  ctx.arc(
    headX - eyeDX + headR * 0.04,
    eyeY - headR * 0.04,
    headR * 0.04,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    headX + eyeDX + headR * 0.04,
    eyeY - headR * 0.04,
    headR * 0.04,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Blush
  ctx.fillStyle = `rgba(255,120,160,${0.22 * alpha})`;
  ctx.beginPath();
  ctx.arc(
    headX - headR * 0.65,
    headY + headR * 0.22,
    headR * 0.16,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    headX + headR * 0.65,
    headY + headR * 0.22,
    headR * 0.16,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Mouth
  ctx.strokeStyle = `rgba(40,20,28,${0.55 * alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(headX, headY + headR * 0.36, headR * 0.12, 0, Math.PI);
  ctx.stroke();

  // Body (simple hoodie)
  const bodyW = headR * 2.2;
  const bodyH = headR * 2.25;
  const bodyX = headX - bodyW / 2;
  const bodyY = headY + headR * 0.78;

  ctx.fillStyle = `rgba(255,255,255,${0.14 * alpha})`;
  ctx.beginPath();
  ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 14);
  ctx.fill();

  // little collar line
  ctx.strokeStyle = `rgba(255,255,255,${0.2 * alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(headX - headR * 0.35, bodyY + headR * 0.35);
  ctx.lineTo(headX + headR * 0.35, bodyY + headR * 0.35);
  ctx.stroke();

  return { headX, headY, headR, bodyX, bodyY, bodyW, bodyH };
}

function drawHeldItem(img, x, y, w, h, alpha) {
  // If image not loaded yet, draw a placeholder
  if (!img || !img.complete || img.naturalWidth === 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 * alpha})`;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 8);
    ctx.fill();
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.92 * alpha;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function drawGuyOrb(x, y, radius, strength, alpha, time) {
  // Soft pinkish orb (not nationality)
  drawOrbGlow(x, y, radius, "255,120,170", strength, alpha);

  const base = drawChibiBase(x, y, radius, alpha, time, {
    hairRgb: "55,40,30", // short dark brown/black
    bobPhase: 0.0,
  });

  // Item: strawberry milk
  const itemX = x + base.headR * 1.15;
  const itemY = base.bodyY + base.headR * 0.95;
  const itemW = base.headR * 1.3;
  const itemH = base.headR * 1.55;

  drawHeldItem(milkImg, itemX, itemY, itemW, itemH, alpha);

  // Arm line to item (cute)
  ctx.strokeStyle = `rgba(255,232,215,${0.4 * alpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + base.headR * 0.55, base.bodyY + base.headR * 0.75);
  ctx.lineTo(itemX - itemW * 0.4, itemY - itemH * 0.1);
  ctx.stroke();
}

function drawGirlOrb(x, y, radius, strength, alpha, time) {
  // Soft white/pearl orb
  drawOrbGlow(x, y, radius, "240,240,255", strength, alpha);

  const base = drawChibiBase(x, y, radius, alpha, time, {
    hairRgb: "18,18,20", // long black
    bobPhase: 1.1,
  });

  // Add “long hair” extension (gentle)
  ctx.fillStyle = `rgba(18,18,20,${0.9 * alpha})`;
  ctx.beginPath();
  ctx.roundRect(
    x - base.headR * 1.05,
    base.headY + base.headR * 0.35,
    base.headR * 2.1,
    base.headR * 1.25,
    16,
  );
  ctx.fill();

  // Item: passport
  const itemX = x + base.headR * 1.15;
  const itemY = base.bodyY + base.headR * 0.95;
  const itemW = base.headR * 1.45;
  const itemH = base.headR * 1.1;

  drawHeldItem(passportImg, itemX, itemY, itemW, itemH, alpha);

  // Arm line
  ctx.strokeStyle = `rgba(255,232,215,${0.4 * alpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + base.headR * 0.55, base.bodyY + base.headR * 0.75);
  ctx.lineTo(itemX - itemW * 0.42, itemY - itemH * 0.05);
  ctx.stroke();
}

// ------------------ Rose stroke setup ------------------
const lengths = strokePaths.map((p) => p.getTotalLength());
const totalLen = lengths.reduce((a, b) => a + b, 0);

function resetRoseStrokes() {
  for (const p of strokePaths) {
    p.style.transition = "none";
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    void p.getBoundingClientRect();
  }
}

function setDrawProgress(p) {
  let remaining = totalLen * clamp(p, 0, 1);
  for (let i = 0; i < strokePaths.length; i++) {
    const len = lengths[i];
    const shown = clamp(remaining / len, 0, 1);
    strokePaths[i].style.strokeDashoffset = `${len * (1 - shown)}`;
    remaining -= len;
  }
}

// ------------------ Hearts burst (from corolla) ------------------
const hearts = [];
let heartsBursted = false;

function burstHearts(x, y) {
  // brief, soft burst
  const n = 16;
  for (let i = 0; i < n; i++) {
    hearts.push({
      x,
      y,
      vx: rand(-0.55, 0.55),
      vy: rand(-1.2, -0.55),
      life: rand(0.75, 1.05),
      age: 0,
      size: rand(10, 18),
      spin: rand(-1.2, 1.2),
    });
  }
}

function drawSoftHeart(x, y, size, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  ctx.beginPath();
  ctx.moveTo(0, 0.28);
  ctx.bezierCurveTo(0, 0.05, -0.28, 0.0, -0.28, -0.18);
  ctx.bezierCurveTo(-0.28, -0.38, -0.05, -0.44, 0, -0.28);
  ctx.bezierCurveTo(0.05, -0.44, 0.28, -0.38, 0.28, -0.18);
  ctx.bezierCurveTo(0.28, 0.0, 0, 0.05, 0, 0.28);
  ctx.closePath();

  ctx.fillStyle = `rgba(255,120,170,${alpha})`;
  ctx.fill();

  ctx.restore();
}

function updateAndDrawHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.age += dt;
    const p = clamp(h.age / h.life, 0, 1);

    h.x += h.vx * (dt * 60);
    h.y += h.vy * (dt * 60);

    // gentle gravity
    h.vy += 0.012 * (dt * 60);

    const alpha = (1 - p) * 0.6;
    const s = (h.size / 100) * (0.8 + (1 - p) * 0.55);

    const sway = Math.sin(h.age * 6 + h.spin) * 2.2;
    drawSoftHeart(h.x + sway, h.y, s, alpha);

    if (p >= 1) hearts.splice(i, 1);
  }
}

// ------------------ Main loop ------------------
function render(now) {
  if (!start) start = now;
  const t = now - start;

  // Run story once, then ambience forever.
  const tOnce = Math.min(t, TOTAL_ONCE);

  // boundaries
  let cursor = 0;
  const pIntroEnd = (cursor += T.skyIntro);
  const pLightsInEnd = (cursor += T.sideLightsIn);
  const pPauseEnd = (cursor += T.pauseBeforeBeam);
  const pPulseEnd = (cursor += T.pulsesToCenter);
  const pDrawEnd = (cursor += T.roseDraw);
  const pBloomEnd = (cursor += T.roseBloom);
  const pFinalEnd = (cursor += T.finalReveal);
  const pDriftEnd = (cursor += T.driftOut);

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawAmbientMist();

  // stars
  const skyA = clamp(tOnce / pIntroEnd, 0, 1);
  for (const st of stars) {
    st.y += st.sp;
    if (st.y > window.innerHeight + 10) {
      st.y = -10;
      st.x = rand(0, window.innerWidth);
    }
    const tw = Math.sin(now * st.tw + st.x * 0.02) * 0.05;
    const a = clamp(st.a + tw, 0.05, 0.98) * (0.45 + 0.55 * skyA);

    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, a * 1.22)})`;
    ctx.fill();
  }

  const cx = window.innerWidth * 0.5;
  const cy = window.innerHeight * 0.44;

  // ambient pulse forever
  const ambientPulse = 0.5 + 0.5 * Math.sin(now * 0.0016);

  // center light
  let centerStrength;
  if (tOnce < pPulseEnd) {
    const rampP = clamp(tOnce / pLightsInEnd, 0, 1);
    centerStrength = 0.24 + 0.62 * easeInOut(rampP);
  } else {
    centerStrength = 0.92 + ambientPulse * 0.12;
  }
  drawCenterLight(cx, cy, 280, centerStrength);

  // --- Side orbs motion ---
  // enter fast then slow-stop => easeOutQuint
  let inP = clamp((tOnce - pIntroEnd) / (pLightsInEnd - pIntroEnd), 0, 1);
  inP = easeOutQuint(inP);

  const stopDx = window.innerWidth * 0.19;

  const lx0 = -window.innerWidth * 0.18;
  const rx0 = window.innerWidth * 1.18;

  const lxStop = cx - stopDx;
  const rxStop = cx + stopDx;

  let lx = lx0 + (lxStop - lx0) * inP;
  let rx = rx0 + (rxStop - rx0) * inP;

  // drift out after final reveal begins
  let sideAlpha = 1;
  if (tOnce >= pFinalEnd) {
    const driftP = clamp((tOnce - pFinalEnd) / (pDriftEnd - pFinalEnd), 0, 1);
    const e = easeInOut(driftP);

    lx = lxStop + (-window.innerWidth * 0.28 - lxStop) * e;
    rx = rxStop + (window.innerWidth * 1.28 - rxStop) * e;

    sideAlpha = 1 - 0.25 * e;
  }

  const showSides = tOnce >= pIntroEnd;
  let sideStrength = 0.92;
  if (t >= TOTAL_ONCE) sideStrength = 0.9 + ambientPulse * 0.12;

  if (showSides) {
    // Guy left with milk, Girl right with passport
    drawGuyOrb(lx, cy + 6, 215, sideStrength, sideAlpha, now * 0.001);
    drawGirlOrb(rx, cy - 6, 215, sideStrength, sideAlpha, now * 0.001);
  }

  // beams (two pulses)
  if (tOnce >= pPauseEnd && tOnce <= pPulseEnd) {
    const pp = clamp((tOnce - pPauseEnd) / (pPulseEnd - pPauseEnd), 0, 1);
    const pulse1 = Math.exp(-Math.pow((pp - 0.25) / 0.085, 2));
    const pulse2 = Math.exp(-Math.pow((pp - 0.7) / 0.09, 2));
    const pulse = clamp(pulse1 + pulse2, 0, 1);

    if (pulse > 0.02) {
      drawBeam(lx, cy + 6, cx, cy, "255,170,210", pulse);
      drawBeam(rx, cy - 6, cx, cy, "210,240,255", pulse);

      const ringProgress = Math.sin(pp * Math.PI);
      drawImpactRing(cx, cy, ringProgress, 0.9 + pulse * 0.5);

      drawCenterLight(cx, cy, 300, 0.95 + pulse * 0.35);
    }
  }

  // Rose setup once
  if (!roseShell.dataset.inited) {
    resetRoseStrokes();
    roseShell.dataset.inited = "1";
  }

  // Rose draw
  if (tOnce >= pPulseEnd) roseShell.classList.add("on");

  if (tOnce >= pPulseEnd && tOnce < pDrawEnd) {
    const dp = clamp((tOnce - pPulseEnd) / (pDrawEnd - pPulseEnd), 0, 1);
    setDrawProgress(easeOutCubic(dp));
  } else if (tOnce >= pDrawEnd) {
    setDrawProgress(1);
  }

  // Bloom + hearts from corolla AFTER flower is formed
  // COROLLA ORIGIN: tweak these if you want the hearts to come from slightly higher/lower.
  const COROLLA_X = cx;
  const COROLLA_Y = cy - 12; // <- hearts originate near the rose center

  if (tOnce >= pDrawEnd && tOnce < pBloomEnd) {
    const bp = clamp((tOnce - pDrawEnd) / (pBloomEnd - pDrawEnd), 0, 1);
    const e = easeInOut(bp);

    const leafFills = fillPaths.filter((x) => x.classList.contains("leafFill"));
    const petalFills = fillPaths.filter((x) =>
      x.classList.contains("petalFill"),
    );

    if (e > 0.1) for (const f of leafFills) f.classList.add("on");
    if (e > 0.24) for (const f of petalFills) f.classList.add("on");
    if (e > 0.28) bloomGlow.classList.add("on");
  }

  // When bloom completes, do a single brief hearts burst from corolla
  if (!heartsBursted && tOnce >= pBloomEnd) {
    heartsBursted = true;
    burstHearts(COROLLA_X, COROLLA_Y);
  }

  // After bloom, keep everything alive
  if (tOnce >= pBloomEnd) {
    bloomGlow.classList.add("on");
    for (const f of fillPaths) f.classList.add("on");
    finalEl.classList.add("on");
  }

  // Hearts animate
  updateAndDrawHearts(1 / 60);

  // subtle halo pulse forever after bloom
  if (tOnce >= pBloomEnd) {
    const haloPulse = 0.75 + ambientPulse * 0.25;
    drawCenterLight(cx, cy, 320, 0.55 * haloPulse);
  }

  rafId = requestAnimationFrame(render);
}

rafId = requestAnimationFrame(render);
