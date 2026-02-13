// music.js - standalone audio controller (does not touch your existing animations)

/**
 * Put your song file here.
 * Examples:
 *  - "./assets/song.mp3"
 *  - "./assets/music.mp3"
 *  - "./song.mp3"
 */
const SONG_SRC = "./assets/song.mp3";

(function initMusic() {
  const musicBtn = document.getElementById("musicBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const audio = document.getElementById("song");

  if (!musicBtn || !cancelBtn || !audio) return;

  audio.src = SONG_SRC;

  let clickCount = 0;

  function setCancelEnabled(enabled) {
    cancelBtn.classList.toggle("isDisabled", !enabled);
    cancelBtn.disabled = !enabled;
  }

  // Ensure initial state matches HTML
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

  function playFrom(timeSec) {
    try {
      audio.pause();
    } catch (_) {}

    const seekAndPlay = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      const safeDur = Math.max(0, dur - 0.05);
      const t = clamp(timeSec, 0, safeDur);

      try {
        audio.currentTime = t;
      } catch (_) {}

      audio
        .play()
        .then(() => {
          musicBtn.classList.add("isPlaying");
          setCancelEnabled(true);
        })
        .catch(() => {
          musicBtn.classList.remove("isPlaying");
          setCancelEnabled(false);
        });
    };

    if (!Number.isFinite(audio.duration) || audio.duration === 0) {
      audio.load();
      audio.addEventListener("loadedmetadata", seekAndPlay, { once: true });
    } else {
      seekAndPlay();
    }
  }

  musicBtn.addEventListener("click", () => {
    clickCount += 1;

    // Every 3rd click plays from the beginning
    if (clickCount % 3 === 0) {
      playFrom(0);
      return;
    }

    // Otherwise: random start point, then play to end
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
})();
