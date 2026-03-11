"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Camera, BootstrapResponse, TrafficEvent } from "@/lib/types/domain";
import { loadFavorites, toggleFavorite } from "@/lib/storage/favorites";
import { REGION_PRESETS } from "@/lib/geo/regions";
import { bboxContainsPoint } from "@/lib/utils/query";
import { Header } from "@/components/layout/header";
import { FilterSidebar, FilterState } from "@/components/filters/filter-sidebar";
import { CameraList } from "@/components/cameras/camera-list";
import { DetailPanel } from "@/components/ui/detail-panel";

const TrafficMap = dynamic(() => import("@/components/map/traffic-map").then((mod) => mod.TrafficMap), {
  ssr: false
});

async function fetchBootstrap(): Promise<BootstrapResponse> {
  const response = await fetch("/api/bootstrap");
  if (!response.ok) {
    throw new Error("Failed to load bootstrap data.");
  }
  return response.json();
}

async function fetchCameraDetail(id: string): Promise<Camera> {
  const response = await fetch(`/api/cameras/${id}`);
  if (!response.ok) {
    throw new Error("Failed to load camera details.");
  }
  return response.json();
}

function sortCameras(cameras: Camera[], favorites: string[]) {
  return [...cameras].sort((left, right) => {
    const leftFavorite = favorites.includes(left.id) ? 0 : 1;
    const rightFavorite = favorites.includes(right.id) ? 0 : 1;
    return leftFavorite - rightFavorite || left.name.localeCompare(right.name);
  });
}

