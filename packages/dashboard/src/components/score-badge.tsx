import clsx from "clsx";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score <= 25) return "bg-danger/20 text-danger-light";
  if (score <= 50) return "bg-amber-500/20 text-amber-400";
  if (score <= 75) return "bg-success/20 text-success-light";
  return "bg-blue-500/20 text-blue-400";
}

function getScoreTier(score: number): string {
  if (score <= 25) return "Low";
  if (score <= 50) return "Medium";
  if (score <= 75) return "High";
  return "Hot";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-bold",
        getScoreColor(score),
        size === "sm" && "h-6 w-6 text-xs",
        size === "md" && "h-8 w-8 text-sm",
        size === "lg" && "h-12 w-12 text-lg"
      )}
      title={`Score: ${score} (${getScoreTier(score)})`}
    >
      {score}
    </span>
  );
}
