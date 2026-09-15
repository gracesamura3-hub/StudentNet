import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

const safeNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

/** Clamps any numeric input into the 0 - 100 percentage range. */
export const clampPercentage = value => Math.max(0, Math.min(100, safeNumber(value)));

/** Thousands separated counts for metric labels. */
export const formatCount = value => safeNumber(value).toLocaleString();

/** Compact axis labels so the vertical axis stays narrow on mobile and web. */
export const formatAxisValue = value => {
  const number = safeNumber(value);
  if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(number % 1000000 === 0 ? 0 : 1)}M`;
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(number % 1000 === 0 ? 0 : 1)}k`;
  return String(Math.round(number * 10) / 10);
};

function normalizeSeries(data) {
  if (!Array.isArray(data)) return [];
  return data.map((item, index) => {
    const isObject = item !== null && typeof item === 'object';
    const label = isObject && item.label !== undefined ? String(item.label) : '';
    return {
      key: `${label || 'item'}-${index}`,
      label,
      value: safeNumber(isObject ? item.value : item),
      color: isObject && item.color ? item.color : null,
    };
  });
}

/**
 * Vertical bar chart with labelled X/Y axes, gridlines and dynamic height scaling.
 * `data` accepts [{ label, value, color? }] objects (plain numbers also render).
 * Bars scale against the highest value in the series set.
 */
