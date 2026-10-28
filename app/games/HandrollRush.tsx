import { useEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n";
import { FONT_BODY, FONT_DISPLAY, logicalPoint, useGameCanvas } from "./canvas";
import type { GameProps } from "./GameShell";

const W = 360;
const H = 480;
const ROUND = 45;

type Ing = "rice" | "salmon" | "tuna" | "avocado" | "cucumber" | "ikura" | "wagyu" | "chili" | "shrimp";
type Kind = Ing | "fork";
const ALL: Ing[] = ["rice", "salmon", "tuna", "avocado", "cucumber", "ikura", "wagyu", "chili", "shrimp"];

/** Rolls from the real menu (handroll section). */
const ORDERS: { name: string; needs: Ing[] }[] = [
  { name: "Salmon Handroll", needs: ["rice", "salmon", "cucumber"] },
  { name: "Tuna Handroll", needs: ["rice", "tuna", "avocado"] },
  { name: "Ikura Handroll", needs: ["rice", "ikura", "cucumber"] },
  { name: "Spicy Wagyu Handroll", needs: ["rice", "wagyu", "chili"] },
  { name: "Shrimp Handroll", needs: ["rice", "shrimp", "avocado"] },
];

type Item = { kind: Kind; x: number; y: number; v: number; rot: number };
type State = {
  x: number;
  items: Item[];
  score: number;
  lives: number;
  time: number;
  combo: number;
  spawn: number;
  order: (typeof ORDERS)[number];
  got: Set<Ing>;
  flash: { text: string; color: string; until: number } | null;
  over: boolean;
};

const newOrder = (prev?: string) => {
  const pool = ORDERS.filter((o) => o.name !== prev);
  return pool[Math.floor(Math.random() * pool.length)]!;
};

export function drawIngredient(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, rot = 0, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#2a1d14";
  switch (kind) {
    case "rice": {
      ctx.fillStyle = "#FFF8EC";
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 12, 0, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e9dcc6";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(-9 + i * 4.5, i % 2 ? 3 : -3, 2.2, 1.2, i, 0, 7);
        ctx.fill();
      }
      break;
    }
    case "salmon":
    case "tuna":
    case "wagyu": {
      ctx.fillStyle = kind === "salmon" ? "#F27A3E" : kind === "tuna" ? "#B3213A" : "#C95B5B";
      ctx.beginPath();
      ctx.roundRect(-18, -10, 36, 20, 6);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = kind === "wagyu" ? "#FCE3DC" : "#FFD9C4";
      ctx.lineWidth = 2;
      for (let i = -10; i <= 10; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i, -8);
        ctx.lineTo(i + 5, 8);
        ctx.stroke();
      }
      break;
    }
    case "avocado": {
      ctx.fillStyle = "#6E9B3A";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 17, 0.5, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#D7E58A";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, 0.5, 0, 7);
      ctx.fill();
      break;
    }
    case "cucumber": {
      ctx.fillStyle = "#3E7D3A";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#D9F0B8";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#9CC07A";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(i) * 4, Math.sin(i) * 4, 1.4, 0, 7);
        ctx.fill();
      }
      break;
    }
    case "ikura": {
      for (const [dx, dy] of [
        [-8, -4],
        [2, -8],
        [8, 2],
        [-3, 5],
        [6, -3],
        [-8, 6],
      ] as const) {
        ctx.fillStyle = "#F2661D";
        ctx.beginPath();
        ctx.arc(dx, dy, 5.5, 0, 7);
        ctx.fill();
        ctx.strokeStyle = "#7a2a08";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#FFD0A8";
        ctx.beginPath();
        ctx.arc(dx - 1.8, dy - 1.8, 1.5, 0, 7);
        ctx.fill();
      }
      break;
    }
    case "chili": {
      ctx.fillStyle = "#D7261E";
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.quadraticCurveTo(10, -12, 16, 10);
      ctx.quadraticCurveTo(0, 4, -14, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#3E7D3A";
      ctx.fillRect(-18, -6, 6, 6);
      break;
    }
    case "shrimp": {
      ctx.strokeStyle = "#E8673A";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 2, 10, Math.PI * 0.9, Math.PI * 2.3);
      ctx.stroke();
      ctx.strokeStyle = "#FFF4E2";
      ctx.lineWidth = 1.5;
      for (let a = 1; a < 4; a++) {
        ctx.beginPath();
        ctx.arc(0, 2, 10, Math.PI * (0.8 + a * 0.35), Math.PI * (0.86 + a * 0.35));
        ctx.stroke();
      }
      break;
    }
    case "fork": {
      ctx.fillStyle = "#CFC8C2";
      ctx.beginPath();
      ctx.roundRect(-3, -4, 6, 26, 3);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-10, -14, 20, 12, 4);
      ctx.fill();
      ctx.stroke();
      for (const dx of [-8, -3, 2, 7]) ctx.fillRect(dx, -26, 2.5, 13);
      break;
    }
  }
  ctx.restore();
}

