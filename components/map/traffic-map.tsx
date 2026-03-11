"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { Camera, TrafficEvent } from "@/lib/types/domain";

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

export function TrafficMap({
  center,
  cameras,
  events,
  onSelectCamera,
  onSelectEvent
}: {
  center?: { lat: number; lng: number; zoom: number };
  cameras: Camera[];
  events: TrafficEvent[];
  onSelectCamera: (camera: Camera) => void;
  onSelectEvent: (event: TrafficEvent) => void;
}) {
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
      {cameras.map((camera) => (
        <Marker
          key={camera.id}
          position={[camera.latitude, camera.longitude]}
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
