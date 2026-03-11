"use client";

import { Dispatch, SetStateAction } from "react";
import { REGION_PRESETS } from "@/lib/geo/regions";
import { TrafficEventType } from "@/lib/types/domain";

export interface FilterState {
  query: string;
  provider: "all" | "vancouver" | "drivebc";
  favoritesOnly: boolean;
  eventType: "all" | TrafficEventType;
  region: string;
  showVancouver: boolean;
  showDriveBc: boolean;
  showEvents: boolean;
}

const EVENT_TYPES: Array<FilterState["eventType"]> = [
  "all",
  "INCIDENT",
  "CONSTRUCTION",
  "WEATHER_CONDITION",
  "ROAD_CONDITION",
  "SPECIAL_EVENT"
];

export function FilterSidebar({
  filters,
  setFilters,
  counts,
  mobileOpen,
  onMobileToggle
}: {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  counts: { cameras: number; events: number; favorites: number };
  mobileOpen: boolean;
  onMobileToggle: () => void;
}) {
  return (
    <aside className="panel flex flex-col gap-5 px-4 py-4 md:px-5 md:py-5">
      <div className="flex items-center justify-between md:block">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filters</p>
          <p className="mt-1 text-sm text-slate-500 md:hidden">{counts.cameras} cameras, {counts.events} events</p>
        </div>
        <button type="button" onClick={onMobileToggle} className="rounded-full bg-slate-100 px-3 py-2 text-sm md:hidden">
          {mobileOpen ? "Hide" : "Show"}
        </button>
      </div>

      <div className={`${mobileOpen ? "flex" : "hidden"} flex-col gap-5 md:flex`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Search</p>
          <input
            aria-label="Search cameras and events"
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Highway, road, or intersection"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-sky"
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Layers</p>
          <div className="mt-2 grid gap-2 text-sm">
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              Vancouver cameras
              <input
                type="checkbox"
                checked={filters.showVancouver}
                onChange={(event) => setFilters((current) => ({ ...current, showVancouver: event.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              DriveBC cameras
              <input
                type="checkbox"
                checked={filters.showDriveBc}
                onChange={(event) => setFilters((current) => ({ ...current, showDriveBc: event.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              DriveBC events
              <input
                type="checkbox"
                checked={filters.showEvents}
                onChange={(event) => setFilters((current) => ({ ...current, showEvents: event.target.checked }))}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
          <label className="text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Provider</span>
            <select
              value={filters.provider}
              onChange={(event) =>
                setFilters((current) => ({ ...current, provider: event.target.value as FilterState["provider"] }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="all">All providers</option>
              <option value="vancouver">Vancouver</option>
              <option value="drivebc">DriveBC</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Region</span>
            <select
              value={filters.region}
              onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              {REGION_PRESETS.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Event type</span>
            <select
              value={filters.eventType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, eventType: event.target.value as FilterState["eventType"] }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All event types" : type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            Favorites only
            <input
              type="checkbox"
              checked={filters.favoritesOnly}
              onChange={(event) => setFilters((current) => ({ ...current, favoritesOnly: event.target.checked }))}
            />
          </label>
        </div>

        <div className="rounded-3xl bg-ink px-4 py-4 text-sm text-white">
          <p>{counts.cameras} cameras</p>
          <p className="mt-1">{counts.events} active events</p>
          <p className="mt-1">{counts.favorites} favorites saved locally</p>
        </div>
      </div>
    </aside>
  );
}
