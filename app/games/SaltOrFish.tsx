import { useEffect, useMemo, useRef, useState } from "react";
import { Photo } from "~/components/Photo";
import { menu, trivia } from "~/content";
import { formatPrice, useI18n } from "~/i18n";
import type { GameProps } from "./GameShell";

const TOTAL = 10;
const SECONDS = 10;

type Q =
  | { type: "origin"; term: string; answer: "lebanese" | "japanese" }
  | { type: "price"; name: string; options: number[]; answer: number }
  | { type: "photo"; photo: string; options: string[]; answer: string }
  | { type: "fact"; statement: { en: string; ar: string; fr: string }; answer: boolean };

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
};

/** Ten questions built from the live menu and trivia.json, so they stay current. */
function buildRound(): Q[] {
  const items = menu.categories.flatMap((c) => c.items);
  const prices = [...new Set(items.map((i) => i.price))];
  const origin: Q[] = shuffle(trivia.terms)
    .slice(0, 3)
    .map((x) => ({ type: "origin", term: x.term, answer: x.origin }));
  const price: Q[] = shuffle(items.filter((i) => i.price >= 9))
    .slice(0, 3)
    .map((i) => {
      const wrong = shuffle(prices.filter((p) => p !== i.price && Math.abs(p - i.price) <= 20)).slice(0, 3);
      while (wrong.length < 3) wrong.push(i.price + 5 * (wrong.length + 1));
      return { type: "price", name: i.name, answer: i.price, options: shuffle([i.price, ...wrong]) };
    });
  const withPhoto = items.filter((i) => i.photo);
  const photo: Q[] = shuffle(withPhoto)
    .slice(0, 2)
    .map((i) => ({
      type: "photo",
      photo: i.photo!,
      answer: i.name,
      options: shuffle([i.name, ...shuffle(withPhoto.filter((x) => x.photo !== i.photo).map((x) => x.name)).slice(0, 3)]),
    }));
  const fact: Q[] = shuffle(trivia.facts)
    .slice(0, 2)
    .map((f) => ({ type: "fact", statement: f.statement, answer: f.answer }));
  return shuffle([...origin, ...price, ...photo, ...fact]).slice(0, TOTAL);
}

export default function SaltOrFish({ onGameOver }: GameProps) {
  const { t, locale } = useI18n();
  const tt = t.play.trivia;
  const round = useMemo(buildRound, []);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const q = round[i]!;

  const answerLabel = (q: Q): string =>
    q.type === "origin"
      ? q.answer === "lebanese"
        ? tt.lebanese
        : tt.japanese
      : q.type === "price"
        ? formatPrice(q.answer)
        : q.type === "photo"
          ? q.answer
          : q.answer
            ? tt.yes
            : tt.no;

  useEffect(() => {
    setLeft(SECONDS);
    timer.current = setInterval(() => setLeft((l) => Math.max(0, +(l - 0.1).toFixed(1))), 100);
    return () => clearInterval(timer.current);
  }, [i]);

  useEffect(() => {
    if (left <= 0 && picked === null) {
      clearInterval(timer.current);
      setPicked("__timeout__");
    }
  }, [left, picked]);

  const choose = (value: string, isRight: boolean) => {
    if (picked !== null) return;
    clearInterval(timer.current);
    setPicked(value);
    if (isRight) {
      setCorrect((c) => c + 1);
      setScore((s) => s + 100 + Math.round(left * 10));
    } else navigator.vibrate?.(60);
  };

  const next = () => {
    if (i + 1 >= TOTAL) {
      onGameOver(score);
      return;
    }
    setPicked(null);
    setI((n) => n + 1);
  };

  const options: { value: string; label: string; right: boolean; lang?: string }[] =
    q.type === "origin"
      ? [
          { value: "lebanese", label: tt.lebanese, right: q.answer === "lebanese" },
          { value: "japanese", label: tt.japanese, right: q.answer === "japanese" },
        ]
      : q.type === "fact"
        ? [
            { value: "true", label: tt.yes, right: q.answer },
            { value: "false", label: tt.no, right: !q.answer },
          ]
        : q.type === "price"
          ? q.options.map((p) => ({ value: String(p), label: formatPrice(p), right: p === q.answer }))
          : q.options.map((n) => ({ value: n, label: n, right: n === q.answer, lang: "en" }));

  const isRight = picked !== null && options.find((o) => o.value === picked)?.right;

  return (
    <div className="grid gap-5 rounded-3xl border border-line bg-coal p-5 md:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">{tt.question(i + 1, TOTAL)}</p>
        <p className="font-display text-3xl font-[800] text-amber tabular-nums">{score}</p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-night"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={SECONDS}
        aria-valuenow={Math.ceil(left)}
        aria-label={t.play.time}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${left < 3 ? "bg-brick" : "bg-amber"}`}
          style={{ width: `${(left / SECONDS) * 100}%` }}
        />
      </div>

      <div className="grid gap-4">
        {q.type === "photo" ? (
          <>
            <h2 className="text-2xl font-bold">{tt.photo}</h2>
            <Photo slug={q.photo} sizes="(min-width: 768px) 420px, 90vw" decorative imgClassName="aspect-[4/3] w-full rounded-2xl object-cover" />
          </>
        ) : q.type === "fact" ? (
          <>
            <p className="eyebrow">{tt.fact}</p>
            <h2 className="text-2xl leading-snug font-bold">{q.statement[locale]}</h2>
          </>
        ) : q.type === "price" ? (
          <h2 className="text-2xl leading-snug font-bold">{tt.price(q.name)}</h2>
        ) : (
          <h2 className="text-2xl leading-snug font-bold">{tt.origin(q.term)}</h2>
        )}
      </div>

      <div className={`grid gap-3 ${options.length > 2 ? "sm:grid-cols-2" : "grid-cols-2"}`}>
        {options.map((o) => {
          const state = picked === null ? "idle" : o.right ? "right" : picked === o.value ? "wrong" : "dim";
          return (
            <button
              key={o.value}
              type="button"
              disabled={picked !== null}
              onClick={() => choose(o.value, o.right)}
              lang={o.lang}
              className={`min-h-14 rounded-2xl border-2 px-4 py-3 text-start text-lg font-bold transition-colors ${
                state === "right"
                  ? "border-leaf bg-leaf text-night"
                  : state === "wrong"
                    ? "border-brick bg-brick text-cream"
                    : state === "dim"
                      ? "border-line text-dusk"
                      : "border-line text-cream hover:border-amber"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {picked !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-3" aria-live="assertive">
          <p className={`text-lg font-bold ${isRight ? "text-leaf" : "text-[#ff8a7e]"}`}>
            {isRight ? tt.correct : picked === "__timeout__" ? tt.timeUp(answerLabel(q)) : tt.wrong(answerLabel(q))}
          </p>
          <button type="button" onClick={next} className="btn btn-primary" autoFocus>
            {i + 1 >= TOTAL ? tt.result(correct, TOTAL) : tt.next}
          </button>
        </div>
      ) : null}
    </div>
  );
}
