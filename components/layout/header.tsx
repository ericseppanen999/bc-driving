import { ProviderHealth } from "@/lib/types/domain";

export function Header({ health }: { health: ProviderHealth[] }) {
  return (
    <header className="panel flex flex-col justify-between gap-4 px-5 py-4 md:flex-row md:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pine">BC Driving</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Traffic cameras and active road events</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {health.map((item) => (
          <div
            key={item.provider}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              item.status === "ok"
                ? "bg-pine/10 text-pine"
                : item.status === "degraded"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-coral/10 text-coral"
            }`}
          >
            {item.provider}: {item.status}
          </div>
        ))}
      </div>
    </header>
  );
}
