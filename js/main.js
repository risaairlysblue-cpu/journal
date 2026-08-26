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

// フォームの内容をスプレッドシートにも記録する（Apps ScriptのウェブアプリURL）。
// 空のあいだは記録をスキップするだけで、フォーム送信そのものには影響しない
const SHEET_ENDPOINT = "";

function logToSheet(form, data) {
  if (!SHEET_ENDPOINT || !form.dataset.sheet) return;
  const body = new FormData();
  for (const [k, v] of data.entries()) body.append(k, v);
  body.append("_sheet", form.dataset.sheet);
  // 記録は補助なので、失敗してもフォーム送信は成功のままにする
  fetch(SHEET_ENDPOINT, { method: "POST", mode: "no-cors", body }).catch((err) => {
    console.warn("sheet log failed", err);
  });
}

function initForms() {
  // ページ内のすべての ajax フォームに同じ送信処理をつける
  document.querySelectorAll("form.ajax-form").forEach((form) => {
    const status = form.querySelector(".form-status");
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);

      if (form.action.includes("YOUR_FORM_ID")) {
        setStatus(status, "フォーム送信先が未設定です（README を確認してください）", "#a35a5a");
        return;
      }

      setStatus(status, "送信中...", "");
      if (button) button.disabled = true;

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          logToSheet(form, data);
          setStatus(status, form.dataset.doneText
            || "送信しました。ご連絡ありがとうございます、LINEまたはメールでご返信します。", "#4f5a3e");
          form.reset();
        } else {
          setStatus(status, "送信に失敗しました。時間をおいて再度お試しください。", "#a35a5a");
        }
      } catch (err) {
        setStatus(status, "送信に失敗しました。通信環境をご確認ください。", "#a35a5a");
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
}

