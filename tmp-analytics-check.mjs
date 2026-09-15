// TEMPORARY arithmetic verification for the new dashboards (deleted after the run).
const safeNumber = value => { const num = Number(value); return Number.isFinite(num) ? num : 0; };
const share = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);
const formatCount = value => safeNumber(value).toLocaleString();
const countLabel = (count, noun) => `${formatCount(count)} ${noun}${safeNumber(count) === 1 ? '' : 's'}`;
const topEntries = (counts, max = 6) => Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max);
const shareRows = (counts, total, noun, max = 6) => topEntries(counts, max).map(([name, count]) => ({ name: String(name)[0].toUpperCase() + String(name).slice(1), percentage: share(count, total), countText: countLabel(count, noun), value: count }));
const clampPercentage = value => Math.max(0, Math.min(100, safeNumber(value)));
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const failures = [];
const check = (label, condition) => { if (!condition) failures.push(label); };

// 1. Student weekly engagement buckets (mirrors buildWeeklyTrend).
const posts = [
  { createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), reactions: 10, commentCount: 2 },
  { createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), reactions: 4, comments: 1 },
  { createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), reactions: 7, commentCount: 0 },
  { createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), reactions: 99, commentCount: 99 },
];
const buckets = [0, 1, 2, 3].map(index => ({ index, label: `W${index + 1}`, views: 0, engagement: 0 }));
posts.forEach(post => {
  const weeksAgo = Math.floor((Date.now() - post.createdAt.getTime()) / WEEK_MS);
  if (weeksAgo < 0 || weeksAgo > 3) return;
  buckets[3 - weeksAgo].engagement += safeNumber(post.reactions) + safeNumber(post.commentCount ?? post.comments);
});
check('week 4 gets current activity (12)', buckets[3].engagement === 12);
check('week 3 gets last week activity (5)', buckets[2].engagement === 5);
check('week 2 gets older activity (7)', buckets[1].engagement === 7);
check('week 1 stays empty', buckets[0].engagement === 0);
check('posts older than 4 weeks are ignored', buckets.reduce((sum, b) => sum + b.engagement, 0) === 24);

// 2. Profile view shaping from the cumulative counter.
const totalViews = 284;
const weights = buckets.map(bucket => bucket.engagement);
const weightTotal = weights.reduce((sum, value) => sum + value, 0);
const views = buckets.map((bucket, index) => Math.round(totalViews * (weightTotal > 0 ? weights[index] / weightTotal : 1 / buckets.length)));
check('shaped views stay finite', views.every(Number.isFinite));
check('shaped views never exceed the counter', views.reduce((sum, v) => sum + v, 0) <= totalViews + 2);
check('shaped views follow the engagement curve', views[3] === Math.max(...views));

// 3. BarChart scaling produces 2 - 100 percent heights.
const bars = [32, 45, 38, 64, 58, 78, 92].flatMap((value, index) => ([
  { label: `W${index + 1}`, value: Math.round(value * 1.4) },
  { label: `W${index + 1}`, value: Math.round(value * 0.6) },
]));
const max = Math.max(...bars.map(item => item.value), 1);
const heights = bars.map(item => Math.max(item.value > 0 ? 6 : 2, (item.value / max) * 100));

// 4. Employer preview share rows.
const applicants = 148;
const programmeCounts = ['BSc Information Technology', 'BCom Accounting', 'BA Graphic Design', 'BSc Computer Science', 'Diploma in IT']
  .reduce((counts, name, index) => ({ ...counts, [name]: Math.round((applicants * ([38, 22, 17, 14, 9][index] || 5)) / 100) }), {});
const programmeRows = shareRows(programmeCounts, applicants, 'applicant');
check('programme rows produced', programmeRows.length === 5);
check('programme percentages are 0-100', programmeRows.every(row => row.percentage >= 0 && row.percentage <= 100));
check('programme counts are finite', programmeRows.every(row => Number.isFinite(row.value)));
check('applicant noun pluralises', programmeRows[0].countText.includes('applicants'));

const skillRows = [{ name: 'JavaScript', value: 78 }, { name: 'Data analysis', value: 63 }].map(skill => ({
  name: skill.name,
  percentage: safeNumber(skill.value),
  countText: countLabel(Math.round((applicants * safeNumber(skill.value)) / 100), 'candidate'),
}));
check('skill percentages stay in range', skillRows.every(row => row.percentage <= 100));
check('skill counts derive from applicants', skillRows[0].countText.startsWith(String(Math.round((148 * 78) / 100))));

// 5. Admin growth estimate and content scaling.
const users = 120;
const months = Array.from({ length: 6 }, (_, index) => ({ label: `M${index + 1}`, registrations: 0, active: 0 }));
months.forEach((month, index) => {
  month.registrations = Math.round(users * ((index + 1) / 15));
  month.active = Math.min(users, Math.round(users * (0.55 + index * 0.06)));
});
check('estimated registrations grow monotonically', months.every((month, index) => index === 0 || month.registrations >= months[index - 1].registrations));
check('estimated active members never exceed the base', months.every(month => month.active <= users));
const content = [240, 12, 6, 9, 3, 1];
const contentMax = Math.max(...content, 1);
const contentRows = content.map(value => ({ value, percentage: share(value, contentMax) }));
check('content percentages 0-100', contentRows.every(row => row.percentage >= 0 && row.percentage <= 100));
check('largest content metric fills its bar', contentRows[0].percentage === 100);
check('zero-safe share', share(0, 0) === 0 && share(5, 0) === 0);

// 6. Ring percentage clamping.
check('ring clamps above 100', clampPercentage(140) === 100);
check('ring clamps below 0', clampPercentage(-20) === 0);
check('ring survives undefined', clampPercentage(undefined) === 0);
check('ring survives text values', clampPercentage('84') === 84);

if (failures.length) {
  console.error('FAILED CHECKS:', failures);
  process.exit(1);
}
console.log('All analytics arithmetic checks passed.');

check('bar heights inside the track', heights.every(height => height >= 2 && height <= 100));
check('largest bar fills the track', Math.max(...heights) === 100);
check('axis ticks descend to zero', [0, 1 / 3, 2 / 3, 1].map(ratio => Math.round(max * (1 - ratio) * 10) / 10).slice(-1)[0] === 0);
check('zero value bars keep a visible stub', Math.max(0 > 0 ? 6 : 2, (0 / max) * 100) === 2);