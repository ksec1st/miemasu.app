const ticketSelect = document.getElementById("ticketSelect");
const refreshBtn = document.getElementById("refreshBtn");
const result = document.getElementById("result");
const message = document.getElementById("message");

async function loadTicketOptions() {
  try {
    const data = await api("status");
    const previous = ticketSelect.value;

    const active = data.tickets.filter(t => t.status !== "完了");

    ticketSelect.innerHTML =
      '<option value="">受付番号を選択してください</option>' +
      active.map(t =>
        `<option value="${escapeHTML(t.ticket)}">${escapeHTML(t.ticket)}（${escapeHTML(t.booth)}ブース）</option>`
      ).join("");

    if (active.some(t => t.ticket === previous)) {
      ticketSelect.value = previous;
    }
  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";
  }
}

async function refreshVisitor() {
  const ticket = ticketSelect.value;

  if (!ticket) {
    message.textContent = "受付番号を選択してください。";
    message.className = "message error";
    result.hidden = true;
    return;
  }

  refreshBtn.disabled = true;
  message.textContent = "状況を確認しています...";
  message.className = "message";

  try {
    const data = await api("visitor", { ticket });

    document.getElementById("ticket").textContent = data.ticket;

    const statusEl = document.getElementById("status");
    statusEl.textContent = data.status;
    statusEl.className = "pill status-" + data.status;

    document.getElementById("statusMessage").textContent = data.message;
    document.getElementById("startTime").textContent = formatTime(data.startAt);
    document.getElementById("boothText").textContent =
      data.booth + "ブースでのご相談です。";

    result.hidden = false;
    message.textContent = "最新の状況を取得しました。";
    message.className = "message success";
  } catch (error) {
    result.hidden = true;
    message.textContent = error.message;
    message.className = "message error";
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", refreshVisitor);
loadTicketOptions();
