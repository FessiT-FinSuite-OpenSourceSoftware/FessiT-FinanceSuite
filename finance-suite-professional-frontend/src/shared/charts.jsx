import React from 'react'
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const DONUT_COLORS = ['#34d399', '#fbbf24', '#cbd5e1', '#60a5fa', '#f97316']
const BAR_COLORS = ['#3b82f6', '#6366f1', '#14b8a6', '#f97316', '#a855f7']
const HBAR_COLORS = ['#3b82f6', '#6366f1', '#14b8a6', '#f97316', '#a855f7']
const PIE_COLORS = ["#34d399", "#fbbf24", "#cbd5e1", "#60a5fa", "#f97316"];

// Unified chart sizing to keep all small dashboard cards consistent
// Increased height to avoid compressed charts; donut width slightly larger.
const CHART_HEIGHT_CLASS = 'h-64'
const CHART_CARD_CLASS = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-none'

/**
 * DonutChart — pie/donut with inline side legend
 *
 * @param {string}   title
 * @param {string}   [subtitle]
 * @param {string}   [badge]        — small text shown top-right (e.g. "42 items")
 * @param {Array}    data           — [{ name, value }]
 * @param {string[]} [colors]
 * @param {string}   [tooltipLabel] — label shown in tooltip (e.g. "Assets")
 */
export function DonutChart({
  title, subtitle, badge,
  data = [],
  colors = DONUT_COLORS,
  tooltipLabel = 'Count',
  valueFormatter = (v) => v,
}) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const isEmpty = !data.length || total === 0;

  return (
    <div className={`${CHART_CARD_CLASS} p-4 ${CHART_HEIGHT_CLASS} flex min-w-0 flex-col`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</div>}
        </div>
        {badge && <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">{badge}</div>}
      </div>

      {isEmpty ? (
        <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-1 text-center">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Not enough data
          </div>
          <div className="text-[11px] text-slate-350 dark:text-slate-600">
            Nothing to show for this period
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-2">
          <div className="w-46 shrink-0 h-full">
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={28} outerRadius={52} paddingAngle={3} isAnimationActive={false}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, tooltipLabel]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 overflow-y-auto">
            {data.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {item.name}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  {valueFormatter(item.value)}
                </span>
                {total > 0 && (
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    ({Math.round((item.value / total) * 100)}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



export function PieChartCard({
  title,
  subtitle,
  badge,
  data = [],
  colors = PIE_COLORS,
  tooltipLabel = "Count",
  valueFormatter = (v) => v,
}) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className={`${CHART_CARD_CLASS} p-4 ${CHART_HEIGHT_CLASS} flex min-w-0 flex-col`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </div>
          )}
        </div>
        {badge && (
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            {badge}
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0 gap-2">
        {/* Pie */}
        <div className="w-28 shrink-0 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={0}
                outerRadius={52}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, tooltipLabel]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        {/* Legend */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 overflow-y-auto">
          {data.map((item, i) => (
            <div
              key={item.name}
              className="flex items-center gap-2 min-w-0"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colors[i % colors.length] }}
              />

              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {item.name}
              </span>

              <div className="flex items-center gap-1 ml-auto shrink-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {valueFormatter(item.value)}
                </span>

                {total > 0 && (
                  <span className="text-[10px] text-slate-400">
                    ({Math.round((item.value / total) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
/**
 * BarChartCard — vertical bar chart with colored bars and inline legend
 *
 * @param {string}   title
 * @param {string}   [subtitle]
 * @param {Array}    data              — [{ name, value }]
 * @param {string[]} [colors]
 * @param {Function} [tooltipFormatter] — (value) => [label, name]
 * @param {Function} [yTickFormatter]   — (value) => string
 */
export function BarChartCard({
  title, subtitle,
  data = [],
  colors = BAR_COLORS,
  tooltipFormatter = (v) => [v, 'Value'],
  yTickFormatter = (v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v,
}) {
  const CustomTick = ({ x, y, payload }) => (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={8}
        textAnchor="end"
        transform="rotate(-45)"
        fontSize={10}
        fill="currentColor"
      >
        <title>{payload.value}</title>
        {payload.value.length > 10 ? `${payload.value.slice(0, 10)}…` : payload.value}
      </text>
    </g>
  );

  return (
    <div className={`${CHART_CARD_CLASS} p-2 ${CHART_HEIGHT_CLASS} flex min-w-0 flex-col`}>
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>}
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={<CustomTick />}
              height={42}
              interval={0}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tickFormatter={yTickFormatter} tick={{ fontSize: 10 }} width={36} />
            <Tooltip formatter={tooltipFormatter} />
            <Bar dataKey="value" maxBarSize={24} radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * HorizontalBarChart — horizontal bar chart (good for ranked lists)
 *
 * @param {string}   title
 * @param {string}   [subtitle]
 * @param {Array}    data              — [{ name, value }]
 * @param {string[]} [colors]
 * @param {Function} [tooltipFormatter] — (value) => [label, name]
 * @param {Function} [xTickFormatter]
 * @param {number}   [yAxisWidth]
 */
export function HorizontalBarChart({
  title, subtitle,
  data = [],
  colors = HBAR_COLORS,
  tooltipFormatter = (v) => [v, 'Value'],
  xTickFormatter = (v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v,
  yAxisWidth = 120,
}) {
  const getTickLines = (value, maxChars = 14) => {
    const words = String(value || '').split(/\s+/).filter(Boolean);
    const lines = [''];
    for (const word of words) {
      const candidate = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
      if (candidate.length <= maxChars) {
        lines[lines.length - 1] = candidate;
      } else if (lines.length < 3) {
        lines.push(word);
      } else {
        lines[2] = lines[2].length + word.length + 1 <= maxChars
          ? `${lines[2]} ${word}`
          : lines[2].slice(0, maxChars - 1) + '…';
      }
    }
    return lines.filter(Boolean);
  };

  const lineHeight = 13;
  const YAxisTick = ({ x, y, payload }) => {
    const lines = getTickLines(payload.value);
    const totalH = lines.length * lineHeight;
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{payload.value}</title>
        <text textAnchor="end" fill="#475569" fontSize={10}>
          {lines.map((line, i) => (
            <tspan key={i} x={0} dy={i === 0 ? -(totalH / 2 - lineHeight * 0.75) : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const [formattedValue, formattedLabel] = tooltipFormatter(item.value);
      const productName = item.payload.name;
      return (
        <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', minWidth: '180px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#333', whiteSpace: 'normal', wordWrap: 'break-word' }}>{productName}</p>
          <p style={{ margin: 0, color: '#555' }}>{formattedLabel}: <strong>{formattedValue}</strong></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${CHART_CARD_CLASS} p-2 ${CHART_HEIGHT_CLASS} flex min-w-0 flex-col`}>
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>}
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={xTickFormatter} tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={<YAxisTick />}
              width={yAxisWidth}
              interval={0}
            />
            <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="value" maxBarSize={22} radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
