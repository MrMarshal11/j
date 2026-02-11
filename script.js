// -----------------------------
// Cute Valentine animation
// Runs locally (no dependencies)
// -----------------------------

// ====== Customize this ======
const GIRLFRIEND_NAME = "Jen"; // change to her name/nickname
const YOUR_SIGNATURE = "Marshal"; // change to your name
const NOTE_LINES = [
  `발렌타인데이 축하해 💕 ${GIRLFRIEND_NAME}`,
  `멀리 있어도, 나는 항상 너를 생각해.`,
  `우리, 천천히 오래 가보자 😊`,
  ``,
  `バレンタインおめでとう💝 ${GIRLFRIENDFRIEND_NAME_FIX()}`,
  `離れていても、ずっと想ってるよ。`,
  `これからもよろしくね😊`,
  ``,
  `Happy Valentine’s Day 💖 ${GIRLFRIEND_NAME}`,
  `Even far away, you’re on my mind.`,
  `Let’s take it slow and make this something real.`,
];

// Small helper so the Japanese line uses the same name even if you tweak later.
function GIRLFRIENDFRIEND_NAME_FIX() {
  return GIRLFRIEND_NAME;
}

// ====== Typewriter ======
const typeEl = document.getElementById("typewriter");
const signatureEl = document.getElementById("signature");
const surpriseBtn = document.getElementById("surpriseBtn");
const replayBtn = document.getElementById("replayBtn");

signatureEl.textContent = `— ${YOUR_SIGNATURE}`;

let typingTimer = null;
let typingIndex = 0;
let fullText = "";

function buildText() {
  // Use \n for line breaks
  return NOTE_LINES.join("\n");
}

function stopTyping() {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
}

function startTyping() {
  stopTyping();
  typingIndex = 0;
  fullText = buildText();
  typeEl.textContent = "";

  // Slight delay before typing starts
  setTimeout(() => {
    typingTimer = setInterval(() => {
      typeEl.textContent = fullText.slice(0, typingIndex);
      typingIndex++;

      // Little "human" pauses on punctuation / emojis
      const lastChar = fullText[typingIndex - 1] || "";
      if ([".", "!", "?", "💕", "💖", "💝", "😊"].includes(lastChar)) {
        // micro-pause
        clearInterval(typingTimer);
        typingTimer = setInterval(stepType, 55);
        setTimeout(() => {
          clearInterval(typingTimer);
          typingTimer = setInterval(stepType, 28);
        }, 140);
      }

      if (typingIndex > fullText.length) stopTyping();
    }, 28);
  }, 350);
}

function stepType() {
  typeEl.textContent = fullText.slice(0, typingIndex);
  typingIndex++;
  if (typingIndex > fullText.length) stopTyping();
}

replayBtn.addEventListener("click", () => startTyping());

// ====== Background hearts (Canvas) ======
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d", { alpha: true });

let W = 0,
  H = 0;
function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  W = canvas.width = Math.floor(window.innerWidth * dpr);
  H = canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const rand = (a, b) => a + Math.random() * (b - a);

function drawHeart(x, y, size, rot, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;

  // Soft gradient fill
  const g = ctx.createLinearGradient(-size, -size, size, size);
  g.addColorStop(0, "rgba(255,94,168,0.95)");
  g.addColorStop(1, "rgba(110,231,255,0.85)");
  ctx.fillStyle = g;

  ctx.beginPath();
  // Parametric-ish heart using bezier curves
  const s = size;
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(s * 0.9, -s * 0.35, s * 0.55, -s * 1.05, 0, -s * 0.55);
  ctx.bezierCurveTo(-s * 0.55, -s * 1.05, -s * 0.9, -s * 0.35, 0, s * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

class Heart {
  constructor(x, y, size, speed, drift, rotSpeed, alpha) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.drift = drift;
    this.rot = rand(-0.6, 0.6);
    this.rotSpeed = rotSpeed;
    this.alpha = alpha;
  }
  step(dt) {
    this.y -= this.speed * dt;
    this.x += this.drift * dt;
    this.rot += this.rotSpeed * dt;

    // Fade slightly as it rises
    this.alpha *= 1 - 0.0006 * dt;

    // Wrap / respawn
    if (this.y < -40 || this.alpha < 0.05) {
      this.y = window.innerHeight + rand(10, 220);
      this.x = rand(0, window.innerWidth);
      this.alpha = rand(0.35, 0.85);
      this.size = rand(7, 18);
      this.speed = rand(18, 55);
      this.drift = rand(-12, 12);
      this.rotSpeed = rand(-0.0025, 0.0025);
    }
  }
  draw() {
    drawHeart(this.x, this.y, this.size, this.rot, this.alpha);
  }
}

const hearts = [];
function seedHearts() {
  hearts.length = 0;
  const count = Math.min(90, Math.floor(window.innerWidth / 9));
  for (let i = 0; i < count; i++) {
    hearts.push(
      new Heart(
        rand(0, window.innerWidth),
        rand(0, window.innerHeight),
        rand(7, 18),
        rand(18, 55),
        rand(-12, 12),
        rand(-0.0025, 0.0025),
        rand(0.35, 0.85),
      ),
    );
  }
}
seedHearts();
window.addEventListener("resize", seedHearts);

// ====== Surprise burst ======
let burst = [];
function makeBurst() {
  burst = [];
  const cx = window.innerWidth * 0.5;
  const cy = window.innerHeight * 0.42;

  const n = 36;
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + rand(-0.06, 0.06);
    const spd = rand(120, 260);
    burst.push({
      x: cx,
      y: cy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: rand(10, 20),
      rot: rand(-1, 1),
      rotSpeed: rand(-0.01, 0.01),
      life: rand(600, 900),
      alpha: 1,
    });
  }

  // Also flash the button text briefly
  surpriseBtn.textContent = "💖 Surprise delivered 💖";
  setTimeout(() => {
    surpriseBtn.textContent = "Tap for a surprise 💘";
  }, 1400);
}

surpriseBtn.addEventListener("click", () => makeBurst());

// ====== Animation loop ======
let last = performance.now();
function loop(now) {
  const dt = Math.min(40, now - last);
  last = now;

  // Clear with slight trail
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Draw background hearts
  for (const h of hearts) {
    h.step(dt);
    h.draw();
  }

  // Draw burst hearts
  if (burst.length) {
    for (const p of burst) {
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.vy += 260 * (dt / 1000); // gravity
      p.rot += p.rotSpeed * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 900);

      drawHeart(p.x, p.y, p.size, p.rot, p.alpha);
    }
    burst = burst.filter((p) => p.life > 0);
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Start typing once loaded
startTyping();
