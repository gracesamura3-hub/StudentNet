export const DEFAULT_SKILL_LIBRARY = [
  'javascript', 'react', 'react native', 'node', 'python', 'sql', 'firebase', 'ui design', 'ux',
  'figma', 'data analysis', 'power bi', 'excel', 'product management', 'project management',
  'communication', 'research', 'marketing', 'seo', 'html', 'css', 'typescript', 'aws', 'google cloud',
  'cybersecurity', 'machine learning', 'artificial intelligence', 'android', 'ios', 'problem solving',
  'customer support', 'leadership', 'mentoring', 'testing', 'quality assurance', 'agile', 'scrum',
  'design systems', 'api integration', 'database design', 'digital marketing', 'business analysis', 'software engineering',
];

export function normalizeSkillText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s+&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractCvSkills(cvText = '', skillLibrary = DEFAULT_SKILL_LIBRARY) {
  const normalized = normalizeSkillText(cvText);

  return skillLibrary.filter(skill => {
    const candidate = normalizeSkillText(skill);
    if (!candidate) return false;
    if (candidate.includes(' ')) {
      return normalized.includes(candidate);
    }
    return normalized.includes(candidate);
  });
}

const QUALIFICATION_LIBRARY = [
  'bsc', 'bcom', 'ba', 'btech', 'diploma', 'honours', 'masters', 'phd', 'nqf',
  'google cloud certification', 'aws certified', 'scrum master', 'prince2',
];

export async function extractSkillsAndQualifications(textInput = '') {
  const text = normalizeSkillText(textInput);
  if (!text) return [];

  const skills = extractCvSkills(text, DEFAULT_SKILL_LIBRARY);
  const qualifications = QUALIFICATION_LIBRARY.filter(item => text.includes(normalizeSkillText(item)));
  return [...new Set([...skills, ...qualifications])].map(item => item.replace(/\b\w/g, letter => letter.toUpperCase()));
}

export function buildContextualNiaTip(profile = {}) {
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const headline = String(profile.headline || '').trim();
  const completion = Number(profile.completion || 0);

  if (skills.length < 5) {
    return 'Add at least five relevant skills so employers can find you in searches.';
  }

  if (!headline) {
    return 'Write a stronger headline with your role, value, and a clear result.';
  }

  if (completion < 75) {
    return 'Add one measurable project outcome and a recent skill to boost your profile strength.';
  }

  return 'Your profile is nearly ready. Keep your headline specific and add one proof point from a project or role.';
}

export function buildAssistantReply(message = '', profile = {}) {
  const text = String(message || '').toLowerCase();
  const skills = Array.isArray(profile.skills) ? profile.skills : [];

  if (text.includes('skill') || text.includes('skills')) {
    const suggested = skills.length >= 5
      ? `You already have ${skills.length} skills listed. Keep them role-specific and remove anything generic.`
      : 'Add skills to appear in searches and match more opportunities.';
    return suggested;
  }

  if (text.includes('headline') || text.includes('summary')) {
    return 'A strong headline should say who you are, what you do, and the type of opportunities you want.';
  }

  if (text.includes('project') || text.includes('portfolio')) {
    return 'Highlight one project with a problem, your contribution, and a measurable result so it feels concrete.';
  }

  if (text.includes('cv') || text.includes('resume')) {
    const cvSkills = extractCvSkills(profile.cvText || '', DEFAULT_SKILL_LIBRARY);
    if (cvSkills.length) {
      return `Your CV text already suggests these strengths: ${cvSkills.slice(0, 5).join(', ')}.`;
    }
    return 'Use a rule-based CV scan to extract the strongest skills from your text and align them to your profile.';
  }

  return buildContextualNiaTip(profile);
}
