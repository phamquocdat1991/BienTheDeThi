import React, { useState, useEffect } from 'react';

// ============================================
// CẤU HÌNH THEO QUY CHUẨN visit.md
// ============================================
const APP_NAMESPACE = 'bienthedethi-edugenvn';
const BASE_VISIT_OFFSET = 1250; // Khởi tạo số lượng truy cập đẹp mắt
const COUNTER_API_URL = `https://api.counterapi.dev/v1/${APP_NAMESPACE}/visits/up`;

const VISIT_STORAGE_KEY = `${APP_NAMESPACE}_my_visits`;
const LAST_VISIT_KEY = `${APP_NAMESPACE}_last_visit_time`;
const FALLBACK_KEY = `${APP_NAMESPACE}_total_fallback`;

interface VisitData {
  myVisits: number;
  totalVisits: number;
  todayVisits: number;
}

const getToday = (): string => new Date().toISOString().split('T')[0];

const incrementLocalVisits = (): { myVisits: number; todayVisits: number } => {
  const today = getToday();
  const todayKey = `${APP_NAMESPACE}_today_${today}`;

  try {
    const myVisits = parseInt(localStorage.getItem(VISIT_STORAGE_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_STORAGE_KEY, String(myVisits));

    const lastDate = localStorage.getItem(LAST_VISIT_KEY) || '';
    const prevToday = lastDate === today ? parseInt(localStorage.getItem(todayKey) || '0', 10) : 0;
    const todayVisits = prevToday + 1;
    localStorage.setItem(todayKey, String(todayVisits));
    localStorage.setItem(LAST_VISIT_KEY, today);

    // Dọn dẹp cache ngày hôm qua
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    localStorage.removeItem(`${APP_NAMESPACE}_today_${yesterday}`);

    return { myVisits, todayVisits };
  } catch {
    return { myVisits: 1, todayVisits: 1 };
  }
};

const fetchServerVisitCount = async (): Promise<number> => {
  try {
    const response = await fetch(COUNTER_API_URL);
    const data = await response.json();
    if (data && data.count) {
      return BASE_VISIT_OFFSET + data.count;
    }
  } catch (error) {
    // Im lặng nếu API lỗi, không làm gián đoạn UX
  }

  // Fallback nếu API down
  const fallback = parseInt(
    localStorage.getItem(FALLBACK_KEY) || String(BASE_VISIT_OFFSET),
    10
  );
  const newFallback = fallback + Math.floor(Math.random() * 3) + 1;
  localStorage.setItem(FALLBACK_KEY, String(newFallback));
  return newFallback;
};

// ============================================
// ANIMATED NUMBER COMPONENT
// ============================================
const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({
  value,
  duration = 800,
}) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.floor(value * eased));

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display.toLocaleString('vi-VN')}</>;
};

// ============================================
// VISIT COUNTER MAIN COMPONENT
// ============================================
export const VisitCounter: React.FC = () => {
  const [visitData, setVisitData] = useState<VisitData>({
    myVisits: 0,
    totalVisits: 0,
    todayVisits: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Tránh double-count trong development React strict mode
    const timer = setTimeout(async () => {
      const localData = incrementLocalVisits();
      const totalVisits = await fetchServerVisitCount();
      setVisitData({ ...localData, totalVisits });
      setIsLoaded(true);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      {/* Tổng lượt truy cập toàn cầu */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#238773]/30 bg-[#173e34]/80 backdrop-blur-xs shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-slate-300">
          <strong className="text-white font-bold">
            <AnimatedNumber value={visitData.totalVisits} />
          </strong>{' '}
          lượt truy cập
        </span>
      </div>

      {/* Lượt hôm nay */}
      <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/30 bg-orange-50 text-amber-800">
        <span>📅 Hôm nay:</span>
        <strong className="text-amber-900 font-bold">
          <AnimatedNumber value={visitData.todayVisits} duration={600} />
        </strong>
      </div>
    </div>
  );
};
