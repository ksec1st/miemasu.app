
let previousCalledTickets = null;
let audioContext = null;
let soundEnabled = false;
let isLoading = false;

function enableSound() {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("このブラウザは音声に対応していません");
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    soundEnabled = true;
    document.getElementById("soundMessage").textContent =
      " 音声が有効です";
    document.getElementById("enableSoundBtn").textContent =
      "音声は有効です";
  } catch (error) {
    document.getElementById("soundMessage").textContent =
      " 音声を有効にできませんでした";
  }
}

// 呼び出し音：「ピロロン♪」
function playCallSound() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const now = audioContext.currentTime;

  // ピ・ロ・ロン♪（少し柔らかい電子チャイム）
  const notes = [
    { frequency: 784, start: 0, duration: 0.18 },
    { frequency: 988, start: 0.16, duration: 0.22 },
    { frequency: 1175, start: 0.34, duration: 0.42 }
  ];

  notes.forEach((note) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      note.frequency,
      now + note.start
    );

    gain.gain.setValueAtTime(0.001, now + note.start);
    gain.gain.linearRampToValueAtTime(
      0.22,
      now + note.start + 0.025
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + note.start + note.duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now + note.start);
    oscillator.stop(now + note.start + note.duration + 0.02);
  });
}

function renderCalls(calledTickets, closed) {
  const callout = document.getElementById("callout");

  if (calledTickets.length) {
    callout.innerHTML = `
      <div class="callout-label">NOW CALLING</div>
      <div class="call-list">
        ${calledTickets.map(t => `
          <div class="callout-item">
            <div class="callout-ticket">${escapeHTML(t.ticket)}</div>
            <div class="callout-booth">
              ${escapeHTML(t.booth)}ブースへお越しください
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } else {
    callout.innerHTML = `
      <div class="callout-label">CONSULTATION GUIDE</div>
      <div class="empty-callout">
        ${closed
          ? "本日の個別相談は終了しました"
          : "現在、呼び出しはありません"}
      </div>
    `;
  }
}

async function loadDashboard() {
  if (isLoading) return;
  isLoading = true;

  const callout = document.getElementById("callout");
  const grid = document.getElementById("boothGrid");

  try {
    const data = await api("status");

    const calledTickets = data.tickets
      .filter(t => t.status === "呼出中")
      .sort((a, b) =>
        a.booth.localeCompare(b.booth, "ja") ||
        a.sequence - b.sequence
      );

    const currentIds = calledTickets.map(t => t.ticket).sort();

    if (previousCalledTickets !== null) {
      const previousSet = new Set(previousCalledTickets);
      const hasNewCall = currentIds.some(id => !previousSet.has(id));

      if (hasNewCall) playCallSound();
    }

    previousCalledTickets = currentIds;
    renderCalls(calledTickets, data.settings?.本日終了 === "true");

    grid.innerHTML = data.booths.map(b => {
      const active = data.tickets.filter(t =>
        t.booth === b.booth &&
        ["呼出中", "相談中"].includes(t.status)
      );

      return `
        <div class="booth-card">
          <div class="booth-top">
            <div class="booth-letter">${escapeHTML(b.booth)}</div>
            <span class="pill status-${escapeHTML(b.status)}">
              ${escapeHTML(b.status)}
            </span>
          </div>
          <div class="booth-current">
            ${active.length
              ? active.map(t => escapeHTML(t.ticket)).join("・")
              : "—"}
          </div>
          <div class="muted small">
            ${active.length ? "呼び出し・相談中の番号" : "現在の相談番号なし"}
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("updatedAt").textContent =
      " 最終更新：" + new Date().toLocaleTimeString("ja-JP");

  } catch (error) {
    callout.innerHTML =
      `<div class="empty-callout">情報を取得できません</div>`;
    document.getElementById("updatedAt").textContent = error.message;
  } finally {
    isLoading = false;
  }
}

document.getElementById("enableSoundBtn")
  .addEventListener("click", enableSound);

// 初回取得時に、すでに呼び出し中の番号があっても
// 過去の呼び出し音を鳴らさない
loadDashboard();
setInterval(loadDashboard, 10000);
