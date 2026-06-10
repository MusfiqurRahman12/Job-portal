"use client";

import React, { useEffect, useRef, useState } from "react";
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
}

export default function CompanyGlobe({
  companies,
  onSelectCompany,
  selectedCompany,
}: CompanyGlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [globeSize, setGlobeSize] = useState({ width: 600, height: 450 });
  const [markers, setMarkers] = useState<GlobeMarker[]>([]);
  const [hoveredCompany, setHoveredCompany] = useState<CompanyProfile | null>(null);

  // Map companies to coordinates with jitter based on company name
  useEffect(() => {
    const mapped = companies.map((c) => {
      const coords = getCoordinatesForLocation(c.name);
      return {
        ...c,
        lat: coords.lat,
        lng: coords.lng,
        id: c.name,
      };
    });
    setMarkers(mapped);
  }, [companies]);

  // Adjust size to fit container
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const width = containerRef.current?.clientWidth || 600;
      const height = Math.min(500, Math.max(350, window.innerHeight * 0.45));
      setGlobeSize({ width, height });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Configure auto-rotation and controls
  useEffect(() => {
    if (!globeRef.current) return;

    const globe = globeRef.current;
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxDistance = 450;
      controls.minDistance = 150;
    }
  }, [globeSize]);

  // Handle focusing on selected company
  useEffect(() => {
    if (!selectedCompany || !globeRef.current) return;
    const marker = markers.find((m) => m.name === selectedCompany.name);
    if (marker) {
      // Pause auto-rotation when focusing
      const controls = globeRef.current.controls();
      if (controls) controls.autoRotate = false;

      // Pan to coordinates
      globeRef.current.pointOfView(
        { lat: marker.lat, lng: marker.lng, altitude: 1.8 },
        1200 // animation duration ms
      );
    }
  }, [selectedCompany, markers]);

  const handleMarkerHover = (marker: GlobeMarker | null) => {
    setHoveredCompany(marker);
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) {
      // Pause rotation on hover, resume on leave
      controls.autoRotate = !marker;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-radial from-[#0d0d18] to-[#06060a] border border-[#1e1b4b]/50 shadow-2xl p-4 min-h-[400px]"
    >
      {/* Dynamic Tooltip Overlay */}
      {hoveredCompany && (
        <div className="absolute top-4 left-4 z-10 p-3 rounded-2xl bg-[#0b0a16]/95 backdrop-blur-xl border border-violet-500/30 shadow-xl flex items-center gap-3 transition-opacity duration-300 pointer-events-none animate-fade-in">
          {hoveredCompany.logo ? (
            <img
              src={hoveredCompany.logo}
              alt={hoveredCompany.name}
              className="w-10 h-10 object-contain rounded-xl bg-white/5 p-1 border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400">
              {hoveredCompany.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">{hoveredCompany.name}</h4>
            <p className="text-xs text-[#a78bfa] font-medium">
              {hoveredCompany.open_jobs_count} active {hoveredCompany.open_jobs_count === 1 ? "role" : "roles"}
            </p>
          </div>
        </div>
      )}

      {/* 3D Canvas Container */}
      <div className="cursor-grab active:cursor-grabbing">
        <Globe
          ref={globeRef}
          width={globeSize.width}
          height={globeSize.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
          showAtmosphere={true}
          atmosphereColor="#8b5cf6"
          atmosphereAltitude={0.15}
          htmlElementsData={markers}
          htmlElement={(d: any) => {
            const el = document.createElement("div");
            el.className = "group relative";
            
            // Check if this is the selected company
            const isSelected = selectedCompany && selectedCompany.name === d.name;

            el.innerHTML = `
              <div class="relative flex items-center justify-center pointer-events-auto transform transition-all duration-300 ${isSelected ? 'scale-130' : 'hover:scale-120'}">
                <!-- Glowing Aura Ring -->
                <div class="absolute -inset-2 rounded-full ${isSelected ? 'bg-violet-500/40 animate-ping' : 'bg-violet-500/20 blur-sm group-hover:bg-violet-500/40'}"></div>
                
                <!-- Logo Frame -->
                <div class="relative w-8 h-8 rounded-full border-2 ${isSelected ? 'border-violet-400 shadow-violet-500/50 shadow-lg' : 'border-violet-500/30 bg-[#0d0c1b]'} bg-[#0a0a12] p-[2px] overflow-hidden flex items-center justify-center cursor-pointer transition-colors duration-300">
                  ${
                    d.logo
                      ? `<img src="${d.logo}" alt="${d.name}" class="w-full h-full object-contain rounded-full" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27><rect width=%27100%25%27 height=%27100%25%27 fill=%27%231e1b4b%27/><text x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27sans-serif%27 font-size=%2740%27 font-weight=%27bold%27 fill=%27%23a78bfa%27>${d.name.substring(0, 1).toUpperCase()}</text></svg>';" />`
                      : `<span class="text-xs font-bold text-violet-400">${d.name.substring(0, 2).toUpperCase()}</span>`
                  }
                </div>
              </div>
            `;

            // Hover events
            el.addEventListener("mouseenter", () => handleMarkerHover(d));
            el.addEventListener("mouseleave", () => handleMarkerHover(null));
            
            // Click event
            el.addEventListener("click", (e) => {
              e.stopPropagation();
              onSelectCompany(d);
            });

            return el;
          }}
        />
      </div>

      {/* Instructions Overlay */}
      <div className="absolute bottom-2 text-center pointer-events-none select-none">
        <span className="text-[10px] uppercase tracking-widest text-[#64748b] bg-[#07060f]/60 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
          Drag to Rotate &bull; Scroll to Zoom &bull; Click logo to see jobs
        </span>
      </div>
    </div>
  );
}
