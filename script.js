/* eslint-disable no-console */
(() => {
  // =========================
  // CONFIG
  // =========================

  // 1) SONG FILE (put your song in /assets and name it here)
  // Example: assets/song.mp3
  const SONG_SRC = "assets/song.mp3";

  // 2) Heart PNGs (you said you have two pngs in assets)
  // If your filenames differ, change these to match.
  const HEART_PNGS = ["assets/heart1.png", "assets/heart2.png"];

  // 3) Bigger hearts: size range (px)
  const HEART_SIZE_MIN = 28; // bigger than "tiny"
  const HEART_SIZE_MAX = 84; // bigger than before

  // 4) Hearts density
  const AMBIENT_HEARTS_PER_SEC = 2.2; // background drifting hearts
  const CLICK_HEART_BURST_COUNT = [10, 18]; // min/max hearts on click burst

  // 5) Every 3 clicks: play from beginning
  const PLAY_FROM_START_EVERY_N_CLICKS = 3;

  // =========================
  // DOM
  // =========================
  const canvas = document.getElementById("bg");
  const ctx = canvas.getContext("2d", { alpha: true });

  const roseShell = document.getElementById("roseShell");
  const bloomGlow = document.getElementById("bloomGlow");
  const finalEl = document.getElementById("final");
  const microText = document.getElementById("microText");

  const musicBtn = document.getElementById("musicBtn");
  const song = document.getElementById("song");

  song.src = SONG_SRC;
  song.preload = "metadata";

  // =========================
  // UTIL
  // =========================
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randi = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function dpr() {
    return Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
  }

  function resize() {
    const ratio = dpr();
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  window.addEventListener("resize", resize);

  // =========================
  // ROSE TIMELINE
  // =========================
  function startRoseSequence() {
    // Fade in HUD microcopy
    const microLines = [
      "~ ~ ~",
      "for you",
      "💗",
      "발렌타인데이",
      "보고 싶어",
      "~ ~ ~",
    ];

    let idx = 0;
    microText.classList.add("on");
    microText.textContent = microLines[idx];

    const microTimer = setInterval(() => {
      idx = (idx + 1) % microLines.length;
      microText.textContent = microLines[idx];
    }, 1400);

    // Show rose
    setTimeout(() => {
      roseShell.classList.add("on");
    }, 650);

    // Fade fills
    setTimeout(() => {
      document
        .querySelectorAll(".fill")
        .forEach((el) => el.classList.add("on"));
      bloomGlow.classList.add("on");
    }, 1600);

    // Final text
    setTimeout(() => {
      finalEl.classList.add("on");
    }, 2700);

    // Keep micro text running; if you want it to stop later:
    // setTimeout(() => clearInterval(microTimer), 15000);
    void microTimer;
  }

  // =========================
  // HEART IMAGES (with fallback)
  // =========================
  const heartImgs = [];
  let imagesReady = false;

  function loadImages() {
    const loaders = HEART_PNGS.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ ok: true, img });
        img.onerror = () => resolve({ ok: false, img: null });
        img.src = src;
      });
    });

    return Promise.all(loaders).then((results) => {
      results.forEach((r) => {
        if (r.ok && r.img) heartImgs.push(r.img);
      });
      imagesReady = heartImgs.length > 0;
    });
  }

  function drawFallbackHeart(x, y, size, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;

    // Vector heart
    const s = size / 40;
    ctx.scale(s, s);

    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.bezierCurveTo(0, -28, -30, -28, -30, -5);
    ctx.bezierCurveTo(-30, 14, -10, 25, 0, 35);
    ctx.bezierCurveTo(10, 25, 30, 14, 30, -5);
    ctx.bezierCurveTo(30, -28, 0, -28, 0, -10);
    ctx.closePath();

    ctx.fillStyle = "rgba(255,45,85,0.9)";
    ctx.shadowColor = "rgba(255,45,85,0.28)";
    ctx.shadowBlur = 18;
    ctx.fill();

    ctx.restore();
  }

  // =========================
  // PARTICLES
  // =========================
  const hearts = [];
  const sparkles = [];

  function spawnSparkle() {
    sparkles.push({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      r: rand(0.8, 2.2),
      a: rand(0.12, 0.55),
      life: rand(900, 2400),
      t: 0,
    });
  }

  function spawnHeart(x, y, burst = false) {
    const size =
      rand(HEART_SIZE_MIN, HEART_SIZE_MAX) * (burst ? rand(0.9, 1.25) : 1);
    const driftX = burst ? rand(-220, 220) : rand(-35, 35);
    const driftY = burst ? rand(-520, -260) : rand(-170, -90);

    hearts.push({
      x,
      y,
      size,
      rot: rand(-0.6, 0.6),
      rotSpd: rand(-0.004, 0.004),
      vx: driftX / 1000,
      vy: driftY / 1000,
      wob: rand(0.6, 2.0),
      wobSpd: rand(0.0015, 0.0045),
      a: 0.0,
      life: burst ? rand(1800, 3300) : rand(4200, 8200),
      t: 0,
      img:
        imagesReady && heartImgs.length
          ? heartImgs[Math.floor(Math.random() * heartImgs.length)]
          : null,
    });
  }

  function heartBurstAt(x, y) {
    const n = randi(CLICK_HEART_BURST_COUNT[0], CLICK_HEART_BURST_COUNT[1]);
    for (let i = 0; i < n; i++) {
      spawnHeart(x + rand(-18, 18), y + rand(-18, 18), true);
    }
    // add a few sparkles too
    for (let i = 0; i < 10; i++) spawnSparkle();
  }

  // =========================
  // AUDIO RULES (random start; every 3 clicks = start at 0)
  // =========================
  let clickCount = 0;
  let pendingSeek = null;

  function safeDuration() {
    const d = song.duration;
    return Number.isFinite(d) && d > 0 ? d : null;
  }

  async function ensureMetadata() {
    const d = safeDuration();
    if (d) return d;

    // Wait for loadedmetadata once
    await new Promise((resolve) => {
      const onMeta = () => {
        song.removeEventListener("loadedmetadata", onMeta);
        resolve();
      };
      song.addEventListener("loadedmetadata", onMeta, { once: true });
      // in case browser needs a nudge
      song.load();
    });

    return safeDuration();
  }

  async function playWithRule() {
    clickCount += 1;

    // If currently playing, restart logic anyway (user explicitly requested behavior)
    try {
      song.pause();
    } catch (_) {}

    const d = await ensureMetadata();
    // If we still can't get duration (some edge cases), just play from 0.
    const duration = d || 0;

    let startTime = 0;

    const isNth = clickCount % PLAY_FROM_START_EVERY_N_CLICKS === 0;

    if (!isNth && duration > 2.5) {
      // Random start point, but not too close to the end
      const tailBuffer = Math.min(2.0, duration * 0.08); // ensure some audio remains
      const maxStart = Math.max(0, duration - tailBuffer);
      startTime = rand(0, maxStart);
      startTime = clamp(startTime, 0, Math.max(0, duration - 0.25));
    } else {
      startTime = 0;
    }

    // Some browsers ignore immediate seek before play; do both
    pendingSeek = startTime;

    try {
      song.currentTime = startTime;
    } catch (_) {
      // ignore
    }

    try {
      await song.play();
    } catch (err) {
      // Autoplay policy shouldn't block because it's user click,
      // but if it does, keep it graceful.
      console.warn("Audio play blocked:", err);
      return;
    }

    // If the browser snapped currentTime elsewhere, force seek once after play
    if (pendingSeek != null) {
      const seekTo = pendingSeek;
      pendingSeek = null;
      try {
        song.currentTime = seekTo;
      } catch (_) {}
    }
  }

  // =========================
  // DRAW
  // =========================
  let last = performance.now();
  let heartSpawnAcc = 0;

  function tick(now) {
    const dt = now - last;
    last = now;

    // Clear
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Ambient spawns
    heartSpawnAcc += dt * (AMBIENT_HEARTS_PER_SEC / 1000);
    while (heartSpawnAcc >= 1) {
      heartSpawnAcc -= 1;
      spawnHeart(
        rand(0, window.innerWidth),
        window.innerHeight + rand(20, 80),
        false,
      );
    }

    // Occasional sparkles
    if (sparkles.length < 60 && Math.random() < 0.22) spawnSparkle();

    // Sparkles update/draw
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const p = sparkles[i];
      p.t += dt;
      const u = p.t / p.life;
      if (u >= 1) {
        sparkles.splice(i, 1);
        continue;
      }
      const a = p.a * (1 - u);
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + Math.sin(u * Math.PI) * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.shadowColor = "rgba(255,255,255,0.5)";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Hearts update/draw
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.t += dt;
      const u = h.t / h.life;
      if (u >= 1) {
        hearts.splice(i, 1);
        continue;
      }

      // fade in then out
      const fadeIn = Math.min(1, u / 0.08);
      const fadeOut = 1 - Math.max(0, (u - 0.72) / 0.28);
      h.a = clamp(fadeIn * fadeOut, 0, 1);

      h.rot += h.rotSpd * dt;
      const wobble = Math.sin(now * h.wobSpd) * h.wob;

      h.x += h.vx * dt;
      h.y += h.vy * dt;

      const x = h.x + wobble;
      const y = h.y;

      if (h.img) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(h.rot);
        ctx.globalAlpha = h.a;

        const s = h.size;
        ctx.shadowColor = "rgba(255,45,85,0.22)";
        ctx.shadowBlur = 18;

        ctx.drawImage(h.img, -s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        drawFallbackHeart(x, y, h.size, h.rot, h.a);
      }
    }

    ctx.globalAlpha = 1;

    requestAnimationFrame(tick);
  }

  // =========================
  // EVENTS
  // =========================
  musicBtn.addEventListener("click", async (e) => {
    // Heart burst around the button area
    const r = musicBtn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;

    heartBurstAt(x, y);

    await playWithRule();
  });

  // Optional: click anywhere makes a burst (nice touch)
  window.addEventListener("pointerdown", (e) => {
    // Don’t double-trigger burst if clicking the button (already handled)
    const path = e.composedPath?.() || [];
    if (path.includes(musicBtn)) return;

    heartBurstAt(e.clientX, e.clientY);
  });

  // =========================
  // START
  // =========================
  async function start() {
    resize();
    await loadImages();
    startRoseSequence();
    requestAnimationFrame(tick);
  }

  start().catch((err) => console.error(err));
})();
