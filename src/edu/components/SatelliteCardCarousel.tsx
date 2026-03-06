import type { EduSatellite } from "../hooks/useEduSatellites";
import { SatelliteCard } from "./SatelliteCard";
import "./SatelliteCardCarousel.css";

interface SatelliteCardCarouselProps {
  satellites: EduSatellite[];
  selectedSatelliteId: string | null;
  onSelectSatellite: (id: string) => void;
  onOpenDetails: (id: string) => void;
}

export function SatelliteCardCarousel({
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
  onOpenDetails,
}: SatelliteCardCarouselProps) {
  return (
    <section className="edu-carousel" aria-label="地球観測衛星（ちきゅうかんそくえいせい）">
      <div className="edu-carousel-header">
        <h2>地球観測衛星（ちきゅうかんそくえいせい）</h2>
        <p>カードをタップして、地球を見ている衛星を選ぼう</p>
      </div>
      <div className="edu-carousel-track">
        {satellites.map((satellite) => (
          <SatelliteCard
            key={satellite.id}
            satellite={satellite}
            selected={satellite.id === selectedSatelliteId}
            onSelect={onSelectSatellite}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </section>
  );
}
