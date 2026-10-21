
let adminPin = "";

const loginCard = document.getElementById("loginCard");
const adminPanel = document.getElementById("adminPanel");
const loginMessage = document.getElementById("loginMessage");
const adminMessage = document.getElementById("adminMessage");

async function adminAction(action, params = {}) {
  return api(action, { ...params, pin: adminPin });
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const candidate = document.getElementById("pin").value.trim();

  if (!candidate) {
    loginMessage.textContent = "PINを入力してください。";
    loginMessage.className = "message error";
    return;
  }

  try {
    // 認証専用の処理。ブースの状態は変更しない
    await api("login", { pin: candidate });

    adminPin = candidate;
    loginCard.hidden = true;
    adminPanel.hidden = false;
    await loadAdmin();
  } catch (error) {
    adminPin = "";
    loginMessage.textContent = error.message;
    loginMessage.className = "message error";
  }
});

async function loadAdmin() {
  try {
    const data = await api("status");
    renderBooths(data);
    renderTickets(data);

    const closed = data.settings?.本日終了 === "true";
    document.getElementById("registerBtn").disabled = closed;

    document.getElementById("closeDayBtn").disabled = closed;
    document.getElementById("closeDayBtn").textContent =
      closed ? "本日の個別相談は終了済み" : "本日の個別相談を終了";

    adminMessage.textContent = closed
      ? "本日の個別相談は終了しています。"
      : "最新情報を取得しました。";
    adminMessage.className = "message success";
  } catch (error) {
    adminMessage.textContent = error.message;
    adminMessage.className = "message error";
  }
}

function renderBooths(data) {
  document.getElementById("adminBooths").innerHTML =
    data.booths.map(b => {
      const active = data.tickets.filter(t =>
        t.booth === b.booth &&
        ["呼出中", "相談中"].includes(t.status)
      );

      return `
        <div class="card admin-booth">
          <h3>${escapeHTML(b.booth)}ブース</h3>
          <div class="form-row">
            <label for="boothStatus${b.booth}">ブース状態</label>
            <select id="boothStatus${b.booth}">
              ${["準備中", "相談中", "本日なし"].map(s =>
                `<option ${b.status === s ? "selected" : ""}>${s}</option>`
              ).join("")}
            </select>
          </div>
          <div class="muted small">
            呼び出し・相談中：${active.length
              ? active.map(t => escapeHTML(t.ticket)).join("・")
              : "なし"}
          </div>
          <div class="actions">
            <button class="btn secondary" data-set="${b.booth}">状態を保存</button>
            <button class="btn" data-call="${b.booth}"
              ${data.settings?.本日終了 === "true" ? "disabled" : ""}>
              次を呼び出す
            </button>
          </div>
        </div>`;
    }).join("");

  document.querySelectorAll("[data-set]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const booth = btn.dataset.set;
      const status = document.getElementById("boothStatus" + booth).value;
      await runAction(() => adminAction("setBooth", { booth, status }));
    });
  });

  document.querySelectorAll("[data-call]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await runAction(async () => {
        const result = await adminAction("callNext", {
          booth: btn.dataset.call
        });
        alert(result.ticket + " を呼び出しました！");
        return result;
      });
    });
  });
}

function renderTickets(data) {
  const rows = data.tickets.slice().sort((a, b) =>
    a.booth.localeCompare(b.booth, "ja") || a.sequence - b.sequence
  );

  document.getElementById("ticketRows").innerHTML = rows.map(t => `
    <tr>
      <td><strong>${escapeHTML(t.ticket)}</strong></td>
      <td>${escapeHTML(t.booth)}</td>
      <td>
        <input type="time"
          aria-label="${escapeHTML(t.ticket)}の開始予定"
          id="time-${escapeHTML(t.ticket)}"
          value="${t.startAt ? formatTime(t.startAt) : ""}">
        <button class="btn secondary" data-time="${escapeHTML(t.ticket)}">
          時刻保存
        </button>
      </td>
      <td>
        <span class="pill status-${escapeHTML(t.status)}">
          ${escapeHTML(t.status)}
        </span>
      </td>
      <td>
        <div class="actions">
          ${t.status === "呼出中" ? `
            <button class="btn success" data-start="${escapeHTML(t.ticket)}">
              相談開始
            </button>` : ""}
          ${["相談中", "呼出中"].includes(t.status) ? `
            <button class="btn danger" data-finish="${escapeHTML(t.ticket)}">
              相談終了
            </button>` : ""}
        </div>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("[data-time]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const ticket = btn.dataset.time;
      const time = document.getElementById("time-" + ticket).value;
      if (!time) return alert("開始時刻を入力してください。");

      const [hour, minute] = time.split(":").map(Number);
      const d = new Date();
      d.setHours(hour, minute, 0, 0);

      await runAction(() => adminAction("updateTime", {
        ticket,
        startAt: d.toISOString()
      }));
    });
  });

  document.querySelectorAll("[data-start]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await runAction(() => adminAction("start", {
        ticket: btn.dataset.start
      }));
    });
  });

  document.querySelectorAll("[data-finish]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm(btn.dataset.finish + " の相談を終了しますか？")) return;
      await runAction(() => adminAction("finish", {
        ticket: btn.dataset.finish
      }));
    });
  });
}

async function runAction(callback) {
  try {
    await callback();
    await loadAdmin();
  } catch (error) {
    adminMessage.textContent = error.message;
    adminMessage.className = "message error";
  }
}

document.getElementById("registerBtn").addEventListener("click", async () => {
  const booth = document.getElementById("registerBooth").value;

  try {
    const data = await adminAction("register", { booth });
    document.getElementById("registerMessage").textContent =
      "受付番号 " + data.ticket + " を発行しました。開始予定：" +
      formatTime(data.startAt);
    document.getElementById("registerMessage").className = "message success";
    await loadAdmin();
  } catch (error) {
    document.getElementById("registerMessage").textContent = error.message;
    document.getElementById("registerMessage").className = "message error";
  }
});

document.getElementById("reloadBtn").addEventListener("click", loadAdmin);

document.getElementById("closeDayBtn").addEventListener("click", async () => {
  const confirmed = confirm(
    "本日の個別相談を終了します。\n" +
    "新規受付・新しい呼び出しができなくなります。\n" +
    "相談中または呼び出し中の来客者がいないことを確認してください。\n\n" +
    "終了してよろしいですか？"
  );

  if (!confirmed) return;

  await runAction(() => adminAction("closeDay"));
});

document.getElementById("clearTicketsBtn").addEventListener("click", async () => {
  const confirmed = confirm(
    "相談予約一覧を削除します。\n" +
    "この操作で予約データが消去されます。\n" +
    "相談中・呼び出し中の来客者がいる場合は削除できません。\n\n" +
    "本当に削除しますか？"
  );

  if (!confirmed) return;

  const secondConfirmation = prompt(
    "削除を実行するには「削除」と入力してください。"
  );

  if (secondConfirmation !== "削除") {
    alert("削除をキャンセルしました。");
    return;
  }

  await runAction(() => adminAction("clearTickets"));
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  adminPin = "";
  document.getElementById("pin").value = "";
  loginCard.hidden = false;
  adminPanel.hidden = true;
});

setInterval(() => {
  if (!adminPanel.hidden) loadAdmin();
}, 15000);
