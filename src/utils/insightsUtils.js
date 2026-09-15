export const safeNumber = value => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const formatCount = value => safeNumber(value).toLocaleString();

export function buildRoleInsightData(user, posts = []) {
  const profileViews = safeNumber(user?.profileViews);
  const connectionCount = Array.isArray(user?.connectionIds)
    ? user.connectionIds.length
    : Array.isArray(user?.connections)
      ? user.connections.length
      : 0;

  const postEngagement = posts.reduce((sum, post) => sum + safeNumber(post.reactions) + safeNumber(post.commentCount), 0);
  const videoPosts = posts.filter(post => post?.type === 'video' || post?.mediaType === 'video').length;
  const isAlumni = user?.role === 'alumni';

  return {
    headline: isAlumni ? 'Your professional impact is growing' : 'Your community engagement is growing',
    chartLabel: isAlumni ? 'Mentorship + visibility · real-time' : 'Profile + network activity · real-time',
    cards: [
      { label: 'Profile views', value: formatCount(profileViews), delta: profileViews ? '+real' : '0' },
      { label: 'Connections', value: formatCount(connectionCount), delta: connectionCount ? '+real' : '0' },
      { label: 'Engagement', value: formatCount(postEngagement), delta: videoPosts ? `${videoPosts} video posts` : `${posts.length} posts` },
    ],
    skills: [
      { name: 'Profile reach', value: profileViews ? Math.min(100, Math.round(profileViews / 3)) : 0 },
      { name: 'Network health', value: connectionCount ? Math.min(100, Math.round(connectionCount * 3)) : 0 },
      { name: 'Post engagement', value: postEngagement ? Math.min(100, Math.round(postEngagement / 5)) : 0 },
    ],
  };
}

export function shouldShowInsightsOnProfile(role) {
  return role === 'student' || role === 'alumni';
}

export function getRoleInsightsEyebrow(role) {
  if (role === 'admin') return 'PLATFORM ANALYTICS';
  if (role === 'business') return 'RECRUITMENT ANALYTICS';
  if (role === 'alumni') return 'ALUMNI ANALYTICS';
  return 'YOUR ANALYTICS';
}
