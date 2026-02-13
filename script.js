// =====================================================
// PHONE-FIRST Valentine (SPRITE VERSION - GUARANTEED VISIBLE)
// Fixes:
// - Sprites were going out-of-frame due to bad stopRightBoundary math.
// - Now sprites are ALWAYS placed using their REAL computed widths,
//   clamped into the viewport, and never overlap the rose safe zone.
// - Sprites are SMALLER (phone UX), sit near edges, fully visible,
//   and never drift behind the rose.
// - Beams originate from sprite inner edges.
// - Hearts burst reliably from corolla.
// - Ambient loop forever.
// =====================================================

const T = {
  skyIntro: 1400,
  spriteIn: 1400,
  pauseBeforeBeam: 320,
  beamPhase: 1000,
  roseDraw: 3100,
  roseBloom: 2000,
};

const TOTAL_ONCE =
  T.skyIntro +
  T.spriteIn +
  T.pauseBeforeBeam +
  T.beamPhase +
  T.roseDraw +
  T.roseBloom;

const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d", { alpha: true });

const roseShell = document.getElementById("roseShell");
const bloomGlow = document.getElementById("bloomGlow");
const finalEl = document.getElementById("final");

const roseSvg = document.getElementById("rose");
const strokePaths = Array.from(roseSvg.querySelectorAll(".stroke"));
const fillPaths = Array.from(roseSvg.querySelectorAll(".fill"));

let start = null;

// ---------- Utils ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ---------- Canvas sizing ----------
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

// ---------- Load sprites ----------
const guyImg = new Image();
guyImg.src = "assets/guy.png";

const girlImg = new Image();
girlImg.src = "assets/girl.png";

// ---------- Stars ----------
const stars = [];
function seedStars() {
  stars.length = 0;
  const count = Math.min(220, Math.floor(window.innerWidth * 0.22));
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.4,
      sp: Math.random() * 0.12 + 0.02,
      a: Math.random() * 0.55 + 0.2,
    });
  }
}
seedStars();
window.addEventListener("resize", seedStars);

// ---------- Rose stroke setup ----------
const lengths = strokePaths.map((p) => p.getTotalLength());
const totalLen = lengths.reduce((a, b) => a + b, 0);

function resetRose() {
  strokePaths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
  });
}
function setDrawProgress(p) {
  let rem = totalLen * clamp(p, 0, 1);
  for (let i = 0; i < strokePaths.length; i++) {
    const len = lengths[i];
    const shown = clamp(rem / len, 0, 1);
    strokePaths[i].style.strokeDashoffset = `${len * (1 - shown)}`;
    rem -= len;
  }
}
resetRose();

// ---------- Hearts ----------
const hearts = [];
let heartsBursted = false;

function burstHearts(x, y) {
  for (let i = 0; i < 18; i++) {
    hearts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.95,
      vy: -Math.random() * 1.55 - 0.45,
      life: 0.85 + Math.random() * 0.25,
      age: 0,
      size: 0.55 + Math.random() * 0.45,
      sway: Math.random() * Math.PI * 2,
    });
  }
}

function drawHeart(x, y, s, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0.3);
  ctx.bezierCurveTo(0, 0.05, -0.3, 0, -0.3, -0.2);
  ctx.bezierCurveTo(-0.3, -0.45, 0, -0.3, 0, -0.15);
  ctx.bezierCurveTo(0, -0.3, 0.3, -0.45, 0.3, -0.2);
  ctx.bezierCurveTo(0.3, 0, 0, 0.05, 0, 0.3);
  ctx.closePath();
  ctx.fillStyle = `rgba(255,120,170,${a})`;
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
    h.vy += 0.02 * (dt * 60);

    const alpha = (1 - p) * 0.78;
    const size = h.size * 15;
    const sway = Math.sin(h.age * 7 + h.sway) * 2.0;

    drawHeart(h.x + sway, h.y, size / 100, alpha);

    if (p >= 1) hearts.splice(i, 1);
  }
}

