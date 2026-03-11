"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { BBox, Camera, TrafficEvent } from "@/lib/types/domain";

const cameraIcon = L.divIcon({
  className: "custom-camera-icon",
  html: '<div style="background:#234b43;width:16px;height:16px;border-radius:999px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.2)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const eventIcon = L.divIcon({
  className: "custom-event-icon",
  html: '<div style="background:#d56a4d;width:16px;height:16px;border-radius:5px;border:3px solid white;transform:rotate(45deg);box-shadow:0 4px 12px rgba(0,0,0,.2)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function formatCoordKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
}

function spreadCameraMarkers(cameras: Camera[]) {
  const counts = new Map<string, number>();

  return cameras.map((camera) => {
    const key = formatCoordKey(camera.latitude, camera.longitude);
    const index = counts.get(key) ?? 0;
    counts.set(key, index + 1);

    if (index === 0) {
      return {
        camera,
        latitude: camera.latitude,
        longitude: camera.longitude
      };
    }

    const angle = (index * Math.PI) / 3;
    const radius = 0.0012 * Math.ceil(index / 6);

    return {
      camera,
      latitude: camera.latitude + Math.sin(angle) * radius,
      longitude: camera.longitude + Math.cos(angle) * radius
    };
  });
}

function MapViewport({
  center,
  regionBbox,
  cameras,
  events
}: {
  center?: { lat: number; lng: number; zoom: number };
  regionBbox?: BBox;
  cameras: Camera[];
  events: TrafficEvent[];
}) {
  const map = useMap();

  useEffect(() => {
    if (regionBbox) {
      map.fitBounds(
        [
          [regionBbox.ymin, regionBbox.xmin],
          [regionBbox.ymax, regionBbox.xmax]
        ],
        { padding: [24, 24] }
      );
      return;
    }

    const points: Array<[number, number]> = [
      ...cameras.map((camera) => [camera.latitude, camera.longitude] as [number, number]),
      ...events
        .filter((event) => event.latitude !== undefined && event.longitude !== undefined)
        .map((event) => [event.latitude as number, event.longitude as number] as [number, number])
    ];

    if (points.length > 1) {
      map.fitBounds(points, { padding: [24, 24], maxZoom: 13 });
      return;
    }

    map.setView([center?.lat ?? 49.2827, center?.lng ?? -123.1207], center?.zoom ?? 11);
  }, [map, center, regionBbox, cameras, events]);

  return null;
}

export function TrafficMap({
  center,
  regionBbox,
  cameras,
  events,
  onSelectCamera,
  onSelectEvent
}: {
  center?: { lat: number; lng: number; zoom: number };
  regionBbox?: BBox;
  cameras: Camera[];
  events: TrafficEvent[];
  onSelectCamera: (camera: Camera) => void;
  onSelectEvent: (event: TrafficEvent) => void;
}) {
  const spreadCameras = useMemo(() => spreadCameraMarkers(cameras), [cameras]);

  return (
    <MapContainer
      center={[center?.lat ?? 49.2827, center?.lng ?? -123.1207]}
      zoom={center?.zoom ?? 11}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport center={center} regionBbox={regionBbox} cameras={cameras} events={events} />
      {spreadCameras.map(({ camera, latitude, longitude }) => (
        <Marker
          key={camera.id}
          position={[latitude, longitude]}
          icon={cameraIcon}
          eventHandlers={{ click: () => onSelectCamera(camera) }}
        >
          <Popup>
            <strong>{camera.name}</strong>
            <div>{camera.provider}</div>
          </Popup>
        </Marker>
      ))}
      {events.map((event) =>
        event.latitude !== undefined && event.longitude !== undefined ? (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={eventIcon}
            eventHandlers={{ click: () => onSelectEvent(event) }}
          >
            <Popup>
              <strong>{event.headline}</strong>
              <div>{event.roadName}</div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
