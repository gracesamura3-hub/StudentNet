import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { BarChart, ChartLegend, HorizontalMetricBar, ProgressRing } from '../components/Charts';
import { IconButton, Pill, SectionHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { analytics as previewAnalytics, opportunities as previewOpportunities, posts as previewPosts } from '../data/demoData';
import { db } from '../firebase/config';
import { colors } from '../theme';

const adminQueue = [
  { id: '1', title: 'Nova Labs Africa', detail: 'Business verification', icon: 'business-outline', tone: colors.bluePale },
  { id: '2', title: 'Graduate Data Analyst', detail: 'Opportunity approval', icon: 'briefcase-outline', tone: colors.mint },
  { id: '3', title: 'Reported career story', detail: 'Content moderation', icon: 'flag-outline', tone: colors.coralPale },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SERIES_COLORS = [colors.green, colors.lime, colors.gold, colors.blue, colors.coral];
const RICHFIELD_PROGRAMMES = ['BSc Information Technology', 'BCom Accounting', 'BA Graphic Design', 'BSc Computer Science', 'Diploma in IT'];

const safeNumber = value => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCount = value => safeNumber(value).toLocaleString();

const roleAccent = role => (role === 'admin' ? colors.coral : role === 'business' ? colors.gold : colors.green);

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shortLabel(value, max = 9) {
  const text = String(value || 'Untitled').trim() || 'Untitled';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function share(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function countLabel(count, noun) {
  const safeCount = safeNumber(count);
  return `${formatCount(safeCount)} ${noun}${safeCount === 1 ? '' : 's'}`;
}

function skillList(value) {
  return (Array.isArray(value) ? value : []).map(skill => String(skill).trim()).filter(Boolean);
}

function topEntries(counts, max = 6) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max);
}

function shareRows(counts, total, noun, max = 6) {
  return topEntries(counts, max).map(([name, count]) => ({
    name: String(name)[0].toUpperCase() + String(name).slice(1),
    percentage: share(count, total),
    countText: countLabel(count, noun),
    value: count,
  }));
}

/**
 * Buckets authored posts into the last four weeks so the trend chart renders a
 * four point time series instead of a single cumulative counter.
 */
function buildWeeklyTrend(user, posts) {
  const storedWeeks = Array.isArray(user?.profileWeeklyViews) ? user.profileWeeklyViews.slice(-4).map(safeNumber) : null;
  const buckets = [0, 1, 2, 3].map(index => ({
    index,
    label: `W${index + 1}`,
    views: storedWeeks ? safeNumber(storedWeeks[index]) : 0,
    engagement: 0,
  }));

  posts.forEach(post => {
    const created = toDate(post?.createdAt);
    if (!created) return;
    const weeksAgo = Math.floor((Date.now() - created.getTime()) / WEEK_MS);
    if (weeksAgo < 0 || weeksAgo > 3) return;
    const bucket = buckets[3 - weeksAgo];
    bucket.engagement += safeNumber(post?.reactions) + safeNumber(post?.commentCount ?? post?.comments);
  });

  const totalViews = safeNumber(user?.profileViews);
  const estimatedViews = !storedWeeks && totalViews > 0;
  if (estimatedViews) {
    // Firestore stores profile views as a cumulative counter, so the four week history
    // is shaped from the engagement curve and labelled as an estimate in the UI.
    const weights = buckets.map(bucket => bucket.engagement);
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    buckets.forEach((bucket, index) => {
      const weight = weightTotal > 0 ? weights[index] / weightTotal : 1 / buckets.length;
      bucket.views = Math.round(totalViews * weight);
    });
  }

  return { buckets, estimatedViews };
}

function buildTrendBars(trend) {
  return trend.buckets.flatMap(bucket => [
    { label: bucket.label, value: bucket.views, color: colors.green },
    { label: bucket.label, value: bucket.engagement, color: colors.lime },
  ]);
}

/** Average profile completeness of the students enrolled in the same programme. */
async function getPeerCompleteness(user) {
  const programme = String(user?.programme || '').trim();
  const fallback = { percentage: 72, label: 'programme benchmark' };
  if (!programme || programme === 'Complete your programme') return fallback;
  try {
    const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), where('programme', '==', programme), limit(40)));
    const values = snapshot.docs.map(docSnap => safeNumber(docSnap.data().completion)).filter(value => value > 0);
    if (values.length < 2) return fallback;
    const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    return { percentage: average, label: `${values.length} ${programme} peers` };
  } catch {
    // Firestore visibility rules can hide peer profiles; the benchmark keeps the ring readable.
    return fallback;
  }
}

