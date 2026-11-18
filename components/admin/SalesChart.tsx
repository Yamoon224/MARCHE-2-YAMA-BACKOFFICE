"use client";

import { useState } from "react";
import { barLayout, compactEuros, fullDay, labelIndexes, niceMax, shortDay, yTicks } from "@/lib/dashboard/chart";
import { formatMoney } from "@/lib/format";

type Point = { date: string; orders_count: number; revenue_minor: number };

const WIDTH = 720;
const HEIGHT = 240;
const LEFT = 56;
const BOTTOM = 28;
const TOP = 8;

/** Ventes par jour en SVG, avec une vue tableau équivalente (accessibilité, lecture des montants exacts). */
export function SalesChart({ points }: { points: Point[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const values = points.map((p) => p.revenue_minor);
  const max = niceMax(Math.max(0, ...values));
  const plotWidth = WIDTH - LEFT - 8;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const bars = barLayout(values, plotWidth, plotHeight, max);
  const ticks = yTicks(max);
  const total = values.reduce((sum, v) => sum + v, 0);

  const tab = (name: "chart" | "table", label: string) => (
    <button
      type="button"
      onClick={() => setView(name)}
      aria-pressed={view === name}
      className={`rounded-full border px-3 py-1 text-sm ${view === name ? "border-brand-green bg-brand-green/10 font-medium" : "border-black/20"}`}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby="sales-title" className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="sales-title" className="font-semibold">Ventes par jour</h2>
        <div className="flex gap-2">{tab("chart", "Graphique")}{tab("table", "Tableau")}</div>
      </div>

      {points.length === 0 || total === 0 ? (
        <p className="py-8 text-center text-sm text-black/60">Aucune vente sur cette période.</p>
      ) : view === "chart" ? (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Chiffre d'affaires par jour, total ${formatMoney(total)}`} className="h-auto w-full">
          {ticks.map((tick) => {
            const y = TOP + plotHeight - (tick / max) * plotHeight;
            return (
              <g key={tick}>
                <line x1={LEFT} x2={WIDTH - 8} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" />
                <text x={LEFT - 6} y={y + 4} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity="0.6">{compactEuros(tick)}</text>
              </g>
            );
          })}
          <g transform={`translate(${LEFT} ${TOP})`}>
            {bars.map((bar) => (
              <rect key={bar.index} x={bar.x} y={bar.y} width={bar.width} height={Math.max(bar.height, bar.value > 0 ? 1 : 0)} rx="2" className="fill-brand-green">
                <title>{`${fullDay(points[bar.index].date)} : ${formatMoney(bar.value)} · ${points[bar.index].orders_count} commande${points[bar.index].orders_count > 1 ? "s" : ""}`}</title>
              </rect>
            ))}
            {labelIndexes(points.length).map((i) => (
              <text key={i} x={bars[i].x + bars[i].width / 2} y={plotHeight + 18} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.6">
                {shortDay(points[i].date)}
              </text>
            ))}
          </g>
        </svg>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left">
              <tr><th className="py-1 pr-4">Jour</th><th className="py-1 pr-4 text-right">Commandes</th><th className="py-1 text-right">Chiffre d&apos;affaires</th></tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t border-black/5">
                  <td className="py-1 pr-4">{fullDay(p.date)}</td>
                  <td className="py-1 pr-4 text-right">{p.orders_count}</td>
                  <td className="py-1 text-right">{formatMoney(p.revenue_minor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
