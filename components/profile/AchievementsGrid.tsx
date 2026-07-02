import type { Achievement } from "@/lib/database.types";
import { SectionHeader } from "@/components/ui/Card";

export function AchievementsGrid({
  achievements,
  earnedIds,
}: {
  achievements: Achievement[];
  earnedIds: Set<string>;
}) {
  return (
    <section aria-label="Achievements">
      <SectionHeader>
        Achievements · {earnedIds.size}/{achievements.length}
      </SectionHeader>
      <div className="grid grid-cols-3 gap-3 px-4">
        {achievements.map((a) => {
          const earned = earnedIds.has(a.id);
          return (
            <div
              key={a.id}
              className={`card flex flex-col items-center gap-1 px-2 py-3 text-center ${
                earned ? "" : "opacity-45 grayscale"
              }`}
              title={a.description}
            >
              <span className="text-3xl">{a.icon}</span>
              <span className="text-[12px] font-bold leading-tight">{a.name}</span>
              <span className="text-[10px] leading-tight text-ink-3">{a.description}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
