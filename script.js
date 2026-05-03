// ============================================================
//  script.js — Logica del gioco
// ============================================================

// ── Stato globale ─────────────────────────────────────────────
let imagesData = { common: [], rare: [], epic: [], legendary: [] };
let csvData    = {};
let currentFile  = null;
let isSpinning   = false;
let linesAngle   = 0;
let linesSpeed   = 0;
let linesRAF     = null;
let recentImages = [];

// ── Session storage voti ──────────────────────────────────────
function hasVotedFor(filename) {
  return sessionStorage.getItem('vote_' + filename) !== null;
}
function markVoted(filename, type) {
  sessionStorage.setItem('vote_' + filename, type);
}

// ── Indicatore server ─────────────────────────────────────────
function setServerStatus(online) {
  document.getElementById('serverDot').className     = 'server-dot ' + (online ? 'online' : 'offline');
  document.getElementById('serverLabel').textContent = online ? 'online' : 'offline (sola lettura)';
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, duration = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

// ── Caricamento dati ──────────────────────────────────────────
async function loadImages() {
  try {
    const res = await fetch('images.json');
    imagesData = await res.json();
  } catch(e) {
    console.warn('images.json non trovato. Uso placeholder.');
    imagesData = { common: ['placeholder'], rare: ['placeholder'], epic: ['placeholder'], legendary: ['placeholder'] };
  }
}

async function loadCsvData() {
  if (!APPS_SCRIPT_URL) { setServerStatus(false); return; }
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    if (!res.ok) throw new Error();
    csvData = await res.json();
    setServerStatus(true);
  } catch(e) {
    csvData = {};
    setServerStatus(false);
  }
}

// ── Utility ───────────────────────────────────────────────────
function getFullName(filename) {
  return (csvData[filename]?.nome_completo) || filename;
}
function getVotes(filename) {
  return { su: csvData[filename]?.voti_su || 0, giu: csvData[filename]?.voti_giu || 0 };
}

function weightedRandom() {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;
  for (const r of RARITIES) { rand -= r.weight; if (rand <= 0) return r; }
  return RARITIES[0];
}

function buildStrip(winnerId) {
  const track  = document.getElementById('stripTrack');
  track.innerHTML = '';
  const totalW = RARITIES.reduce((s, r) => s + r.weight, 0);
  const sequence = [];
  for (let i = 0; i < STRIP_LENGTH; i++) {
    let rand = Math.random() * totalW, chosen = RARITIES[0];
    for (const r of RARITIES) { rand -= r.weight; if (rand <= 0) { chosen = r; break; } }
    sequence.push(chosen);
  }
  sequence[WINNER_POS] = RARITIES.find(r => r.id === winnerId);
  sequence.forEach(r => {
    const seg = document.createElement('div');
    seg.className = 'strip-segment';
    seg.style.background = r.bg;
    seg.style.color = r.color;
    seg.textContent = r.label;
    track.appendChild(seg);
  });
}

function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

// ── Spin ──────────────────────────────────────────────────────
function startSpin() {
  if (isSpinning) return;
  const available = RARITIES.filter(r => (imagesData[r.id] || []).length > 0);
  if (!available.length) { alert('Nessuna immagine trovata. Controlla images.json.'); return; }

  let winner = weightedRandom();
  if (!(imagesData[winner.id] || []).length) winner = available[Math.floor(Math.random() * available.length)];

  isSpinning = true;
  document.getElementById('spinBtn').disabled = true;
  buildStrip(winner.id);

  const track      = document.getElementById('stripTrack');
  const wrapperW   = document.querySelector('.strip-wrapper').offsetWidth;
  const startX     = wrapperW / 2 - SEGMENT_W / 2;
  const targetX    = startX - WINNER_POS * STRIP_TOTAL;
  const startOffset = startX + STRIP_TOTAL * 4;
  track.style.transform = `translateX(${startOffset}px)`;

  const duration = 4200, t0 = performance.now();
  function animate(now) {
    const t = Math.min((now - t0) / duration, 1);
    track.style.transform = `translateX(${startOffset + (targetX - startOffset) * easeOut(t)}px)`;
    t < 1 ? requestAnimationFrame(animate) : onSpinEnd(winner);
  }
  requestAnimationFrame(animate);
}

