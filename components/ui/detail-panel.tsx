import Image from "next/image";
import { Camera, TrafficEvent } from "@/lib/types/domain";

export function DetailPanel({
  camera,
  event,
  favoriteIds,
  onToggleFavorite,
  onClose
}: {
  camera: Camera | null;
  event: TrafficEvent | null;
  favoriteIds: string[];
  onToggleFavorite: (cameraId: string) => void;
  onClose: () => void;
}) {
  return (
    <section className="panel min-h-[260px] overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Details</h2>
        <button onClick={onClose} className="text-sm text-slate-500">
          Clear
        </button>
      </div>
      {camera ? (
        <div className="space-y-4 p-4">
          <div className="relative h-48 overflow-hidden rounded-3xl bg-slate-100 md:h-56">
            {camera.imageUrl ? (
              <Image src={camera.imageUrl} alt={camera.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                Camera image unavailable right now. Open the official source page instead.
              </div>
            )}
          </div>
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-ink">{camera.name}</h3>
                <p className="text-sm text-slate-500">{camera.provider}</p>
              </div>
              <button
                className={`rounded-full px-3 py-2 text-sm ${
                  favoriteIds.includes(camera.id) ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                }`}
                onClick={() => onToggleFavorite(camera.id)}
              >
                {favoriteIds.includes(camera.id) ? "Remove favorite" : "Save favorite"}
              </button>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>{camera.snippet ?? camera.roadName ?? camera.area ?? "Approximate location"}</p>
              <p>{camera.orientation ?? "Orientation unavailable"}</p>
              <p>Updates every ~{Math.round((camera.updateIntervalSeconds ?? 900) / 60)} minutes</p>
              {camera.approximateLocation ? <p>Coordinates are approximate for this Vancouver camera.</p> : null}
              {camera.pageUrl ? (
                <a href={camera.pageUrl} target="_blank" rel="noreferrer" className="text-pine underline">
                  Open official source page
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : event ? (
        <div className="space-y-4 p-4">
          <div className="rounded-3xl bg-coral/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            {event.eventType.replaceAll("_", " ")}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-ink">{event.headline}</h3>
            <p className="mt-2 text-sm text-slate-600">{event.description ?? "No additional event description."}</p>
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <p>Status: {event.status}</p>
            <p>Severity: {event.severity ?? "Unknown"}</p>
            <p>Road: {event.roadName ?? "Unknown"}</p>
            {event.start ? <p>Start: {new Date(event.start).toLocaleString()}</p> : null}
            {event.end ? <p>End: {new Date(event.end).toLocaleString()}</p> : null}
            {event.url ? (
              <a href={event.url} target="_blank" rel="noreferrer" className="text-pine underline">
                Open official DriveBC event
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex h-[220px] items-center justify-center px-6 text-center text-sm text-slate-500">
          Select a camera or event marker to inspect details, images, and source links.
        </div>
      )}
    </section>
  );
}