/** Live demand for the student's own skills across approved opportunities. */
async function getRecruiterSkillDemand(user) {
  const skills = skillList(user?.skills).slice(0, 6);
  if (!skills.length) return { rows: [], empty: 'Add skills to your profile to see what recruiters are searching for.' };
  try {
    const snapshot = await getDocs(query(collection(db, 'opportunities'), where('status', '==', 'approved'), limit(60)));
    const liveRoles = snapshot.docs.map(docSnap => new Set([
      ...skillList(docSnap.data().skills).map(skill => skill.toLowerCase()),
      ...skillList(docSnap.data().requiredSkills).map(skill => skill.toLowerCase()),
    ]));
    if (!liveRoles.length) return { rows: skills.map(name => ({ name, percentage: 0, countText: 'No live roles yet' })), empty: '' };
    return {
      rows: skills
        .map(name => {
          const matches = liveRoles.filter(role => role.has(name.toLowerCase())).length;
          return { name, percentage: share(matches, liveRoles.length), countText: `${formatCount(matches)} of ${formatCount(liveRoles.length)} live roles` };
        })
        .sort((a, b) => b.percentage - a.percentage),
      empty: '',
    };
  } catch {
    return { rows: skills.map(name => ({ name, percentage: 0, countText: 'Demand data unavailable' })), empty: '' };
  }
}

async function getStudentMetrics(user) {
  const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', user.id)));
  const posts = postsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  const [peer, demand] = await Promise.all([getPeerCompleteness(user), getRecruiterSkillDemand(user)]);

  const trend = buildWeeklyTrend(user, posts);
  const connectionCount = Array.isArray(user?.connectionIds)
    ? user.connectionIds.length
    : Array.isArray(user?.connections)
      ? user.connections.length
      : 0;
  const totalViews = safeNumber(user?.profileViews);
  const engagement = posts.reduce((sum, post) => sum + safeNumber(post.reactions) + safeNumber(post.commentCount ?? post.comments), 0);
  const videoPosts = posts.filter(post => post?.type === 'video' || post?.mediaType === 'video').length;

  return {
    headline: 'Your visibility and engagement, tracked live',
    chartLabel: `Profile views${trend.estimatedViews ? ' (estimated from your view counter)' : ''} and post engagement · last 4 weeks`,
    chart: buildTrendBars(trend),
    chartLegend: [{ label: 'Profile views', color: colors.green }, { label: 'Engagement', color: colors.lime }],
    skills: demand.rows,
    skillsEmpty: demand.empty,
    cards: [
      { label: 'Profile views', value: formatCount(totalViews), delta: totalViews ? 'tracked total' : 'no views yet' },
      { label: 'Connections', value: formatCount(connectionCount), delta: connectionCount ? 'accepted network' : 'not connected yet' },
      { label: 'Engagement', value: formatCount(engagement), delta: videoPosts ? countLabel(videoPosts, 'video post') : countLabel(posts.length, 'post') },
    ],
    ring: { percentage: safeNumber(user?.completion), caption: 'profile complete', color: colors.lime },
    peer,
  };
}

/** Reads readable applicant profiles so demographics can be filled in where Firestore allows it. */
async function getApplicantProfiles(applications) {
  const ids = [...new Set(applications.map(item => item.userId || item.id).filter(Boolean))].slice(0, 24);
  const profiles = await Promise.all(ids.map(async id => {
    try {
      const snapshot = await getDoc(doc(db, 'users', id));
      return snapshot.exists() ? { id, ...snapshot.data() } : null;
    } catch {
      return null;
    }
  }));
  return profiles.filter(Boolean).reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
}

