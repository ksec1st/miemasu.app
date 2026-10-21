/* api.js */
const API_URL = "https://script.google.com/macros/s/AKfycbwoso8Ggy5njTRqEpQdozOmh0oFcc7BFl7PuAqM1YJfqOXFemSHwI9nDjBkwEkANgK9XA/exec";

function api(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callback = "ocCallback" + Date.now() +
      Math.floor(Math.random() * 100000);

    const query = new URLSearchParams({
      action,
      ...params,
      callback
    });

    const script = document.createElement("script");
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("通信がタイムアウトしました"));
    }, 15000);

    function cleanup() {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
    }

    window[callback] = data => {
      cleanup();
      if (data && data.ok) resolve(data);
      else reject(new Error(data?.message || "処理に失敗しました"));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("サーバーに接続できませんでした"));
    };

    script.src = API_URL + "?" + query.toString();
    document.body.appendChild(script);
  });
}

function formatTime(iso) {
  if (!iso) return "未設定";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "未設定";
  return d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}