function setStatus(el, text, color) {
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

// ---------- calendar ----------

const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const EVENTS_URL = "data/events.json";

// イベントの種別。listed:false のものは「今後のイベント」に出さず、
// カレンダー上の印と詳細だけで案内する
const EVENT_KINDS = {
  nukumori: { short: "ぬくもり", label: "ぬくもり発達相談会", listed: true },
  group:    { short: "グループ", label: "グループレッスン",   listed: true },
  private:  { short: "個別",     label: "個別レッスン",       listed: false },
};

function kindOf(ev) {
  return EVENT_KINDS[ev.kind] ? ev.kind : "nukumori";
}

function yen(n) {
  return `¥${n.toLocaleString()}`;
}

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
    el.dataset.date = key;
    const num = document.createElement("span");
    num.className = "day-num";
    num.textContent = d;
    el.appendChild(num);

    if (key === today) el.classList.add("today");

    const dayEvents = eventsByDate[key];
    if (dayEvents) {
      el.classList.add("has-event");
      el.title = dayEvents.map((e) => e.title).join(" / ");
      // 種別ごとの印。同じ種別が重なっても印は1つにまとめる
      const marks = [...new Set(dayEvents.map(kindOf))];
      const dots = document.createElement("span");
      dots.className = "day-marks";
      marks.forEach((k) => {
        const dot = document.createElement("i");
        dot.className = `mark mark-${k}`;
        dots.appendChild(dot);
      });
      el.appendChild(dots);
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.addEventListener("click", () => onDayClick && onDayClick(key));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDayClick && onDayClick(key); }
      });
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
    // 定員が未入力のイベントもあるので、数値が入っているときだけ満席判定する
    const hasSlots = ev.remaining != null && ev.capacity != null;
    const full = hasSlots && ev.remaining <= 0;
    const card = document.createElement("div");
    card.className = "event-card" + (full ? " full" : "");
    // applyUrl（サイト内の申し込みフォーム）があればそちらを優先する
    const href = ev.applyUrl || ev.lineUrl;
    const isExternal = href && /^https?:/.test(href);
    const label = ev.applyLabel || (ev.applyUrl ? "申し込む →" : "LINEで申し込む →");
    const applyLink = !full && href
      ? `<a href="${href}"${isExternal ? ' target="_blank" rel="noopener"' : ""} class="link-arrow">${label}</a>`
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
        ${hasSlots ? `<div class="slots">${full ? "満席" : `残り${ev.remaining}枠 / 定員${ev.capacity}名`}</div>` : ""}
        ${applyLink}
      </div>
    `;
    listEl.appendChild(card);
  });
}

// ---------- イベント申し込みフォームの日程欄 ----------

async function initEventForm() {
  const select = document.getElementById("ef-date");
  if (!select) return;

  const keyword = select.dataset.filter || "";
  const events = await loadEvents();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events.filter((ev) => {
    if (keyword && !ev.title.includes(keyword)) return false;
    if (new Date(ev.date) < today) return false;
    return !(ev.remaining != null && ev.remaining <= 0);
  });

  select.innerHTML = "";

  if (!upcoming.length) {
    select.insertAdjacentHTML("beforeend",
      '<option value="次回の日程が決まり次第の連絡希望">次回の日程が決まり次第、連絡がほしい</option>');
    const note = document.getElementById("ef-empty");
    if (note) note.hidden = false;
    return;
  }

  select.insertAdjacentHTML("beforeend", '<option value="">選択してください</option>');
  upcoming.forEach((ev) => {
    const { m, d } = eventDateLabel(ev.date);
    const wd = "日月火水木金土"[new Date(ev.date).getDay()];
    const label = `${m}${d}日（${wd}） ${ev.time || ""}　${ev.place || ""}`.trim();
    select.insertAdjacentHTML("beforeend", `<option value="${label}">${label}</option>`);
  });
  select.insertAdjacentHTML("beforeend",
    '<option value="日程は相談したい">この中に都合の合う日がない／相談したい</option>');
}

// ---------- 選んだ日の詳細 ----------

function renderDayDetail(el, dateKey, dayEvents) {
  if (!el) return;

  if (!dayEvents || !dayEvents.length) {
    el.innerHTML = '<p class="detail-hint">印のついた日をタップすると、その日の予定が表示されます。</p>';
    return;
  }

  const [y, m, d] = dateKey.split("-").map(Number);
  const wd = "日月火水木金土"[new Date(y, m - 1, d).getDay()];

  const items = dayEvents.map((ev) => {
    const k = kindOf(ev);
    const rows = [];
    if (ev.time) rows.push(ev.time);
    if (ev.place) rows.push(ev.place);
    if (ev.price != null) rows.push(`${yen(ev.price)}（税込）`);
    if (ev.note) rows.push(ev.note);

    const href = ev.applyUrl || ev.lineUrl;
    const isExternal = href && /^https?:/.test(href);
    const full = ev.remaining != null && ev.remaining <= 0;
    const link = !full && href
      ? `<a href="${href}"${isExternal ? ' target="_blank" rel="noopener"' : ""} class="link-arrow">${ev.applyLabel || "詳しく見る →"}</a>`
      : (full ? '<span class="detail-full">満席</span>' : "");

    return `
      <div class="detail-item">
        <p class="detail-kind"><i class="mark mark-${k}"></i>${EVENT_KINDS[k].label}</p>
        ${rows.map((r) => `<p class="detail-row">${r}</p>`).join("")}
        ${link}
      </div>`;
  });

  el.innerHTML = `<p class="detail-date">${m}月${d}日（${wd}）</p>${items.join("")}`;
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

  const detailEl = document.querySelector(root.getAttribute("data-detail-target") || "");

  function selectDay(dateKey) {
    if (detailEl) {
      renderDayDetail(detailEl, dateKey, eventsByDate[dateKey]);
      gridEl.querySelectorAll(".day.is-selected").forEach((n) => n.classList.remove("is-selected"));
      const cell = [...gridEl.querySelectorAll(".day")].find((n) => n.dataset.date === dateKey);
      if (cell) cell.classList.add("is-selected");
      return;
    }
    // 詳細パネルがないページでは、一覧の該当カードへ移動する
    const target = document.getElementById(`event-${dateKey}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function draw() {
    renderMonthGrid(gridEl, labelEl, viewYear, viewMonth, eventsByDate, todayKey, selectDay);
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

  if (detailEl) {
    const next = events.find((ev) => ev.date >= todayKey);
    if (next) {
      // 直近の予定がある月を開いておく
      const [ny, nm] = next.date.split("-").map(Number);
      if (ny !== viewYear || nm - 1 !== viewMonth) {
        viewYear = ny; viewMonth = nm - 1; draw();
      }
      selectDay(next.date);
    } else {
      renderDayDetail(detailEl, null, null);
    }
  }

  if (listEl) {
    const upcoming = events.filter((ev) => ev.date >= todayKey && EVENT_KINDS[kindOf(ev)].listed);
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
  initForms();
  initCalendarPage();
  initEventForm();
});
