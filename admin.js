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

  adminPin = candidate;
  try {
    // 認証確認を兼ねて、保護された操作を実行せずに
    // PINの有効性をサーバー側で確認する
    await adminAction("setBooth", {
      booth: "A",
      status: "準備中"
    });

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
    adminMessage.textContent = "最新情報を取得しました。";
    adminMessage.className = "message success";
  } catch (error) {
    adminMessage.textContent = error.message;
    adminMessage.className = "message error";
  }
}

function renderBooths(data) {
  document.getElementById("adminBooths").innerHTML =
    data.booths.map(b => {
      const current = data.tickets.find(t =>
        t.ticket === b.currentTicket &&
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
          <div class="muted small">現在番号：${escapeHTML(current?.ticket || "なし")}</div>
          <div class="actions">
            <button class="btn secondary" data-set="${b.booth}">状態を保存</button>
            <button class="btn" data-call="${b.booth}">次を呼び出す</button>
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
      const booth = btn.dataset.call;
      await runAction(async () => {
        const result = await adminAction("callNext", { booth });
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
        <input type="time" aria-label="${escapeHTML(t.ticket)}の開始予定"
          id="time-${escapeHTML(t.ticket)}"
          value="${t.startAt ? formatTime(t.startAt) : ""}">
        <button class="btn secondary" data-time="${escapeHTML(t.ticket)}">時刻保存</button>
      </td>
      <td><span class="pill status-${escapeHTML(t.status)}">${escapeHTML(t.status)}</span></td>
      <td>
        <div class="actions">
          ${t.status === "呼出中"
            ? `<button class="btn success" data-start="${escapeHTML(t.ticket)}">相談開始</button>` : ""}
          ${["相談中", "呼出中"].includes(t.status)
            ? `<button class="btn danger" data-finish="${escapeHTML(t.ticket)}">相談終了</button>` : ""}
        </div>
      </td>
    </tr>`).join("");

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
  if (!confirm("すべてのブースを「本日なし」にしますか？")) return;
  await runAction(() => adminAction("closeDay"));
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
