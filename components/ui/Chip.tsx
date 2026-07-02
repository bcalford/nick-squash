import type { HTMLAttributes } from "react";

type Tone = "cobalt" | "coral" | "volt" | "glass" | "neutral" | "gradient";

const tones: Record<Tone, string> = {
  cobalt: "bg-cobalt-soft text-cobalt",
  coral: "bg-coral-soft text-coral",
  volt: "bg-volt-soft text-volt-ink",
  glass: "bg-glass-soft text-glass",
  neutral: "bg-inset text-ink-2",
  gradient: "gradient-signature",
};

export function Chip({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold tnum ${tones[tone]} ${className}`}
      {...props}
    />
  );
}

export function EloDelta({ delta }: { delta: number }) {
  if (delta === 0) return <Chip tone="neutral">±0</Chip>;
  return (
    <Chip tone={delta > 0 ? "volt" : "coral"}>
      {delta > 0 ? `+${delta}` : delta}
    </Chip>
  );
}
