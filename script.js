// =====================================================
// Clean cinematic valentine (SPRITE VERSION)
// - Two custom sprites
// - Subtle beam
// - Rose perfectly centered
// - Hearts burst from corolla
// - Gentle ambient pulse forever
// =====================================================

const T = {
  skyIntro: 1800,
  spriteIn: 1600,
  pauseBeforeBeam: 400,
  beamPhase: 1200,
  roseDraw: 3500,
  roseBloom: 2200,
};

const TOTAL_ONCE =
  T.skyIntro +
  T.spriteIn +
  T.pauseBeforeBeam +
  T.beamPhase +
  T.roseDraw +
  T.roseBloom;

const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

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
  canvas.width = window.innerWidth * DPR;
  canvas.height = window.innerHeight * DPR;
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
const guyImg = new Image();
guyImg.src = "assets/guy.png";

const girlImg = new Image();
girlImg.src = "assets/girl.png";

// --- Stars ---
const stars = [];
for (let i = 0; i < 180; i++) {
  stars.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.5 + 0.4,
    sp: Math.random() * 0.12 + 0.02,
  });
}

// --- Rose stroke setup ---
const lengths = strokePaths.map((p) => p.getTotalLength());
const totalLen = lengths.reduce((a, b) => a + b, 0);

function resetRose() {
  strokePaths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });
}
function setDrawProgress(p) {
  let rem = totalLen * p;
  strokePaths.forEach((path, i) => {
    const len = lengths[i];
    const shown = Math.min(rem / len, 1);
    path.style.strokeDashoffset = len * (1 - shown);
    rem -= len;
  });
}
resetRose();

// --- Hearts ---
const hearts = [];
function burstHearts(x, y) {
  for (let i = 0; i < 16; i++) {
    hearts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -Math.random() * 1.8 - 0.5,
      life: 1,
      age: 0,
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

// --- Subtle beam ---
function drawBeam(x1, y1, x2, y2, intensity) {
  ctx.strokeStyle = `rgba(255,255,255,${0.12 * intensity})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

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
  stars.forEach((s) => {
    s.y += s.sp;
    if (s.y > window.innerHeight) s.y = 0;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
  });

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.44;

  // center glow pulse
  const pulse = 0.85 + Math.sin(now * 0.0015) * 0.15;
  ctx.beginPath();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260);
  g.addColorStop(0, `rgba(255,45,85,${0.4 * pulse})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.arc(cx, cy, 260, 0, Math.PI * 2);
  ctx.fill();

  // Sprite entry near edges
  const spriteWidth = 200;
  const margin = 40;
  const stopLeft = margin;
  const stopRight = window.innerWidth - spriteWidth - margin;

  const entryP = easeOut(clamp((tOnce - pIntro) / (pIn - pIntro), 0, 1));
  let lx = -spriteWidth + (stopLeft + spriteWidth) * entryP;
  let rx = window.innerWidth + -(window.innerWidth - stopRight) * entryP;

  // Back away when rose forming
  if (tOnce > pBeam) {
    const backP = easeInOut(clamp((tOnce - pBeam) / (pDraw - pBeam), 0, 1));
    lx = stopLeft - 120 * backP;
    rx = stopRight + 120 * backP;
  }

  // Draw sprites
  const float = Math.sin(now * 0.002) * 6;
  if (guyImg.complete) {
    ctx.drawImage(guyImg, lx, cy + float - 150, spriteWidth, 300);
  }
  if (girlImg.complete) {
    ctx.drawImage(girlImg, rx, cy + float - 150, spriteWidth, 300);
  }

  // Beam
  if (tOnce > pPause && tOnce < pBeam) {
    const beamP = Math.sin(((tOnce - pPause) / (pBeam - pPause)) * Math.PI);
    drawBeam(lx + spriteWidth, cy, cx, cy, beamP);
    drawBeam(rx, cy, cx, cy, beamP);
  }

  // Rose
  if (tOnce > pBeam) {
    roseShell.classList.add("on");
    const dp = clamp((tOnce - pBeam) / (pDraw - pBeam), 0, 1);
    setDrawProgress(dp);
  }

  if (tOnce > pDraw) {
    fillPaths.forEach((f) => f.classList.add("on"));
    bloomGlow.classList.add("on");
    finalEl.classList.add("on");
  }

  // Hearts
  if (tOnce > pBloom && hearts.length === 0) {
    burstHearts(cx, cy - 10);
  }

  hearts.forEach((h, i) => {
    h.age += 0.016;
    h.x += h.vx;
    h.y += h.vy;
    h.vy += 0.02;
    drawHeart(h.x, h.y, 0.8, 1 - h.age);
    if (h.age > h.life) hearts.splice(i, 1);
  });

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
