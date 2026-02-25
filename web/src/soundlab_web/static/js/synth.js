// Web Synth - Browser-based keyboard synthesizer using Web Audio API
(function () {
  "use strict";

  // Key mapping: code -> { note (semitone offset from C), type, label }
  const KEY_MAP = {
    // White keys (A-row)
    KeyA: { note: 0, type: "white", label: "C" },
    KeyS: { note: 2, type: "white", label: "D" },
    KeyD: { note: 4, type: "white", label: "E" },
    KeyF: { note: 5, type: "white", label: "F" },
    KeyG: { note: 7, type: "white", label: "G" },
    KeyH: { note: 9, type: "white", label: "A" },
    KeyJ: { note: 11, type: "white", label: "B" },
    KeyK: { note: 12, type: "white", label: "C'" },
    // Black keys (W-row)
    KeyW: { note: 1, type: "black", label: "C#" },
    KeyE: { note: 3, type: "black", label: "D#" },
    KeyT: { note: 6, type: "black", label: "F#" },
    KeyY: { note: 8, type: "black", label: "G#" },
    KeyU: { note: 10, type: "black", label: "A#" },
  };

  // Which white-key index each black key sits after
  const BLACK_KEY_POSITION = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

  // State
  let audioCtx = null;
  let masterGain = null;
  let waveform = "sine";
  let octave = 4;
  let volume = 0.5;
  const activeVoices = new Map();

  // --- Audio engine ---

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function noteToFrequency(semitone, oct) {
    const midiNote = 12 * (oct + 1) + semitone;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  function noteOn(code) {
    if (activeVoices.has(code)) return;
    const mapping = KEY_MAP[code];
    if (!mapping) return;

    ensureAudioContext();

    const freq = noteToFrequency(mapping.note, octave);
    const osc = audioCtx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = freq;

    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
    voiceGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.01);

    osc.connect(voiceGain);
    voiceGain.connect(masterGain);
    osc.start();

    activeVoices.set(code, { oscillator: osc, gain: voiceGain });
    highlightKey(code, true);
  }

  function noteOff(code) {
    const voice = activeVoices.get(code);
    if (!voice) return;

    const now = audioCtx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + 0.08);
    voice.oscillator.stop(now + 0.1);

    activeVoices.delete(code);
    highlightKey(code, false);
  }

  function allNotesOff() {
    for (const code of [...activeVoices.keys()]) {
      noteOff(code);
    }
  }

  // --- Keyboard events ---

  function handleKeyDown(e) {
    if (e.repeat) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.code === "KeyZ") {
      setOctave(octave - 1);
      return;
    }
    if (e.code === "KeyX") {
      setOctave(octave + 1);
      return;
    }

    if (KEY_MAP[e.code]) {
      e.preventDefault();
      noteOn(e.code);
    }
  }

  function handleKeyUp(e) {
    if (KEY_MAP[e.code]) {
      e.preventDefault();
      noteOff(e.code);
    }
  }

  // --- UI ---

  function renderKeyboard() {
    const container = document.getElementById("keyboard");
    container.innerHTML = "";

    const whiteKeys = Object.entries(KEY_MAP)
      .filter(([, v]) => v.type === "white")
      .sort((a, b) => a[1].note - b[1].note);

    const blackKeys = Object.entries(KEY_MAP)
      .filter(([, v]) => v.type === "black")
      .sort((a, b) => a[1].note - b[1].note);

    const whiteCount = whiteKeys.length;
    const keyWidthPct = 100 / whiteCount;

    // White keys
    const whiteRow = document.createElement("div");
    whiteRow.className = "flex h-full gap-[2px]";

    whiteKeys.forEach(([code, info]) => {
      const key = document.createElement("div");
      key.className =
        "white-key flex-1 bg-white border border-gray-300 rounded-b-md " +
        "flex flex-col items-center justify-end pb-2 cursor-pointer " +
        "hover:bg-gray-50 transition-colors";
      key.dataset.code = code;
      key.innerHTML =
        '<span class="text-xs text-gray-400">' + info.label + "</span>" +
        '<span class="text-[10px] text-gray-300 mt-0.5">' + code.replace("Key", "") + "</span>";

      key.addEventListener("pointerdown", () => noteOn(code));
      key.addEventListener("pointerup", () => noteOff(code));
      key.addEventListener("pointerleave", () => noteOff(code));
      whiteRow.appendChild(key);
    });

    container.appendChild(whiteRow);

    // Black keys (absolute overlay)
    const blackRow = document.createElement("div");
    blackRow.className = "absolute top-0 left-0 w-full pointer-events-none";
    blackRow.style.height = "110px";

    blackKeys.forEach(([code, info]) => {
      const whiteIdx = BLACK_KEY_POSITION[info.note];
      if (whiteIdx === undefined) return;

      const key = document.createElement("div");
      const leftPct = ((whiteIdx + 1) / whiteCount) * 100;
      const bkWidth = keyWidthPct * 0.6;

      key.className =
        "black-key absolute bg-gray-800 text-white rounded-b-md " +
        "flex flex-col items-center justify-end pb-1 cursor-pointer " +
        "hover:bg-gray-700 transition-colors pointer-events-auto";
      key.style.left = (leftPct - bkWidth / 2) + "%";
      key.style.width = bkWidth + "%";
      key.style.height = "100%";
      key.dataset.code = code;
      key.innerHTML =
        '<span class="text-[10px] text-gray-400">' + info.label + "</span>" +
        '<span class="text-[9px] text-gray-500 mt-0.5">' + code.replace("Key", "") + "</span>";

      key.addEventListener("pointerdown", () => noteOn(code));
      key.addEventListener("pointerup", () => noteOff(code));
      key.addEventListener("pointerleave", () => noteOff(code));
      blackRow.appendChild(key);
    });

    container.appendChild(blackRow);
  }

  function highlightKey(code, active) {
    const mapping = KEY_MAP[code];
    if (!mapping) return;
    const el = document.querySelector('[data-code="' + code + '"]');
    if (!el) return;

    if (mapping.type === "white") {
      el.classList.toggle("bg-blue-100", active);
      el.classList.toggle("border-blue-400", active);
    } else {
      el.classList.toggle("bg-blue-600", active);
      el.classList.toggle("bg-gray-800", !active);
    }
  }

  function setOctave(newOctave) {
    octave = Math.max(1, Math.min(7, newOctave));
    document.getElementById("octave-display").textContent = octave;
    allNotesOff();
  }

  // --- Init ---

  function init() {
    renderKeyboard();

    // Waveform buttons
    document.querySelectorAll(".wave-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        waveform = btn.dataset.wave;
        document.querySelectorAll(".wave-btn").forEach(function (b) {
          b.classList.toggle("bg-blue-600", b === btn);
          b.classList.toggle("text-white", b === btn);
          b.classList.toggle("bg-white", b !== btn);
        });
      });
    });

    // Default waveform highlight
    var defaultBtn = document.querySelector('[data-wave="sine"]');
    if (defaultBtn) {
      defaultBtn.classList.add("bg-blue-600", "text-white");
    }

    // Volume slider
    var volumeSlider = document.getElementById("volume");
    var volumeDisplay = document.getElementById("volume-display");
    volumeSlider.addEventListener("input", function () {
      volume = volumeSlider.value / 100;
      volumeDisplay.textContent = volumeSlider.value;
      if (masterGain) {
        masterGain.gain.value = volume;
      }
    });

    // Octave buttons
    document.getElementById("octave-down").addEventListener("click", function () {
      setOctave(octave - 1);
    });
    document.getElementById("octave-up").addEventListener("click", function () {
      setOctave(octave + 1);
    });

    // Keyboard events
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    // Stop all notes when window loses focus
    window.addEventListener("blur", allNotesOff);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