export function BarChart({
  data = [],
  height = 190,
  color = colors.green,
  activeColor = colors.lime,
  showValues = true,
  showAxes = true,
  groupSize = 1,
  yAxisLabel,
  xAxisLabel,
  valueFormatter = formatAxisValue,
  emptyLabel = 'No chart data available yet',
  highlightLast = true,
}) {
  const series = normalizeSeries(data);
  const chromeHeight = (yAxisLabel ? 14 : 0) + 14 + 14 + (xAxisLabel ? 16 : 0);
  const plotHeight = Math.max(48, height - chromeHeight);
  const max = Math.max(...series.map(item => item.value), 1);
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    return { ratio, value: Math.round(max * (1 - ratio) * 10) / 10 };
  });
  const startsGroup = index => groupSize > 1 && index > 0 && index % groupSize === 0;
  const barColorAt = (item, index) => item.color || (highlightLast && index === series.length - 1 ? activeColor : color);

  if (!series.length) {
    return <View style={[styles.chartEmpty, { height }]}><Text style={styles.chartEmptyText}>{emptyLabel}</Text></View>;
  }

  return <View style={styles.chartFrame}>
    {yAxisLabel ? <Text style={styles.axisTitle}>{yAxisLabel}</Text> : null}
    <View style={styles.chartBody}>
      {showAxes ? <View style={[styles.yAxis, { height: plotHeight }]}>{ticks.map(tick => <Text key={`tick-${tick.ratio}`} style={styles.yAxisTick}>{valueFormatter(tick.value)}</Text>)}</View> : null}
      <View style={styles.chartMain}>
        <View style={[styles.plotArea, { height: plotHeight }]}>
          <View pointerEvents="none" style={styles.gridLayer}>{ticks.map(tick => <View key={`grid-${tick.ratio}`} style={[styles.gridLine, { top: Math.round(plotHeight * tick.ratio) }]} />)}</View>
          <View style={styles.barRow}>{series.map((item, index) => (
            <View key={item.key} style={[styles.barColumn, startsGroup(index) && styles.barGroupSpacer]}>
              <View style={styles.barValueSlot}>{showValues ? <Text numberOfLines={1} style={styles.barValue}>{valueFormatter(item.value)}</Text> : null}</View>
              <View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max(item.value > 0 ? 6 : 2, (item.value / max) * 100)}%`, backgroundColor: barColorAt(item, index) }]} /></View>
            </View>
          ))}</View>
        </View>
        <View style={styles.barLabelsRow}>{series.map((item, index) => (
          <View key={`label-${item.key}`} style={[styles.barLabelCell, startsGroup(index) && styles.barGroupSpacer]}><Text numberOfLines={1} style={styles.barLabel}>{item.label}</Text></View>
        ))}</View>
        {xAxisLabel ? <Text style={[styles.axisTitle, styles.axisTitleBottom]}>{xAxisLabel}</Text> : null}
      </View>
    </View>
  </View>;
}

/**
 * Circular/donut progress indicator.
 * Accepts `percentage` (0-100) directly, or a `value`/`max` pair which is converted.
 */
export function ProgressRing({
  percentage,
  value,
  max = 100,
  size = 118,
  strokeWidth = 12,
  color = colors.lime,
  trackColor = 'rgba(255,255,255,0.18)',
  label = '%',
  caption,
  textColor = colors.white,
  captionColor = colors.subtle,
  showValue = true,
}) {
  const explicit = percentage !== undefined && percentage !== null && Number.isFinite(Number(percentage));
  const resolved = explicit ? safeNumber(percentage) : (safeNumber(value) / Math.max(safeNumber(max), 1)) * 100;
  const percent = clampPercentage(resolved);
  const radius = Math.max((size - strokeWidth) / 2, 1);
  const circumference = 2 * Math.PI * radius;
  const filled = (circumference * percent) / 100;

  return <View accessibilityRole="progressbar" accessibilityLabel={`${Math.round(percent)} percent`} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${filled} ${Math.max(circumference - filled, 0.001)}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </Svg>
    <View pointerEvents="none" style={styles.ringCenter}>
      {showValue ? <View style={styles.ringValueRow}><Text style={[styles.ringValue, { color: textColor, fontSize: Math.max(13, Math.round(size * 0.23)) }]}>{Math.round(percent)}</Text><Text style={[styles.ringSuffix, { color, fontSize: Math.max(8, Math.round(size * 0.1)) }]}>{label}</Text></View> : null}
      {caption ? <Text numberOfLines={2} style={[styles.ringCaption, { color: captionColor }]}>{caption}</Text> : null}
    </View>
  </View>;
}

/**
 * Horizontal distribution / progress bar.
 * Pass `percentage` (0-100) for share based visuals, or `value` + `max` for counts.
 * `countText` (or legacy `detail`) is rendered on the right of the label row.
 */
export function HorizontalMetricBar({
  label,
  percentage,
  value,
  max = 100,
  color = colors.green,
  countText,
  detail,
  subtitle,
  trackColor = colors.cream,
  height = 9,
}) {
  const explicit = percentage !== undefined && percentage !== null && Number.isFinite(Number(percentage));
  const resolved = explicit ? safeNumber(percentage) : (safeNumber(value) / Math.max(safeNumber(max), 1)) * 100;
  const percent = clampPercentage(resolved);

  return <View style={styles.metricBar}>
    <View style={styles.metricBarHeader}>
      <View style={styles.metricBarLabelWrap}>
        <Text numberOfLines={1} style={styles.metricBarLabel}>{label}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.metricBarSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text numberOfLines={1} style={styles.metricBarValue}>{countText || detail || `${Math.round(percent)}%`}</Text>
    </View>
    <View style={[styles.metricBarTrack, { height, backgroundColor: trackColor }]}>
      <View style={[styles.metricBarFill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  </View>;
}

/** Colour key for multi-series bar charts and distribution charts. */
export function ChartLegend({ items = [], style }) {
  const rows = (Array.isArray(items) ? items : []).filter(item => item && item.label);
  if (!rows.length) return null;
  return <View style={[styles.legend, style]}>
    {rows.map((item, index) => (
      <View key={`${item.label}-${index}`} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: item.color || colors.green }]} />
        <Text numberOfLines={1} style={styles.legendLabel}>{item.label}</Text>
        {item.value !== undefined ? <Text numberOfLines={1} style={styles.legendValue}>{item.value}</Text> : null}
      </View>
    ))}
  </View>;
}

const styles = StyleSheet.create({
  chartFrame: { width: '100%' },
  chartBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  chartMain: { flex: 1, minWidth: 0 },
  axisTitle: { color: colors.subtle, fontSize: 8, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 7 },
  axisTitleBottom: { textAlign: 'center', marginTop: 6, marginBottom: 0 },
  yAxis: { width: 30, justifyContent: 'space-between', alignItems: 'flex-end' },
  yAxisTick: { color: colors.subtle, fontSize: 8, fontWeight: '700', height: 10, lineHeight: 10, transform: [{ translateY: -5 }] },
  plotArea: { width: '100%', position: 'relative' },
  gridLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line },
  barRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  barColumn: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barGroupSpacer: { marginLeft: 6 },
  barValueSlot: { height: 12, justifyContent: 'flex-end' },
  barValue: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  barTrack: { width: '68%', maxWidth: 30, flex: 1, justifyContent: 'flex-end', backgroundColor: colors.cream, borderRadius: 8, overflow: 'hidden' },
  bar: { width: '100%', minHeight: 2, borderRadius: 8 },
  barLabelsRow: { flexDirection: 'row', marginTop: 7 },
  barLabelCell: { flex: 1, minWidth: 0, alignItems: 'center' },
  barLabel: { color: colors.subtle, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  chartEmpty: { alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.cream },
  chartEmptyText: { color: colors.subtle, fontSize: 9, fontWeight: '800', textAlign: 'center', paddingHorizontal: 14 },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  ringValue: { fontWeight: '900' },
  ringSuffix: { fontWeight: '900', marginTop: 6 },
  ringCaption: { fontSize: 7, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center', marginTop: 2, maxWidth: 96 },
  metricBar: { gap: 7 },
  metricBarHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  metricBarLabelWrap: { flex: 1, minWidth: 0 },
  metricBarLabel: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  metricBarSubtitle: { color: colors.subtle, fontSize: 8, marginTop: 2 },
  metricBarValue: { color: colors.green, fontSize: 10, fontWeight: '900' },
  metricBarTrack: { borderRadius: 999, backgroundColor: colors.cream, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 999, minWidth: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendLabel: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  legendValue: { color: colors.ink, fontSize: 9, fontWeight: '900' },
});
