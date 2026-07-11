import Link from "next/link";

const CATEGORIES = [
  { value: "all", label: "For You" },
  { value: "hot", label: "Hot" },
  { value: "tech", label: "Tech" },
  { value: "culture", label: "Culture" },
] as const;

export function CategoryTabs({ active }: { active: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto px-4 pt-3 pb-1">
      {CATEGORIES.map((c) => (
        <Link
          key={c.value}
          href={c.value === "all" ? "/feed" : `/feed?category=${c.value}`}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
            active === c.value
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {c.label}
        </Link>
      ))}
    </div>
  );
}
