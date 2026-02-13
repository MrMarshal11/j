// =====================================================
// Phone-optimized cinematic valentine (SPRITE VERSION)
// - Two custom sprites (assets/guy.png, assets/girl.png)
// - Sprites preserve aspect ratio (no squish)
// - Sized + positioned for PHONE: never overlap, never sit behind the rose
// - Sprites slide in near edges, then back away and stay out of the rose area
// - Subtle beam
// - Rose centered on center light
// - Hearts burst from corolla briefly after bloom completes
// - Ambient pulse forever
// =====================================================

const T = {
  skyIntro: 1600,
  spriteIn: 1500,
  pauseBeforeBeam: 350,
  beamPhase: 1100,
  roseDraw: 3200,
  roseBloom: 2100,
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

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// --- Load your sprites ---
// Put these files in: assets/guy.png and assets/girl.png
const guyImg = new Image();
guyImg.src = "assets/guy.png";

const girlImg = new Image();
girlImg.src = "assets/girl.png";

// --- Stars ---
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

// --- Rose stroke setup ---
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

// --- Hearts ---
const hearts = [];
let heartsBursted = false;

function burstHearts(x, y) {
  // brief, soft burst
  for (let i = 0; i < 16; i++) {
    hearts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.0,
      vy: -Math.random() * 1.6 - 0.45,
      life: 0.9 + Math.random() * 0.25,
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

    const alpha = (1 - p) * 0.75;
    const size = h.size * 16;
    const sway = Math.sin(h.age * 7 + h.sway) * 2.2;

    drawHeart(h.x + sway, h.y, size / 100, alpha);

    if (p >= 1) hearts.splice(i, 1);
  }
}

// --- Subtle beam ---
function drawBeam(x1, y1, x2, y2, intensity) {
  // phone-friendly subtle beams (no heavy pulse)
  const a = 0.08 * intensity;
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // ultra-faint tint
  ctx.strokeStyle = `rgba(255,45,85,${0.035 * intensity})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// --- Center glow ---
function drawCenterGlow(x, y, now) {
  const pulse = 0.85 + Math.sin(now * 0.0015) * 0.15;

  const g = ctx.createRadialGradient(x, y, 0, x, y, 255);
  g.addColorStop(0, `rgba(255,45,85,${0.4 * pulse})`);
  g.addColorStop(0.55, `rgba(255,45,85,${0.14 * pulse})`);
  g.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 255, 0, Math.PI * 2);
  ctx.fill();
}

// --- Sprite draw (preserve aspect ratio) ---
function drawSpriteFixedHeight(img, xLeft, yTop, height, alpha = 1) {
  if (!img.complete || img.naturalWidth === 0) return null;
  const aspect = img.naturalWidth / img.naturalHeight;
  const width = height * aspect;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, xLeft, yTop, width, height);
  ctx.restore();

  return { width, height };
}

function render(now) {
  if (!start) start = now;
  const t = now - start;

  // run story once, keep ambience forever
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

  // --- PHONE layout constants ---
  // Keep rose + center glow in the middle; keep sprites OUT of the rose zone.
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.44;

  // Center glow always
  drawCenterGlow(cx, cy, now);

  // "No overlap" zone around center (half-width)
  const centerSafeHalfW = Math.min(170, window.innerWidth * 0.26);

  // Sprite height scaled for phone (smaller!)
  // Caps ensure they don't dominate portrait screens
  const spriteH = Math.min(280, window.innerHeight * 0.4);

  // Edge margins so sprites are fully visible
  const edgeMargin = 12;

  // Entry progress
  const entryP = easeOut(clamp((tOnce - pIntro) / (pIn - pIntro), 0, 1));

  // Start off-screen
  const startLeftX = -700;
  const startRightBoundary = window.innerWidth + 700;

  // We'll compute widths (if loaded) to ensure:
  // - left sprite stays <= centerSafeLeft
  // - right sprite stays >= centerSafeRight
  const guyAspect =
    guyImg.complete && guyImg.naturalWidth > 0
      ? guyImg.naturalWidth / guyImg.naturalHeight
      : 0.65;
  const girlAspect =
    girlImg.complete && girlImg.naturalWidth > 0
      ? girlImg.naturalWidth / girlImg.naturalHeight
      : 0.65;

  const guyW = spriteH * guyAspect;
  const girlW = spriteH * girlAspect;

  const centerSafeLeftMax = cx - centerSafeHalfW - guyW; // left sprite xLeft must be <= this
  const centerSafeRightMin = cx + centerSafeHalfW + girlW; // right boundary must be >= this

  // Desired stop positions near edges
  // Left stop: as close to edge as possible but not past center safe zone
  const stopLeftX = Math.min(edgeMargin, centerSafeLeftMax);

  // Right boundary stop: as close to edge as possible but not past center safe zone
  const stopRightBoundary = Math.max(
    window.innerWidth - edgeMargin,
    centerSafeRightMin,
  );

  // Interpolate toward stops
  let leftX = startLeftX + (stopLeftX - startLeftX) * entryP;
  let rightBoundary =
    startRightBoundary + (stopRightBoundary - startRightBoundary) * entryP;

  // As soon as rose begins forming (after beam phase), sprites back away and stay OUTSIDE center zone
  if (tOnce > pBeam) {
    const backP = easeInOut(clamp((tOnce - pBeam) / (pDraw - pBeam), 0, 1));
    leftX = stopLeftX - 180 * backP;
    rightBoundary = stopRightBoundary + 180 * backP;
  }

  // Gentle idle float
  const float = Math.sin(now * 0.002) * 5;

  // vertical placement (centered on cy)
  const yTop = cy + float - spriteH * 0.5;

  // Draw left sprite (guy)
  const guyDims = drawSpriteFixedHeight(guyImg, leftX, yTop, spriteH, 1);

  // Draw right sprite (girl) aligned to right boundary
  if (girlImg.complete && girlImg.naturalWidth > 0) {
    const girlXLeft = rightBoundary - girlW;
    ctx.drawImage(girlImg, girlXLeft, yTop, girlW, spriteH);
  }

  // Beam phase: subtle beams from sprite near inner edges toward center
  if (tOnce > pPause && tOnce < pBeam) {
    const beamP = Math.sin(((tOnce - pPause) / (pBeam - pPause)) * Math.PI); // 0->1->0

    const intensity = beamP;

    const leftBeamX = guyDims ? leftX + guyDims.width - 8 : leftX + guyW - 8;
    const rightBeamX = rightBoundary - girlW + 8;

    drawBeam(leftBeamX, cy, cx, cy, intensity);
    drawBeam(rightBeamX, cy, cx, cy, intensity);
  }

  // Rose draw starts after beam
  if (tOnce > pBeam) {
    roseShell.classList.add("on");
    const dp = clamp((tOnce - pBeam) / (pDraw - pBeam), 0, 1);
    setDrawProgress(dp);
  }

  // Bloom fills after draw completes
  if (tOnce > pDraw) {
    for (const f of fillPaths) f.classList.add("on");
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  // Hearts burst once bloom completes (from corolla, aligned to center light)
  const COROLLA_X = cx;
  const COROLLA_Y = cy - 10;

  if (!heartsBursted && tOnce >= pBloom) {
    heartsBursted = true;
    burstHearts(COROLLA_X, COROLLA_Y);
  }

  // Hearts animate
  updateAndDrawHearts(1 / 60);

  // Keep final state after story ends (loop ambience)
  if (t >= TOTAL_ONCE) {
    setDrawProgress(1);
    for (const f of fillPaths) f.classList.add("on");
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
