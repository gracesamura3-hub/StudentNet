export const demoUsers = {
  student: {
    id: 'demo-student',
    role: 'student',
    firstName: 'Thando',
    lastName: 'Mokoena',
    name: 'Thando Mokoena',
    initials: 'TM',
    headline: 'BSc IT · Aspiring Product Engineer',
    programme: 'BSc Information Technology',
    campus: 'Braamfontein Campus',
    year: '3rd year',
    verified: true,
    completion: 84,
    skills: ['React Native', 'JavaScript', 'Firebase', 'UI Design'],
  },
  alumni: {
    id: 'demo-alumni',
    role: 'alumni',
    firstName: 'Lerato',
    lastName: 'Nkosi',
    name: 'Lerato Nkosi',
    initials: 'LN',
    headline: 'Software Engineer at Luno',
    programme: 'BSc Information Technology',
    campus: 'Pretoria Campus',
    year: 'Class of 2022',
    verified: true,
    completion: 96,
    skills: ['React', 'Node.js', 'Cloud Architecture', 'Mentorship'],
  },
  business: {
    id: 'demo-business',
    role: 'business',
    firstName: 'Nova',
    lastName: 'Labs',
    name: 'Nova Labs Africa',
    initials: 'NL',
    headline: 'Building teams for meaningful technology',
    programme: 'Technology & Digital Products',
    campus: 'Johannesburg, South Africa',
    year: 'Verified employer',
    verified: true,
    completion: 92,
    skills: ['Graduate talent', 'Software engineering', 'Product design'],
  },
  admin: {
    id: 'demo-admin',
    role: 'admin',
    firstName: 'Ayanda',
    lastName: 'Dlamini',
    name: 'Ayanda Dlamini',
    initials: 'AD',
    headline: 'Community Administrator',
    programme: 'Richfield Student Success',
    campus: 'National Office',
    year: 'Staff account',
    verified: true,
    completion: 100,
    skills: ['Community safety', 'Career services', 'Student success'],
  },
};

export const stories = [
  { id: '1', name: 'Zinhle', initials: 'ZM', label: 'My first week', color: '#F8DDC8' },
  { id: '2', name: 'Neo', initials: 'NM', label: 'At Microsoft', color: '#D9E6FF' },
  { id: '3', name: 'Amina', initials: 'AK', label: 'Design tips', color: '#D7EFE4' },
  { id: '4', name: 'Kabelo', initials: 'KM', label: 'Hackathon', color: '#EFE0FF' },
];

export const posts = [
  {
    id: 'post-1',
    authorId: 'alumni-1',
    author: 'Lerato Nkosi',
    initials: 'LN',
    role: 'Alumni · Software Engineer at Luno',
    time: '38m',
    accent: '#DDE8FF',
    body: 'Three years ago I walked into my first developer interview with a portfolio full of student projects. Today, I helped welcome our newest graduate cohort. Keep building in public — your small projects tell a bigger story.',
    tag: '#CareerJourney',
    reactions: 148,
    comments: 24,
    reacted: false,
  },
  {
    id: 'post-2',
    authorId: 'student-2',
    author: 'Amina Khan',
    initials: 'AK',
    role: 'Student · BCom Marketing',
    time: '2h',
    accent: '#FCE5DC',
    body: 'Excited to share the brand strategy project our team presented today. We turned community research into a campaign for a real local business — and learned so much from the process.',
    tag: '#StudentWork',
    reactions: 92,
    comments: 11,
    reacted: true,
  },
];

export const people = [
  { id: 'p1', name: 'Lerato Nkosi', initials: 'LN', headline: 'Software Engineer at Luno', shared: 'BSc IT · 12 mutual', color: '#DDE8FF', status: 'Connect' },
  { id: 'p2', name: 'Siyabonga Mthembu', initials: 'SM', headline: 'UX Designer at Discovery', shared: 'Richfield alumnus · 8 mutual', color: '#FCE5DC', status: 'Connect' },
  { id: 'p3', name: 'Zinhle Mbatha', initials: 'ZM', headline: 'Data Science Student', shared: 'Braamfontein · 5 mutual', color: '#DBF0E7', status: 'Pending' },
  { id: 'p4', name: 'Neo Moloi', initials: 'NM', headline: 'Cloud Engineer at Microsoft', shared: 'BSc IT · Mentor', color: '#F8E6B8', status: 'Connect' },
];