export default function HandrollRush({ onGameOver }: GameProps) {
  const { t } = useI18n();
  const labels = t.play.rush;
  const keys = useRef<Record<string, boolean>>({});
  const [, force] = useState(0);
  const s = useRef<State>({
    x: W / 2,
    items: [],
    score: 0,
    lives: 3,
    time: ROUND,
    combo: 0,
    spawn: 0.4,
    order: newOrder(),
    got: new Set(),
    flash: null,
    over: false,
  });

  const say = (text: string, color: string) => (s.current.flash = { text, color, until: performance.now() + 900 });

  const ref = useGameCanvas(W, H, (ctx, dt, now) => {
    const st = s.current;
    if (!st.over) {
      st.time -= dt;
      st.spawn -= dt;
      if (st.spawn <= 0) {
        const r = Math.random();
        let kind: Kind;
        const missing = st.order.needs.filter((n) => !st.got.has(n));
        if (r < 0.16) kind = "fork";
        else if (r < 0.62) kind = (missing.length ? missing : st.order.needs)[Math.floor(Math.random() * (missing.length || st.order.needs.length))]!;
        else kind = ALL[Math.floor(Math.random() * ALL.length)]!;
        const lvl = Math.min(1, (ROUND - st.time) / ROUND);
        st.items.push({ kind, x: 30 + Math.random() * (W - 60), y: -20, v: 120 + lvl * 140 + Math.random() * 40, rot: Math.random() * 6 });
        st.spawn = Math.max(0.36, 0.85 - (ROUND - st.time) * 0.011);
      }
      if (keys.current.ArrowLeft) st.x -= 380 * dt;
      if (keys.current.ArrowRight) st.x += 380 * dt;
      st.x = Math.max(46, Math.min(W - 46, st.x));
      const matY = H - 46;
      st.items = st.items.filter((it) => {
        it.y += it.v * dt;
        it.rot += dt;
        if (it.y > matY - 6 && it.y < matY + 16 && Math.abs(it.x - st.x) < 50) {
          if (it.kind === "fork") {
            st.lives -= 1;
            st.combo = 0;
            say(labels.forkJail, "#F6CF2E");
            navigator.vibrate?.(80);
          } else if (st.order.needs.includes(it.kind) && !st.got.has(it.kind)) {
            st.got.add(it.kind);
            st.score += 10;
            if (st.order.needs.every((n) => st.got.has(n))) {
              st.combo += 1;
              st.score += 60 + st.combo * 20;
              say(st.combo > 1 ? labels.combo(st.combo) : labels.rolled, "#FFF4E2");
              st.order = newOrder(st.order.name);
              st.got = new Set();
            }
          } else {
            st.score = Math.max(0, st.score - 15);
            st.combo = 0;
            say(labels.wrong, "#FFD0A8");
          }
          return false;
        }
        return it.y < H + 30;
      });
      if (st.time <= 0 || st.lives <= 0) {
        st.over = true;
        setTimeout(() => onGameOver(st.score), 700);
      }
    }

    // --- draw ---
    ctx.fillStyle = "#B43A2B";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,230,210,.26)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // ticket
    ctx.fillStyle = "#FFF4E2";
    ctx.beginPath();
    ctx.roundRect(12, 12, W - 24, 66, 12);
    ctx.fill();
    ctx.fillStyle = "#14363B";
    ctx.font = `800 13px ${FONT_DISPLAY}`;
    ctx.textAlign = "left";
    ctx.fillText(labels.chefCalls.toUpperCase(), 24, 32);
    ctx.font = `700 17px ${FONT_BODY}`;
    ctx.fillText(st.order.name, 24, 54);
    let cx = W - 24;
    ctx.font = `600 11px ${FONT_BODY}`;
    for (const n of [...st.order.needs].reverse()) {
      const label = labels.ingredients[n];
      const w = ctx.measureText(label).width + 14;
      cx -= w;
      const got = st.got.has(n);
      ctx.fillStyle = got ? "#2F7A4B" : "#EFE2CF";
      ctx.beginPath();
      ctx.roundRect(cx, 52, w, 20, 10);
      ctx.fill();
      ctx.fillStyle = got ? "#fff" : "#14363B";
      ctx.fillText(label, cx + 7, 66);
      cx -= 6;
    }
    // HUD
    ctx.fillStyle = "#FFF4E2";
    ctx.font = `900 24px ${FONT_DISPLAY}`;
    ctx.fillText(String(st.score).padStart(4, "0"), 16, 108);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.max(0, Math.ceil(st.time))}s`, W - 16, 108);
    ctx.textAlign = "left";
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < st.lives ? "#F6CF2E" : "rgba(255,244,226,.25)";
      ctx.beginPath();
      ctx.arc(W / 2 - 18 + i * 18, 101, 6, 0, 7);
      ctx.fill();
    }
    for (const it of st.items) drawIngredient(ctx, it.kind, it.x, it.y, Math.sin(it.rot) * 0.3);
    // nori mat
    ctx.save();
    ctx.translate(st.x, H - 38);
    ctx.fillStyle = "#1E2A1F";
    ctx.beginPath();
    ctx.roundRect(-46, -10, 92, 22, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(140,170,120,.35)";
    ctx.lineWidth = 1.5;
    for (let i = -40; i <= 40; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, -8);
      ctx.lineTo(i, 10);
      ctx.stroke();
    }
    let gx = -30;
    for (const n of st.order.needs) {
      if (st.got.has(n)) {
        drawIngredient(ctx, n, gx, -14, 0, 0.55);
        gx += 30;
      }
    }
    ctx.restore();
    if (st.flash && now < st.flash.until) {
      ctx.fillStyle = st.flash.color;
      ctx.font = `900 32px ${FONT_DISPLAY}`;
      ctx.textAlign = "center";
      ctx.fillText(st.flash.text.toUpperCase(), W / 2, H / 2);
      ctx.textAlign = "left";
    }
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        keys.current[e.key] = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => (keys.current[e.key] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    ref.current?.focus();
    force(1);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [ref]);

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    s.current.x = logicalPoint(e.currentTarget, e, W, H).x;
  };

  return (
    <canvas
      ref={ref}
      tabIndex={0}
      aria-label={`${t.play.games["handroll-rush"].name}. ${t.play.games["handroll-rush"].how}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      className="mx-auto block aspect-[3/4] w-full max-w-[420px] cursor-none touch-none rounded-3xl shadow-2xl outline-none"
    />
  );
}