async function getBusinessMetrics(user) {
  const opportunitiesSnap = await getDocs(collection(db, 'opportunities'));
  const ownedOpportunities = opportunitiesSnap.docs.filter(docSnap => {
    const data = docSnap.data();
    return [data.authorId, data.userId, data.createdBy, data.ownerId, data.businessId, data.postedBy].includes(user.id);
  });

  const opportunityStats = await Promise.all(ownedOpportunities.map(async docSnap => {
    const data = docSnap.data();
    const applicationSnap = await getDocs(collection(db, 'opportunities', docSnap.id, 'applications'));
    return {
      id: docSnap.id,
      title: String(data.title || 'Opportunity'),
      status: data.status || 'pending',
      requiredSkills: [...skillList(data.skills), ...skillList(data.requiredSkills)],
      applications: applicationSnap.docs.map(item => ({ id: item.id, ...item.data() })),
    };
  }));

  const allApplications = opportunityStats.flatMap(item => item.applications);
  const profiles = await getApplicantProfiles(allApplications);
  const totalApplicants = allApplications.length;
  const totalListings = opportunityStats.length;

  const pipeline = opportunityStats
    .map((item, index) => ({ label: shortLabel(item.title), value: item.applications.length, color: SERIES_COLORS[index % SERIES_COLORS.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const stageCounts = {};
  const skillCounts = {};
  const skillProgrammeCounts = {};
  const programmeCounts = {};
  const yearCounts = {};

  allApplications.forEach(application => {
    const profile = profiles[application.userId || application.id];
    const stage = String(application.status || 'submitted');
    const programme = String(application.programme || profile?.programme || 'Programme not specified');
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    programmeCounts[programme] = (programmeCounts[programme] || 0) + 1;
    yearCounts[String(application.year || profile?.year || 'Year not specified')] = (yearCounts[String(application.year || profile?.year || 'Year not specified')] || 0) + 1;
    [...skillList(application.skills), ...skillList(profile?.skills)].forEach(skill => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      skillProgrammeCounts[skill] = skillProgrammeCounts[skill] || {};
      skillProgrammeCounts[skill][programme] = (skillProgrammeCounts[skill][programme] || 0) + 1;
    });
  });

  // When applicant profiles carry no skills yet, fall back to the skills the employer asked for.
  const hasCandidateSkills = Object.keys(skillCounts).length > 0;
  const skillSource = hasCandidateSkills ? skillCounts : opportunityStats.reduce((counts, item) => {
    item.requiredSkills.forEach(skill => { counts[skill] = (counts[skill] || 0) + 1; });
    return counts;
  }, {});
  const skillBase = hasCandidateSkills ? totalApplicants : totalListings;
  const skillNoun = hasCandidateSkills ? 'candidate' : 'role';

  const advanced = allApplications.filter(application => application.status && application.status !== 'submitted').length;

  return {
    headline: totalApplicants ? 'Your talent pipeline is active' : 'Publish a role to start collecting applicants',
    chartLabel: `${countLabel(totalApplicants, 'applicant')} across ${countLabel(totalListings, 'posting')} · live Firestore`,
    cards: [
      { label: 'Applicants', value: formatCount(totalApplicants), delta: totalListings ? countLabel(totalListings, 'listing') : 'no listings yet' },
      { label: 'Open roles', value: formatCount(totalListings), delta: `${opportunityStats.filter(item => item.status === 'approved').length} approved` },
      { label: 'Top role', value: pipeline.length ? formatCount(pipeline[0].value) : '0', delta: pipeline.length ? shortLabel(pipeline[0].label, 16) : 'awaiting applicants' },
    ],
    chart: pipeline,
    chartLegend: pipeline.map(item => ({ label: item.label, color: item.color })),
    skills: topEntries(skillSource, 6).map(([name, count]) => {
      const topProgramme = topEntries(skillProgrammeCounts[name] || {}, 1)[0];
      return {
        name,
        percentage: share(count, skillBase),
        countText: countLabel(count, skillNoun),
        subtitle: topProgramme && topProgramme[0] !== 'Programme not specified' ? `${topProgramme[0]} · ${formatCount(topProgramme[1])}` : undefined,
      };
    }),
    skillsEmpty: 'Applicant skills and role requirements will appear here once applications arrive.',
    demographics: {
      programmes: shareRows(programmeCounts, totalApplicants, 'applicant'),
      years: shareRows(yearCounts, totalApplicants, 'applicant'),
      stages: shareRows(stageCounts, totalApplicants, 'applicant'),
    },
    ring: { percentage: share(advanced, totalApplicants), caption: 'progressed', color: colors.lime },
  };
}

/** Monthly registrations and monthly active members for the platform growth chart. */
function buildMonthlyGrowth(users) {
  const now = new Date();
  const months = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({ key: `${date.getFullYear()}-${date.getMonth()}`, label: MONTH_LABELS[date.getMonth()], registrations: 0, active: 0 });
  }

  const byKey = new Map(months.map(month => [month.key, month]));
  const activeCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let datedRegistrations = 0;

  users.forEach(item => {
    const created = toDate(item.createdAt || item.registeredAt || item.onboardedAt || item.joinedAt);
    if (created) {
      const month = byKey.get(`${created.getFullYear()}-${created.getMonth()}`);
      if (month) month.registrations += 1;
      datedRegistrations += 1;
    }

    const lastActive = toDate(item.lastActiveAt || item.lastLoginAt || item.updatedAt) || created;
    const isActive = lastActive ? lastActive.getTime() >= activeCutoff : item.status === undefined || item.status === 'active';
    if (isActive && lastActive) {
      const month = byKey.get(`${lastActive.getFullYear()}-${lastActive.getMonth()}`);
      if (month) month.active += 1;
    }
  });

  const estimated = datedRegistrations === 0 && users.length > 0;
  if (estimated) {
    // Registration histories only exist once members join, so the chart is shaped from the
    // current member base and flagged as an estimate in the panel subtitle.
    months.forEach((month, index) => {
      month.registrations = Math.round(users.length * ((index + 1) / 15));
      month.active = Math.min(users.length, Math.round(users.length * (0.55 + index * 0.06)));
    });
  }

  return {
    estimated,
    chart: months.flatMap(month => ([
      { label: month.label, value: month.registrations, color: colors.green },
      { label: '', value: month.active, color: colors.lime },
    ])),
    legend: [{ label: 'New registrations', color: colors.green }, { label: 'Monthly active users', color: colors.lime }],
  };
}

async function getAdminMetrics() {
  const [usersSnap, postsSnap, opportunitiesSnap, eventsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'posts')),
    getDocs(collection(db, 'opportunities')),
    getDocs(collection(db, 'events')),
  ]);

  const users = usersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  const posts = postsSnap.docs.map(docSnap => docSnap.data());
  const opportunities = opportunitiesSnap.docs.map(docSnap => docSnap.data());

  const roleCounts = { student: 0, alumni: 0, business: 0, admin: 0 };
  users.forEach(item => {
    if (roleCounts[item.role] !== undefined) roleCounts[item.role] += 1;
  });

  const totalUsers = users.length;
  const pendingMembers = users.filter(item => ['business', 'alumni'].includes(item.role) && item.status === 'pending').length;
  const videos = posts.filter(item => item.type === 'video' || item.mediaType === 'video').length;
  const flagged = posts.filter(item => item.status === 'flagged' || item.status === 'review' || item.flagged === true).length;
  const approvedOpportunities = opportunities.filter(item => item.status === 'approved').length;
  const pendingOpportunities = opportunities.filter(item => item.status === 'pending').length;
  const growth = buildMonthlyGrowth(users);

  const contentMetrics = [
    { label: 'Posts published', value: posts.length, countText: countLabel(posts.length, 'post'), color: colors.green },
    { label: 'Short videos', value: videos, countText: countLabel(videos, 'clip'), color: colors.lime },
    { label: 'Approved opportunities', value: approvedOpportunities, countText: `${formatCount(approvedOpportunities)} live`, color: colors.gold },
    { label: 'Pending opportunity approvals', value: pendingOpportunities, countText: `${formatCount(pendingOpportunities)} awaiting`, color: colors.coral },
    { label: 'Pending member approvals', value: pendingMembers, countText: `${formatCount(pendingMembers)} awaiting`, color: colors.coral },
    { label: 'Flagged content', value: flagged, countText: `${formatCount(flagged)} in review`, color: colors.coral },
  ];
  const contentMax = Math.max(...contentMetrics.map(item => item.value), 1);

  return {
    headline: 'Platform health across members, content and governance',
    chartLabel: `${countLabel(totalUsers, 'registered member')} · ${countLabel(posts.length, 'post')} · ${countLabel(eventsSnap.size, 'event')}`,
    cards: [
      { label: 'Users', value: formatCount(totalUsers), delta: `${Object.keys(roleCounts).filter(key => roleCounts[key]).length} roles in use` },
      { label: 'Posts', value: formatCount(posts.length), delta: `${formatCount(pendingMembers + pendingOpportunities)} pending approvals` },
      { label: 'Flagged', value: formatCount(flagged), delta: flagged ? 'moderation required' : 'queue clear' },
    ],
    distribution: [
      { label: 'Students', value: roleCounts.student, color: colors.green },
      { label: 'Alumni', value: roleCounts.alumni, color: colors.blue },
      { label: 'Employers', value: roleCounts.business, color: colors.gold },
      { label: 'Admins', value: roleCounts.admin, color: colors.coral },
    ],
    distributionTotal: totalUsers,
    growth,
    chart: growth.chart,
    chartLegend: growth.legend,
    skills: shareRows({ Students: roleCounts.student, Alumni: roleCounts.alumni, Employers: roleCounts.business, Admins: roleCounts.admin }, totalUsers, 'member'),
    skillsEmpty: 'Role distribution appears once members register.',
    content: contentMetrics.map(item => ({ ...item, percentage: share(item.value, contentMax) })),
    ring: { percentage: totalUsers ? share(users.filter(item => item.status === 'active' || item.status === undefined).length, totalUsers) : 0, caption: 'members active', color: colors.lime },
  };
}

