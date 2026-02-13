// =====================================================
// PHONE-FIRST Valentine (SPRITES) - MOBILE SAFE + CONTINUOUS SKY HEARTS AFTER FINISH
// - Hearts: continuous slow stream of tiny cute hearts drifting down from the top
//           starts AFTER the flower is finished (after roseDraw completes),
//           fades out and vanishes before traveling too far.
// - Names above sprites:
//    Guy:  "Me (cool guy)"
//    Girl: 'You ("은서")'
// - Uses visualViewport for iOS Safari sizing
// - Never overlaps sprites; auto-scales down on narrow phones
// - Beam ALWAYS from GUY sprite (respects FLIP_GUY)
// =====================================================

const T = {
  skyIntro: 1100,
  spriteIn: 1100,
  pauseBeforeBeam: 260,
  beamPhase: 1000,
  roseDraw: 3000,
  roseBloom: 1900,

  // When the flower is "finished" for the heart stream start:
  // We treat end of roseDraw as "created". (Bloom can happen after.)
  heartStreamStartDelay: 250,
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

// ---------- Name labels ----------
const GUY_LABEL = "Me (cool guy)";
const GIRL_LABEL = 'You ("은서")';

// ---------- Utils ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// ---------- Mobile-safe viewport sizing ----------
let DPR = 1;
let VW = 0;
let VH = 0;

function getViewport() {
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
  // If your sprites fail ONLY on phone, try commenting this out (CORS headers).
  img.crossOrigin = "anonymous";
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

// ---------- Rounded-rect fallback ----------
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

// ---------- Name label rendering ----------
function drawNameLabel(text, centerX, topY) {
  const padX = 10;
  const padY = 6;

  const fontPx = clamp(Math.round(VW * 0.04), 12, 16);
  ctx.font = `600 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;

  const textW = ctx.measureText(text).width;

  const boxW = textW + padX * 2;
  const boxH = fontPx + padY * 2;

  const x = clamp(centerX - boxW / 2, 8, VW - 8 - boxW);
  const y = clamp(topY - boxH - 6, 8, VH - 8 - boxH);

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;

  roundRectPath(x, y, boxW, boxH, 999);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textBaseline = "top";
  ctx.fillText(text, x + padX, y + padY);
  ctx.restore();
}

// ---------- Tiny sky hearts (continuous stream) ----------
const skyHearts = [];
let skyHeartAccumulator = 0;

// Tiny heart shape (reused)
function drawTinyHeart(x, y, sizePx, alpha, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const s = sizePx / 100;
  ctx.scale(s, s);

  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.bezierCurveTo(0, 5, -30, 0, -30, -20);
  ctx.bezierCurveTo(-30, -45, 0, -30, 0, -15);
  ctx.bezierCurveTo(0, -30, 30, -45, 30, -20);
  ctx.bezierCurveTo(30, 0, 0, 5, 0, 30);
  ctx.closePath();

  ctx.fillStyle = `rgba(255,120,170,${alpha})`;
  ctx.fill();
  ctx.restore();
}

function spawnSkyHeart() {
  // Spawn from slightly above the top edge, spread across the width
  const x = Math.random() * VW;

  // Start high so they "appear from the sky"
  const y = -10 - Math.random() * 30;

  // Slow drift down, tiny size, gentle sway
  const baseFall = 0.18 + Math.random() * 0.22; // px per frame-ish (scaled by dt*60 below)
  const vx = (Math.random() - 0.5) * 0.12;
  const swayPhase = Math.random() * Math.PI * 2;

  // Keep them from traveling too far: short lifespan + extra fade
  const life = 1.7 + Math.random() * 0.9; // seconds

  skyHearts.push({
    x,
    y,
    vx,
    vy: baseFall,
    age: 0,
    life,
    size: 6 + Math.random() * 6, // tiny hearts
    swayPhase,
    rot: (Math.random() - 0.5) * 0.6,
    rotSp: (Math.random() - 0.5) * 0.25,
    // Fade out early and vanish before reaching far down
    maxTravel: Math.min(160, VH * 0.22) + Math.random() * 30,
  });

  // Cap to avoid buildup on slow devices
  if (skyHearts.length > 140) skyHearts.splice(0, skyHearts.length - 140);
}

function updateAndDrawSkyHearts(dt, enabled) {
  if (enabled) {
    // Spawn rate: small, steady stream
    // dt in seconds; rate hearts/sec
    const rate = 10; // hearts per second (tiny)
    skyHeartAccumulator += dt * rate;
    while (skyHeartAccumulator >= 1) {
      skyHeartAccumulator -= 1;
      spawnSkyHeart();
    }
  }

  // Update/draw
  for (let i = skyHearts.length - 1; i >= 0; i--) {
    const h = skyHearts[i];
    h.age += dt;
    const p = clamp(h.age / h.life, 0, 1);

    // Sway + drift
    const sway = Math.sin(h.age * 3.2 + h.swayPhase) * 0.9;

    h.x += (h.vx + sway * 0.02) * (dt * 60);
    h.y += h.vy * (dt * 60);
    h.rot += h.rotSp * dt;

    // Fade: gentle, and also fade out as they travel downward
    const traveled = h.y + 40; // approx since start is negative
    const travelP = clamp(traveled / h.maxTravel, 0, 1);

    // Not too bright; fade quicker near end of travel
    const alpha = (1 - p) * 0.55 * (1 - travelP * 0.85);

    drawTinyHeart(h.x, h.y, h.size, alpha, h.rot);

    // Remove when done or when they went "not too far"
    if (p >= 1 || travelP >= 1 || h.y > VH + 40) {
      skyHearts.splice(i, 1);
    }
  }
}

// ---------- Layout (phone-first, never overlap, auto-fit) ----------
function computeSpriteLayout(now) {
  const cx = VW / 2;
  const cy = VH * 0.44;

  let spriteH = Math.min(160, VH * 0.235);
  spriteH = Math.max(95, spriteH);

  let gap = Math.min(28, VW * 0.075);
  gap = Math.max(16, gap);

  const edge = 10;

  const float = Math.sin(now * 0.002) * 3.0;
  const spriteCenterY = cy - Math.max(72, VH * 0.11) + float;

  const gD0 = getDims(guyImg, spriteH);
  const grD0 = getDims(girlImg, spriteH);

  const maxUsableW = VW - edge * 2;
  const requiredW = gD0.w + gap + grD0.w;

  if (requiredW > maxUsableW) {
    const scale = clamp(maxUsableW / requiredW, 0.5, 1);
    spriteH = spriteH * scale;
  }

  const guyD = getDims(guyImg, spriteH);
  const girlD = getDims(girlImg, spriteH);

  const benchmarkLeftEdge = cx - gap / 2;
  const benchmarkRightEdge = cx + gap / 2;

  let guyFinalX = benchmarkLeftEdge - guyD.w;
  let girlFinalX = benchmarkRightEdge;

  guyFinalX = clamp(guyFinalX, edge, VW - edge - guyD.w);
  girlFinalX = clamp(girlFinalX, edge, VW - edge - girlD.w);

  const minGirlX = guyFinalX + guyD.w + gap;
  if (girlFinalX < minGirlX) {
    const overflow = minGirlX - girlFinalX;
    girlFinalX = clamp(girlFinalX + overflow, edge, VW - edge - girlD.w);

    const minGirlX2 = guyFinalX + guyD.w + gap;
    if (girlFinalX < minGirlX2) {
      const overflow2 = minGirlX2 - girlFinalX;
      guyFinalX = clamp(guyFinalX - overflow2, edge, VW - edge - guyD.w);
    }
  }

  let yTopTarget = spriteCenterY - spriteH * 0.5;
  const maxYTop = cy - spriteH - 12;
  yTopTarget = clamp(yTopTarget, edge + 18, Math.max(edge + 18, maxYTop));

  return {
    cx,
    cy,
    spriteH,
    guyD,
    girlD,
    guyFinalX,
    girlFinalX,
    yTopTarget,
  };
}

// ---------- Main loop ----------
let start = null;
let lastNow = null;

function render(now) {
  if (!start) start = now;
  if (lastNow == null) lastNow = now;

  const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000)); // seconds
  lastNow = now;

  const t = now - start;
  const tOnce = Math.min(t, TOTAL_ONCE);

  let cursor = 0;
  const pIntro = (cursor += T.skyIntro);
  const pIn = (cursor += T.spriteIn);
  const pPause = (cursor += T.pauseBeforeBeam);
  const pBeam = (cursor += T.beamPhase);
  const pDraw = (cursor += T.roseDraw);
  const pBloom = (cursor += T.roseBloom);

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

  const L = computeSpriteLayout(now);
  const { cx, cy, spriteH, guyD, girlD, guyFinalX, girlFinalX, yTopTarget } = L;

  drawCenterGlow(cx, cy, now);

  // Entry animation
  const entryP = easeOut(clamp((tOnce - pIntro) / (pIn - pIntro), 0, 1));

  const slide = Math.min(36, VW * 0.08);
  const guyStartX = guyFinalX - slide;
  const girlStartX = girlFinalX + slide;

  const yTopStart = yTopTarget - 18;

  const guyX = lerp(guyStartX, guyFinalX, entryP);
  const girlX = lerp(girlStartX, girlFinalX, entryP);
  const yTop = lerp(yTopStart, yTopTarget, entryP);

  // Draw sprites
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

  // Name labels
  drawNameLabel(GUY_LABEL, guyX + guyD.w / 2, yTop);
  drawNameLabel(GIRL_LABEL, girlX + girlD.w / 2, yTop);

  // GUY ONLY BEAM
  if (tOnce > pPause && tOnce < pBeam) {
    const beamP = Math.sin(((tOnce - pPause) / (pBeam - pPause)) * Math.PI);
    const intensity = beamP;

    const handXFactor = 0.92;
    const beamStartX = FLIP_GUY
      ? guyX + guyD.w * (1 - handXFactor)
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

  // Bloom (as before)
  if (tOnce > pDraw) {
    for (const f of fillPaths) f.classList.add("on");
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  // -----------------------------------------------------
  // NEW: Continuous sky heart stream after flower is created
  // "Created" moment = end of roseDraw (pDraw), plus small delay.
  // -----------------------------------------------------
  const flowerCreatedAt = pDraw + T.heartStreamStartDelay;
  const heartStreamEnabled = tOnce >= flowerCreatedAt;

  // Draw sky hearts AFTER everything else so they appear in front a bit
  updateAndDrawSkyHearts(dt, heartStreamEnabled);

  // Keep final state
  if (t >= TOTAL_ONCE) {
    setDrawProgress(1);
    for (const f of fillPaths) f.classList.add("on");
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  requestAnimationFrame(render);
}

// Late-loading image safety
[guyImg, girlImg].forEach((img) => {
  img.addEventListener("load", () => {});
  img.addEventListener("error", () => {});
});

requestAnimationFrame(render);

// random
