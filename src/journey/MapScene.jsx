import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(workerUrl);
import { chapters } from "./chapters.js";

const LIVE_STYLE = "https://tiles.openfreemap.org/styles/positron";
const base = "/data/";
const localStyle = {
  version: 8,
  sources: {
    land: {
      type: "geojson",
      data: base + "land.geojson",
      attribution: "Natural Earth (public domain)",
    },
    boundaries: { type: "geojson", data: base + "boundaries.geojson" },
    highways: { type: "geojson", data: base + "highways.geojson" },
    roads: { type: "geojson", data: base + "roads.geojson" },
  },
  layers: [
    {
      id: "water",
      type: "background",
      paint: { "background-color": "#e7eff3" },
    },
    {
      id: "land",
      type: "fill",
      source: "land",
      paint: { "fill-color": "#f7f8f5" },
    },
    {
      id: "coast",
      type: "line",
      source: "land",
      paint: { "line-color": "#d5dfdf", "line-width": 1 },
    },
    {
      id: "boundaries",
      type: "line",
      source: "boundaries",
      paint: {
        "line-color": "#c7ceca",
        "line-width": 0.7,
        "line-dasharray": [4, 4],
      },
    },
    {
      id: "highways",
      type: "line",
      source: "highways",
      paint: {
        "line-color": "#d5dbd1",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          0.3,
          11,
          1.5,
          15,
          3,
        ],
      },
    },
    {
      id: "roads",
      type: "line",
      source: "roads",
      paint: {
        "line-color": "#c6cfc4",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          0.4,
          12,
          1.2,
          16,
          2.5,
        ],
      },
    },
  ],
};
function makeArc(from, to) {
  const rad = Math.PI / 180,
    a = from.map((v) => v * rad),
    b = to.map((v) => v * rad);
  const A = [
      Math.cos(a[1]) * Math.cos(a[0]),
      Math.cos(a[1]) * Math.sin(a[0]),
      Math.sin(a[1]),
    ],
    B = [
      Math.cos(b[1]) * Math.cos(b[0]),
      Math.cos(b[1]) * Math.sin(b[0]),
      Math.sin(b[1]),
    ];
  const angle = Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        A.reduce((sum, v, i) => sum + v * B[i], 0),
      ),
    ),
  );
  return Array.from({ length: 65 }, (_, i) => {
    const t = i / 64,
      s = Math.sin(angle);
    const p = A.map((v, k) =>
      s < 1e-8
        ? v
        : (v * Math.sin((1 - t) * angle)) / s +
          (B[k] * Math.sin(t * angle)) / s,
    );
    return [
      Math.atan2(p[1], p[0]) / rad,
      Math.atan2(p[2], Math.hypot(p[0], p[1])) / rad,
    ];
  });
}
const routes = {
  type: "FeatureCollection",
  features: chapters
    .slice(1)
    .map((c, i) => ({
      type: "Feature",
      properties: { chapter: i + 1, color: c.color },
      geometry: {
        type: "LineString",
        coordinates: makeArc(chapters[i].location.center, c.location.center),
      },
    })),
};
function padding() {
  return innerWidth < 700
    ? { left: 20, right: 20, top: 0, bottom: innerHeight * 0.46 }
    : {
        left: innerWidth * 0.41,
        right: innerWidth * 0.06,
        top: innerHeight * 0.06,
        bottom: innerHeight * 0.16,
      };
}
function camera(chapter, mode) {
  return {
    center: chapter.location.center,
    zoom: mode === "live" ? chapter.location.zoom : chapter.location.localZoom,
    pitch: chapter.location.pitch,
    bearing: chapter.location.bearing,
    padding: padding(),
  };
}
function addJourney(map) {
  if (map.getSource("journey-route")) return;
  map.addSource("journey-route", { type: "geojson", data: routes });
  map.addLayer({
    id: "journey-route",
    type: "line",
    source: "journey-route",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 1.4,
      "line-opacity": 0.4,
      "line-dasharray": [2, 4],
    },
  });
}
function styleLive(style) {
  const result = JSON.parse(JSON.stringify(style));
  result.layers = result.layers.map((layer) => {
    const l = { ...layer, paint: { ...layer.paint } };
    const id = l.id.toLowerCase();
    if (l.type === "background") l.paint["background-color"] = "#f7f8f6";
    if (l.type === "fill") {
      const color = id.includes("water")
        ? "#e5eef4"
        : id.includes("park") ||
            id.includes("wood") ||
            id.includes("grass") ||
            id.includes("landcover")
          ? "#edf1e9"
          : id.includes("building")
            ? "#e0e5df"
            : "#f6f7f3";
      l.paint["fill-color"] = color;
    }
    if (l.type === "line") {
      l.paint["line-color"] = id.includes("water")
        ? "#d7e4ea"
        : id.includes("boundary")
          ? "#c9d0cc"
          : id.includes("motorway") || id.includes("trunk")
            ? "#d2d8c9"
            : id.includes("casing")
              ? "#e1e6df"
              : "#ffffff";
    }
    if (l.type === "symbol") {
      l.paint["text-color"] =
        id.includes("city") || id.includes("place") ? "#737f7c" : "#98a39e";
      l.paint["text-halo-color"] = "#ffffff";
    }
    return l;
  });
  return result;
}
function Attribution({ mode }) {
  return (
    <div className="geo-attribution">
      {mode === "live" ? (
        <>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap
          </a>
          <span> · </span>
          <a href="https://openfreemap.org" target="_blank" rel="noreferrer">
            OpenFreeMap
          </a>
          <span> · </span>
          <a
            href="https://carto.com/attributions"
            target="_blank"
            rel="noreferrer"
          >
            CARTO
          </a>
        </>
      ) : (
        <a
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          target="_blank"
          rel="noreferrer"
        >
          Natural Earth · regional geography
        </a>
      )}
    </div>
  );
}
function mercator([lng, lat]) {
  return [
    (lng + 180) / 360,
    (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2,
  ];
}
function paths(geometry, project) {
  const line = (coords) =>
    coords
      .map((p, i) => {
        const [x, y] = project(p);
        return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  if (geometry.type === "Polygon")
    return geometry.coordinates.map((r) => line(r) + "Z").join(" ");
  if (geometry.type === "MultiPolygon")
    return geometry.coordinates
      .map((p) => p.map((r) => line(r) + "Z").join(" "))
      .join(" ");
  return (
    geometry.type === "LineString"
      ? [geometry.coordinates]
      : geometry.coordinates
  )
    .map(line)
    .join(" ");
}
function GeographicFallback({ chapter, onReady }) {
  const [data, setData] = useState(null),
    [size, setSize] = useState([innerWidth, innerHeight]);
  useEffect(() => {
    let active = true;
    Promise.all(
      ["land", "roads", "boundaries"].map((n) =>
        fetch(base + n + ".geojson").then((r) => {
          if (!r.ok) throw Error("Map data unavailable");
          return r.json();
        }),
      ),
    )
      .then((result) => {
        if (active) {
          setData(result);
          onReady?.("geographic-fallback");
        }
      })
      .catch(() => {
        if (active) onReady?.("unavailable");
      });
    const resize = () => setSize([innerWidth, innerHeight]);
    addEventListener("resize", resize);
    return () => {
      active = false;
      removeEventListener("resize", resize);
    };
  }, [onReady]);
  const [w, h] = size,
    center = mercator(chapter.location.center),
    scale = 256 * 2 ** (chapter.location.localZoom - 1.1),
    project = (p) => {
      const point = mercator(p);
      return [
        (point[0] - center[0]) * scale + w * (w < 700 ? 0.5 : 0.68),
        (point[1] - center[1]) * scale + h * (w < 700 ? 0.27 : 0.46),
      ];
    };
  return (
    <>
      <svg
        className="journey-map"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Real geographic map around ${chapter.location.name}`}
      >
        <rect width={w} height={h} fill="#e7eff3" />
        {data &&
          data.map((collection, i) => (
            <g
              key={i}
              fill={i === 0 ? "#f7f8f5" : "none"}
              stroke={i === 0 ? "#d6e0dc" : i === 1 ? "#c8d1c5" : "#ccd3cd"}
              strokeWidth={i === 1 ? 1 : 0.7}
            >
              {collection.features.map((feature, j) => (
                <path key={j} d={paths(feature.geometry, project)} />
              ))}
            </g>
          ))}
        <circle
          cx={w * (w < 700 ? 0.5 : 0.68)}
          cy={h * (w < 700 ? 0.27 : 0.46)}
          r="6"
          fill={chapter.color}
          stroke="white"
          strokeWidth="3"
        />
      </svg>
      <Attribution mode="local" />
    </>
  );
}
export default function MapScene({ progress, reducedMotion, onReady }) {
  const active = Math.min(chapters.length - 1, Math.round(progress)),
    chapter = chapters[active];
  const ref = useRef(null),
    mapRef = useRef(null),
    controls = useRef({ active, reducedMotion });
  controls.current = { active, reducedMotion };
  const [failed, setFailed] = useState(false),
    [mode, setMode] = useState("local"),
    modeRef = useRef("local"),
    markerRef = useRef(null),
    mapReady = useRef(false);
  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style: localStyle,
        ...camera(chapters[controls.current.active], "local"),
        attributionControl: false,
        interactive: false,
        renderWorldCopies: false,
        canvasContextAttributes: { antialias: true },
        maxPitch: 65,
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    let disposed = false,
      liveTimer;
    map
      .getCanvas()
      .setAttribute(
        "aria-label",
        "Real geographic map showing San Francisco, Cumming, and Irvine",
      );
    map.getCanvas().setAttribute("role", "img");
    function updateMarker() {
      const c = chapters[controls.current.active];
      if (!markerRef.current) {
        const el = document.createElement("div");
        el.className = "location-marker";
        const dot = document.createElement("span");
        dot.className = "location-marker-dot";
        const label = document.createElement("span");
        label.className = "location-marker-label";
        el.append(dot, label);
        markerRef.current = new maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat(c.location.center)
          .addTo(map);
      }
      const el = markerRef.current.getElement();
      el.style.setProperty("--marker-color", c.color);
      el.querySelector(".location-marker-label").textContent =
        c.kind === "intro"
          ? "san francisco / today"
          : c.id === "google"
            ? "san francisco / google"
            : c.id === "blizzard"
              ? "irvine / blizzard"
              : "cumming / the beginning";
      markerRef.current.setLngLat(c.location.center);
    }
    const load = () => {
      if (disposed) return;
      mapReady.current = true;
      addJourney(map);
      updateMarker();
      onReady?.(
        modeRef.current === "live" ? "maplibre-live" : "maplibre-local",
      );
    };
    map.on("load", load);
    map.on("style.load", () => {
      if (disposed) return;
      addJourney(map);
      if (modeRef.current === "live") {
        const layer = map
          .getStyle()
          .layers?.find((l) => l["source-layer"] === "building" && l.source);
        if (layer && !map.getLayer("journey-buildings"))
          map.addLayer({
            id: "journey-buildings",
            type: "fill-extrusion",
            source: layer.source,
            "source-layer": layer["source-layer"],
            minzoom: 13.5,
            paint: {
              "fill-extrusion-color": "#e1e6df",
              "fill-extrusion-height": [
                "to-number",
                ["coalesce", ["get", "render_height"], ["get", "height"], 0],
              ],
              "fill-extrusion-base": [
                "to-number",
                ["coalesce", ["get", "render_min_height"], 0],
              ],
              "fill-extrusion-opacity": 0.65,
            },
          });
        onReady?.("maplibre-live");
      }
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    // If the tile provider is unavailable, the real local geography remains in place.
    fetch(LIVE_STYLE, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error("Live map unavailable");
        return r.json();
      })
      .then((style) => {
        if (disposed) return;
        const nextStyle = styleLive(style);
        modeRef.current = "live";
        setMode("live");
        map.setStyle(nextStyle);
        map.once("style.load", () => {
          if (!disposed) {
            map.jumpTo(camera(chapters[controls.current.active], "live"));
            updateMarker();
          }
        });
        liveTimer = setTimeout(() => {
          if (disposed || modeRef.current !== "live") return;
          const sources = Object.entries(map.getStyle().sources).filter(
            ([, s]) => s.type === "vector",
          );
          if (
            sources.length &&
            !sources.some(([id]) => map.isSourceLoaded(id))
          ) {
            modeRef.current = "local";
            setMode("local");
            map.setStyle(localStyle);
            map.once("style.load", () => {
              if (!disposed)
                map.jumpTo(camera(chapters[controls.current.active], "local"));
            });
          }
        }, 12000);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
    const move = () => {
      if (disposed) return;
      mapReady.current = true;
      ref.current.dataset.mapCenter = map.getCenter().toArray().join(",");
      ref.current.dataset.mapPitch = String(map.getPitch());
      if (modeRef.current === "local" && map.getLayer("roads")) {
        ref.current.dataset.renderedRoads = String(
          map.queryRenderedFeatures({ layers: ["roads"] }).length,
        );
      }
    };
    map.on("idle", move);
    map.on("moveend", move);
    const resize = () => {
      map.resize();
      map.jumpTo(camera(chapters[controls.current.active], modeRef.current));
    };
    window.addEventListener("resize", resize);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      clearTimeout(liveTimer);
      controller.abort();
      window.removeEventListener("resize", resize);
      markerRef.current?.remove();
      markerRef.current = null;
      mapReady.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [onReady]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = chapters[active];
    const el = markerRef.current?.getElement();
    if (el) {
      el.style.setProperty("--marker-color", c.color);
      el.querySelector(".location-marker-label").textContent =
        c.id === "google"
          ? "san francisco / google"
          : c.id === "blizzard"
            ? "irvine / blizzard"
            : c.id === "beginning"
              ? "cumming / the beginning"
              : "san francisco / today";
      markerRef.current.setLngLat(c.location.center);
    }
    map.flyTo({
      ...camera(c, modeRef.current),
      duration: reducedMotion ? 0 : 2400,
      essential: false,
      curve: 1.5,
    });
  }, [active, reducedMotion]);
  if (failed) return <GeographicFallback chapter={chapter} onReady={onReady} />;
  return (
    <>
      <div className="journey-map" ref={ref} />
      <Attribution mode={mode} />
    </>
  );
}