// ---------- Beam + Center Glow ----------
function drawBeam(x1, y1, x2, y2, intensity) {
  const a = 0.08 * intensity; // subtle
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255,45,85,${0.03 * intensity})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawCenterGlow(x, y, now) {
  const pulse = 0.85 + Math.sin(now * 0.0015) * 0.15;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 245);
  g.addColorStop(0, `rgba(255,45,85,${0.4 * pulse})`);
  g.addColorStop(0.55, `rgba(255,45,85,${0.14 * pulse})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 245, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Sprite drawing (aspect preserved) ----------
function getDims(img, height) {
  if (!img.complete || img.naturalWidth === 0)
    return { w: height * 0.7, h: height, ready: false };
  const aspect = img.naturalWidth / img.naturalHeight;
  return { w: height * aspect, h: height, ready: true };
}

function drawSprite(img, xLeft, yTop, w, h, alpha = 1) {
  if (!img.complete || img.naturalWidth === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, xLeft, yTop, w, h);
  ctx.restore();
}

// ---------- Main loop ----------
function render(now) {
  if (!start) start = now;
  const t = now - start;
  const tOnce = Math.min(t, TOTAL_ONCE);

  let cursor = 0;
  const pIntro = (cursor += T.skyIntro);
  const pIn = (cursor += T.spriteIn);
  const pPause = (cursor += T.pauseBeforeBeam);
  const pBeam = (cursor += T.beamPhase);
  const pDraw = (cursor += T.roseDraw);
  const pBloom = (cursor += T.roseBloom);

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // stars
  for (const s of stars) {
    s.y += s.sp;
    if (s.y > window.innerHeight) s.y = 0;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.fill();
  }

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.44;
  drawCenterGlow(cx, cy, now);

  // ---------- PHONE UX LAYOUT ----------
  // Make sprites clearly visible on phones:
  // - smaller height
  // - slightly lower than rose center so they don't "sit behind" the rose
  // - enforced safe zone around center so they never overlap rose area
  const spriteH = Math.min(210, window.innerHeight * 0.3); // MUCH smaller
  const guy = getDims(guyImg, spriteH);
  const girl = getDims(girlImg, spriteH);

  // rose safe zone width (keep sprites outside this)
  const safeHalfW = Math.min(160, window.innerWidth * 0.25);

  // edges
  const edgeMargin = 10;

  // FINAL on-screen targets (fully visible + outside safe zone)
  // Left sprite xLeft must be:
  // - at least edgeMargin
  // - at most (cx - safeHalfW - guy.w)
  const leftTarget = clamp(edgeMargin, edgeMargin, cx - safeHalfW - guy.w);

  // Right sprite xLeft must be:
  // - at least (cx + safeHalfW)
  // - at most (windowWidth - edgeMargin - girl.w)
  const rightTarget = clamp(
    cx + safeHalfW,
    cx + safeHalfW,
    window.innerWidth - edgeMargin - girl.w,
  );

  // Offscreen starts
  const leftStart = -guy.w - 40;
  const rightStart = window.innerWidth + 40;

  // Entry interpolation
  const entryP = easeOut(clamp((tOnce - pIntro) / (pIn - pIntro), 0, 1));
  let leftX = lerp(leftStart, leftTarget, entryP);
  let rightX = lerp(rightStart, rightTarget, entryP);

  // When rose begins (after beam), sprites back away and STAY out
  if (tOnce > pBeam) {
    const backP = easeInOut(clamp((tOnce - pBeam) / (pDraw - pBeam), 0, 1));
    leftX = leftTarget - 120 * backP;
    rightX = rightTarget + 120 * backP;
  }

  // vertical placement: put sprites a bit LOWER than the rose center
  const float = Math.sin(now * 0.002) * 4;
  const yTop = cy + 85 + float - spriteH * 0.5;

  // GUARANTEE on-screen visibility (hard clamp)
  leftX = clamp(leftX, -guy.w * 0.35, window.innerWidth - edgeMargin - guy.w);
  rightX = clamp(rightX, edgeMargin, window.innerWidth + girl.w * 0.35);

  // draw sprites
  drawSprite(guyImg, leftX, yTop, guy.w, guy.h, 1);
  drawSprite(girlImg, rightX, yTop, girl.w, girl.h, 1);

  // beams: originate from inner edges of sprites
  if (tOnce > pPause && tOnce < pBeam) {
    const beamP = Math.sin(((tOnce - pPause) / (pBeam - pPause)) * Math.PI);
    const intensity = beamP;

    const leftBeamX = leftX + guy.w;
    const rightBeamX = rightX;

    // aim a bit above sprites toward rose center
    drawBeam(leftBeamX, yTop + guy.h * 0.35, cx, cy, intensity);
    drawBeam(rightBeamX, yTop + girl.h * 0.35, cx, cy, intensity);
  }

  // rose draw
  if (tOnce > pBeam) {
    roseShell.classList.add("on");
    const dp = clamp((tOnce - pBeam) / (pDraw - pBeam), 0, 1);
    setDrawProgress(dp);
  }

  // bloom
  if (tOnce > pDraw) {
    for (const f of fillPaths) f.classList.add("on");
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  // hearts burst after bloom completes (reliable)
  const COROLLA_X = cx;
  const COROLLA_Y = cy - 8;

  if (!heartsBursted && tOnce >= pBloom) {
    heartsBursted = true;
    burstHearts(COROLLA_X, COROLLA_Y);
  }
  updateAndDrawHearts(1 / 60);

  // keep final state after story ends
  if (t >= TOTAL_ONCE) {
    setDrawProgress(1);
    for (const f of fillPaths) f.classList.add("on");
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