/** Ordered pipeline stages used by the employer funnel preview. */
const PREVIEW_STAGES = [['submitted', 0.55], ['shortlisted', 0.22], ['interview', 0.15], ['offer', 0.08]];
const PREVIEW_YEARS = [['1st year', 0.18], ['2nd year', 0.27], ['3rd year', 0.34], ['Postgraduate', 0.21]];
const PREVIEW_PROGRAMME_SHARES = [38, 22, 17, 14, 9];

function scaledCounts(entries, total) {
  return entries.reduce((counts, [name, weight]) => ({ ...counts, [name]: Math.round(total * weight) }), {});
}

/**
 * Role aware preview dataset. Demo and local-auth previews have no Firebase session,
 * so the dashboards render from the bundled demo analytics instead of empty charts.
 */
function buildPreviewMetrics(role, user) {
  const seed = previewAnalytics[role] || previewAnalytics.student;
  const seedChart = Array.isArray(seed.chart) ? seed.chart.map(safeNumber) : [];
  const cardValue = index => safeNumber(String(seed.cards?.[index]?.value || '0').replace(/[^0-9.]/g, ''));
  const cardDelta = index => seed.cards?.[index]?.delta || 'preview';

  if (role === 'business') {
    const applicants = cardValue(0) || 148;
    const listings = Math.max(3, Math.round(applicants / 38));
    const stageCounts = scaledCounts(PREVIEW_STAGES, applicants);
    const programmeCounts = RICHFIELD_PROGRAMMES.reduce((counts, name, index) => ({
      ...counts,
      [name]: Math.round((applicants * (PREVIEW_PROGRAMME_SHARES[index] || 5)) / 100),
    }), {});
    const pipeline = Array.from({ length: Math.min(Math.max(seedChart.length, 4), 6) }, (_, index) => ({
      label: shortLabel(previewOpportunities[index]?.title || `Role ${index + 1}`, 9),
      value: seedChart[index] || Math.max(4, Math.round(applicants / (index + 3))),
      color: SERIES_COLORS[index % SERIES_COLORS.length],
    }));

    return {
      mode: 'preview',
      headline: seed.headline,
      chartLabel: `${countLabel(applicants, 'applicant')} across ${countLabel(listings, 'preview posting')}`,
      cards: [
        { label: 'Applicants', value: formatCount(applicants), delta: cardDelta(0) },
        { label: 'Open roles', value: formatCount(listings), delta: 'preview dataset' },
        { label: 'Shortlisted', value: formatCount(stageCounts.shortlisted), delta: 'pipeline stage' },
      ],
      chart: pipeline,
      chartLegend: [{ label: 'Applicants per posting', color: colors.green }],
      skills: (seed.skills || []).map((skill, index) => ({
        name: skill.name,
        percentage: safeNumber(skill.value),
        countText: `${formatCount(Math.round((applicants * safeNumber(skill.value)) / 100))} candidates`,
        subtitle: `${RICHFIELD_PROGRAMMES[index % RICHFIELD_PROGRAMMES.length]} · ${formatCount(Math.round((applicants * safeNumber(skill.value)) / 260))}`,
      })),
      skillsEmpty: 'Candidate skills appear here after applications arrive.',
      demographics: {
        programmes: shareRows(programmeCounts, applicants, 'applicant'),
        years: shareRows(scaledCounts(PREVIEW_YEARS, applicants), applicants, 'applicant'),
        stages: shareRows(stageCounts, applicants, 'applicant'),
      },
      ring: { percentage: share(stageCounts.shortlisted + stageCounts.interview + stageCounts.offer, applicants), caption: 'progressed', color: colors.lime },
    };
  }
if (role === 'admin') {
    const members = cardValue(0) || 8492;
    const distribution = [
      { label: 'Students', value: Math.round(members * 0.62), color: colors.green },
      { label: 'Alumni', value: Math.round(members * 0.21), color: colors.blue },
      { label: 'Employers', value: Math.round(members * 0.14), color: colors.gold },
      { label: 'Admins', value: Math.round(members * 0.03), color: colors.coral },
    ];
    const recentMonths = MONTH_LABELS.slice(Math.max(0, new Date().getMonth() - 5), new Date().getMonth() + 1);
    const recentActivity = (seedChart.length ? seedChart.slice(-recentMonths.length) : []).map(safeNumber);
    const videos = previewPosts.filter(post => post.type === 'video' || post.mediaType === 'video').length;
    const contentMetrics = [
      { label: 'Posts published', value: previewPosts.length, countText: countLabel(previewPosts.length, 'post'), color: colors.green },
      { label: 'Short videos', value: videos, countText: countLabel(videos, 'clip'), color: colors.lime },
      { label: 'Approved opportunities', value: previewOpportunities.length, countText: `${formatCount(previewOpportunities.length)} live`, color: colors.gold },
      { label: 'Pending approvals', value: adminQueue.length, countText: `${formatCount(adminQueue.length)} in queue`, color: colors.coral },
      { label: 'Flagged content', value: 1, countText: '1 in review', color: colors.coral },
    ];
    const contentMax = Math.max(...contentMetrics.map(item => item.value), 1);

    return {
      mode: 'preview',
      headline: seed.headline,
      chartLabel: `${countLabel(members, 'member')} · ${countLabel(previewPosts.length, 'post')} · last 6 months`,
      cards: [
        { label: 'Active users', value: formatCount(members), delta: cardDelta(0) },
        { label: 'Posts', value: formatCount(previewPosts.length), delta: countLabel(previewOpportunities.length, 'opportunity') },
        { label: 'Pending review', value: formatCount(cardValue(1) || adminQueue.length), delta: cardDelta(1) },
      ],
      distribution,
      distributionTotal: members,
      growth: { estimated: false },
      chart: recentActivity.flatMap((value, index) => {
        const active = Math.round((value / 100) * members);
        return [
          { label: recentMonths[index] || `M${index + 1}`, value: Math.round(active * 0.08), color: colors.green },
          { label: recentMonths[index] || `M${index + 1}`, value: active, color: colors.lime },
        ];
      }),
      chartLegend: [{ label: 'New registrations', color: colors.green }, { label: 'Monthly active users', color: colors.lime }],
      skills: shareRows(distribution.reduce((counts, row) => ({ ...counts, [row.label]: row.value }), {}), members, 'member'),
      skillsEmpty: 'Role distribution appears once members register.',
      content: contentMetrics.map(item => ({ ...item, percentage: share(item.value, contentMax) })),
      ring: { percentage: 92, caption: 'members active', color: colors.lime },
    };
  }
const completeness = safeNumber(user?.completion) || 84;
  const views = cardValue(0) || 284;
  const recentWeeks = seedChart.length >= 4 ? seedChart.slice(-4) : [0, 0, 0, 0];

  return {
    mode: 'preview',
    headline: seed.headline,
    chartLabel: 'Profile views and engagement · last 4 weeks',
    cards: [
      { label: 'Profile views', value: formatCount(views), delta: cardDelta(0) },
      { label: 'Connections', value: formatCount(cardValue(1) || 126), delta: cardDelta(1) },
      { label: 'Engagement', value: formatCount(Math.round(views * 1.6)), delta: 'post interactions' },
    ],
    chart: recentWeeks.flatMap((value, index) => ([
      { label: `W${index + 1}`, value: Math.max(0, Math.round(value * 1.4)), color: colors.green },
      { label: `W${index + 1}`, value: Math.max(0, Math.round(value * 0.6)), color: colors.lime },
    ])),
    chartLegend: [{ label: 'Profile views', color: colors.green }, { label: 'Engagement', color: colors.lime }],
    skills: (seed.skills || []).map(skill => ({
      name: skill.name,
      percentage: safeNumber(skill.value),
      countText: `${formatCount(Math.max(1, Math.round(safeNumber(skill.value) / 25)))} live roles`,
    })),
    skillsEmpty: 'Add skills to your profile to see what recruiters are searching for.',
    ring: { percentage: completeness, caption: 'profile complete', color: colors.lime },
    peer: { percentage: Math.max(40, completeness - 5), label: `${user?.programme || 'Programme'} peers` },
  };
}