// ── Fine spin → popup ─────────────────────────────────────────
function onSpinEnd(winner) {
  setTimeout(() => {
    const pool  = imagesData[winner.id] || [];
    const avail = pool.filter(x => !recentImages.includes(x));
    const chosen = (avail.length ? avail : pool)[Math.floor(Math.random() * (avail.length || pool.length))];
    recentImages.push(chosen);
    if (recentImages.length > MAX_RECENT) recentImages.shift();

    currentFile = chosen;

    const imgSrc = chosen === 'placeholder'
      ? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23222"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23555" font-size="14">placeholder</text></svg>'
      : `images/${chosen}`;

    const imgWrap = document.getElementById('popupImgWrap');
    imgWrap.style.backgroundColor = winner.bg;
    imgWrap.style.borderColor     = winner.glowColor;

    document.getElementById('popupBadge').textContent        = winner.label;
    document.getElementById('popupBadge').style.background   = winner.badgeBg;
    document.getElementById('popupBadge').style.color        = winner.badgeColor;
    document.getElementById('popupFullname').textContent     = chosen === 'placeholder' ? '' : getFullName(chosen);
    document.getElementById('popupName').textContent         = chosen === 'placeholder' ? '' : chosen;

    const votes = getVotes(chosen);
    document.getElementById('voteTotal').textContent = votes.su - votes.giu;

    const btnUp = document.getElementById('voteUp'), btnDown = document.getElementById('voteDown');
    btnUp.classList.remove('voted', 'pop');
    btnDown.classList.remove('voted', 'pop');
    if (hasVotedFor(chosen)) {
      const prev = sessionStorage.getItem('vote_' + chosen);
      (prev === 'su' ? btnUp : btnDown).classList.add('voted');
      btnUp.disabled = true; btnDown.disabled = true;
    } else {
      btnUp.disabled = false; btnDown.disabled = false;
    }

    document.getElementById('linesCanvas').getContext('2d').clearRect(0, 0, 9999, 9999);

    const img = document.getElementById('popupImg');
    img.onload = () => {
      document.getElementById('popup').classList.add('visible');
      startSpeedLines(winner.glowColor);
    };
    img.src = imgSrc;

    isSpinning = false;
    document.getElementById('spinBtn').disabled = false;
  }, 350);
}

// ── Voto ──────────────────────────────────────────────────────
async function castVote(type) {
  if (!currentFile || hasVotedFor(currentFile)) return;
  markVoted(currentFile, type);

  const btnUp = document.getElementById('voteUp'), btnDown = document.getElementById('voteDown');
  btnUp.disabled = true; btnDown.disabled = true;

  const btn = type === 'su' ? btnUp : btnDown;
  btn.classList.add('voted', 'pop');
  btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });

  if (!csvData[currentFile]) csvData[currentFile] = { nome_completo: currentFile, voti_su: 0, voti_giu: 0 };
  type === 'su' ? csvData[currentFile].voti_su++ : csvData[currentFile].voti_giu++;

  const totalEl = document.getElementById('voteTotal');
  totalEl.textContent = csvData[currentFile].voti_su - csvData[currentFile].voti_giu;
  totalEl.classList.remove('pop');
  void totalEl.offsetWidth;
  totalEl.classList.add('pop');
  totalEl.addEventListener('animationend', () => totalEl.classList.remove('pop'), { once: true });

  try {
    const url = `${APPS_SCRIPT_URL}?filename=${encodeURIComponent(currentFile)}&type=${type}&action=vote`;
    await fetch(url, { method: 'GET', mode: 'no-cors' });
    showToast(type === 'su' ? '👍 Voto positivo inviato!' : '👎 Voto negativo inviato!');
  } catch(e) {
    showToast('⚠️ Errore di rete — voto non salvato', 3000);
  }
}

// ── Speed lines ───────────────────────────────────────────────
function startSpeedLines(color) {
  const canvas = document.getElementById('linesCanvas');
  const ctx    = canvas.getContext('2d');
  const wrap   = document.getElementById('popupImgWrap');
  canvas.width = wrap.offsetWidth; canvas.height = wrap.offsetHeight;
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const NUM = 70, MIN_R = 100, MAX_R = Math.max(canvas.width, canvas.height) * 0.8;
  linesAngle = 0; linesSpeed = 0.2;
  const angles = Array.from({ length: NUM }, (_, i) => (i / NUM) * Math.PI * 2);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color.replace('0.7','0.15').replace('0.6','0.1').replace('0.5','0.08').replace('0.4','0.05');
    ctx.beginPath(); ctx.arc(cx, cy, MAX_R, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(linesAngle);
    angles.forEach(a => {
      const sp = (Math.PI * 2) / NUM * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - sp) * MIN_R, Math.sin(a - sp) * MIN_R);
      ctx.lineTo(Math.cos(a + sp) * MIN_R, Math.sin(a + sp) * MIN_R);
      ctx.lineTo(Math.cos(a + sp) * MAX_R, Math.sin(a + sp) * MAX_R);
      ctx.lineTo(Math.cos(a - sp) * MAX_R, Math.sin(a - sp) * MAX_R);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    });
    ctx.restore();
    linesAngle += linesSpeed;
    linesSpeed = Math.max(0.002, linesSpeed * 0.98);
    linesRAF = requestAnimationFrame(draw);
  }
  if (linesRAF) cancelAnimationFrame(linesRAF);
  draw();
}

// ── Popup risultato ───────────────────────────────────────────
function closePopup() {
  document.getElementById('popup').classList.remove('visible');
  if (linesRAF) { cancelAnimationFrame(linesRAF); linesRAF = null; }
  document.getElementById('linesCanvas').getContext('2d').clearRect(0, 0, 9999, 9999);
  document.getElementById('popupImg').src = '';
  currentFile = null;
}

// ── Popup info ────────────────────────────────────────────────
function openInfo() {
  document.getElementById('infoOverlay').classList.add('visible');
}
function closeInfo() {
  document.getElementById('infoOverlay').classList.remove('visible');
}
function closeInfoOnBg(e) {
  if (e.target === document.getElementById('infoOverlay')) closeInfo();
}

// ── Init ──────────────────────────────────────────────────────
Promise.all([loadImages(), loadCsvData()]);
