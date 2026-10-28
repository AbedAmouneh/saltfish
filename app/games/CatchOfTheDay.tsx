import { useEffect, useRef } from "react";
import { useI18n } from "~/i18n";
import { FONT_BODY, FONT_DISPLAY, useGameCanvas } from "./canvas";
import type { GameProps } from "./GameShell";

const W = 360;
const H = 540;
const FISH_X = 92;
const SEABED = H - 34;

type Obstacle = { kind: "hook" | "net"; x: number; end: number; passed?: boolean };
type Pickup = { kind: "salt" | "lemon"; x: number; y: number; taken?: boolean };
type State = {
  y: number;
  vy: number;
  speed: number;
  dist: number;
  bonus: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  spawnIn: number;
  bubbles: { x: number; y: number; r: number; v: number }[];
  started: boolean;
  over: boolean;
  t: number;
  flash: { text: string; until: number } | null;
};

const GRAVITY = 1250;
const FLAP = -370;

function drawSalty(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = "#2a1d14";
  // tail (behind, on the left: Salty swims to the right)
  ctx.fillStyle = "#F6CF2E";
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-38, -14);
  ctx.lineTo(-34, 0);
  ctx.lineTo(-38, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 21, 0, 0, 7);
  ctx.fill();
  ctx.stroke();
  // fin
  ctx.beginPath();
  ctx.moveTo(-4, -20);
  ctx.quadraticCurveTo(6, -30, 14, -18);
  ctx.stroke();
  // sunglasses
  ctx.fillStyle = "#1a1412";
  ctx.beginPath();
  ctx.roundRect(2, -10, 12, 9, 3);
  ctx.roundRect(15, -10, 10, 9, 3);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.fillRect(4, -8, 5, 1.6);
  // mouth
  ctx.fillStyle = "#C2412F";
  ctx.beginPath();
  ctx.ellipse(19, 8, 3.5, 2.6, 0, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export default function CatchOfTheDay({ onGameOver, branch }: GameProps) {
  const { t } = useI18n();
  const mountain = branch === "faqra";
  const s = useRef<State>({
    y: H / 2,
    vy: 0,
    speed: 150,
    dist: 0,
    bonus: 0,
    obstacles: [],
    pickups: [],
    spawnIn: 1.2,
    bubbles: Array.from({ length: 18 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3, v: 10 + Math.random() * 30 })),
    started: false,
    over: false,
    t: 0,
    flash: null,
  });
  const score = () => Math.floor(s.current.dist / 18) + s.current.bonus;

  const flap = () => {
    const st = s.current;
    if (st.over) return;
    st.started = true;
    st.vy = FLAP;
  };

  const ref = useGameCanvas(W, H, (ctx, dt, now) => {
    const st = s.current;
    st.t += dt;
    if (st.started && !st.over) {
      st.vy += GRAVITY * dt;
      st.y += st.vy * dt;
      if (st.y < 26) {
        st.y = 26;
        st.vy = 0;
      }
      st.speed = Math.min(320, 150 + st.t * 3.2);
      st.dist += st.speed * dt;
      st.spawnIn -= dt;
      if (st.spawnIn <= 0) {
        const r = Math.random();
        const gap = Math.max(150, 210 - st.t * 1.2);
        if (r < 0.35) st.obstacles.push({ kind: "hook", x: W + 30, end: 110 + Math.random() * 220 });
        else if (r < 0.7) st.obstacles.push({ kind: "net", x: W + 30, end: SEABED - (90 + Math.random() * 190) });
        else {
          const top = 80 + Math.random() * (SEABED - gap - 140);
          st.obstacles.push({ kind: "hook", x: W + 30, end: top }, { kind: "net", x: W + 30, end: top + gap });
        }
        const py = 70 + Math.random() * (SEABED - 140);
        st.pickups.push({ kind: Math.random() < 0.25 ? "lemon" : "salt", x: W + 30 + 105, y: py });
        st.spawnIn = Math.max(0.95, 1.6 - st.t * 0.012);
      }
      for (const o of st.obstacles) o.x -= st.speed * dt;
      for (const p of st.pickups) p.x -= st.speed * dt;
      st.obstacles = st.obstacles.filter((o) => o.x > -60);
      st.pickups = st.pickups.filter((p) => p.x > -30 && !p.taken);

      // collisions (fish ≈ circle r=19 at FISH_X, y)
      const hitR = 18;
      let dead = st.y + hitR > SEABED;
      for (const o of st.obstacles) {
        if (Math.abs(o.x - FISH_X) > 30) continue;
        if (o.kind === "hook") {
          // line from 0..end at x, hook circle at (x, end)
          if (st.y - hitR < o.end - 6 && Math.abs(o.x - FISH_X) < hitR + 2) dead = true;
          if (Math.hypot(o.x + 6 - FISH_X, o.end + 6 - st.y) < hitR + 10) dead = true;
        } else if (st.y + hitR > o.end && Math.abs(o.x - FISH_X) < hitR + 22) dead = true;
      }
      for (const p of st.pickups) {
        if (Math.hypot(p.x - FISH_X, p.y - st.y) < hitR + 12) {
          p.taken = true;
          st.bonus += p.kind === "lemon" ? 30 : 10;
          st.flash = { text: p.kind === "lemon" ? "+30" : "+10", until: now + 450 };
        }
      }
      if (dead) {
        st.over = true;
        st.flash = { text: t.play.catchGame.hook, until: now + 900 };
        navigator.vibrate?.(120);
        setTimeout(() => onGameOver(score()), 800);
      }
    } else if (!st.started) {
      st.y = H / 2 + Math.sin(st.t * 3) * 8;
    }

    // --- draw ---
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (mountain) {
      g.addColorStop(0, "#f39a4c");
      g.addColorStop(0.45, "#b8332a");
      g.addColorStop(1, "#2a1416");
    } else {
      g.addColorStop(0, "#1f4a50");
      g.addColorStop(0.6, "#12282c");
      g.addColorStop(1, "#0b1416");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (mountain) {
      ctx.fillStyle = "rgba(42,20,22,.55)";
      ctx.beginPath();
      ctx.moveTo(0, 300);
      const off = (st.dist * 0.15) % 240;
      for (let x = -off; x <= W + 240; x += 120) {
        ctx.lineTo(x + 60, 210 + ((x / 120) % 2 ? 40 : 0));
        ctx.lineTo(x + 120, 300);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();
    }
    for (const b of st.bubbles) {
      b.y -= b.v * dt;
      b.x -= (st.started ? st.speed * 0.25 : 10) * dt;
      if (b.y < -5) b.y = H + 5;
      if (b.x < -5) b.x = W + 5;
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, 7);
      ctx.stroke();
    }
    // seabed tiles (the counter, underwater)
    ctx.fillStyle = "#B43A2B";
    ctx.fillRect(0, SEABED, W, H - SEABED);
    ctx.strokeStyle = "rgba(255,228,205,.3)";
    ctx.lineWidth = 2;
    const tileOff = st.dist % 26;
    for (let x = -tileOff; x < W; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, SEABED);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, SEABED + 17);
    ctx.lineTo(W, SEABED + 17);
    ctx.stroke();

    for (const o of st.obstacles) {
      if (o.kind === "hook") {
        ctx.strokeStyle = "rgba(246,231,214,.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x, 0);
        ctx.lineTo(o.x, o.end);
        ctx.stroke();
        ctx.strokeStyle = "#d9d2cc";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(o.x, o.end);
        ctx.lineTo(o.x, o.end + 14);
        ctx.arc(o.x + 8, o.end + 14, 8, Math.PI, 0, true);
        ctx.lineTo(o.x + 16, o.end + 6);
        ctx.stroke();
        ctx.fillStyle = "#ff8a3d";
        ctx.beginPath();
        ctx.arc(o.x, o.end - 26, 5, 0, 7);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(20,10,8,.55)";
        ctx.fillRect(o.x - 24, o.end, 48, SEABED - o.end);
        ctx.strokeStyle = "rgba(246,231,214,.55)";
        ctx.lineWidth = 1.5;
        for (let i = -24; i <= 24; i += 8) {
          ctx.beginPath();
          ctx.moveTo(o.x + i, o.end);
          ctx.lineTo(o.x + i + 10, SEABED);
          ctx.moveTo(o.x + i + 10, o.end);
          ctx.lineTo(o.x + i, SEABED);
          ctx.stroke();
        }
        ctx.fillStyle = "#f6e7d6";
        ctx.fillRect(o.x - 27, o.end - 4, 54, 6);
      }
    }
    for (const p of st.pickups) {
      if (p.kind === "salt") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI / 4 + st.t);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#cfe6ea";
        ctx.lineWidth = 2;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.strokeRect(-7, -7, 14, 14);
        ctx.restore();
      } else {
        ctx.fillStyle = "#f6cf2e";
        ctx.strokeStyle = "#2a1d14";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 13, 10, 0.3, 0, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#7fb36a";
        ctx.beginPath();
        ctx.ellipse(p.x + 10, p.y - 9, 5, 2.5, -0.6, 0, 7);
        ctx.fill();
      }
    }
    drawSalty(ctx, FISH_X, st.y, Math.max(-0.5, Math.min(0.6, st.vy / 700)));

    ctx.fillStyle = "#f6e7d6";
    ctx.font = `900 30px ${FONT_DISPLAY}`;
    ctx.textAlign = "left";
    ctx.fillText(String(score()), 18, 44);
    if (!st.started) {
      ctx.textAlign = "center";
      ctx.font = `700 16px ${FONT_BODY}`;
      ctx.fillText(t.play.catchGame.tap, W / 2, H / 2 + 70);
    }
    if (st.flash && now < st.flash.until) {
      ctx.textAlign = "center";
      ctx.fillStyle = st.over ? "#ff8a3d" : "#f6cf2e";
      ctx.font = `900 ${st.over ? 40 : 24}px ${FONT_DISPLAY}`;
      ctx.fillText(st.flash.text.toUpperCase(), st.over ? W / 2 : FISH_X + 40, st.over ? H / 2 : st.y - 30);
    }
    ctx.textAlign = "left";
  });

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", key);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={ref}
      tabIndex={0}
      aria-label={`${t.play.games.catch.name}. ${t.play.games.catch.how}`}
      onPointerDown={(e) => {
        e.preventDefault();
        flap();
      }}
      className="mx-auto block aspect-[2/3] w-full max-w-[400px] touch-none rounded-3xl shadow-2xl outline-none select-none"
    />
  );
}
