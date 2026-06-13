"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Globe from "react-globe.gl";
import { CompanyProfile } from "@/lib/api";
import { getCoordinatesForLocation } from "@/lib/coordinates";

interface CompanyGlobeProps {
  companies: CompanyProfile[];
  onSelectCompany: (company: CompanyProfile) => void;
  selectedCompany: CompanyProfile | null;
}

interface GlobeMarker extends CompanyProfile {
  lat: number;
  lng: number;
  id: string;
  size: number;
  color: string;
}

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

export default function CompanyGlobe({
  companies,
  onSelectCompany,
  selectedCompany,
}: CompanyGlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [globeSize, setGlobeSize] = useState({ width: 800, height: 650 });
  const [markers, setMarkers] = useState<GlobeMarker[]>([]);
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const [hoveredCompany, setHoveredCompany] = useState<CompanyProfile | null>(
    null
  );
  const [isGlobeReady, setIsGlobeReady] = useState(false);

  // Map companies to coordinates
  useEffect(() => {
    const mapped = companies.map((c) => {
      const coords = getCoordinatesForLocation(c.name);
      // Scale marker size based on open jobs count (min 0.3, max 1.2)
      const size = Math.min(1.2, Math.max(0.3, c.open_jobs_count / 15));
      return {
        ...c,
        lat: coords.lat,
        lng: coords.lng,
        id: c.name,
        size,
        color: "#a78bfa",
      };
    });
    setMarkers(mapped);

    // Generate connecting arcs between random pairs for visual flair
    const arcs: ArcData[] = [];
    const arcColors = [
      "rgba(139, 92, 246, 0.15)",
      "rgba(52, 211, 153, 0.12)",
      "rgba(99, 102, 241, 0.10)",
    ];
    if (mapped.length > 3) {
      const arcCount = Math.min(12, Math.floor(mapped.length / 3));
      for (let i = 0; i < arcCount; i++) {
        const a = mapped[i % mapped.length];
        const b = mapped[(i * 7 + 3) % mapped.length];
        if (a.id !== b.id) {
          arcs.push({
            startLat: a.lat,
            startLng: a.lng,
            endLat: b.lat,
            endLng: b.lng,
            color: arcColors[i % arcColors.length],
          });
        }
      }
    }
    setArcsData(arcs);
  }, [companies]);

  // Responsive container sizing – use much larger dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const width = containerRef.current?.clientWidth || 800;
      // Much taller: up to 70% of viewport height, min 550px
      const height = Math.min(750, Math.max(550, window.innerHeight * 0.7));
      setGlobeSize({ width, height });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Configure smooth controls once globe is ready
  const handleGlobeReady = useCallback(() => {
    setIsGlobeReady(true);
    if (!globeRef.current) return;

    const globe = globeRef.current;
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4; // Slower, more cinematic rotation
      controls.enableDamping = true;
      controls.dampingFactor = 0.12; // Much smoother inertia
      controls.rotateSpeed = 0.6; // Easier to drag
      controls.zoomSpeed = 0.8;
      controls.maxDistance = 380;
      controls.minDistance = 120;
      controls.enablePan = false; // Prevent jarring panning
    }

    // Set initial camera angle for dramatic entrance
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);

    // Smooth zoom-in animation on mount
    setTimeout(() => {
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.0 }, 2000);
    }, 300);
  }, []);

  // Handle focusing on selected company
  useEffect(() => {
    if (!selectedCompany || !globeRef.current || !isGlobeReady) return;
    const marker = markers.find((m) => m.name === selectedCompany.name);
    if (marker) {
      const controls = globeRef.current.controls();
      if (controls) controls.autoRotate = false;

      globeRef.current.pointOfView(
        { lat: marker.lat, lng: marker.lng, altitude: 1.6 },
        1500
      );
    }
  }, [selectedCompany, markers, isGlobeReady]);

  // Hover handler: pause rotation and show tooltip
  const handlePointHover = useCallback(
    (point: any) => {
      setHoveredCompany(point as GlobeMarker | null);
      if (!globeRef.current) return;
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = !point;
      }
      // Change cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = point ? "pointer" : "grab";
      }
    },
    []
  );

  // Click handler
  const handlePointClick = useCallback(
    (point: any) => {
      if (point) {
        onSelectCompany(point as CompanyProfile);
      }
    },
    [onSelectCompany]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-[#1e1b4b]/40 shadow-2xl min-h-[550px]"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, #0f0e1e 0%, #08071a 40%, #040410 100%)",
      }}
    >
      {/* Animated ambient glow behind globe */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.04) 30%, transparent 60%)",
        }}
      />
      <div
        className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Dynamic Tooltip Overlay */}
      <div
        className={`absolute top-5 left-5 z-20 p-4 rounded-2xl bg-[#0b0a16]/95 backdrop-blur-2xl border shadow-2xl flex items-center gap-4 pointer-events-none transition-all duration-300 ${
          hoveredCompany
            ? "opacity-100 translate-y-0 border-violet-500/40"
            : "opacity-0 -translate-y-2 border-transparent"
        }`}
      >
        {hoveredCompany && (
          <>
            {hoveredCompany.logo ? (
              <img
                src={hoveredCompany.logo}
                alt={hoveredCompany.name}
                className="w-11 h-11 object-contain rounded-xl bg-white/5 p-1.5 border border-white/10"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400 text-sm">
                {hoveredCompany.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-white tracking-wide">
                {hoveredCompany.name}
              </h4>
              <p className="text-xs text-[#a78bfa] font-medium mt-0.5">
                {hoveredCompany.open_jobs_count} active{" "}
                {hoveredCompany.open_jobs_count === 1 ? "role" : "roles"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Company count badge */}
      <div className="absolute top-5 right-5 z-20 pointer-events-none">
        <div className="px-4 py-2 rounded-full bg-[#0b0a16]/80 backdrop-blur-xl border border-violet-500/20 text-xs font-semibold text-[#a78bfa] tracking-wide">
          <span className="inline-block w-2 h-2 rounded-full bg-[#34d399] mr-2 animate-pulse" />
          {companies.length} companies worldwide
        </div>
      </div>

      {/* 3D Globe Canvas */}
      <div className="cursor-grab active:cursor-grabbing">
        <Globe
          ref={globeRef}
          width={globeSize.width}
          height={globeSize.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          showAtmosphere={true}
          atmosphereColor="#7c3aed"
          atmosphereAltitude={0.18}
          onGlobeReady={handleGlobeReady}
          // ── Points Layer (fast WebGL rendering) ──
          pointsData={markers}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => "#a78bfa"}
          pointAltitude={0.01}
          pointRadius="size"
          pointsMerge={false}
          onPointHover={handlePointHover}
          onPointClick={handlePointClick}
          // ── Rings Layer (animated pulsing markers) ──
          ringsData={markers}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => (t: number) =>
            `rgba(167, 139, 250, ${1 - t})`}
          ringMaxRadius={2.5}
          ringPropagationSpeed={1.5}
          ringRepeatPeriod={2000}
          ringAltitude={0.005}
          // ── Arcs Layer (connecting lines) ──
          arcsData={arcsData}
          arcColor="color"
          arcAltitude={0.15}
          arcStroke={0.3}
          arcDashLength={0.6}
          arcDashGap={0.3}
          arcDashAnimateTime={4000}
          // ── Labels (company names on hover) ──
          labelsData={
            hoveredCompany
              ? markers.filter((m) => m.name === hoveredCompany.name)
              : []
          }
          labelLat="lat"
          labelLng="lng"
          labelText="name"
          labelSize={1.2}
          labelColor={() => "#e2e8f0"}
          labelDotRadius={0.4}
          labelAltitude={0.02}
          labelResolution={2}
        />
      </div>

      {/* Instructions Overlay */}
      <div className="absolute bottom-4 text-center pointer-events-none select-none">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#64748b] bg-[#07060f]/70 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-xl font-medium">
          Drag to Rotate &bull; Scroll to Zoom &bull; Click dot to
          explore
        </span>
      </div>
    </div>
  );
}