export const opportunities = [
  {
    id: 'job-1', company: 'Nova Labs', logo: 'N', color: '#E8E6FF', title: 'Graduate Software Engineer',
    location: 'Johannesburg · Hybrid', type: 'Graduate programme', posted: '2d ago', match: 94,
    skills: ['JavaScript', 'React', 'Firebase'], description: 'Join a small product team building accessible digital services across Africa.', saved: false,
  },
  {
    id: 'job-2', company: 'Discovery', logo: 'D', color: '#E5F0FF', title: 'UX Design Intern',
    location: 'Sandton · Hybrid', type: 'Internship', posted: '4d ago', match: 88,
    skills: ['Figma', 'Research', 'Prototyping'], description: 'Help shape health experiences used by millions of members.', saved: true,
  },
  {
    id: 'job-3', company: 'Standard Bank', logo: 'S', color: '#FFF0DA', title: 'Data & Analytics Learnership',
    location: 'Johannesburg · On-site', type: 'Learnership', posted: '6d ago', match: 81,
    skills: ['SQL', 'Python', 'Analytics'], description: 'Build data fluency through a structured twelve-month learning experience.', saved: false,
  },
];

export const conversations = [
  { id: 'c1', name: 'Lerato Nkosi', initials: 'LN', text: 'Happy to look over your portfolio this week.', time: '09:42', unread: 2, color: '#DDE8FF', online: true },
  { id: 'c2', name: 'Nova Labs Careers', initials: 'NL', text: 'Your application has moved to the next stage.', time: 'Yesterday', unread: 1, color: '#E8E6FF', online: false },
  { id: 'c3', name: 'Amina Khan', initials: 'AK', text: 'The event starts at 10 tomorrow, right?', time: 'Mon', unread: 0, color: '#FCE5DC', online: true },
  { id: 'c4', name: 'BSc IT Career Circle', initials: 'IT', text: 'Neo: I shared the cloud roadmap.', time: 'Sun', unread: 0, color: '#DBF0E7', online: false },
];

export const notifications = [
  { id: 'n1', icon: 'briefcase-outline', tone: 'green', title: 'New 94% opportunity match', detail: 'Graduate Software Engineer at Nova Labs', time: '12m' },
  { id: 'n2', icon: 'person-add-outline', tone: 'blue', title: 'New connection request', detail: 'Siyabonga wants to connect with you', time: '1h' },
  { id: 'n3', icon: 'calendar-outline', tone: 'gold', title: 'Event reminder', detail: 'Graduate Career Fair begins tomorrow', time: '3h' },
];

export const analytics = {
  student: {
    headline: 'Your visibility is growing',
    cards: [{ label: 'Profile views', value: '284', delta: '+18%' }, { label: 'Connections', value: '126', delta: '+9' }],
    chart: [32, 45, 38, 64, 58, 78, 92],
    chartLabel: 'Profile views · last 7 days',
    skills: [{ name: 'React Native', value: 86 }, { name: 'JavaScript', value: 72 }, { name: 'Firebase', value: 54 }],
  },
  business: {
    headline: 'Talent pipeline at a glance',
    cards: [{ label: 'Applicants', value: '148', delta: '+24%' }, { label: 'Listing reach', value: '3.8k', delta: '+12%' }],
    chart: [22, 36, 54, 48, 72, 82, 68],
    chartLabel: 'Qualified applicants · last 7 days',
    skills: [{ name: 'JavaScript', value: 78 }, { name: 'Data analysis', value: 63 }, { name: 'UX design', value: 49 }],
  },
  admin: {
    headline: 'Community health is strong',
    cards: [{ label: 'Active users', value: '8,492', delta: '+14%' }, { label: 'Pending review', value: '17', delta: '-6' }],
    chart: [48, 58, 62, 71, 68, 84, 96],
    chartLabel: 'Monthly active users · 7 months',
    skills: [{ name: 'Students', value: 82 }, { name: 'Alumni', value: 58 }, { name: 'Businesses', value: 31 }],
  },
};
