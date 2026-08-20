// ---------- partial include (header / footer / contact form) ----------

async function includePartials() {
  const nodes = document.querySelectorAll("[data-include]");
  await Promise.all(
    Array.from(nodes).map(async (node) => {
      const src = node.getAttribute("data-include");
      const base = src.slice(0, src.indexOf("components/"));
      try {
        const res = await fetch(src);
        const html = await res.text();
        node.outerHTML = html.replaceAll("{{base}}", base);
      } catch (err) {
        console.error("include failed:", src, err);
      }
    })
  );
}

// ---------- nav ----------

function initNav() {
  const toggle = document.getElementById("nav-toggle");
  const close = document.getElementById("nav-close");
  const menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => menu.classList.add("is-open"));
  if (close) close.addEventListener("click", () => menu.classList.remove("is-open"));

  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => menu.classList.remove("is-open"));
  });
}

// ---------- contact form ----------

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("cf-status");
    const data = new FormData(form);

    if (form.action.includes("YOUR_FORM_ID")) {
      status.textContent = "フォーム送信先が未設定です（README を確認してください）";
      status.style.color = "#a35a5a";
      return;
    }

    status.textContent = "送信中...";
    status.style.color = "";

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        status.textContent = "送信しました。ご連絡ありがとうございます、LINEまたはメールでご返信します。";
        status.style.color = "#4f5a3e";
        form.reset();
      } else {
        status.textContent = "送信に失敗しました。時間をおいて再度お試しください。";
        status.style.color = "#a35a5a";
      }
    } catch (err) {
      status.textContent = "送信に失敗しました。通信環境をご確認ください。";
      status.style.color = "#a35a5a";
    }
  });
}

// ---------- calendar ----------

const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const EVENTS_URL = "data/events.json";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateKey(y, m, d) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

async function loadEvents() {
  try {
    const res = await fetch(EVENTS_URL);
    const events = await res.json();
    return events.sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error("events load failed", err);
    return [];
  }
}

function renderMonthGrid(gridEl, labelEl, year, month, eventsByDate, today, onDayClick) {
  labelEl.textContent = `${year}年${month + 1}月`;
  gridEl.innerHTML = "";

  DOW.forEach((d) => {
    const el = document.createElement("div");
    el.className = "dow";
    el.textContent = d;
    gridEl.appendChild(el);
  });

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDow; i++) {
    const el = document.createElement("div");
    el.className = "day empty";
    gridEl.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatDateKey(year, month, d);
    const el = document.createElement("div");
    el.className = "day";
    el.textContent = d;

    if (key === today) el.classList.add("today");
    if (eventsByDate[key]) {
      el.classList.add("has-event");
      el.title = eventsByDate[key].map((e) => e.title).join(" / ");
      el.addEventListener("click", () => onDayClick && onDayClick(key));
    }
    gridEl.appendChild(el);
  }
}

function eventDateLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  return { m: `${parseInt(m, 10)}月`, d: parseInt(d, 10) };
}

function renderEventList(listEl, events, { emptyText = "現在募集中のイベントはありません。" } = {}) {
  listEl.innerHTML = "";
  if (!events.length) {
    const p = document.createElement("p");
    p.className = "empty-note";
    p.textContent = emptyText;
    listEl.appendChild(p);
    return;
  }

  events.forEach((ev) => {
    const { m, d } = eventDateLabel(ev.date);
    const full = ev.remaining <= 0;
    const card = document.createElement("div");
    card.className = "event-card" + (full ? " full" : "");
    const applyLink = !full && ev.lineUrl
      ? `<a href="${ev.lineUrl}" target="_blank" rel="noopener" class="link-arrow">LINEで申し込む →</a>`
      : "";

    // 時間・場所・料金のうち、入力されているものだけを並べる
    const meta = [];
    if (ev.time) meta.push(ev.time);
    if (ev.place) meta.push(ev.place);
    if (ev.price != null) meta.push(`¥${ev.price.toLocaleString()}（税込）`);

    card.innerHTML = `
      <div class="date-badge"><span class="d">${d}</span><span class="m">${m}</span></div>
      <div>
        <h4>${ev.title}</h4>
        ${meta.length ? `<p>${meta.join("　")}</p>` : ""}
        <div class="slots">${full ? "満席" : `残り${ev.remaining}枠 / 定員${ev.capacity}名`}</div>
        ${applyLink}
      </div>
    `;
    listEl.appendChild(card);
  });
}

async function initCalendarPage() {
  const root = document.querySelector("[data-calendar]");
  if (!root) return;

  const mode = root.getAttribute("data-calendar"); // "full" | "compact"
  const gridEl = root.querySelector(".calendar-grid");
  const labelEl = root.querySelector(".month-label");
  const prevBtn = root.querySelector(".prev-month");
  const nextBtn = root.querySelector(".next-month");
  const listEl = document.querySelector(root.getAttribute("data-list-target") || "#event-list");

  const events = await loadEvents();
  const eventsByDate = {};
  events.forEach((ev) => {
    (eventsByDate[ev.date] = eventsByDate[ev.date] || []).push(ev);
  });

  const now = new Date();
  const todayKey = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();

  function draw() {
    renderMonthGrid(gridEl, labelEl, viewYear, viewMonth, eventsByDate, todayKey, (dateKey) => {
      const target = document.getElementById(`event-${dateKey}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      viewMonth -= 1;
      if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
      draw();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      viewMonth += 1;
      if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
      draw();
    });
  }

  draw();

  if (listEl) {
    const upcoming = events.filter((ev) => ev.date >= todayKey);
    const list = mode === "compact" ? upcoming.slice(0, 2) : upcoming;
    renderEventList(listEl, list);
    list.forEach((ev, i) => {
      const cards = listEl.querySelectorAll(".event-card");
      if (cards[i]) cards[i].id = `event-${ev.date}`;
    });
  }
}

// ---------- boot ----------

document.addEventListener("DOMContentLoaded", async () => {
  await includePartials();
  initNav();
  initContactForm();
  initCalendarPage();
});
