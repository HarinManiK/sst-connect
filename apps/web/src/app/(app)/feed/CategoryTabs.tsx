import Link from "next/link";

const CATEGORIES = [
  { value: "all", label: "For You" },
  { value: "hot", label: "🔥 Hot" },
  { value: "tech", label: "💻 Tech" },
  { value: "culture", label: "🎭 Culture" },
] as const;

export function CategoryTabs({ active }: { active: string }) {
  return (
    <div className="sticky top-[57px] z-10 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={c.value === "all" ? "/feed" : `/feed?category=${c.value}`}
            className={`tap whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ${
              active === c.value
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-surface text-slate-600 border border-border"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
