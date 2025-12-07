'use client';

/**
 * 周执行日选择器组件
 * Requirements: 2.1, 2.4
 */

interface WeekDaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

const WEEK_DAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

export default function WeekDaySelector({
  selectedDays,
  onChange,
}: WeekDaySelectorProps): React.ReactElement {
  const handleToggle = (day: number): void => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const hasError = selectedDays.length === 0;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        执行日期
        <span className="ml-2 text-gray-400">（至少选择一天）</span>
      </label>

      <div className="flex flex-wrap gap-2">
        {WEEK_DAYS.map((day) => {
          const isSelected = selectedDays.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => handleToggle(day.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {hasError && (
        <p className="text-sm text-red-600">请至少选择一天</p>
      )}
    </div>
  );
}
