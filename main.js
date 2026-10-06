// Маскот — плагин страницы Agents Hub (EXTENDING.md, API 1.x): фиолетовое «облачко» с белыми глазами в шапке боковой
// панели, симметрично аватару слева (32 px), показывает состояние флота: ждёт вас → работает → спит. Векторно (SVG):
// тело — круги одной заливки (формы — shapes.js), анимации — CSS (mascot.css): работает — моргает и поглядывает,
// ждёт вас — покачивается, спит — глаза закрыты, медленно дышит. Клик ничего не делает, подсказка — сводка по сессиям.
// Место — `sidebar.header` (API 1.5); хаб старше — подвал боковой панели (`sidebar.footer`).
import { SHAPES } from "./shapes.js";

const SHAPE = "cloud";   // какая форма из shapes.js

function svg(shape) {
  const { circles, eyes } = SHAPES[shape];
  const body = circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("");
  const open = eyes.map(([x, y]) => `<ellipse class="m-eye" cx="${x}" cy="${y}" rx="5.8" ry="8.2"/>`).join("");
  const shut = eyes.map(([x, y]) => `<path class="m-shut" d="M${x - 6} ${y + 1} q6 5 12 0"/>`).join("");
  return `<svg viewBox="0 0 100 100" width="32" height="32" aria-hidden="true"><g class="m-body">${body}</g>` +
    `<g class="m-eyes">${open}</g><g class="m-closed">${shut}</g></svg>`;
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
      root.classList.add("mascot", slot === "sidebar.header" ? "in-header" : "in-footer");
      root.setAttribute("role", "img");
      if (!root.firstChild) root.innerHTML = svg(SHAPE);   // один раз: root живёт между снимками, анимация не сбрасывается
      const all = snap?.sessions || [];
      const nWait = all.filter(waits).length, nWork = all.filter((s) => works(s) && !waits(s)).length;
      root.title = `Работают ${nWork} · ждут вас ${nWait} · спят ${all.length - nWork - nWait}`;
      root.setAttribute("aria-label", `Состояние сессий: ${root.title}`);
      root.dataset.state = fleetState(all);
    },
  });
}
