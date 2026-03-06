import type { CustomSatelliteCardView, EduSatellite } from "../hooks/useEduSatellites";
import { CustomSatelliteCard } from "./CustomSatelliteCard";
import { SatelliteCard } from "./SatelliteCard";
import "./SatelliteCardCarousel.css";

interface SatelliteCardCarouselProps {
  customSatellite: CustomSatelliteCardView;
  satellites: EduSatellite[];
  selectedSatelliteId: string | null;
  onSelectSatellite: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onOpenLaunchPanel: () => void;
}

export function SatelliteCardCarousel({
  customSatellite,
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
  onOpenDetails,
  onOpenLaunchPanel,
}: SatelliteCardCarouselProps) {
  return (
    <section className="edu-carousel" aria-label="地球観測衛星（ちきゅうかんそくえいせい）">
      <div className="edu-carousel-header">
        <h2>地球観測衛星（ちきゅうかんそくえいせい）</h2>
        <p>カードをタップして、地球を見ている衛星を選ぼう</p>
      </div>
      <div className="edu-carousel-track">
        <CustomSatelliteCard
          satellite={customSatellite}
          selected={selectedSatelliteId === customSatellite.id}
          onSelect={onSelectSatellite}
          onOpenDetails={onOpenDetails}
          onOpenLaunchPanel={onOpenLaunchPanel}
        />
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