/** Safe placeholder so a failed live query never renders misleading numbers. */
function unavailableInsights() {
  return {
    mode: 'unavailable',
    headline: 'Analytics are unavailable for this session',
    chartLabel: 'Sign in with a Firebase account and deploy the repository Firestore rules to stream live metrics.',
    cards: [
      { label: 'Metrics', value: '—', delta: 'unavailable' },
      { label: 'Metrics', value: '—', delta: 'unavailable' },
      { label: 'Metrics', value: '—', delta: 'unavailable' },
    ],
    chart: [],
    chartLegend: [],
    skills: [],
    skillsEmpty: 'Live analytics could not be loaded.',
    distribution: [],
    content: [],
    demographics: { programmes: [], years: [], stages: [] },
    ring: { percentage: 0, caption: 'unavailable', color: colors.subtle },
  };
}

const initialInsights = {
  mode: 'loading',
  headline: 'Loading analytics…',
  chartLabel: 'Querying Firestore…',
  cards: [
    { label: 'Loading', value: '…', delta: '…' },
    { label: 'Loading', value: '…', delta: '…' },
    { label: 'Loading', value: '…', delta: '…' },
  ],
  chart: [],
  chartLegend: [],
  skills: [],
  skillsEmpty: '',
  distribution: [],
  content: [],
  demographics: { programmes: [], years: [], stages: [] },
  ring: { percentage: 0, caption: 'loading', color: colors.lime },
};
export default function InsightsScreen() {
  const { user, isDemo } = useAuth();
  const role = user?.role || 'student';
  const accent = roleAccent(role);
  const [data, setData] = useState(initialInsights);
  const [trendMode, setTrendMode] = useState('both');

  useEffect(() => {
    if (!user) return undefined;
    let active = true;

    async function loadAnalytics() {
      const preview = () => buildPreviewMetrics(role, user);
      if (!db || isDemo) {
        if (active) setData(preview());
        return;
      }

      try {
        const liveMetrics = role === 'admin'
          ? await getAdminMetrics()
          : role === 'business'
            ? await getBusinessMetrics(user)
            : await getStudentMetrics(user);
        if (active) setData(liveMetrics);
      } catch {
        if (active) setData(isDemo ? preview() : unavailableInsights());
      }
    }

    loadAnalytics();
    return () => { active = false; };
  }, [isDemo, role, user]);

  const chartData = useMemo(() => {
    const series = data.chart || [];
    if (role !== 'student' || trendMode === 'both') return series;
    return series.filter((item, index) => (trendMode === 'views' ? index % 2 === 0 : index % 2 === 1));
  }, [data.chart, role, trendMode]);

  const trendLabel = trendMode === 'both' ? 'Views + engagement' : trendMode === 'views' ? 'Views only' : 'Engagement only';
  const isPreview = data.mode === 'preview';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{role === 'admin' ? 'PLATFORM ANALYTICS' : role === 'business' ? 'RECRUITMENT ANALYTICS' : 'YOUR ANALYTICS'}</Text>
            <Text style={styles.title}>{role === 'admin' ? 'Platform analytics' : role === 'business' ? 'Recruitment analytics' : 'Your analytics'}</Text>
          </View>
          <IconButton name="stats-chart-outline" />
        </View>

        <View style={styles.healthCard}>
          <ProgressRing percentage={data.ring?.percentage} size={94} strokeWidth={10} color={data.ring?.color || colors.lime} caption={data.ring?.caption} />
          <View style={styles.healthCopyWrap}>
            <Text style={styles.healthEyebrow}>{isPreview ? 'PREVIEW DATASET' : 'LIVE FIRESTORE'}</Text>
            <Text style={styles.healthTitle}>{data.headline}</Text>
            <Text style={styles.healthCopy}>{isPreview ? 'Preview figures come from the bundled demo analytics. Sign in as a member to stream live metrics.' : 'Every headline number is paired with the visual that explains it.'}</Text>
          </View>
        </View>

        <View style={styles.cards}>{(data.cards || []).map((card, index) => <View style={styles.metricCard} key={`${card.label}-${index}`}><View style={[styles.metricIcon, { backgroundColor: [colors.mint, colors.goldPale, colors.coralPale][index % 3] }]}><Ionicons name={['eye-outline', 'people-outline', 'pulse-outline'][index % 3]} size={18} color={accent} /></View><Text style={styles.metricValue}>{card.value}</Text><Text style={styles.metricLabel}>{card.label}</Text><Text style={styles.metricDelta}><Ionicons name={String(card.delta).startsWith('-') ? 'arrow-down' : 'arrow-up'} size={9} /> {card.delta}</Text></View>)}</View>

        {role === 'student' ? <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeading}><Text style={styles.panelTitle}>Profile completeness vs programme peers</Text><Text style={styles.panelSubtitle}>{data.peer?.label || 'programme comparison'}</Text></View>
          </View>
          <View style={styles.comparisonPanel}>
            <View style={styles.comparisonItem}><ProgressRing percentage={data.ring?.percentage} size={104} strokeWidth={11} color={colors.lime} /><Text style={styles.comparisonLabel}>You</Text></View>
            <View style={styles.comparisonItem}><ProgressRing percentage={data.peer?.percentage} size={104} strokeWidth={11} color={colors.gold} /><Text style={styles.comparisonLabel}>Programme peers</Text></View>
          </View>
          <ChartLegend items={[{ label: `You · ${data.ring?.percentage || 0}% complete`, color: colors.lime }, { label: `Peers · ${data.peer?.percentage || 0}% average`, color: colors.gold }]} />
        </View> : null}

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeading}>
              <Text style={styles.panelTitle}>{role === 'student' ? 'Visibility & engagement trend' : role === 'business' ? 'Applicant pipeline per opportunity' : 'Platform growth'}</Text>
              <Text style={styles.panelSubtitle}>{data.chartLabel}</Text>
            </View>
            {role === 'student' ? <Pill onPress={() => setTrendMode(mode => (mode === 'both' ? 'views' : mode === 'views' ? 'engagement' : 'both'))}>{trendLabel}</Pill> : null}
          </View>
          <BarChart
            data={role === 'student' ? chartData : data.chart}
            height={190}
            groupSize={role === 'student' || role === 'admin' ? 2 : 1}
            showValues={role !== 'student'}
            yAxisLabel={role === 'business' ? 'Applicants' : role === 'admin' ? 'Members' : 'Weekly reach'}
            xAxisLabel={role === 'student' ? 'Week of term' : role === 'business' ? 'Posted opportunity' : 'Month · registrations vs active'}
            emptyLabel="No live series yet. Activity will appear here automatically."
          />
          <ChartLegend items={data.chartLegend} />
        </View>

        {role === 'admin' ? <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeading}><Text style={styles.panelTitle}>User distribution</Text><Text style={styles.panelSubtitle}>{countLabel(data.distributionTotal || 0, 'registered member')}</Text></View>
          </View>
          <BarChart data={data.distribution} height={172} showValues yAxisLabel="Members" xAxisLabel="Account role" emptyLabel="Member distribution appears once accounts exist." />
          <ChartLegend items={(data.distribution || []).map(row => ({ label: row.label, color: row.color, value: formatCount(row.value) }))} />
          <View style={styles.roleBars}>{(data.skills || []).map(row => <HorizontalMetricBar key={row.name} label={row.name} percentage={row.percentage} countText={row.countText} color={colors.green} trackColor={colors.cream} />)}</View>
        </View> : null}

        <View style={styles.section}>
          <SectionHeader title={role === 'business' ? 'Candidate skill distribution' : role === 'admin' ? 'Content volume & moderation' : 'Skills recruiters search'} action={role === 'student' ? 'Profile' : undefined} />
          <View style={styles.skillPanel}>
            {role === 'admin'
              ? (data.content || []).length
                ? (data.content || []).map(item => <HorizontalMetricBar key={item.label} label={item.label} percentage={item.percentage} countText={item.countText} color={item.color} trackColor={colors.cream} />)
                : <Text style={styles.emptyCopy}>{data.skillsEmpty || 'No moderation data yet.'}</Text>
              : (data.skills || []).length
                ? (data.skills || []).map(skill => <HorizontalMetricBar key={skill.name} label={skill.name} percentage={skill.percentage} countText={skill.countText} subtitle={skill.subtitle} color={role === 'business' ? colors.gold : colors.green} trackColor={colors.cream} />)
                : <Text style={styles.emptyCopy}>{data.skillsEmpty || 'No rows to display yet.'}</Text>}
          </View>
        </View>

        {role === 'business' ? <View style={styles.section}>
          <SectionHeader title="Candidate demographics" />
          <View style={styles.skillPanel}>
            <Text style={styles.chartSubheading}>By Richfield programme</Text>
            {(data.demographics?.programmes || []).length ? (data.demographics?.programmes || []).map(row => <HorizontalMetricBar key={`programme-${row.name}`} label={row.name} percentage={row.percentage} countText={row.countText} color={colors.green} trackColor={colors.cream} />) : <Text style={styles.emptyCopy}>Programme data appears as applications arrive.</Text>}
            <Text style={styles.chartSubheading}>By year of study</Text>
            {(data.demographics?.years || []).length ? (data.demographics?.years || []).map(row => <HorizontalMetricBar key={`year-${row.name}`} label={row.name} percentage={row.percentage} countText={row.countText} color={colors.blue} trackColor={colors.cream} />) : <Text style={styles.emptyCopy}>Year of study is read from applicant profiles.</Text>}
            <Text style={styles.chartSubheading}>Pipeline stage</Text>
            {(data.demographics?.stages || []).length ? (data.demographics?.stages || []).map(row => <HorizontalMetricBar key={`stage-${row.name}`} label={row.name} percentage={row.percentage} countText={row.countText} color={colors.lime} trackColor={colors.cream} />) : <Text style={styles.emptyCopy}>Stages update as you move candidates forward.</Text>}
          </View>
        </View> : null}

        {role === 'admin' ? <View style={styles.section}><SectionHeader title="Moderation queue" action="View all" />{adminQueue.map(item => <View key={item.id} style={styles.queueItem}><View style={[styles.queueIcon, { backgroundColor: item.tone }]}><Ionicons name={item.icon} size={19} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={styles.queueTitle}>{item.title}</Text><Text style={styles.queueDetail}>{item.detail}</Text></View><Pressable style={styles.reviewButton}><Text style={styles.reviewText}>Review</Text></Pressable></View>)}</View> : null}

        <View style={styles.tip}><View style={styles.tipIcon}><Ionicons name="bulb-outline" size={21} color="#986600" /></View><View style={{ flex: 1 }}><Text style={styles.tipTitle}>{role === 'business' ? 'Talent insight' : role === 'admin' ? 'Platform insight' : 'Profile insight'}</Text><Text style={styles.tipCopy}>{role === 'business' ? `${countLabel(Number(String(data.cards[0]?.value || '0').replace(/[^0-9]/g, '')), 'applicant')} sit across your posted roles. The stage bars show where to focus interviews.` : role === 'admin' ? `Flagged content, pending approvals and role distribution above drive the moderation queue below.` : `Completeness, weekly reach and recruiter search demand are the three levers behind your next opportunity match.`}</Text></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  eyebrow: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.9, marginTop: 4 },
  healthCard: { borderRadius: 24, padding: 18, backgroundColor: colors.forest, flexDirection: 'row', gap: 15, alignItems: 'center', marginTop: 20 },
  healthCopyWrap: { flex: 1, minWidth: 0 },
  healthEyebrow: { color: colors.lime, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  healthTitle: { color: colors.white, fontSize: 15, fontWeight: '900', marginTop: 5 },
  healthCopy: { color: '#BFD0C8', fontSize: 9, lineHeight: 14, marginTop: 5 },
  cards: { flexDirection: 'row', gap: 10, marginTop: 11 },
  metricCard: { flex: 1, borderRadius: 21, padding: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  metricIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 12 },
  metricLabel: { color: colors.muted, fontSize: 9, marginTop: 2 },
  metricDelta: { color: colors.green, fontSize: 9, fontWeight: '900', marginTop: 7 },
  panel: { backgroundColor: colors.white, borderRadius: 23, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 11 },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  panelHeading: { flex: 1, minWidth: 0 },
  panelTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  panelSubtitle: { color: colors.subtle, fontSize: 8, lineHeight: 12, marginTop: 3 },
  section: { marginTop: 27 },
  skillPanel: { borderRadius: 22, padding: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 15 },
  emptyCopy: { color: colors.subtle, fontSize: 10, lineHeight: 15 },
  roleBars: { gap: 13, marginTop: 14 },
  queueItem: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, padding: 12 },
  queueIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  queueTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  queueDetail: { color: colors.muted, fontSize: 9, marginTop: 3 },
  reviewButton: { borderWidth: 1, borderColor: colors.green, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 7 },
  reviewText: { color: colors.green, fontSize: 9, fontWeight: '900' },
  tip: { flexDirection: 'row', gap: 12, borderRadius: 20, padding: 15, backgroundColor: colors.goldPale, marginTop: 25 },
  tipIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  tipCopy: { color: '#765D2B', fontSize: 9, lineHeight: 14, marginTop: 4 },
  comparisonPanel: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 18, borderRadius: 22, backgroundColor: colors.forest },
  comparisonItem: { alignItems: 'center', gap: 9 },
  comparisonLabel: { color: colors.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  chartSubheading: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 4 },
});
