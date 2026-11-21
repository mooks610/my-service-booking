import React from 'react';
import { ResourceVisualType } from '../types/resource';

interface ArchitecturalVisualProps {
  type: ResourceVisualType;
  accentColor?: string;
  className?: string;
}

export const ArchitecturalVisual: React.FC<ArchitecturalVisualProps> = ({
  type,
  accentColor = '#0D9488',
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Architectural grid lines */}
        <defs>
          <pattern
            id={`grid-${type}`}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="160" height="100" fill={`url(#grid-${type})`} />

        {type === 'boardroom' && (
          <g>
            {/* Room Perimeter */}
            <rect
              x="18"
              y="14"
              width="124"
              height="72"
              rx="4"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            {/* Wall Display */}
            <rect x="20" y="34" width="4" height="32" rx="1" fill="#0F172A" />
            {/* Executive Table */}
            <rect
              x="42"
              y="32"
              width="78"
              height="36"
              rx="8"
              fill="#F1F5F9"
              stroke="#64748B"
              strokeWidth="1.4"
            />
            {/* Chairs top & bottom */}
            {[50, 68, 86, 104].map((cx) => (
              <React.Fragment key={cx}>
                <rect x={cx} y="22" width="10" height="6" rx="2" fill="#94A3B8" />
                <rect x={cx} y="72" width="10" height="6" rx="2" fill="#94A3B8" />
              </React.Fragment>
            ))}
            {/* Chair right */}
            <rect x="125" y="45" width="6" height="10" rx="2" fill="#94A3B8" />
            {/* Accent table hub */}
            <rect x="74" y="47" width="14" height="6" rx="2" fill={accentColor} />
          </g>
        )}

        {type === 'studio' && (
          <g>
            <rect
              x="24"
              y="16"
              width="112"
              height="68"
              rx="4"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            {/* Glass whiteboard wall */}
            <line
              x1="46"
              y1="16"
              x2="114"
              y2="16"
              stroke={accentColor}
              strokeWidth="2.5"
            />
            {/* Oval Table */}
            <rect
              x="48"
              y="35"
              width="64"
              height="30"
              rx="14"
              fill="#F1F5F9"
              stroke="#64748B"
              strokeWidth="1.4"
            />
            {/* Chairs */}
            {[56, 75, 94].map((cx) => (
              <React.Fragment key={cx}>
                <circle cx={cx + 4} cy="27" r="3.5" fill="#94A3B8" />
                <circle cx={cx + 4} cy="73" r="3.5" fill="#94A3B8" />
              </React.Fragment>
            ))}
            {/* Video camera bar */}
            <rect x="26" y="42" width="3.5" height="16" rx="1" fill="#0F172A" />
          </g>
        )}

        {type === 'scrum' && (
          <g>
            <rect
              x="20"
              y="16"
              width="120"
              height="68"
              rx="4"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            {/* High standing table */}
            <rect
              x="46"
              y="38"
              width="68"
              height="24"
              rx="4"
              fill="#F1F5F9"
              stroke="#64748B"
              strokeWidth="1.4"
            />
            {/* Scrum wall board */}
            <rect x="52" y="20" width="56" height="8" rx="1.5" fill="#E2E8F0" />
            <rect x="56" y="22" width="12" height="4" rx="1" fill={accentColor} />
            <rect x="72" y="22" width="16" height="4" rx="1" fill="#2563EB" />
            <rect x="92" y="22" width="10" height="4" rx="1" fill="#94A3B8" />
            {/* Stools */}
            {[54, 76, 98].map((cx) => (
              <circle
                key={cx}
                cx={cx + 4}
                cy="72"
                r="4"
                fill="#FFFFFF"
                stroke="#64748B"
                strokeWidth="1.3"
              />
            ))}
          </g>
        )}

        {type === 'booth' && (
          <g>
            {/* Acoustic Pod Outer */}
            <rect
              x="48"
              y="16"
              width="64"
              height="68"
              rx="6"
              fill="#FFFFFF"
              stroke="#0F172A"
              strokeWidth="1.6"
            />
            {/* Acoustic panels */}
            <line x1="56" y1="24" x2="56" y2="76" stroke="#CBD5E1" strokeWidth="1.2" />
            <line x1="104" y1="24" x2="104" y2="76" stroke="#CBD5E1" strokeWidth="1.2" />
            {/* Desk inside pod */}
            <rect
              x="62"
              y="26"
              width="36"
              height="14"
              rx="2"
              fill="#F1F5F9"
              stroke="#64748B"
              strokeWidth="1.2"
            />
            {/* Monitor */}
            <rect x="71" y="29" width="18" height="3" rx="1" fill={accentColor} />
            {/* Seat */}
            <circle cx="80" cy="56" r="8" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.2" />
          </g>
        )}

        {type === 'equipment' && (
          <g>
            {/* Equipment Case / Desk */}
            <rect
              x="28"
              y="20"
              width="104"
              height="60"
              rx="6"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            {/* Portable 4K Projector */}
            <rect
              x="40"
              y="34"
              width="38"
              height="28"
              rx="4"
              fill="#F1F5F9"
              stroke="#0F172A"
              strokeWidth="1.4"
            />
            <circle cx="59" cy="48" r="8" fill="#FFFFFF" stroke={accentColor} strokeWidth="2" />
            <circle cx="59" cy="48" r="3" fill="#0F172A" />
            {/* Conference Speakerphone */}
            <circle cx="104" cy="48" r="14" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.4" />
            <circle cx="104" cy="48" r="5" fill={accentColor} />
          </g>
        )}
      </svg>
    </div>
  );
};
