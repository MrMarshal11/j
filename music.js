// music.js - standalone audio controller (does not touch your existing animations)

const SONG_SRC = "./assets/song.mp3";

(function initMusic() {
  const musicBtn = document.getElementById("musicBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const audio = document.getElementById("song");

  if (!musicBtn || !cancelBtn || !audio) return;

  audio.src = SONG_SRC;

  let clickCount = 0;
  let autoStarted = false;
  let armedAutoStart = false;

  function setCancelEnabled(enabled) {
    cancelBtn.classList.toggle("isDisabled", !enabled);
    cancelBtn.disabled = !enabled;
  }

  setCancelEnabled(false);

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function stopMusic() {
    try {
      audio.pause();
    } catch (_) {}
    try {
      audio.currentTime = 0;
    } catch (_) {}
    musicBtn.classList.remove("isPlaying");
    setCancelEnabled(false);
  }

  function tryPlay() {
    return audio
      .play()
      .then(() => {
        musicBtn.classList.add("isPlaying");
        setCancelEnabled(true);
        return true;
      })
      .catch(() => {
        musicBtn.classList.remove("isPlaying");
        // keep cancel disabled if nothing is playing
        setCancelEnabled(false);
        return false;
      });
  }

  async function playFrom(timeSec) {
    try {
      audio.pause();
    } catch (_) {}

    const seekAndMaybePlay = async () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      const safeDur = Math.max(0, dur - 0.05);
      const t = clamp(timeSec, 0, safeDur);

      try {
        audio.currentTime = t;
      } catch (_) {}

      const ok = await tryPlay();
      return ok;
    };

    if (!Number.isFinite(audio.duration) || audio.duration === 0) {
      audio.load();
      return new Promise((resolve) => {
        audio.addEventListener(
          "loadedmetadata",
          async () => {
            const ok = await seekAndMaybePlay();
            resolve(ok);
          },
          { once: true },
        );
      });
    } else {
      return await seekAndMaybePlay();
    }
  }

  // Button behavior stays the same
  musicBtn.addEventListener("click", () => {
    clickCount += 1;

    if (clickCount % 3 === 0) {
      playFrom(0);
      return;
    }

    const durKnown = Number.isFinite(audio.duration) && audio.duration > 0;
    const dur = durKnown ? audio.duration : 120;
    const minTailSeconds = 6;
    const maxStart = Math.max(0, dur - minTailSeconds);
    const start = maxStart > 0 ? rand(0, maxStart) : 0;

    playFrom(start);
  });

  cancelBtn.addEventListener("click", () => {
    if (cancelBtn.disabled) return;
    stopMusic();
  });

  audio.addEventListener("ended", () => {
    musicBtn.classList.remove("isPlaying");
    setCancelEnabled(false);
  });

  audio.addEventListener("pause", () => {
    if (audio.ended || audio.currentTime === 0) {
      musicBtn.classList.remove("isPlaying");
      setCancelEnabled(false);
    }
  });

  // NEW: auto-start when rose finishes (first time only)
  window.addEventListener("rose:finished", async () => {
    if (autoStarted) return;
    autoStarted = true;

    const ok = await playFrom(0);
    if (!ok) {
      // Autoplay blocked -> arm it for the next user gesture
      armedAutoStart = true;
    }
  });

  // NEW: if autoplay was blocked, start as soon as user interacts anywhere
  const unlockHandler = async () => {
    if (!armedAutoStart) return;
    armedAutoStart = false;
    await playFrom(0);
  };

  // Capture multiple gesture types
  window.addEventListener("pointerdown", unlockHandler, { passive: true });
  window.addEventListener("touchstart", unlockHandler, { passive: true });
  window.addEventListener("keydown", unlockHandler);
})();
