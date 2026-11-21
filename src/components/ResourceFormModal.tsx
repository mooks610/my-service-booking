import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Resource, ResourceCategory, ResourceVisualType } from '../types/resource';

interface ResourceFormModalProps {
  isOpen: boolean;
  editingResource: Resource | null;
  onClose: () => void;
  onSave: (data: Omit<Resource, 'id' | 'operationalStatus'>, id?: string) => void;
}

const AMENITY_OPTIONS = [
  '화상회의',
  '4K 디스플레이',
  '화이트보드',
  '빔프로젝터',
  '무선 마이크',
  'USB-C 허브',
  '방음 부스',
  '조명 제어',
  '스탠딩 테이블',
];

export const ResourceFormModal: React.FC<ResourceFormModalProps> = ({
  isOpen,
  editingResource,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('meeting_room');
  const [floor, setFloor] = useState('4층');
  const [zone, setZone] = useState('센트럴 허브');
  const [capacity, setCapacity] = useState(6);
  const [amenities, setAmenities] = useState<string[]>(['화상회의', '4K 디스플레이']);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingResource) {
      setName(editingResource.name);
      setCategory(editingResource.category);
      setFloor(editingResource.floor);
      setZone(editingResource.zone);
      setCapacity(editingResource.capacity);
      setAmenities(editingResource.amenities);
      setDescription(editingResource.description);
    } else {
      setName('');
      setCategory('meeting_room');
      setFloor('4층');
      setZone('프로덕트 스튜디오');
      setCapacity(6);
      setAmenities(['화상회의', '4K 디스플레이']);
      setDescription('');
    }
  }, [isOpen, editingResource]);

  if (!isOpen) return null;

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const resolveVisualType = (cat: ResourceCategory, cap: number): ResourceVisualType => {
    if (cat === 'focus_booth') return 'booth';
    if (cat === 'equipment') return 'equipment';
    if (cap >= 12) return 'boardroom';
    return 'studio';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(
      {
        name: name.trim(),
        category,
        visualType: resolveVisualType(category, capacity),
        floor: floor.trim() || '4층',
        zone: zone.trim() || '본관',
        capacity: Math.max(1, capacity),
        amenities: amenities.length > 0 ? amenities : ['기본 설비'],
        description:
          description.trim() || '사내 공용 예약 가능 워크플레이스 리소스입니다.',
      },
      editingResource?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full sm:max-w-[500px] bg-[#FFFFFF] rounded-t-xl sm:rounded-xl border border-[#E5E7EB] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111827]">
            {editingResource ? '리소스 정보 수정' : '신규 리소스 등록'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#434655] mb-1.5">
                리소스 이름 *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 아폴로 미팅룸 C"
                className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#434655] mb-1.5">
                유형
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="meeting_room">회의실</option>
                <option value="focus_booth">포커스 부스</option>
                <option value="equipment">공용 장비</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#434655] mb-1.5">
                수용 인원 (또는 세트 수)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-sm text-[#111827] tabular-nums focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#434655] mb-1.5">
                층수
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="예: 4층"
                className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#434655] mb-1.5">
                상세 구역
              </label>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="예: 센트럴 허브"
                className="w-full h-10 px-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#434655] mb-2">
              지원 설비 및 옵션
            </span>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((item) => {
                const checked = amenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={`h-8 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      checked
                        ? 'bg-[#DBEAFE] border-[#2563EB] text-[#1D4ED8]'
                        : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#434655] mb-1.5">
              설명
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="공간 특징 또는 이용 안내를 입력하세요."
              className="w-full p-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-sm text-[#111827] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-sm font-semibold text-[#6B7280] hover:bg-[#F3F4F6] cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] text-sm font-semibold cursor-pointer"
            >
              {editingResource ? '수정 완료' : '리소스 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
