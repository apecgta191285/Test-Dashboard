import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  ErrorBar,
} from 'recharts';
import { format } from 'date-fns';

export type ChartDatum = {
  date: string;
  [key: string]: number | string | null | undefined;
};

interface MetricsChartProps {
  metrics: ChartDatum[];
  metric: string;
  title: string;
  color?: string;
}

export const MetricsLineChart: React.FC<MetricsChartProps> = ({ metrics, metric, title, color = '#3b82f6' }) => {
  const data = metrics
    .filter(m => m[metric] !== undefined && m[metric] !== null)
    .map(m => ({
      date: format(new Date(m.date), 'MMM dd'),
      value: typeof m[metric] === 'string' ? parseFloat(m[metric] as string) : Number(m[metric] ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke={color} name={title} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ScatterPerformanceChartProps {
  title: string;
  data: { name: string; spend: number; conversions: number; cpa: number }[];
  xLabel?: string;
  yLabel?: string;
}

export const ScatterPerformanceChart: React.FC<ScatterPerformanceChartProps> = ({
  title,
  data,
  xLabel = 'Spend',
  yLabel = 'Conversions',
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="spend" name={xLabel} tickFormatter={(value) => `THB ${(value / 1000).toFixed(1)}K`} />
        <YAxis type="number" dataKey="conversions" name={yLabel} />
        <ZAxis type="number" dataKey="cpa" range={[60, 260]} name="Avg. CPA" />
        <Tooltip
          formatter={(value, name) => {
            if (name === 'spend') return [`THB ${Number(value).toLocaleString('en-US')}`, xLabel];
            if (name === 'conversions') return [Number(value).toLocaleString(), yLabel];
            if (name === 'cpa') return [`THB ${Number(value).toLocaleString('en-US')}`, 'Avg. CPA'];
            return [value, name];
          }}
          cursor={{ strokeDasharray: '3 3' }}
        />
        <Legend />
        <Scatter data={data} fill="#a855f7" name="Campaign" />
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

interface StockPerformanceChartProps {
  title: string;
  data: { date: string; open: number; close: number; high: number; low: number }[];
}

export const StockPerformanceChart: React.FC<StockPerformanceChartProps> = ({ title, data }) => {
  const chartData = data.map((point) => ({
    ...point,
    range: [point.low, point.high] as [number, number],
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip
            formatter={(value, rawName) => {
              const name = typeof rawName === 'string' ? rawName : String(rawName ?? '');
              if (['open', 'close', 'high', 'low'].includes(name)) {
                const label = name.charAt(0).toUpperCase() + name.slice(1);
                return [`THB ${Number(value).toLocaleString('en-US')}`, label];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2} name="Close" dot={{ r: 3 }}>
            <ErrorBar dataKey="range" width={6} stroke="#111827" strokeWidth={1.5} />
          </Line>
          <Line type="monotone" dataKey="open" stroke="#f97316" strokeWidth={1.5} name="Open" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MetricsBarChart: React.FC<MetricsChartProps> = ({ metrics, metric, title, color = '#10b981' }) => {
  const data = metrics
    .filter(m => m[metric] !== undefined && m[metric] !== null)
    .map(m => ({
      date: format(new Date(m.date), 'MMM dd'),
      value: typeof m[metric] === 'string' ? parseFloat(m[metric] as string) : Number(m[metric] ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill={color} name={title} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface PlatformPieChartProps {
  data: { name: string; value: number }[];
  title: string;
}

export const PlatformPieChart: React.FC<PlatformPieChartProps> = ({ data, title }) => {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number | string) => `THB ${Number(value).toLocaleString('en-US')}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
