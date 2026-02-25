// Web Synth - Browser-based keyboard synthesizer using Web Audio API
(function () {
  "use strict";

  // PC keyboard → semitone offset mapping (1 octave)
  const KEY_MAP = {
    KeyA: { semi: 0 }, KeyS: { semi: 2 }, KeyD: { semi: 4 }, KeyF: { semi: 5 },
    KeyG: { semi: 7 }, KeyH: { semi: 9 }, KeyJ: { semi: 11 }, KeyK: { semi: 12 },
    KeyW: { semi: 1 }, KeyE: { semi: 3 },
    KeyT: { semi: 6 }, KeyY: { semi: 8 }, KeyU: { semi: 10 },
  };

  // PC key labels for visual keyboard
  var PC_KEY_LABELS = {
    0: "A", 2: "S", 4: "D", 5: "F", 7: "G", 9: "H", 11: "J", 12: "K",
    1: "W", 3: "E", 6: "T", 8: "Y", 10: "U",
  };

  // Note definitions for one octave
  var NOTES = [
    { semi: 0,  type: "white", label: "C" },
    { semi: 1,  type: "black", label: "C#" },
    { semi: 2,  type: "white", label: "D" },
    { semi: 3,  type: "black", label: "D#" },
    { semi: 4,  type: "white", label: "E" },
    { semi: 5,  type: "white", label: "F" },
    { semi: 6,  type: "black", label: "F#" },
    { semi: 7,  type: "white", label: "G" },
    { semi: 8,  type: "black", label: "G#" },
    { semi: 9,  type: "white", label: "A" },
    { semi: 10, type: "black", label: "A#" },
    { semi: 11, type: "white", label: "B" },
  ];
  var WHITE_SEMIS = [0, 2, 4, 5, 7, 9, 11];
  var BLACK_AFTER_WHITE = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // black semi → white index it sits after
  var START_OCT = 3; // 固定表示: オクターブ 3, 4, 5
  var END_OCT = 5;

  // State
  let audioCtx = null;
  let masterGain = null;
  let waveform = "sine";
  let octave = 4; // PCキーボードが操作するオクターブ（START_OCT〜END_OCT）
  let volume = 0.5;
  const activeVoices = new Map();

  // Effects state
  let filterNode = null;
  let filterType = "off"; // off, lowpass, highpass, bandpass

  let delayNode = null;
  let delayFeedback = null;
  let delayDry = null;
  let delayWet = null;

  let reverbConvolver = null;
  let reverbDry = null;
  let reverbWet = null;
  let reverbDecay = 2.0;

  // --- Audio engine ---

  // --- Impulse response generation ---

  function generateImpulseResponse(decay) {
    var sampleRate = audioCtx.sampleRate;
    var length = Math.floor(sampleRate * decay);
    var buffer = audioCtx.createBuffer(2, length, sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buffer.getChannelData(ch);
      for (var i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    return buffer;
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = volume;

      // --- Filter ---
      filterNode = audioCtx.createBiquadFilter();
      filterNode.type = "lowpass";
      filterNode.frequency.value = 8000;
      filterNode.Q.value = 1;

      // --- Delay (dry/wet mix) ---
      delayNode = audioCtx.createDelay(2.0);
      delayNode.delayTime.value = 0;
      delayFeedback = audioCtx.createGain();
      delayFeedback.gain.value = 0;
      delayDry = audioCtx.createGain();
      delayDry.gain.value = 1.0;
      delayWet = audioCtx.createGain();
      delayWet.gain.value = 0;

      // delay feedback loop
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(delayWet);

      // --- Reverb (dry/wet mix) ---
      reverbConvolver = audioCtx.createConvolver();
      reverbConvolver.buffer = generateImpulseResponse(reverbDecay);
      reverbDry = audioCtx.createGain();
      reverbDry.gain.value = 1.0;
      reverbWet = audioCtx.createGain();
      reverbWet.gain.value = 0;

      reverbConvolver.connect(reverbWet);

      // --- Chain: masterGain → filter → delay split → reverb split → destination ---
      // Filter (bypassed when filterType === "off" by setting frequency high)
      masterGain.connect(filterNode);

      // Delay split
      filterNode.connect(delayDry);  // dry path
      filterNode.connect(delayNode); // wet path

      // Reverb split
      delayDry.connect(reverbDry);   // dry→dry
      delayDry.connect(reverbConvolver); // dry→reverb
      delayWet.connect(reverbDry);   // wet→dry
      delayWet.connect(reverbConvolver); // wet→reverb

      // Output
      reverbDry.connect(audioCtx.destination);
      reverbWet.connect(audioCtx.destination);

      applyFilterType();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  // --- Effects control ---

  function applyFilterType() {
    if (!filterNode) return;
    if (filterType === "off") {
      filterNode.type = "lowpass";
      filterNode.frequency.value = 20000;
      filterNode.Q.value = 0.1;
    } else {
      filterNode.type = filterType;
      var freqSlider = document.getElementById("filter-freq");
      var qSlider = document.getElementById("filter-q");
      if (freqSlider) filterNode.frequency.value = parseFloat(freqSlider.value);
      if (qSlider) filterNode.Q.value = parseFloat(qSlider.value);
    }
  }

  function setDelayParams(time, feedback, mix) {
    if (!delayNode) return;
    delayNode.delayTime.value = time;
    delayFeedback.gain.value = feedback;
    delayDry.gain.value = 1.0 - mix;
    delayWet.gain.value = mix;
  }

  function setReverbMix(mix) {
    if (!reverbDry) return;
    reverbDry.gain.value = 1.0 - mix;
    reverbWet.gain.value = mix;
  }

  function setReverbDecayValue(decay) {
    reverbDecay = decay;
    if (reverbConvolver && audioCtx) {
      reverbConvolver.buffer = generateImpulseResponse(decay);
    }
  }

  function noteToFrequency(semitone, oct) {
    const midiNote = 12 * (oct + 1) + semitone;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  // voiceKey: unique string for tracking active voices (e.g. "4-7" = octave4 semi7)
  function voiceKey(oct, semi) { return oct + "-" + semi; }

  function startVoice(key, oct, semi) {
    if (activeVoices.has(key)) return;
    ensureAudioContext();

    var freq = noteToFrequency(semi, oct);
    var osc = audioCtx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = freq;

    var vGain = audioCtx.createGain();
    vGain.gain.setValueAtTime(0, audioCtx.currentTime);
    vGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.01);

    osc.connect(vGain);
    vGain.connect(masterGain);
    osc.start();

    activeVoices.set(key, { oscillator: osc, gain: vGain, oct: oct, semi: semi });
    highlightVisualKey(oct, semi, true);
  }

  function stopVoice(key) {
    var voice = activeVoices.get(key);
    if (!voice) return;

    var now = audioCtx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + 0.08);
    voice.oscillator.stop(now + 0.1);

    highlightVisualKey(voice.oct, voice.semi, false);
    activeVoices.delete(key);
  }

  // PC keyboard note on/off (uses KEY_MAP + current octave)
  function noteOn(code) {
    var mapping = KEY_MAP[code];
    if (!mapping) return;
    var oct = octave;
    var semi = mapping.semi;
    if (semi === 12) { oct += 1; semi = 0; } // C' → next octave C
    startVoice("kb-" + code, oct, semi);
  }

  function noteOff(code) {
    stopVoice("kb-" + code);
  }

  // Mouse/touch note on/off (uses absolute oct + semi)
  function noteOnByNote(oct, semi) {
    startVoice(voiceKey(oct, semi), oct, semi);
  }

  function noteOffByNote(oct, semi) {
    stopVoice(voiceKey(oct, semi));
  }

  function allNotesOff() {
    for (var key of [...activeVoices.keys()]) {
      stopVoice(key);
    }
  }

  // --- Keyboard events ---

  function handleKeyDown(e) {
    if (e.repeat) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.code === "ArrowLeft") {
      e.preventDefault();
      setOctave(octave - 1);
      return;
    }
    if (e.code === "ArrowRight") {
      e.preventDefault();
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
    var container = document.getElementById("keyboard");
    container.innerHTML = "";

    // Count total white keys (7 per octave + final C)
    var whiteCount = (END_OCT - START_OCT + 1) * 7 + 1;
    var keyWidthPct = 100 / whiteCount;

    // White keys row
    var whiteRow = document.createElement("div");
    whiteRow.className = "flex h-full gap-[2px]";

    for (var oct = START_OCT; oct <= END_OCT; oct++) {
      for (var w = 0; w < WHITE_SEMIS.length; w++) {
        var semi = WHITE_SEMIS[w];
        (function (o, s) {
          var key = document.createElement("div");
          key.className =
            "white-key flex-1 border rounded-b-md " +
            "flex flex-col items-center justify-end pb-2 cursor-pointer " +
            "hover:bg-gray-50 transition-colors bg-white border-gray-300";
          key.dataset.oct = o;
          key.dataset.semi = s;
          key.innerHTML = '<span class="note-label text-[10px] text-gray-400">' + NOTES[s].label + o + '</span>' +
            '<span class="pc-label text-[9px] text-blue-400 font-medium mt-0.5 hidden"></span>';

          key.addEventListener("pointerdown", function () { noteOnByNote(o, s); });
          key.addEventListener("pointerup", function () { noteOffByNote(o, s); });
          key.addEventListener("pointerleave", function () { noteOffByNote(o, s); });
          whiteRow.appendChild(key);
        })(oct, semi);
      }
    }
    // Final C of next octave
    (function () {
      var finalOct = END_OCT + 1;
      var key = document.createElement("div");
      key.className =
        "white-key flex-1 bg-white border border-gray-300 rounded-b-md " +
        "flex flex-col items-center justify-end pb-2 cursor-pointer " +
        "hover:bg-gray-50 transition-colors";
      key.dataset.oct = finalOct;
      key.dataset.semi = 0;
      key.innerHTML = '<span class="note-label text-[10px] text-gray-400">C' + finalOct + '</span>' +
        '<span class="pc-label text-[9px] text-blue-400 font-medium mt-0.5 hidden"></span>';
      key.addEventListener("pointerdown", function () { noteOnByNote(finalOct, 0); });
      key.addEventListener("pointerup", function () { noteOffByNote(finalOct, 0); });
      key.addEventListener("pointerleave", function () { noteOffByNote(finalOct, 0); });
      whiteRow.appendChild(key);
    })();

    container.appendChild(whiteRow);

    // Black keys (absolute overlay)
    var blackRow = document.createElement("div");
    blackRow.className = "absolute top-0 left-0 w-full pointer-events-none";
    blackRow.style.height = "110px";

    var octOffset = 0;
    for (var oct2 = START_OCT; oct2 <= END_OCT; oct2++) {
      var blackSemis = [1, 3, 6, 8, 10];
      for (var b = 0; b < blackSemis.length; b++) {
        (function (o, s, oOff) {
          var whiteLocalIdx = BLACK_AFTER_WHITE[s];
          var globalWhiteIdx = oOff * 7 + whiteLocalIdx;
          var leftPct = ((globalWhiteIdx + 1) / whiteCount) * 100;
          var bkWidth = keyWidthPct * 0.6;

          var key = document.createElement("div");
          key.className =
            "black-key absolute text-white rounded-b-md " +
            "flex flex-col items-center justify-end pb-1 cursor-pointer " +
            "hover:bg-gray-700 transition-colors pointer-events-auto bg-gray-800";
          key.style.left = (leftPct - bkWidth / 2) + "%";
          key.style.width = bkWidth + "%";
          key.style.height = "100%";
          key.dataset.oct = o;
          key.dataset.semi = s;
          key.innerHTML = '<span class="note-label text-[9px] text-gray-400">' + NOTES[s].label + '</span>' +
            '<span class="pc-label text-[8px] text-blue-300 font-medium mt-0.5 hidden"></span>';

          key.addEventListener("pointerdown", function () { noteOnByNote(o, s); });
          key.addEventListener("pointerup", function () { noteOffByNote(o, s); });
          key.addEventListener("pointerleave", function () { noteOffByNote(o, s); });
          blackRow.appendChild(key);
        })(oct2, blackSemis[b], octOffset);
      }
      octOffset++;
    }

    container.appendChild(blackRow);
  }

  function updateFocusHighlight() {
    // Reset all keys to default style
    document.querySelectorAll("#keyboard .white-key").forEach(function (el) {
      el.classList.remove("bg-blue-50", "border-blue-200");
      el.classList.add("bg-white", "border-gray-300");
      var pcLabel = el.querySelector(".pc-label");
      if (pcLabel) { pcLabel.textContent = ""; pcLabel.classList.add("hidden"); }
    });
    document.querySelectorAll("#keyboard .black-key").forEach(function (el) {
      el.classList.remove("bg-gray-700");
      el.classList.add("bg-gray-800");
      var pcLabel = el.querySelector(".pc-label");
      if (pcLabel) { pcLabel.textContent = ""; pcLabel.classList.add("hidden"); }
    });

    // Highlight current octave
    document.querySelectorAll('#keyboard [data-oct="' + octave + '"]').forEach(function (el) {
      var semi = parseInt(el.dataset.semi);
      var isBlack = el.classList.contains("black-key");
      if (isBlack) {
        el.classList.remove("bg-gray-800");
        el.classList.add("bg-gray-700");
      } else {
        el.classList.remove("bg-white", "border-gray-300");
        el.classList.add("bg-blue-50", "border-blue-200");
      }
      // Show PC key label
      var label = PC_KEY_LABELS[semi];
      if (label) {
        var pcLabel = el.querySelector(".pc-label");
        if (pcLabel) { pcLabel.textContent = label; pcLabel.classList.remove("hidden"); }
      }
    });
    // Also highlight C of next octave if it's the K key (semi=12 → oct+1, semi=0)
    var nextC = document.querySelector('#keyboard [data-oct="' + (octave + 1) + '"][data-semi="0"]');
    if (nextC && !nextC.classList.contains("black-key")) {
      nextC.classList.remove("bg-white", "border-gray-300");
      nextC.classList.add("bg-blue-50", "border-blue-200");
      var pcLabel = nextC.querySelector(".pc-label");
      if (pcLabel) { pcLabel.textContent = "K"; pcLabel.classList.remove("hidden"); }
    }
  }

  function highlightVisualKey(oct, semi, active) {
    var el = document.querySelector('[data-oct="' + oct + '"][data-semi="' + semi + '"]');
    if (!el) return;
    var isBlack = el.classList.contains("black-key");

    if (isBlack) {
      if (active) {
        el.classList.remove("bg-gray-800", "bg-gray-700");
        el.classList.add("bg-blue-600");
      } else {
        el.classList.remove("bg-blue-600");
        el.classList.add(oct === octave ? "bg-gray-700" : "bg-gray-800");
      }
    } else {
      if (active) {
        el.classList.remove("bg-white", "bg-blue-50");
        el.classList.add("bg-blue-200", "border-blue-400");
      } else {
        el.classList.remove("bg-blue-200", "border-blue-400");
        var isFocused = (oct === octave) || (oct === octave + 1 && semi === 0);
        el.classList.add(isFocused ? "bg-blue-50" : "bg-white");
        el.classList.add(isFocused ? "border-blue-200" : "border-gray-300");
      }
    }
  }

  function updateOctaveButtons() {
    document.querySelectorAll(".oct-btn").forEach(function (btn) {
      var isActive = parseInt(btn.dataset.oct) === octave;
      btn.classList.toggle("bg-blue-600", isActive);
      btn.classList.toggle("text-white", isActive);
      btn.classList.toggle("bg-white", !isActive);
    });
  }

  function setOctave(newOctave) {
    var clamped = Math.max(START_OCT, Math.min(END_OCT, newOctave));
    if (clamped === octave) return;
    allNotesOff();
    octave = clamped;
    updateOctaveButtons();
    updateFocusHighlight();
  }

  // --- Init ---

  function init() {
    renderKeyboard();
    updateFocusHighlight();
    updateOctaveButtons();

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
    document.querySelectorAll(".oct-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setOctave(parseInt(btn.dataset.oct));
      });
    });

    // --- Filter controls ---
    document.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterType = btn.dataset.filter;
        document.querySelectorAll(".filter-btn").forEach(function (b) {
          b.classList.toggle("bg-blue-600", b === btn);
          b.classList.toggle("text-white", b === btn);
          b.classList.toggle("bg-white", b !== btn);
        });
        var filterParams = document.getElementById("filter-params");
        if (filterParams) filterParams.classList.toggle("hidden", filterType === "off");
        applyFilterType();
      });
    });
    // Default filter highlight
    var defaultFilter = document.querySelector('[data-filter="off"]');
    if (defaultFilter) defaultFilter.classList.add("bg-blue-600", "text-white");

    var filterFreq = document.getElementById("filter-freq");
    var filterFreqDisplay = document.getElementById("filter-freq-display");
    if (filterFreq) {
      filterFreq.addEventListener("input", function () {
        filterFreqDisplay.textContent = filterFreq.value;
        if (filterNode && filterType !== "off") filterNode.frequency.value = parseFloat(filterFreq.value);
      });
    }

    var filterQ = document.getElementById("filter-q");
    var filterQDisplay = document.getElementById("filter-q-display");
    if (filterQ) {
      filterQ.addEventListener("input", function () {
        filterQDisplay.textContent = parseFloat(filterQ.value).toFixed(1);
        if (filterNode && filterType !== "off") filterNode.Q.value = parseFloat(filterQ.value);
      });
    }

    // --- Delay controls ---
    var delayTime = document.getElementById("delay-time");
    var delayTimeDisplay = document.getElementById("delay-time-display");
    var delayFb = document.getElementById("delay-feedback");
    var delayFbDisplay = document.getElementById("delay-feedback-display");
    var delayMix = document.getElementById("delay-mix");
    var delayMixDisplay = document.getElementById("delay-mix-display");

    function updateDelay() {
      var t = parseFloat(delayTime.value);
      var fb = parseFloat(delayFb.value);
      var m = parseFloat(delayMix.value) / 100;
      delayTimeDisplay.textContent = t.toFixed(2);
      delayFbDisplay.textContent = parseFloat(delayFb.value).toFixed(2);
      delayMixDisplay.textContent = delayMix.value;
      setDelayParams(t, fb, m);
    }
    if (delayTime) delayTime.addEventListener("input", updateDelay);
    if (delayFb) delayFb.addEventListener("input", updateDelay);
    if (delayMix) delayMix.addEventListener("input", updateDelay);

    // --- Reverb controls ---
    var reverbDecaySlider = document.getElementById("reverb-decay");
    var reverbDecayDisplay = document.getElementById("reverb-decay-display");
    var reverbMix = document.getElementById("reverb-mix");
    var reverbMixDisplay = document.getElementById("reverb-mix-display");

    if (reverbDecaySlider) {
      reverbDecaySlider.addEventListener("input", function () {
        reverbDecayDisplay.textContent = parseFloat(reverbDecaySlider.value).toFixed(1);
        setReverbDecayValue(parseFloat(reverbDecaySlider.value));
      });
    }
    if (reverbMix) {
      reverbMix.addEventListener("input", function () {
        reverbMixDisplay.textContent = reverbMix.value;
        setReverbMix(parseFloat(reverbMix.value) / 100);
      });
    }

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
