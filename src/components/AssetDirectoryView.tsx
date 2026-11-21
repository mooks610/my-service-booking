import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Power } from 'lucide-react';
import { Booking, Resource, ResourceCategory } from '../types/resource';
import {
  computeDailyUtilizationPercent,
  formatDateISO,
  getCategoryLabel,
} from '../utils/schedule';
import { ArchitecturalVisual } from './ArchitecturalVisual';

interface AssetDirectoryViewProps {
  resources: Resource[];
  bookings: Booking[];
  now: Date;
  currentUserId: string;
  isAdmin: boolean;
  onAddResource: () => void;
  onEditResource: (resource: Resource) => void;
  onToggleOperationalStatus: (resourceId: string) => void;
}

export const AssetDirectoryView: React.FC<AssetDirectoryViewProps> = ({
  resources,
  bookings,
  now,
  currentUserId,
  isAdmin,
  onAddResource,
  onEditResource,
  onToggleOperationalStatus,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | ResourceCategory>('all');
  const todayISO = formatDateISO(now);

  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return resources;
    return resources.filter((r) => r.category === categoryFilter);
  }, [resources, categoryFilter]);

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <section className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg overflow-x-auto">
          {(
            [
              { id: 'all', label: '전체 자산' },
              { id: 'meeting_room', label: '회의실' },
              { id: 'focus_booth', label: '포커스 부스' },
              { id: 'equipment', label: '공용 장비' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-[#FFFFFF] text-[#111827] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddResource}
          className="h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>신규 리소스 등록</span>
        </button>
      </section>

      {/* Asset Directory Table */}
      <section className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[12px] font-semibold text-[#6B7280]">
                <th className="py-3 px-4 whitespace-nowrap">자산 정보</th>
                <th className="py-3 px-4 whitespace-nowrap">유형 · 위치</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">수용 규모</th>
                <th className="py-3 px-4 whitespace-nowrap">지원 설비</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">금일 가동률</th>
                <th className="py-3 px-4 whitespace-nowrap">운영 상태</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-sm">
              {filtered.map((resource) => {
                const utilization = computeDailyUtilizationPercent(
                  bookings,
                  resource.id,
                  todayISO
                );
                const isActive = resource.operationalStatus === 'active';

                return (
                  <tr
                    key={resource.id}
                    className="hover:bg-[#F9FAFB] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <ArchitecturalVisual
                          type={resource.visualType}
                          className="w-12 h-9 rounded-md shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#111827] truncate">
                            {resource.name}
                          </div>
                          <div className="text-xs text-[#6B7280] truncate max-w-[240px]">
                            {resource.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-[#111827] font-medium">
                        {getCategoryLabel(resource.category)}
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        {resource.floor} · {resource.zone}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right tabular-nums font-medium text-[#111827]">
                      {resource.category === 'equipment'
                        ? '1세트'
                        : `${resource.capacity}인`}
                    </td>

                    <td className="py-3.5 px-4 max-w-[240px]">
                      <p className="text-xs text-[#4B5563] truncate">
                        {resource.amenities.join(' · ')}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full"
                            style={{ width: `${utilization}%` }}
                          />
                        </div>
                        <span className="tabular-nums font-semibold text-xs text-[#111827] w-9 text-right">
                          {utilization}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                          isActive
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'bg-[#FEE2E2] text-[#B91C1C]'
                        }`}
                      >
                        {isActive ? '정상 운영' : '점검 중'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      {isAdmin || resource.createdByUid === currentUserId ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditResource(resource)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#F9FAFB] text-xs font-medium text-[#111827] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>편집</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleOperationalStatus(resource.id)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                              isActive
                                ? 'border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#FEF2F2] hover:text-[#B91C1C] text-[#4B5563]'
                                : 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isActive ? '점검 전환' : '운영 재개'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">읽기 전용</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
