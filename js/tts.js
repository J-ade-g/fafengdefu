// === TTS via Web Speech API ===

const VOICE_CONFIGS = {
  opossum:  { rate: 1.5, pitch: 0.75 },
  macaque:  { rate: 1.6, pitch: 1.25 },
  capybara: { rate: 0.7, pitch: 1.0 }
};

// Split long text into sentence chunks so Chrome doesn't cut it off
function splitText(text) {
  const chunks = [];
  const sentences = text.split(/(?<=[。！？\n])/);
  let buffer = '';
  for (const s of sentences) {
    if ((buffer + s).length > 120) {
      if (buffer) chunks.push(buffer.trim());
      buffer = s;
    } else {
      buffer += s;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.length > 0 ? chunks : [text];
}

function speak(text, character) {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      console.warn('Web Speech API not available');
      resolve();
      return;
    }

    speechSynthesis.cancel();

    const cfg = VOICE_CONFIGS[character] || VOICE_CONFIGS.opossum;
    const chunks = splitText(text);
    const voices = speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh') && !v.name.includes('Female'))
      || voices.find(v => v.lang.startsWith('zh'))
      || voices[0];

    let idx = 0;
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) { done = true; speechSynthesis.cancel(); resolve(); }
    }, 30000);

    function speakNext() {
      if (done) return;
      if (idx >= chunks.length) {
        done = true;
        clearTimeout(timeout);
        resolve();
        return;
      }

      const utter = new SpeechSynthesisUtterance(chunks[idx]);
      utter.lang = 'zh-CN';
      utter.rate = cfg.rate;
      utter.pitch = cfg.pitch;
      utter.volume = 0.8;
      if (zhVoice) utter.voice = zhVoice;

      utter.onend = () => { idx++; speakNext(); };
      utter.onerror = () => { idx++; speakNext(); };

      speechSynthesis.speak(utter);
    }

    speakNext();
  });
}

// Preload voices (Chrome needs this)
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}
