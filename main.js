// Mascot — an Agents Hub page plugin (EXTENDING.md, API 1.x): a purple "cloud" with white eyes in the sidebar header,
// opposite the avatar on the left (37 px — 1.15 times bigger, the same offset from the edge), shows the state of the
// fleet: waiting for you → working → asleep. Vector (SVG): the body is circles of one fill (shapes in shapes.js).
//
// The animation is driven by its own requestAnimationFrame loop from a shared clock, not by CSS: the page re-inserts the
// place's element on every core snapshot, and CSS animations would restart each time — jerky motion. Only the SVG
// transform attributes change — no layout recalculation. Liveliness: each bubble breathes at its own rhythm; the eyes
// blink at random intervals (sometimes twice), follow the cursor or look around by themselves; the expression follows
// the state (working — squinting, "reading"; waiting for you — eyes wider, looks at you and sways; asleep — eyes closed,
// breathing); a click — a jump with squash and stretch and happy "^ ^" eyes. "Reduce motion" — static, no jump.
// Place — `sidebar.header` (API 1.5); an older hub — the sidebar footer (`sidebar.footer`).
import { SHAPES } from "./shapes.js";

const SHAPE = "cloud";   // which shape from shapes.js
const NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (x) => x * x * (3 - 2 * x);           // 0..1 → 0..1 without a jerk at the ends
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function node(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent?.append(n);
  return n;
}

// "waiting for you" — a question as a form (a card in pending), a tool request, the watchdog's guess, a permission
// request in the middle of a turn; a crashed session is "waiting for you" too: something needs attention
const needsOwner = (s) => (s.requests || []).filter((r) => r.state === "needs-owner");
const waits = (s) => (s.pending || []).length || needsOwner(s).length || s.attention || s.state === "dialog" || s.state === "failed";
const works = (s) => ["busy", "starting"].includes(s.state);

export function fleetState(sessions) {
  if (sessions.some(waits)) return "wait";
  if (sessions.some(works)) return "work";
  return "sleep";
}

