"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { ExternalLink, MapPin } from "lucide-react";
import { getStateMapPoint } from "@/lib/state-map-data";

type StateMapPoint = {
  lat: number;
  lng: number;
  zoomSpan?: number;
};

export function StateMap({
  stateName,
  coordinates,
}: {
  stateName: string;
  coordinates?: { latitude: number; longitude: number } | null;
}) {
  const point: StateMapPoint | null = coordinates
    ? { lat: coordinates.latitude, lng: coordinates.longitude }
    : getStateMapPoint(stateName);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const zoom = point?.zoomSpan && point.zoomSpan <= 1.2 ? 8 : 6;

  useEffect(() => {
    if (!point || !mapNodeRef.current) {
      return;
    }

    const currentPoint = point;
    let cancelled = false;

    async function mountMap() {
      const L = await import("leaflet");

      if (cancelled || !mapNodeRef.current) {
        return;
      }

      mapRef.current?.remove();

      const map = L.map(mapNodeRef.current, {
        attributionControl: false,
        scrollWheelZoom: false,
      }).setView([currentPoint.lat, currentPoint.lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);

      L.marker([currentPoint.lat, currentPoint.lng], {
        icon: L.divIcon({
          className: "",
          html: '<div class="state-map-marker"><div></div></div>',
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        }),
      }).addTo(map);

      mapRef.current = map;

      const refreshMapSize = () => {
        map.invalidateSize();
        map.setView([currentPoint.lat, currentPoint.lng], zoom, { animate: false });
      };

      requestAnimationFrame(refreshMapSize);
      window.setTimeout(refreshMapSize, 250);

      const resizeObserver = new ResizeObserver(refreshMapSize);
      resizeObserver.observe(mapNodeRef.current);

      map.once("unload", () => resizeObserver.disconnect());
    }

    void mountMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [point, zoom]);

  if (!point) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-primary/15 via-accent to-saffron/15 p-6 text-center">
          <div>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-saffron text-saffron-foreground shadow-lg">
              <MapPin className="h-6 w-6" />
            </div>
            <div className="mt-3 text-sm font-medium">{stateName}</div>
            <div className="mt-1 text-xs text-muted-foreground">Map coordinates unavailable</div>
          </div>
        </div>
      </div>
    );
  }

  const externalUrl = `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=${zoom}/${point.lat}/${point.lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{stateName} map</h3>
          <p className="text-xs text-muted-foreground">
            Lat {point.lat.toFixed(2)}, Long {point.lng.toFixed(2)}
          </p>
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Open ${stateName} map`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <div ref={mapNodeRef} className="state-map-canvas h-[260px] w-full bg-muted" />
    </div>
  );
}
