import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CHART_COLORS, formatCurrency, formatNumber } from '../../utils/dashboard';
import EmptyState from '../ui/EmptyState';
import { FiBarChart2, FiPieChart, FiTrendingUp } from 'react-icons/fi';

const axisStyle = { fontSize: 12, fill: '#64748b' };

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 25px -5px rgb(15 23 42 / 0.12)',
  fontSize: 13,
};

export const RevenueTrendChart = ({ data = [] }) => {
  if (!data.length) {
    return <EmptyState icon={FiTrendingUp} title="No revenue data yet" description="Revenue trends will appear once payments are recorded." />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, { compact: true })}
          width={60}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatCurrency(value), 'Revenue']}
        />
        <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#revGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const RevenueSourceChart = ({ data = [] }) => {
  if (!data.length) {
    return <EmptyState icon={FiPieChart} title="No income sources yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(value)} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const TopCoursesChart = ({ data = [] }) => {
  if (!data.length) {
    return <EmptyState icon={FiBarChart2} title="No enrollment data yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatNumber(value), 'Enrollments']} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="enrollments" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const StatusDonut = ({ data = [], colors }) => {
  const palette = colors || ['#10b981', '#f59e0b', '#ef4444'];
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  if (!total) {
    return <EmptyState icon={FiPieChart} title="No data yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatNumber(value)} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};
