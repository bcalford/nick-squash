"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProfileStats } from "@/lib/stats";
import { SectionHeader } from "@/components/ui/Card";

/** Resolves chart tokens from CSS variables and tracks dark-mode toggles. */
function useChartColors() {
  const [colors, setColors] = useState({
    c1: "#2952ff",
    c2: "#ff5a47",
    grid: "rgba(14,17,22,0.08)",
    ink2: "rgba(14,17,22,0.6)",
    surface: "#ffffff",
  });

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      setColors({
        c1: style.getPropertyValue("--chart-1").trim(),
        c2: style.getPropertyValue("--chart-2").trim(),
        grid: style.getPropertyValue("--chart-grid").trim(),
        ink2: style.getPropertyValue("--text-secondary").trim(),
        surface: style.getPropertyValue("--bg-elevated").trim(),
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card flex flex-col gap-0.5 px-4 py-3">
      <span className="text-[12px] font-bold uppercase tracking-wide text-ink-3">{label}</span>
      <span className="tnum text-[26px] font-extrabold leading-tight">{value}</span>
      {sub ? <span className="text-[12px] text-ink-2">{sub}</span> : null}
    </div>
  );
}

const axisFont = { fontSize: 11, fontWeight: 600 };

export function StatsCharts({ stats }: { stats: ProfileStats }) {
  const colors = useChartColors();

  const eloData = stats.eloSeries.map((p, i) => ({
    n: i,
    elo: p.elo,
    date: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  const lengthData = stats.byLength.map((b) => ({
    name: `${b.length} games`,
    Wins: b.wins,
    Losses: b.losses,
  }));
  const hasLengthData = stats.byLength.some((b) => b.wins + b.losses > 0);

  const tooltipStyle = {
    background: colors.surface,
    border: "0.5px solid var(--separator)",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text)",
  };

  return (
    <section aria-label="Stats">
      <SectionHeader>Stats</SectionHeader>
      <div className="grid grid-cols-2 gap-3 px-4">
        <StatTile
          label="Win rate"
          value={stats.winRate === null ? "—" : `${Math.round(stats.winRate * 100)}%`}
          sub={`${stats.wins}W · ${stats.losses}L`}
        />
        <StatTile
          label="Streak"
          value={
            stats.streak === 0 ? "—" : `${Math.abs(stats.streak)}${stats.streak > 0 ? "W" : "L"}`
          }
          sub={stats.streak >= 3 ? "On fire 🔥" : undefined}
        />
        <StatTile
          label="Pts / game won"
          value={stats.avgPointsWon === null ? "—" : stats.avgPointsWon.toFixed(1)}
        />
        <StatTile
          label="Pts / game conceded"
          value={stats.avgPointsConceded === null ? "—" : stats.avgPointsConceded.toFixed(1)}
        />
      </div>

      {eloData.length >= 2 && (
        <>
          <SectionHeader>Elo rating</SectionHeader>
          <div className="card mx-4 p-3 pt-4">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={eloData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ ...axisFont, fill: colors.ink2 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={["dataMin - 20", "dataMax + 20"]}
                  tick={{ ...axisFont, fill: colors.ink2 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--text)" }} />
                <Line
                  type="monotone"
                  dataKey="elo"
                  name="Elo"
                  stroke={colors.c1}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: colors.surface }}
                />
              </LineChart>
            </ResponsiveContainer>
            <table className="sr-only">
              <caption>Elo rating after each rated match</caption>
              <tbody>
                {eloData.map((d) => (
                  <tr key={d.n}>
                    <td>{d.date}</td>
                    <td>{d.elo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasLengthData && (
        <>
          <SectionHeader>Results by match length</SectionHeader>
          <div className="card mx-4 p-3 pt-4">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={lengthData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }} barGap={2}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ ...axisFont, fill: colors.ink2 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ ...axisFont, fill: colors.ink2 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.grid }} />
                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                <Bar dataKey="Wins" fill={colors.c1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Losses" fill={colors.c2} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
            <table className="sr-only">
              <caption>Wins and losses by match length</caption>
              <tbody>
                {lengthData.map((d) => (
                  <tr key={d.name}>
                    <td>{d.name}</td>
                    <td>{d.Wins} wins</td>
                    <td>{d.Losses} losses</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
