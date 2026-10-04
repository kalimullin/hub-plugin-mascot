// Маскот — плагин страницы Agents Hub (EXTENDING.md, API 1.x): пиксельный персонаж в шапке боковой панели показывает
// состояние всего флота одним взглядом — ждёт вас → работает → спит. Спрайт — данные в mascot-sprite.js (замените
// своим); здесь — логика состояний и сборка: пиксель — rect в SVG, кадры переключает CSS steps. Клик ничего не делает,
// подсказка — сводка по сессиям. Место — `sidebar.header` (API 1.5: строка «Хаб сессий», справа); хаб старше — подвал
// боковой панели (`sidebar.footer`).
import SPRITE from "./mascot-sprite.js";

function svg(rows, pal, px) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  let rects = "";
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (pal[ch]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[ch]}"/>`;
  }));
  return `<svg viewBox="0 0 ${w} ${h}" width="${w * px}" height="${h * px}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

// кадр i из n виден в своей доле цикла; правила — один раз на каждое n
const made = new Set();
function keyframes(n) {
  if (n < 2 || made.has(n)) return;
  made.add(n);
  let css = "";
  for (let i = 0; i < n; i++) {
    const a = (100 * i) / n, b = (100 * (i + 1)) / n;
    css += `@keyframes mascot-f${n}-${i} { 0% { opacity: ${i ? 0 : 1}; } ${a}% { opacity: 1; } ${b}% { opacity: 0; } 100% { opacity: ${i === n - 1 ? 1 : 0}; } }`;
  }
  const st = document.createElement("style");
  st.textContent = css;
  document.head.append(st);
}

function sprite(state, sp = SPRITE) {
  const { frames, seconds = 1, mark } = sp.states[state];
  const n = frames.length;
  keyframes(n);
  const fs = frames.map((f, i) => `<span class="f" style="${n > 1 ? `animation:mascot-f${n}-${i} ${seconds}s steps(1,end) infinite;` : ""}${i ? "opacity:0" : ""}">${svg(f, sp.palette, sp.px)}</span>`).join("");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  // знак текстом (IBM Plex Mono 700): покачивается сверху справа или два уплывают вверх вправо со сдвигом
  const add = !mark ? "" : mark.motion === "drift"
    ? [0, 1].map((k) => `<span class="mt drift${k ? " d2" : ""}" style="color:${esc(mark.color)};--d:${seconds}s">${esc(mark.text)}</span>`).join("")
    : `<span class="mt bob" style="color:${esc(mark.color)}">${esc(mark.text)}</span>`;
  return `<span class="spr">${fs}${add}</span>`;
}

// «ждёт вас» — вопрос формой (карточка в pending), запрос инструмента, догадка сторожа, запрос разрешения посреди хода;
// упавшая сессия — тоже «ждёт вас»: что-то требует внимания
const needsOwner = (s) => (s.requests || []).filter((r) => r.state === "needs-owner");
const waits = (s) => (s.pending || []).length || needsOwner(s).length || s.attention || s.state === "dialog" || s.state === "failed";
const works = (s) => ["busy", "starting"].includes(s.state);

export function fleetState(sessions) {
  if (sessions.some(waits)) return "wait";
  if (sessions.some(works)) return "work";
  return "sleep";
}

const newer = (api, want) => {
  const [a, b] = String(api || "0").split(".").map(Number), [x, y] = want.split(".").map(Number);
  return a > x || (a === x && (b || 0) >= y);
};

export default function register(hub) {
  hub.addStyle("mascot.css");
  const slot = newer(hub.api, "1.5") ? "sidebar.header" : "sidebar.footer";
  hub.addSlot(slot, {
    id: "mascot",
    render(root, snap) {
      // root живёт между снимками: тот же спрайт не пересобираем, иначе кадры начнутся заново
      root.classList.add("mascot", slot === "sidebar.header" ? "in-header" : "in-footer");
      root.setAttribute("role", "img");
      const all = snap?.sessions || [];
      const state = fleetState(all);
      const nWait = all.filter(waits).length, nWork = all.filter((s) => works(s) && !waits(s)).length;
      root.title = `Работают ${nWork} · ждут вас ${nWait} · спят ${all.length - nWork - nWait}`;
      root.setAttribute("aria-label", `Состояние сессий: ${root.title}`);
      if (root.dataset.state === state) return;
      root.dataset.state = state;
      root.innerHTML = sprite(state);
    },
  });
}
