// =====================================================
// PHONE-FIRST Valentine (SPRITES) - FIXED FOR MOBILE VIEWPORT + SAFE PLACEHOLDERS
// - Uses visualViewport (iOS Safari address-bar-safe sizing)
// - Guarantees sprites stay on-screen and never overlap
// - Auto-scales sprite size down if the phone is too narrow
// - Beam ALWAYS originates from the GUY sprite (and respects FLIP_GUY)
// - Avoids ctx.roundRect crashes on older mobile browsers (fallback included)
// =====================================================

const T = {
  skyIntro: 1100,
  spriteIn: 1100,
  pauseBeforeBeam: 260,
  beamPhase: 1000,
  roseDraw: 3000,
  roseBloom: 1900,
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

// ---------- Facing toggles ----------
const FLIP_GIRL = false; // set true if your girl sprite faces RIGHT by default
const FLIP_GUY = false; // set true if your guy sprite faces LEFT by default

// ---------- Utils ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// ---------- Mobile-safe viewport sizing ----------
let DPR = 1;
let VW = 0;
let VH = 0;

function getViewport() {
  // visualViewport fixes iOS Safari “address bar” sizing issues
  const vv = window.visualViewport;
  const w = vv ? vv.width : window.innerWidth;
  const h = vv ? vv.height : window.innerHeight;
  return {
    w: Math.max(1, Math.floor(w)),
    h: Math.max(1, Math.floor(h)),
  };
}

function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);

  const v = getViewport();
  VW = v.w;
  VH = v.h;

  canvas.width = Math.floor(VW * DPR);
  canvas.height = Math.floor(VH * DPR);
  canvas.style.width = VW + "px";
  canvas.style.height = VH + "px";

  // Draw in CSS pixel coordinates
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
  window.visualViewport.addEventListener("scroll", resize);
}
resize();

// ---------- Load sprites ----------
function loadImage(path) {
  const img = new Image();
  // NOTE: crossOrigin can cause issues if assets are not served with CORS headers.
  // For same-origin hosting it’s fine. If your phone shows missing images,
  // try commenting the next line out.
  img.crossOrigin = "anonymous";

  // Cache-bust (helps phones with aggressive caching)
  img.src = `${path}?v=${Date.now()}`;
  return img;
}

const guyImg = loadImage("assets/guy.png");
const girlImg = loadImage("assets/girl.png");

// ---------- Stars ----------
const stars = [];
function seedStars() {
  stars.length = 0;
  const count = Math.min(180, Math.floor(VW * 0.18));
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * VW,
      y: Math.random() * VH,
      r: Math.random() * 1.4 + 0.4,
      sp: Math.random() * 0.1 + 0.02,
      a: Math.random() * 0.55 + 0.2,
    });
  }
}
seedStars();
window.addEventListener("resize", seedStars);
if (window.visualViewport)
  window.visualViewport.addEventListener("resize", seedStars);

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
  for (let i = 0; i < 16; i++) {
    hearts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.9,
      vy: -Math.random() * 1.45 - 0.45,
      life: 0.85 + Math.random() * 0.22,
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
    const size = h.size * 14;
    const sway = Math.sin(h.age * 7 + h.sway) * 2.0;

    drawHeart(h.x + sway, h.y, size / 100, alpha);

    if (p >= 1) hearts.splice(i, 1);
  }
}

