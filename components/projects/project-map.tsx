"use client";

// Карта проектов на Leaflet + OpenStreetMap. Импортируется ДИНАМИЧЕСКИ с ssr:false
// (см. projects-explorer), потому что Leaflet обращается к window на импорте — на сервере
// это упало бы с "window is not defined". Здесь же грузим CSS Leaflet.

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

import type { Project } from "@/types";
import { statusMeta } from "@/lib/project-meta";
import { ProjectCard } from "./project-card";

// Центр примерно по Казахстану + масштаб, при котором видна вся страна.
const KZ_CENTER: [number, number] = [48.0, 67.5];
const KZ_ZOOM = 5;

// Свой SVG-пин, окрашенный по статусу. Так мы: (1) не тянем дефолтные картинки Leaflet,
// которые ломаются в бандлерах, (2) кодируем статус цветом (легенда — в сайдбаре).
function pinIcon(color: string): L.DivIcon {
  const html = `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 0C5.82 0 0 5.82 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.82 20.18 0 13 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="13" cy="13" r="4.5" fill="#ffffff"/>
  </svg>`;
  return L.divIcon({
    html,
    className: "", // без дефолтной рамки/фона .leaflet-div-icon
    iconSize: [26, 34],
    iconAnchor: [13, 34], // «носик» пина указывает на точку
    popupAnchor: [0, -30],
  });
}

export default function ProjectMap({ projects }: { projects: Project[] }) {
  return (
    <MapContainer
      center={KZ_CENTER}
      zoom={KZ_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {projects.map((p) =>
        p.latitude != null && p.longitude != null ? (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={pinIcon(statusMeta(p.status).color)}
          >
            <Popup>
              <ProjectCard project={p} />
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  );
}
