// =====================================================
// Cinematic valentine (auto-play, LOOPS ambience forever)
// - Persistent center light (dim -> brighter)
// - AU + KR personal orbs enter fast then slow-stop
// - Energy beams pulse into center (with impact ring)
// - Rose draws + blooms
// - Brief soft heart burst when rose completes
// - Final message appears, then everything gently pulses forever
// - AU/KR orbs slowly drift out after the beams
// =====================================================

const T = {
  skyIntro: 2600, // stars + center light begins
  sideLightsIn: 1900, // enter fast then slow to stop
  pauseBeforeBeam: 450, // brief tension
  pulsesToCenter: 1800, // 2 pulses
  roseDraw: 4300, // rose draws
  roseBloom: 2800, // fills + bloom glow
  finalReveal: 1200, // final text fade in
  driftOut: 5200, // orbs drift out slowly
  // After this: ambience continues forever (no end)
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
function setMicro(text, on = true) {
  microText.textContent = text;
  if (on) microText.classList.add("on");
  else microText.classList.remove("on");
}

// You said you don’t like “hey / far apart” — so we keep this minimal.
// If you want it completely gone, setMicro("", false) once.
setMicro("", false);

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
  mist.addColorStop(0.55, "rgba(25,255,135,0.03)");
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

// ------------------ Personal orbs (AU / KR) ------------------
// These are stylized "mini characters" drawn inside the light.

function drawAULightWithCharacter(x, y, radius, strength, alpha = 1, time = 0) {
  strength *= alpha;

  // AU vibe: deep blue glow with subtle red/white accents
  let g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(20,80,255,${0.24 * strength})`);
  g.addColorStop(0.45, `rgba(10,40,160,${0.16 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  g = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius * 0.65);
  g.addColorStop(0, `rgba(255,45,85,${0.07 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // White speckles
  const specks = Math.floor(7 + strength * 12);
  for (let i = 0; i < specks; i++) {
    const ang = rand(0, Math.PI * 2);
    const r = rand(radius * 0.12, radius * 0.58);
    const sx = x + Math.cos(ang) * r;
    const sy = y + Math.sin(ang) * r;
    ctx.fillStyle = `rgba(255,255,255,${0.035 * strength})`;
    ctx.beginPath();
    ctx.arc(sx, sy, rand(0.5, 1.3), 0, Math.PI * 2);
    ctx.fill();
  }

  // Character (AU): short dark hair man holding strawberry milk
  drawMiniCharacterAU(x, y, radius, 0.9 * alpha, time);

  // core
  ctx.fillStyle = `rgba(255,255,255,${0.18 * strength})`;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.085, 0, Math.PI * 2);
  ctx.fill();
}

function drawKRLightWithCharacter(x, y, radius, strength, alpha = 1, time = 0) {
  strength *= alpha;

  // KR vibe: white glow with red/blue core
  let g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255,255,255,${0.18 * strength})`);
  g.addColorStop(0.52, `rgba(255,255,255,${0.11 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  const coreR = radius * 0.22;
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

  // Character (KR): long black hair holding green passport
  drawMiniCharacterKR(x, y, radius, 0.9 * alpha, time);

  // core
  ctx.fillStyle = `rgba(255,255,255,${0.16 * strength})`;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawMiniCharacterAU(x, y, radius, alpha, time) {
  // small floating bob
  const bob = Math.sin(time * 2.0) * 2.0;

  const headR = radius * 0.16;
  const headX = x;
  const headY = y - radius * 0.08 + bob;

  // Face
  ctx.fillStyle = `rgba(255,235,220,${0.85 * alpha})`;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Short dark hair cap
  ctx.fillStyle = `rgba(50,35,25,${0.95 * alpha})`;
  ctx.beginPath();
  ctx.arc(headX, headY - headR * 0.25, headR * 1.02, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  // Body
  const bodyW = headR * 2.0;
  const bodyH = headR * 2.2;
  ctx.fillStyle = `rgba(255,255,255,${0.14 * alpha})`;
  ctx.beginPath();
  ctx.roundRect(headX - bodyW / 2, headY + headR * 0.75, bodyW, bodyH, 10);
  ctx.fill();

  // Strawberry milk (pink cup + straw)
  const cupW = headR * 1.1;
  const cupH = headR * 1.25;
  const cupX = headX + headR * 0.95;
  const cupY = headY + headR * 1.35;

  ctx.fillStyle = `rgba(255,160,190,${0.8 * alpha})`;
  ctx.beginPath();
  ctx.roundRect(cupX - cupW / 2, cupY - cupH / 2, cupW, cupH, 6);
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${0.55 * alpha})`;
  ctx.beginPath();
  ctx.roundRect(cupX - cupW / 2, cupY - cupH / 2, cupW, cupH * 0.25, 6);
  ctx.fill();

  // Straw
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cupX + cupW * 0.15, cupY - cupH * 0.55);
  ctx.lineTo(cupX + cupW * 0.25, cupY - cupH * 0.95);
  ctx.stroke();

  // Arm hint
  ctx.strokeStyle = `rgba(255,235,220,${0.45 * alpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(headX + headR * 0.6, headY + headR * 1.3);
  ctx.lineTo(cupX - cupW * 0.35, cupY - cupH * 0.1);
  ctx.stroke();
}

function drawMiniCharacterKR(x, y, radius, alpha, time) {
  const bob = Math.sin(time * 2.0 + 1.2) * 2.0;

  const headR = radius * 0.16;
  const headX = x;
  const headY = y - radius * 0.08 + bob;

  // Face
  ctx.fillStyle = `rgba(255,235,220,${0.85 * alpha})`;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Long black hair shape
  ctx.fillStyle = `rgba(15,15,18,${0.95 * alpha})`;
  ctx.beginPath();
  ctx.arc(headX, headY - headR * 0.15, headR * 1.05, Math.PI, 0);
  ctx.lineTo(headX + headR * 1.05, headY + headR * 1.35);
  ctx.quadraticCurveTo(
    headX,
    headY + headR * 1.75,
    headX - headR * 1.05,
    headY + headR * 1.35,
  );
  ctx.closePath();
  ctx.fill();

  // Body
  const bodyW = headR * 2.0;
  const bodyH = headR * 2.2;
  ctx.fillStyle = `rgba(255,255,255,${0.14 * alpha})`;
  ctx.beginPath();
  ctx.roundRect(headX - bodyW / 2, headY + headR * 0.75, bodyW, bodyH, 10);
  ctx.fill();

  // Green passport
  const passW = headR * 1.25;
  const passH = headR * 1.0;
  const passX = headX + headR * 1.05;
  const passY = headY + headR * 1.35;

  ctx.fillStyle = `rgba(0,160,90,${0.8 * alpha})`;
  ctx.beginPath();
  ctx.roundRect(passX - passW / 2, passY - passH / 2, passW, passH, 6);
  ctx.fill();

  // tiny emblem dot
  ctx.fillStyle = `rgba(255,215,130,${0.55 * alpha})`;
  ctx.beginPath();
  ctx.arc(passX, passY, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Arm hint
  ctx.strokeStyle = `rgba(255,235,220,${0.45 * alpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(headX + headR * 0.6, headY + headR * 1.3);
  ctx.lineTo(passX - passW * 0.35, passY - passH * 0.1);
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

// ------------------ Hearts burst ------------------
const hearts = [];
let heartsBursted = false;

function burstHearts(x, y) {
  // tasteful, brief burst
  const n = 14;
  for (let i = 0; i < n; i++) {
    hearts.push({
      x,
      y,
      vx: rand(-0.55, 0.55),
      vy: rand(-1.35, -0.55),
      life: rand(0.8, 1.15),
      age: 0,
      size: rand(10, 18),
      spin: rand(-1.2, 1.2),
    });
  }
}

function updateAndDrawHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.age += dt;
    const p = clamp(h.age / h.life, 0, 1);

    // motion
    h.x += h.vx * (dt * 60);
    h.y += h.vy * (dt * 60);

    // gentle gravity
    h.vy += 0.012 * (dt * 60);

    const alpha = (1 - p) * 0.55;
    const s = (h.size / 100) * (0.8 + (1 - p) * 0.6);

    // slight sway
    const sway = Math.sin(h.age * 6 + h.spin) * 2.2;
    drawSoftHeart(h.x + sway, h.y, s, alpha);

    if (p >= 1) hearts.splice(i, 1);
  }
}

// ------------------ Main loop ------------------
function render(now) {
  if (!start) start = now;
  const t = now - start;

  // We run the “story” once, then remain in ambient mode forever.
  const tOnce = Math.min(t, TOTAL_ONCE);

  // phase boundaries
  let cursor = 0;
  const pIntroEnd = (cursor += T.skyIntro);
  const pLightsInEnd = (cursor += T.sideLightsIn);
  const pPauseEnd = (cursor += T.pauseBeforeBeam);
  const pPulseEnd = (cursor += T.pulsesToCenter);
  const pDrawEnd = (cursor += T.roseDraw);
  const pBloomEnd = (cursor += T.roseBloom);
  const pFinalEnd = (cursor += T.finalReveal);
  const pDriftEnd = (cursor += T.driftOut);

  // clear + ambient mist
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
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, a * 1.25)})`;
    ctx.fill();
  }

  const cx = window.innerWidth * 0.5;
  const cy = window.innerHeight * 0.44;

  // gentle heartbeat after final (keeps alive forever)
  const ambientPulse = 0.5 + 0.5 * Math.sin(now * 0.0016);

  // center light strength ramps up then stays pulsing
  let centerStrength;
  if (tOnce < pPulseEnd) {
    const rampP = clamp(tOnce / pLightsInEnd, 0, 1);
    centerStrength = 0.22 + 0.62 * easeInOut(rampP);
  } else {
    centerStrength = 0.92 + ambientPulse * 0.12;
  }

  // draw center light (brighter, phone-friendly)
  drawCenterLight(cx, cy, 280, centerStrength);

  // ---- Side orbs positions (enter -> stop -> pulses -> drift out) ----
  // Entry: fast then slow stop => easeOutQuint
  let inP = clamp((tOnce - pIntroEnd) / (pLightsInEnd - pIntroEnd), 0, 1);
  inP = easeOutQuint(inP);

  const stopDx = window.innerWidth * 0.19;

  // start off-screen
  const lx0 = -window.innerWidth * 0.18;
  const rx0 = window.innerWidth * 1.18;

  const lxStop = cx - stopDx;
  const rxStop = cx + stopDx;

  let lx = lx0 + (lxStop - lx0) * inP;
  let rx = rx0 + (rxStop - rx0) * inP;

  // After drift-out phase begins, move them slowly out
  let sideAlpha = 1;
  if (tOnce >= pFinalEnd) {
    const driftP = clamp((tOnce - pFinalEnd) / (pDriftEnd - pFinalEnd), 0, 1);
    const e = easeInOut(driftP);

    // slowly leave (opposite directions, gentle curve)
    lx = lxStop + (-window.innerWidth * 0.28 - lxStop) * e;
    rx = rxStop + (window.innerWidth * 1.28 - rxStop) * e;

    // keep visible but soften slightly
    sideAlpha = 1 - 0.25 * e;
  }

  // Side strength pulses gently after story completes
  let sideStrength = 0.92;
  if (t >= TOTAL_ONCE) sideStrength = 0.9 + ambientPulse * 0.12;

  // only show side lights once intro is done
  const showSides = tOnce >= pIntroEnd;

  if (showSides) {
    // AU left / KR right
    drawAULightWithCharacter(
      lx,
      cy + 6,
      210,
      sideStrength,
      sideAlpha,
      now * 0.001,
    );
    drawKRLightWithCharacter(
      rx,
      cy - 6,
      210,
      sideStrength,
      sideAlpha,
      now * 0.001,
    );
  }

  // ---- Beams (two pulses) ----
  if (tOnce >= pPauseEnd && tOnce <= pPulseEnd) {
    const pp = clamp((tOnce - pPauseEnd) / (pPulseEnd - pPauseEnd), 0, 1);

    // Two pulses at ~25% and ~70%
    const pulse1 = Math.exp(-Math.pow((pp - 0.25) / 0.085, 2));
    const pulse2 = Math.exp(-Math.pow((pp - 0.7) / 0.09, 2));
    const pulse = clamp(pulse1 + pulse2, 0, 1);

    if (pulse > 0.02) {
      drawBeam(lx, cy + 6, cx, cy, "180,210,255", pulse); // AU-ish
      drawBeam(rx, cy - 6, cx, cy, "255,120,180", pulse); // KR-ish

      // impact ring makes it feel real
      const ringProgress = Math.sin(pp * Math.PI);
      drawImpactRing(cx, cy, ringProgress, 0.9 + pulse * 0.5);

      // briefly boost center brightness on hit
      drawCenterLight(cx, cy, 300, 0.95 + pulse * 0.35);
    }
  }

  // ---- Rose draw/bloom ----
  // Ensure rose strokes initialized once
  if (!roseShell.dataset.inited) {
    resetRoseStrokes();
    roseShell.dataset.inited = "1";
  }

  // Draw starts right after pulses
  if (tOnce >= pPulseEnd) {
    roseShell.classList.add("on");
  }

  if (tOnce >= pPulseEnd && tOnce < pDrawEnd) {
    const dp = clamp((tOnce - pPulseEnd) / (pDrawEnd - pPulseEnd), 0, 1);
    setDrawProgress(easeOutCubic(dp));
  } else if (tOnce >= pDrawEnd) {
    setDrawProgress(1);
  }

  // Bloom fills
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

    // hearts burst once as bloom starts (tasteful)
    if (!heartsBursted && e > 0.26) {
      heartsBursted = true;
      burstHearts(cx, cy + 24);
    }
  }

  // After bloom finishes, keep glow pulsing gently forever
  if (tOnce >= pBloomEnd) {
    bloomGlow.classList.add("on");
    for (const f of fillPaths) f.classList.add("on");
  }

  // Final message reveal then always visible
  if (tOnce >= pBloomEnd) {
    finalEl.classList.add("on");
  }

  // Hearts update (dt)
  const dt = 1 / 60;
  updateAndDrawHearts(dt);

  // Keep rose “alive” after final: subtle halo pulse
  if (tOnce >= pBloomEnd) {
    const haloPulse = 0.75 + ambientPulse * 0.25;
    drawCenterLight(cx, cy, 320, 0.55 * haloPulse);
  }

  rafId = requestAnimationFrame(render);
}

rafId = requestAnimationFrame(render);
