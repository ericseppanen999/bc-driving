import Image from "next/image";
import { Camera } from "@/lib/types/domain";

export function CameraList({
  cameras,
  favoriteIds,
  onSelect,
  onToggleFavorite
}: {
  cameras: Camera[];
  favoriteIds: string[];
  onSelect: (camera: Camera) => void;
  onToggleFavorite: (cameraId: string) => void;
}) {
  return (
    <section className="panel flex-1 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Camera list</h2>
        <span className="text-xs text-slate-400">{cameras.length} visible</span>
      </div>
      <div className="grid max-h-[420px] gap-3 overflow-y-auto p-4 md:max-h-[480px]">
        {cameras.map((camera) => (
          <article key={camera.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
            <div
              role="button"
              tabIndex={0}
              className="cursor-pointer"
              onClick={() => onSelect(camera)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(camera);
                }
              }}
            >
              <div className="relative h-28 bg-slate-200 md:h-32">
                {camera.imageUrl ? (
                  <Image src={camera.imageUrl} alt={camera.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">Image unavailable</div>
                )}
              </div>
              <div className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-ink">{camera.name}</h3>
                    <p className="text-sm text-slate-500">{camera.provider}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Toggle favorite for ${camera.name}`}
                    className={`rounded-full px-3 py-1 text-xs ${
                      favoriteIds.includes(camera.id) ? "bg-amber-100 text-amber-900" : "bg-white text-slate-600"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(camera.id);
                    }}
                  >
                    {favoriteIds.includes(camera.id) ? "Saved" : "Save"}
                  </button>
                </div>
                <p className="text-sm text-slate-600">{camera.snippet ?? camera.roadName ?? camera.area ?? "Approximate location"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