// ---------- Beam + Center Glow ----------
function drawBeam(x1, y1, x2, y2, intensity) {
  const a = 0.085 * intensity;
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
  const g = ctx.createRadialGradient(x, y, 0, x, y, 235);
  g.addColorStop(0, `rgba(255,45,85,${0.38 * pulse})`);
  g.addColorStop(0.55, `rgba(255,45,85,${0.13 * pulse})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 235, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Rounded-rect fallback (avoids mobile crashes) ----------
function roundRectPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

// ---------- Sprite helpers ----------
function getDims(img, targetH, fallbackAspect = 0.7) {
  const ready = img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
  const aspect = ready ? img.naturalWidth / img.naturalHeight : fallbackAspect;
  return { w: targetH * aspect, h: targetH, ready, aspect };
}

function drawSpriteOrPlaceholder(img, x, y, w, h, label, flipX = false) {
  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    if (flipX) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
    return;
  }

  // Placeholder (safe on mobile)
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;

  roundRectPath(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(label, x + 10, y + 18);
}

// ---------- Layout (phone-first, never overlap, auto-fit) ----------
function computeSpriteLayout(now) {
  const cx = VW / 2;
  const cy = VH * 0.44;

  // Base sprite height target (phone-friendly)
  let spriteH = Math.min(160, VH * 0.235);
  spriteH = Math.max(95, spriteH);

  // Gap between sprites around the benchmark center
  let gap = Math.min(28, VW * 0.075);
  gap = Math.max(16, gap);

  // Screen padding
  const edge = 10;

  // Float bob
  const float = Math.sin(now * 0.002) * 3.0;

  // “Directly above the flower” placement
  const spriteCenterY = cy - Math.max(72, VH * 0.11) + float;

  // If phone is narrow, scale sprites down to fit BOTH sprites + gap + edges
  // We approximate widths via aspect ratios (real once loaded, fallback otherwise).
  const gD0 = getDims(guyImg, spriteH);
  const grD0 = getDims(girlImg, spriteH);

  const maxUsableW = VW - edge * 2;
  const requiredW = gD0.w + gap + grD0.w;

  if (requiredW > maxUsableW) {
    const scale = clamp(maxUsableW / requiredW, 0.5, 1);
    spriteH = spriteH * scale;

    // Recompute with scaled height
    // (important for correct placement after scaling)
  }

  const guyD = getDims(guyImg, spriteH);
  const girlD = getDims(girlImg, spriteH);

  // Benchmark edges (center “no-cross” zone)
  const benchmarkLeftEdge = cx - gap / 2;
  const benchmarkRightEdge = cx + gap / 2;

  // Desired resting X positions
  let guyFinalX = benchmarkLeftEdge - guyD.w;
  let girlFinalX = benchmarkRightEdge;

  // Clamp to viewport
  guyFinalX = clamp(guyFinalX, edge, VW - edge - guyD.w);
  girlFinalX = clamp(girlFinalX, edge, VW - edge - girlD.w);

  // As a safety net: enforce no overlap even after clamping
  // If they collide (very narrow screens), push them apart symmetrically.
  const minGirlX = guyFinalX + guyD.w + gap;
  if (girlFinalX < minGirlX) {
    const overflow = minGirlX - girlFinalX;

    // Try pushing girl right first
    girlFinalX = clamp(girlFinalX + overflow, edge, VW - edge - girlD.w);

    // If still colliding, push guy left
    const minGirlX2 = guyFinalX + guyD.w + gap;
    if (girlFinalX < minGirlX2) {
      const overflow2 = minGirlX2 - girlFinalX;
      guyFinalX = clamp(guyFinalX - overflow2, edge, VW - edge - guyD.w);
    }
  }

  // Y positioning (keep fully visible and above the rose)
  let yTopTarget = spriteCenterY - spriteH * 0.5;

  // Don’t let sprites drift off the top; and keep them above the rose center
  const maxYTop = cy - spriteH - 12;
  yTopTarget = clamp(yTopTarget, edge, Math.max(edge, maxYTop));

  return {
    cx,
    cy,
    spriteH,
    gap,
    guyD,
    girlD,
    guyFinalX,
    girlFinalX,
    yTopTarget,
  };
}

// ---------- Main loop ----------
let start = null;
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

  // Clear using viewport-safe dims
  ctx.clearRect(0, 0, VW, VH);

  // stars
  for (const s of stars) {
    s.y += s.sp;
    if (s.y > VH) s.y = 0;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.fill();
  }

  // Layout + glow center
  const L = computeSpriteLayout(now);
  const { cx, cy, spriteH, guyD, girlD, guyFinalX, girlFinalX, yTopTarget } = L;

  drawCenterGlow(cx, cy, now);

  // Entry animation: slide in toward final positions
  const entryP = easeOut(clamp((tOnce - pIntro) / (pIn - pIntro), 0, 1));

  const guyStartX = guyFinalX - Math.min(36, VW * 0.08);
  const girlStartX = girlFinalX + Math.min(36, VW * 0.08);

  const yTopStart = yTopTarget - 18;

  const guyX = lerp(guyStartX, guyFinalX, entryP);
  const girlX = lerp(girlStartX, girlFinalX, entryP);
  const yTop = lerp(yTopStart, yTopTarget, entryP);

  // Draw sprites facing each other
  drawSpriteOrPlaceholder(guyImg, guyX, yTop, guyD.w, guyD.h, "GUY", FLIP_GUY);
  drawSpriteOrPlaceholder(
    girlImg,
    girlX,
    yTop,
    girlD.w,
    girlD.h,
    "GIRL",
    FLIP_GIRL,
  );

  // GUY ONLY BEAM (always from guy, respects FLIP_GUY)
  if (tOnce > pPause && tOnce < pBeam) {
    const beamP = Math.sin(((tOnce - pPause) / (pBeam - pPause)) * Math.PI);
    const intensity = beamP;

    // start point: "inner hand" depending on whether the guy is flipped
    const handXFactor = 0.92; // near right edge when not flipped
    const beamStartX = FLIP_GUY
      ? guyX + guyD.w * (1 - handXFactor) // mirrored: near left edge
      : guyX + guyD.w * handXFactor;

    const beamStartY = yTop + spriteH * 0.62;

    drawBeam(beamStartX, beamStartY, cx, cy, intensity);
  }

  // Rose draw
  if (tOnce > pBeam) {
    roseShell.classList.add("on");
    const dp = clamp((tOnce - pBeam) / (pDraw - pBeam), 0, 1);
    setDrawProgress(dp);
  }

  // Bloom
  if (tOnce > pDraw) {
    for (const f of fillPaths) f.classList.add("on");
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  // Hearts after bloom completes
  const COROLLA_X = cx;
  const COROLLA_Y = cy - 8;

  if (!heartsBursted && tOnce >= pBloom) {
    heartsBursted = true;
    burstHearts(COROLLA_X, COROLLA_Y);
  }

  updateAndDrawHearts(1 / 60);

  // Keep final state after story ends
  if (t >= TOTAL_ONCE) {
    setDrawProgress(1);
    for (const f of fillPaths) f.classList.add("on");
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  requestAnimationFrame(render);
}

// If images load late on mobile, this helps them “snap” into correct aspect sizing immediately
[guyImg, girlImg].forEach((img) => {
  img.addEventListener("load", () => {
    // no-op; the render loop will pick up naturalWidth/Height next frame
  });
  img.addEventListener("error", () => {
    // If you see placeholders only on phone, likely a path/CORS/hosting issue.
    // Keep running so placeholders still show.
  });
});

requestAnimationFrame(render);

// random
