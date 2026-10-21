async function loadDashboard() {
  const callout = document.getElementById("callout");
  const grid = document.getElementById("boothGrid");

  try {
    const data = await api("status");

    const activeCalls = data.tickets.filter(t => t.status === "呼出中");
    const next = activeCalls.sort((a, b) =>
      a.booth.localeCompare(b.booth, "ja"))[0];

    if (next) {
      callout.innerHTML = `
        <div class="callout-label">NOW CALLING</div>
        <div class="callout-ticket">${escapeHTML(next.ticket)}</div>
        <div class="callout-booth">${escapeHTML(next.booth)}ブースへお越しください</div>`;
    } else {
      const available = data.booths.filter(b =>
        b.status === "準備中" &&
        !data.tickets.some(t =>
          t.booth === b.booth &&
          ["呼出中", "相談中"].includes(t.status)
        )
      );

      callout.innerHTML = `
        <div class="callout-label">CONSULTATION GUIDE</div>
        <div class="empty-callout">現在、呼び出しはありません</div>
        <p>${available.length
          ? "準備中のブース：" + available.map(b => escapeHTML(b.booth)).join("・")
          : "各ブースの状況をご確認ください"}</p>`;
    }

    grid.innerHTML = data.booths.map(b => {
      const current = data.tickets.find(t =>
        t.ticket === b.currentTicket &&
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
            ${current ? escapeHTML(current.ticket) : "—"}
          </div>
          <div class="muted small">
            ${current ? "現在の相談番号" : "現在の相談番号なし"}
          </div>
        </div>`;
    }).join("");

    document.getElementById("updatedAt").textContent =
      "最終更新：" + new Date().toLocaleTimeString("ja-JP");

  } catch (error) {
    callout.innerHTML = `<div class="empty-callout">情報を取得できません</div>`;
    document.getElementById("updatedAt").textContent = error.message;
  }
}

loadDashboard();
setInterval(loadDashboard, 30000);
