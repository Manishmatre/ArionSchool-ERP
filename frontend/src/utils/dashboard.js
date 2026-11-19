// Shared helpers for analytical dashboards

export const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

export const formatCurrency = (value = 0, { compact = false } = {}) => {
  const num = Number(value) || 0;
  if (compact) {
    if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

export const formatNumber = (value = 0) => (Number(value) || 0).toLocaleString('en-IN');

// Convert 'YYYY-MM' to a short label like "Jan 26"
export const monthLabel = (ym) => {
  if (!ym || typeof ym !== 'string') return ym;
  const [year, month] = ym.split('-').map(Number);
  if (!year || !month) return ym;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

// Aggregate revenue report rows ([{month, source, totalRevenue}]) into a monthly series
export const aggregateRevenueByMonth = (rows = []) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = r.month;
    map.set(key, (map.get(key) || 0) + (Number(r.totalRevenue) || 0));
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, revenue]) => ({ month, label: monthLabel(month), revenue }));
};

// Aggregate revenue report rows into totals per source (for donut/bar)
export const aggregateRevenueBySource = (rows = []) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = (r.source || 'other').toString();
    map.set(key, (map.get(key) || 0) + (Number(r.totalRevenue) || 0));
  });
  return Array.from(map.entries())
    .map(([source, value]) => ({
      name: source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
    }))
    .sort((a, b) => b.value - a.value);
};

// Compute a percentage trend given current-period and total values (best-effort)
export const percentOf = (part, whole) => {
  const p = Number(part) || 0;
  const w = Number(whole) || 0;
  if (w <= 0) return 0;
  return Math.round((p / w) * 100);
};