class Mascot {
  constructor(root) {
    this.root = root;
    this.state = "sleep";
    const { circles, eyes } = SHAPES[SHAPE];
    this.svg = node("svg", { viewBox: "0 0 100 100", width: 37, height: 37, "aria-hidden": "true" });
    this.whole = node("g", {}, this.svg);                        // jump, sway — the whole body with the eyes
    const body = node("g", { class: "m-body" }, this.whole);
    this.bubs = circles.map(([x, y, r], i) => ({ x, y, el: node("circle", { cx: x, cy: y, r }, body),
      f1: 0.11 + ((i * 0.037) % 0.07), f2: 0.23 + ((i * 0.053) % 0.09), p1: i * 1.7, p2: i * 2.9 }));
    this.eyes = eyes.map(([x, y]) => {
      const g = node("g", {}, this.whole);
      const open = node("ellipse", { class: "m-eye", cx: 0, cy: 0, rx: 5.8, ry: 8.2 }, g);
      const shut = node("path", { class: "m-shut", d: "M-6 1 q6 5 12 0" }, g);      // asleep: arcs down
      const happy = node("path", { class: "m-shut", d: "M-6 3 q6 -8 12 0" }, g);    // after a click: "^ ^"
      return { x, y, g, open, shut, happy };
    });
    this.gaze = [0, 0]; this.look = [0, 0]; this.nextLook = 0;
    this.blinkAt = performance.now() / 1000 + rnd(1.5, 4); this.blinkT = -1; this.double = false;
    this.jumpT = -1; this.mouse = null;
    root.replaceChildren(this.svg);
    root.addEventListener("click", () => { if (!calm()) this.jumpT = performance.now() / 1000; });
    document.addEventListener("pointermove", (e) => { this.mouse = [e.clientX, e.clientY, performance.now() / 1000]; },
      { passive: true });
    this.last = performance.now() / 1000;
    const tick = () => { this.frame(performance.now() / 1000); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  frame(t) {
    const dt = Math.min(0.05, t - this.last); this.last = t;
    const still = calm(), st = this.state;

    // bubbles: two slow sine waves each — the silhouette flows, with no repeating pattern
    for (const b of this.bubs) {
      const s = still ? 1 : 1 + 0.055 * Math.sin(TAU * b.f1 * t + b.p1) + 0.025 * Math.sin(TAU * b.f2 * t + b.p2);
      const dx = still ? 0 : 1.1 * Math.sin(TAU * b.f2 * t + b.p1), dy = still ? 0 : 1.1 * Math.cos(TAU * b.f1 * t + b.p2);
      b.el.setAttribute("transform", `translate(${(b.x + dx).toFixed(2)} ${(b.y + dy).toFixed(2)}) scale(${s.toFixed(4)}) translate(${-b.x} ${-b.y})`);
    }

    // body: waiting — sways; asleep — breathes; working — barely moves; a click — a jump with squash and stretch
    let y = 0, rot = 0, sx = 1, sy = 1;
    if (!still) {
      if (st === "wait") { y = -2.2 * (0.5 - 0.5 * Math.cos(TAU * 0.9 * t)); rot = 5 * Math.sin(TAU * 0.45 * t); }
      else if (st === "sleep") { const b = Math.sin(TAU * 0.22 * t); sx = 1 + 0.03 * b; sy = 1 - 0.025 * b; }
      else rot = 1.2 * Math.sin(TAU * 0.18 * t);
      if (this.jumpT >= 0) {
        const p = (t - this.jumpT) / 0.9;
        if (p >= 1) this.jumpT = -1;
        else {
          // squash 0–0.12 → jump with stretch 0.12–0.5 → landing with squash 0.5–0.62 → a damped spring
          const sq = (a, b) => smooth(clamp((p - a) / (b - a), 0, 1));
          const jump = p > 0.12 && p < 0.5 ? Math.sin(Math.PI * (p - 0.12) / 0.38) : 0;
          y += -16 * jump;
          const squash = 0.22 * (sq(0, 0.12) - sq(0.12, 0.2)) + 0.18 * (sq(0.5, 0.56) - sq(0.56, 0.68));
          const stretch = 0.14 * jump * (1 - sq(0.3, 0.5));
          const wobble = p > 0.68 ? 0.06 * Math.exp(-8 * (p - 0.68)) * Math.sin(TAU * 3.2 * (p - 0.68)) : 0;
          sy *= 1 - squash + stretch + wobble; sx *= 1 + squash * 0.9 - stretch * 0.6 - wobble;
          rot += 8 * jump * Math.sin(TAU * 1.3 * p);
        }
      }
    }
    this.whole.setAttribute("transform",
      `translate(50 100) translate(0 ${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-50 -100)`);

    // gaze: follows the cursor if it moved recently; otherwise looks around by itself; working — more often "reads" down
    if (!still) {
      const m = this.mouse;
      if (m && t - m[2] < 2.5 && st !== "sleep") {
        if (!this.rect || t - (this.rectT || 0) > 1) { this.rect = this.root.getBoundingClientRect(); this.rectT = t; }
        const cx = this.rect.left + this.rect.width / 2, cy = this.rect.top + this.rect.height / 2;
        const dx = m[0] - cx, dy = m[1] - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 120);
        this.look = [(dx / d) * k, (dy / d) * k];
      } else if (t >= this.nextLook) {
        const reading = st === "work" && Math.random() < 0.55;
        this.look = st === "wait" && Math.random() < 0.6 ? [0, 0.15]
          : reading ? [rnd(-0.7, 0.3), rnd(0.4, 0.8)] : [rnd(-1, 1), rnd(-0.6, 0.5)];
        this.nextLook = t + (st === "wait" ? rnd(0.8, 2.2) : rnd(1.4, 4));
      }
      const k = 1 - Math.exp(-dt * 9);                 // eases toward the target, without a jerk
      this.gaze = [this.gaze[0] + (this.look[0] - this.gaze[0]) * k, this.gaze[1] + (this.look[1] - this.gaze[1]) * k];
    }

    // blinking: random intervals, sometimes twice in a row; the lids follow a smooth arc
    let lid = 1;
    if (!still && st !== "sleep") {
      if (this.blinkT < 0 && t >= this.blinkAt) { this.blinkT = t; this.double = Math.random() < 0.22; }
      if (this.blinkT >= 0) {
        const len = 0.17, p = (t - this.blinkT) / len;
        if (p < 1) lid = 1 - 0.9 * Math.sin(Math.PI * p);
        else if (this.double && p < 2.4) lid = p < 1.4 ? 1 : 1 - 0.9 * Math.sin(Math.PI * clamp((p - 1.4), 0, 1));
        else { this.blinkT = -1; this.blinkAt = t + (st === "wait" ? rnd(1.2, 3.5) : rnd(2, 6.5)); }
      }
    }
    // expression by state: working — squinting; waiting for you — wider
    const shape = st === "wait" ? [1.1, 1.12] : st === "work" ? [1, 0.82] : [1, 1];
    const happy = this.jumpT >= 0 && !still;
    for (const e of this.eyes) {
      const gx = this.gaze[0] * 3.2, gy = this.gaze[1] * 2.6;
      e.g.setAttribute("transform", `translate(${(e.x + gx).toFixed(2)} ${(e.y + gy).toFixed(2)})`);
      const asleep = st === "sleep";
      e.open.style.display = asleep || happy ? "none" : "";
      e.shut.style.display = asleep && !happy ? "" : "none";
      e.happy.style.display = happy ? "" : "none";
      e.open.setAttribute("transform", `scale(${shape[0]} ${(shape[1] * lid).toFixed(3)})`);
    }
  }
}

const newer = (api, want) => {
  const [a, b] = String(api || "0").split(".").map(Number), [x, y] = want.split(".").map(Number);
  return a > x || (a === x && (b || 0) >= y);
};

export default function register(hub) {
  const RU = hub.lang === "ru";   // the page language (API 1.25); English when it is missing
  const summary = (work, wait, sleep) => RU
    ? `Работают ${work} · ждут вас ${wait} · спят ${sleep}`
    : `Working ${work} · waiting for you ${wait} · asleep ${sleep}`;
  const label = (text) => (RU ? `Состояние сессий: ${text}` : `Session state: ${text}`);
  hub.addStyle("mascot.css");
  const slot = newer(hub.api, "1.5") ? "sidebar.header" : "sidebar.footer";
  hub.addSlot(slot, {
    id: "mascot",
    render(root, snap) {
      root.classList.add("mascot", slot === "sidebar.header" ? "in-header" : "in-footer");
      root.setAttribute("role", "img");
      root.mascot ||= new Mascot(root);     // once: root lives between snapshots, the animation loop is its own
      const all = snap?.sessions || [];
      const nWait = all.filter(waits).length, nWork = all.filter((s) => works(s) && !waits(s)).length;
      root.title = summary(nWork, nWait, all.length - nWork - nWait);
      root.setAttribute("aria-label", label(root.title));
      root.mascot.state = fleetState(all);
    },
  });
}
