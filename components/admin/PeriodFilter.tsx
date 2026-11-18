import Link from "next/link";
import { presetPeriod, PRESETS, type Period } from "@/lib/dashboard/period";

/** Sélecteur de période : raccourcis (7 jours…) et dates libres, en simple formulaire GET (aucun JavaScript). */
export function PeriodFilter({ path, period, today, extra }: { path: string; period: Period; today: string; extra?: Record<string, string> }) {
  const link = (from: string, to: string) => {
    const query = new URLSearchParams({ ...extra, from, to });
    return `${path}?${query.toString()}`;
  };

  return (
    <form action={path} className="mb-4 flex flex-wrap items-end gap-3">
      {Object.entries(extra ?? {}).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <label className="text-sm font-medium">
        Du
        <input type="date" name="from" defaultValue={period.from} max={today} required className="mt-1 block rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm" />
      </label>
      <label className="text-sm font-medium">
        Au
        <input type="date" name="to" defaultValue={period.to} max={today} required className="mt-1 block rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm" />
      </label>
      <button type="submit" className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white">Appliquer</button>
      <div className="flex flex-wrap gap-2" aria-label="Raccourcis de période">
        {PRESETS.map(({ label, days }) => {
          const preset = presetPeriod(days, today);
          const active = preset.from === period.from && preset.to === period.to;
          return (
            <Link key={days} href={link(preset.from, preset.to)} aria-current={active ? "true" : undefined} className={`rounded-full border px-3 py-1 text-sm ${active ? "border-brand-green bg-brand-green/10 font-medium" : "border-black/20"}`}>
              {label}
            </Link>
          );
        })}
      </div>
    </form>
  );
}
