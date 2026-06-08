import type { ReactNode } from "react";

export function StatsGrid({ stats }: { stats: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <article className="stat-card" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
          {stat.hint ? <p>{stat.hint}</p> : null}
        </article>
      ))}
    </div>
  );
}
