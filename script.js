// ===== STATE =====
let qaDatabase = [
  { q: "hello", a: "Greetings. I am GKCEM, your neural interface. How can I assist you?" },
  { q: "who are you", a: "I am GKCEM — a synthetic intelligence interface. My purpose is to assist and communicate." },
  { q: "what can you do", a: "I can answer your questions, speak responses aloud, and animate my facial expressions during speech." }
];
let voiceEnabled = true;
let speaking = false;
let currentUtterance = null;
let isSpeaking = false;

// ===== Q&A MANAGER =====
function toggleQA() {
  const body = document.getElementById('qa-body');
  const icon = document.getElementById('qa-toggle-icon');
  body.classList.toggle('open');
  icon.textContent = body.classList.contains('open') ? '▲' : '▼';
  renderQAList();
}

function addQA() {
  const q = document.getElementById('qa-q-input').value.trim();
  const a = document.getElementById('qa-a-input').value.trim();
  if (!q || !a) return;
  qaDatabase.push({ q, a });
  document.getElementById('qa-q-input').value = '';
  document.getElementById('qa-a-input').value = '';
  renderQAList();
}

function deleteQA(i) {
  qaDatabase.splice(i, 1);
  renderQAList();
}

function renderQAList() {
  const list = document.getElementById('qa-list');
  list.innerHTML = qaDatabase.map((item, i) => `
    <div class="qa-item">
      <div class="qa-item-texts">
        <div class="qa-q">Q: ${escHtml(item.q)}</div>
        <div class="qa-a">A: ${escHtml(item.a)}</div>
      </div>
      <button class="qa-del" onclick="deleteQA(${i})">×</button>
    </div>
  `).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== CHAT =====
function sendMessage() {
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  appendMsg('user', text);
  setStatus('PROCESSING', true);

  setTimeout(() => {
    const reply = getReply(text);
    setStatus('TRANSMITTING', true);
    appendMsg('ai', reply);
    if (voiceEnabled) speak(reply);
    else setStatus('STANDBY', false);
  }, 600);
}

function getReply(text) {
  const lower = text.toLowerCase();
  // Check custom Q&A
  for (const item of qaDatabase) {
    if (lower.includes(item.q.toLowerCase())) return item.a;
  }
  // Fallback generic
  const fallbacks = [
    "That query is outside my current knowledge matrix. Please refine your input.",
    "Processing... I do not have a specific response for that. Try adding a custom answer below.",
    "Interesting query. No matching data found in my neural database.",
    "Signal received. No matching response pattern found. You can add one in the Q&A panel.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function appendMsg(role, text) {
  const out = document.getElementById('chat-output');
  const div = document.createElement('div');
  div.className = `msg msg-${role === 'user' ? 'user' : 'ai'}`;
  div.innerHTML = `<span class="msg-label">${role === 'user' ? '// YOU' : '// GKCEM'}</span><span class="msg-text">${escHtml(text)}</span>`;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

// ===== VOICE =====
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  const btn = document.getElementById('voice-toggle');
  const vs = document.getElementById('voice-status');
  btn.textContent = voiceEnabled ? '🔊 VOICE ON' : '🔇 VOICE OFF';
  btn.classList.toggle('muted', !voiceEnabled);
  vs.textContent = voiceEnabled ? 'ACTIVE' : 'MUTED';
  if (!voiceEnabled && currentUtterance) {
    speechSynthesis.cancel();
    stopLipSync();
  }
}

function speak(text) {
  if (!('speechSynthesis' in window)) { setStatus('STANDBY', false); return; }
  speechSynthesis.cancel();

  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.rate = 0.92;
  currentUtterance.pitch = 0.85;
  currentUtterance.volume = 1;

  // Try to pick a good voice
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && /male|david|alex|daniel/i.test(v.name))
    || voices.find(v => v.lang.startsWith('en'))
    || voices[0];
  if (preferred) currentUtterance.voice = preferred;

  currentUtterance.onstart = () => { isSpeaking = true; startLipSync(); };
  currentUtterance.onend = () => { isSpeaking = false; stopLipSync(); setStatus('STANDBY', false); };
  currentUtterance.onerror = () => { isSpeaking = false; stopLipSync(); setStatus('STANDBY', false); };

  speechSynthesis.speak(currentUtterance);
}

// ===== LIP SYNC =====
let lipInterval = null;
const upperLip = document.getElementById('upper-lip');
const lowerLip = document.getElementById('lower-lip');
const innerMouth = document.getElementById('inner-mouth');

// Mouth shapes: [upperCurve, lowerOpen, innerOpen]
const mouthShapes = [
  // Closed / resting
  { upper: "M-38,55 Q-20,48 0,50 Q20,48 38,55", lower: "M-38,55 Q-20,62 0,62 Q20,62 38,55", inner: "M-38,55 Q0,56 38,55 Q38,58 0,58 Q-38,58 -38,55 Z" },
  // Slightly open
  { upper: "M-36,53 Q-18,45 0,47 Q18,45 36,53", lower: "M-36,53 Q-18,66 0,68 Q18,66 36,53", inner: "M-36,53 Q0,54 36,53 Q36,68 0,68 Q-36,68 -36,53 Z" },
  // Medium open
  { upper: "M-35,51 Q-18,42 0,44 Q18,42 35,51", lower: "M-35,51 Q-18,70 0,74 Q18,70 35,51", inner: "M-35,51 Q0,52 35,51 Q35,74 0,74 Q-35,74 -35,51 Z" },
  // Wide open
  { upper: "M-33,49 Q-16,38 0,40 Q16,38 33,49", lower: "M-33,49 Q-16,74 0,80 Q16,74 33,49", inner: "M-33,49 Q0,50 33,49 Q33,80 0,80 Q-33,80 -33,49 Z" },
  // O shape
  { upper: "M-25,50 Q0,40 25,50", lower: "M-25,50 Q0,76 25,50", inner: "M-25,50 Q0,51 25,50 Q25,76 0,76 Q-25,76 -25,50 Z" },
  // Wide smile
  { upper: "M-38,52 Q-18,42 0,43 Q18,42 38,52", lower: "M-38,52 Q-18,64 0,67 Q18,64 38,52", inner: "M-38,52 Q0,53 38,52 Q38,67 0,67 Q-38,67 -38,52 Z" },
];

function startLipSync() {
  if (lipInterval) clearInterval(lipInterval);
  let frame = 0;
  lipInterval = setInterval(() => {
    if (!isSpeaking) { stopLipSync(); return; }
    // Random mouth shape with bias toward mid-open
    const weights = [0, 1, 2, 3, 4, 5, 1, 2, 3, 2, 1];
    const idx = weights[Math.floor(Math.random() * weights.length)];
    const shape = mouthShapes[idx];
    upperLip.setAttribute('d', shape.upper);
    lowerLip.setAttribute('d', shape.lower);
    innerMouth.setAttribute('d', shape.inner);
    frame++;
  }, 110);
}

function stopLipSync() {
  if (lipInterval) { clearInterval(lipInterval); lipInterval = null; }
  // Reset to closed mouth
  const closed = mouthShapes[0];
  upperLip.setAttribute('d', closed.upper);
  lowerLip.setAttribute('d', closed.lower);
  innerMouth.setAttribute('d', closed.inner);
}

// ===== STATUS =====
function setStatus(text, active) {
  document.getElementById('status-text').textContent = text;
  const dot = document.getElementById('status-dot');
  dot.classList.toggle('active', active);
}

// Preload voices
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

renderQAList();
