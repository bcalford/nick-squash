import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-6xl">🥽</span>
      <h1 className="text-[24px] font-extrabold">Out of court</h1>
      <p className="max-w-[280px] text-[15px] text-ink-2">
        That page doesn’t exist — the ball went straight into the tin.
      </p>
      <Link href="/" className="contents">
        <Button size="lg">Back to the Feed</Button>
      </Link>
    </div>
  );
}