export function TrafficDashboard() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TrafficEvent | null>(null);
  const [cameraOverrides, setCameraOverrides] = useState<Record<string, Camera>>({});
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    provider: "all",
    favoritesOnly: false,
    eventType: "all",
    region: "default-view",
    showVancouver: true,
    showDriveBc: true,
    showEvents: true
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: fetchBootstrap
  });

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const region = useMemo(
    () => REGION_PRESETS.find((item) => item.id === filters.region),
    [filters.region]
  );

  const camerasWithOverrides = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.cameras.map((camera) => cameraOverrides[camera.id] ?? camera);
  }, [cameraOverrides, data]);

  const filteredCameras = useMemo(() => {
    let cameras = camerasWithOverrides;

    cameras = cameras.filter((camera) => {
      if (filters.provider !== "all" && camera.provider !== filters.provider) {
        return false;
      }
      if (!filters.showVancouver && camera.provider === "vancouver") {
        return false;
      }
      if (!filters.showDriveBc && camera.provider === "drivebc") {
        return false;
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matches = [camera.name, camera.area, camera.roadName, camera.snippet].some((value) =>
          value?.toLowerCase().includes(q)
        );
        if (!matches) {
          return false;
        }
      }
      if (filters.favoritesOnly && !favorites.includes(camera.id)) {
        return false;
      }
      if (region?.bbox && !bboxContainsPoint(region.bbox, camera.latitude, camera.longitude)) {
        return false;
      }
      if (region?.roadName && camera.roadName !== region.roadName) {
        return false;
      }
      return true;
    });

    return sortCameras(cameras, favorites);
  }, [camerasWithOverrides, favorites, filters, region]);

  const filteredEvents = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.events.filter((event) => {
      if (!filters.showEvents) {
        return false;
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matches = [event.headline, event.description, event.roadName].some((value) =>
          value?.toLowerCase().includes(q)
        );
        if (!matches) {
          return false;
        }
      }
      if (filters.eventType !== "all" && event.eventType !== filters.eventType) {
        return false;
      }
      if (region?.bbox && !bboxContainsPoint(region.bbox, event.latitude, event.longitude)) {
        return false;
      }
      if (region?.roadName && event.roadName !== region.roadName) {
        return false;
      }
      return true;
    });
  }, [data, filters, region]);

  async function handleSelectCamera(camera: Camera) {
    setSelectedEvent(null);
    setSelectedCamera(cameraOverrides[camera.id] ?? camera);

    if (cameraOverrides[camera.id]?.imageUrl || camera.imageUrl || !camera.pageUrl) {
      return;
    }

    try {
      const enriched = await fetchCameraDetail(camera.id);
      setCameraOverrides((current) => ({ ...current, [camera.id]: enriched }));
      setSelectedCamera(enriched);
    } catch {
      setSelectedCamera(camera);
    }
  }

  function handleToggleFavorite(cameraId: string) {
    setFavorites(toggleFavorite(cameraId));
  }

  const selectedKind = selectedCamera ? "camera" : selectedEvent ? "event" : null;
  const showMobileSheet = Boolean(selectedCamera || selectedEvent);

  return (
    <main className="min-h-screen p-3 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] flex-col gap-4">
        <Header health={data?.health ?? []} />
        <div className="grid flex-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            counts={{
              cameras: filteredCameras.length,
              events: filteredEvents.length,
              favorites: favorites.length
            }}
            mobileOpen={mobileFiltersOpen}
            onMobileToggle={() => setMobileFiltersOpen((current) => !current)}
          />

          <div className="order-2 flex flex-col gap-4 xl:contents">
            <div className="panel flex items-center gap-2 p-2 xl:hidden">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm ${mobileView === "list" ? "bg-ink text-white" : "bg-slate-100 text-slate-700"}`}
              >
                Cameras
              </button>
              <button
                type="button"
                onClick={() => setMobileView("map")}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm ${mobileView === "map" ? "bg-ink text-white" : "bg-slate-100 text-slate-700"}`}
              >
                Map
              </button>
            </div>

            <section className={`panel relative min-h-[58vh] overflow-hidden xl:order-none xl:min-h-[420px] ${mobileView === "map" ? "block" : "hidden xl:block"}`}>
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading traffic data...</div>
              ) : error ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-coral">
                  Failed to load bootstrap data. Check provider health and retry.
                </div>
              ) : (
                <>
                  <TrafficMap
                    center={data?.config.defaultCenter}
                    regionBbox={region?.bbox}
                    cameras={filteredCameras}
                    events={filteredEvents}
                    onSelectCamera={handleSelectCamera}
                    onSelectEvent={(event) => {
                      setSelectedCamera(null);
                      setSelectedEvent(event);
                    }}
                  />
                  <div className="absolute left-3 right-3 top-3 max-w-md space-y-2 md:left-4 md:right-auto md:top-4">
                    {data?.staleWarnings.map((warning) => (
                      <div key={warning} className="rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900">
                        {warning}
                      </div>
                    ))}
                    <div className="rounded-2xl border border-sky/20 bg-white/90 px-4 py-3 text-sm text-slate-600">
                      Camera images are provided by public agencies and may update every few minutes; some Vancouver camera pages indicate 10 to 15 minute refresh intervals.
                    </div>
                  </div>
                </>
              )}
            </section>

            <div className={`flex min-h-[420px] flex-col gap-4 xl:order-none ${mobileView === "list" ? "flex" : "hidden xl:flex"}`}>
              <div className="hidden xl:block">
                <DetailPanel
                  camera={selectedCamera}
                  event={selectedEvent}
                  favoriteIds={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onClose={() => {
                    setSelectedCamera(null);
                    setSelectedEvent(null);
                  }}
                />
              </div>
              <CameraList
                cameras={filteredCameras}
                favoriteIds={favorites}
                onSelect={handleSelectCamera}
                onToggleFavorite={handleToggleFavorite}
              />
            </div>
          </div>
        </div>
      </div>

      {showMobileSheet ? (
        <div className="fixed inset-x-0 bottom-0 z-[1000] p-3 xl:hidden">
          <DetailPanel
            camera={selectedCamera}
            event={selectedEvent}
            favoriteIds={favorites}
            onToggleFavorite={handleToggleFavorite}
            onClose={() => {
              setSelectedCamera(null);
              setSelectedEvent(null);
            }}
            className="max-h-[70vh] overflow-y-auto rounded-[2rem] border border-white/80 bg-white/95 shadow-2xl"
          />
        </div>
      ) : null}

      <div className="mx-auto mt-4 max-w-[1600px] px-2 text-xs text-slate-500">
        Sources: City of Vancouver traffic cameras, DriveBC HighwayCams metadata, DriveBC Open511 events.
        {selectedKind === null ? " Select a marker or camera card for details." : ""}
      </div>
    </main>
  );
}
