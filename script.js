// =====================================================
// PHONE-FIRST Valentine (SPRITES) - SIMPLE + ROBUST
// Per your request:
// - Both sprites sit ABOVE the flower, fully visible, facing inward.
// - Only the GUY shoots a subtle beam to the center light.
// - Girl is positioned safely on-screen (no cropping).
// - Rose formation + bloom + hearts stay as before.
// - Ambient loop forever.
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

// ---------- Utils ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

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

// ---------- Load sprites (cache-bust for phones) ----------
function loadImage(path) {
  const img = new Image();
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
  const count = Math.min(180, Math.floor(window.innerWidth * 0.18));
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.4,
      sp: Math.random() * 0.1 + 0.02,
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
  const a = 0.08 * intensity;
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

// ---------- Sprite helpers ----------
function getDims(img, targetH, fallbackAspect = 0.7) {
  const ready = img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
  const aspect = ready ? img.naturalWidth / img.naturalHeight : fallbackAspect;
  return { w: targetH * aspect, h: targetH, ready };
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

  // placeholder
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(label, x + 10, y + 18);
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

  // ---------- SPRITE LAYOUT: ABOVE FLOWER, BOTH FULLY VISIBLE ----------
  const spriteH = Math.min(160, window.innerHeight * 0.22);
  const guyD = getDims(guyImg, spriteH);
  const girlD = getDims(girlImg, spriteH);

  const edge = 12;
  const safeGap = Math.min(110, window.innerWidth * 0.2); // keep open space in middle

  // Final target positions (xLeft)
  const leftTarget = edge;
  const rightTarget = window.innerWidth - edge - girlD.w;

  // Ensure they DON'T invade the center
  const leftMax = cx - safeGap - guyD.w;
  const rightMin = cx + safeGap;

  const finalLeft = Math.min(leftTarget, leftMax);
  const finalRight = Math.max(rightTarget, rightMin);

  // Enter from offscreen
  const leftStart = -guyD.w - 30;
  const rightStart = window.innerWidth + 30;

  const entryP = easeOut(clamp((tOnce - pIntro) / (pIn - pIntro), 0, 1));
  let leftX = lerp(leftStart, finalLeft, entryP);
  let rightX = lerp(rightStart, finalRight, entryP);

  // Hard clamp into view (prevents the "only a sliver" problem)
  leftX = clamp(leftX, 0, window.innerWidth - edge - guyD.w);
  rightX = clamp(rightX, 0, window.innerWidth - edge - girlD.w);

  // Place them above flower
  const float = Math.sin(now * 0.002) * 3.0;
  const spriteCenterY = window.innerHeight * 0.22 + float;
  const yTop = spriteCenterY - spriteH * 0.5;

  // Face inward: guy faces right (no flip), girl faces left (flipX = true)
  drawSpriteOrPlaceholder(guyImg, leftX, yTop, guyD.w, guyD.h, "GUY", false);
  drawSpriteOrPlaceholder(
    girlImg,
    rightX,
    yTop,
    girlD.w,
    girlD.h,
    "GIRL",
    true,
  );

  // ---------- ONLY GUY SHOOTS BEAM ----------
  if (tOnce > pPause && tOnce < pBeam) {
    const beamP = Math.sin(((tOnce - pPause) / (pBeam - pPause)) * Math.PI);
    const intensity = beamP;

    const beamStartX = leftX + guyD.w; // from guy's right side
    const beamStartY = yTop + spriteH * 0.6;

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

  // Hearts after bloom completes (from corolla at center light)
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

requestAnimationFrame(render);
