const normalize = value => String(value || '').trim().toLowerCase();

function valuesFrom(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => typeof item === 'string' ? item : item?.name || item?.title || item?.skill)
    .map(normalize)
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

export function calculateJobMatch(studentProfile = {}, opportunity = {}) {
  const studentSkills = unique(valuesFrom(studentProfile.skills));
  const requiredSkills = unique(valuesFrom(opportunity.requiredSkills || opportunity.skills));
  const studentInterests = unique(valuesFrom(studentProfile.careerInterests || studentProfile.interests));
  const opportunityInterests = unique(valuesFrom(opportunity.careerInterests || opportunity.interests || opportunity.tags));
  const targetProgrammes = unique(valuesFrom(opportunity.targetProgrammes || opportunity.programmes));
  const programme = normalize(studentProfile.programme);

  const matchedSkills = requiredSkills.filter(skill => studentSkills.includes(skill));
  const matchedInterests = opportunityInterests.filter(interest => studentInterests.includes(interest));
  const skillScore = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0;
  const programmeScore = targetProgrammes.length && programme
    ? targetProgrammes.some(target => programme.includes(target) || target.includes(programme)) ? 1 : 0
    : 0;
  const interestScore = opportunityInterests.length ? matchedInterests.length / opportunityInterests.length : 0;

  const score = Math.max(0, Math.min(100, Math.round((skillScore * 0.6 + programmeScore * 0.25 + interestScore * 0.15) * 100)));
  const reasons = [];
  if (matchedSkills.length) reasons.push(`${matchedSkills.length} matching skill${matchedSkills.length === 1 ? '' : 's'}`);
  if (programmeScore) reasons.push('your programme aligns');
  if (matchedInterests.length) reasons.push('your career interests align');

  return {
    score,
    matchedSkills: requiredSkills.filter(skill => matchedSkills.includes(skill)).map(skill => {
      const original = (opportunity.requiredSkills || opportunity.skills || []).find(item => normalize(typeof item === 'string' ? item : item?.name || item?.title || item?.skill) === skill);
      return typeof original === 'string' ? original : original?.name || original?.title || original?.skill || skill;
    }),
    reasoning: reasons.length ? reasons.join(', ') : 'Add relevant skills, a programme, or career interests to improve this match.',
  };
}

export default calculateJobMatch;
