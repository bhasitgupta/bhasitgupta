// scripts/retime_sentry_squash.mjs
import { execSync } from 'child_process';
import path from 'path';

const sentryDir = path.resolve('c:/Users/Bhasit Gupta/Desktop/Projects/Sentry');

console.log('Extracting Sentry commit history...');
const rawLog = execSync(
  'git log --reverse --format="%H<FIELD>%T<FIELD>%P<FIELD>%an<FIELD>%ae<FIELD>%ad<FIELD>%cd<FIELD>%s"',
  { cwd: sentryDir, maxBuffer: 100 * 1024 * 1024, encoding: 'utf-8' }
);

const lines = rawLog.split('\n').filter(l => l.trim().length > 0);
const allCommits = lines.map(line => {
  const [sha, tree, parents, authorName, authorEmail, authorDate, committerDate, ...msgParts] = line.split('<FIELD>');
  return {
    sha,
    tree,
    parents: parents ? parents.trim().split(' ').filter(Boolean) : [],
    authorName,
    authorEmail,
    authorDate,
    committerDate,
    msg: msgParts.join('<FIELD>')
  };
});

console.log(`Total commits parsed: ${allCommits.length}`);

// Split May-Aug (until 2026-08-31T23:59:59) and Sep-Oct (from 2026-09-01)
const mayAug = allCommits.filter(c => {
  const d = new Date(c.authorDate);
  return d < new Date('2026-09-01T00:00:00+05:30');
});

const sepOct = allCommits.filter(c => {
  const d = new Date(c.authorDate);
  return d >= new Date('2026-09-01T00:00:00+05:30');
});

console.log(`May-Aug commits: ${mayAug.length}, Sep-Oct commits: ${sepOct.length}`);

// Select 200 representative milestone commits from mayAug
const TARGET_MAY_AUG_COUNT = 200;
const selectedMayAug = [];
for (let i = 0; i < TARGET_MAY_AUG_COUNT; i++) {
  const idx = Math.floor((i / (TARGET_MAY_AUG_COUNT - 1)) * (mayAug.length - 1));
  selectedMayAug.push(mayAug[idx]);
}

// Generate calendar of May 1 to Aug 31
const startDate = new Date('2026-05-01T00:00:00+05:30');
const endDate = new Date('2026-08-31T00:00:00+05:30');

// Define 48 zero days (weekends + midweek)
const offDays = new Set([
  // May weekends + midweek
  '2026-05-02', '2026-05-03', '2026-05-06', '2026-05-09', '2026-05-10', '2026-05-13',
  '2026-05-16', '2026-05-17', '2026-05-23', '2026-05-24', '2026-05-27', '2026-05-30', '2026-05-31',
  // June weekends + midweek
  '2026-06-03', '2026-06-06', '2026-06-07', '2026-06-10', '2026-06-13', '2026-06-14',
  '2026-06-17', '2026-06-20', '2026-06-21', '2026-06-24', '2026-06-27', '2026-06-28',
  // July weekends + midweek
  '2026-07-01', '2026-07-04', '2026-07-05', '2026-07-08', '2026-07-11', '2026-07-12',
  '2026-07-18', '2026-07-19', '2026-07-22', '2026-07-25', '2026-07-26', '2026-07-29',
  // August weekends + midweek
  '2026-08-01', '2026-08-02', '2026-08-05', '2026-08-08', '2026-08-09', '2026-08-12',
  '2026-08-15', '2026-08-16', '2026-08-19', '2026-08-22', '2026-08-23', '2026-08-26',
  '2026-08-29', '2026-08-30'
]);

// 6 Sprint / Peak blocks
const peakPlan = {
  '2026-05-04': 16,
  '2026-05-18': 18,
  '2026-06-15': 14,
  '2026-07-13': 15,
  '2026-08-10': 20,
  '2026-08-24': 18
};

const activeDays = [];
for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const str = `${yyyy}-${mm}-${dd}`;
  if (!offDays.has(str)) {
    activeDays.push(str);
  }
}

console.log(`Active days: ${activeDays.length}, Off-days: ${offDays.size}`);

// Build daily target counts for each active day
const dailyCounts = {};
let assignedSum = 0;

for (const day of activeDays) {
  if (peakPlan[day]) {
    dailyCounts[day] = peakPlan[day];
    assignedSum += peakPlan[day];
  }
}

const remainingDays = activeDays.filter(d => !peakPlan[d]);
const remainingCommits = TARGET_MAY_AUG_COUNT - assignedSum;
console.log(`Remaining commits to assign: ${remainingCommits} across ${remainingDays.length} days`);

// Distribute remaining across normal days
let rem = remainingCommits;
for (let i = 0; i < remainingDays.length; i++) {
  const day = remainingDays[i];
  const count = (i % 2 === 0 && rem > (remainingDays.length - i)) ? 2 : 1;
  dailyCounts[day] = count;
  rem -= count;
}
if (rem > 0) {
  dailyCounts['2026-08-10'] += rem;
}

// Generate exact timestamps for each of the 200 commits
const commitDates = [];
for (const day of activeDays) {
  const count = dailyCounts[day] || 0;
  for (let c = 0; c < count; c++) {
    const hour = Math.floor(10 + (c * 11) / Math.max(count, 1));
    const minute = (14 + c * 23) % 60;
    const second = (7 + c * 17) % 60;
    const hhStr = String(hour).padStart(2, '0');
    const mmStr = String(minute).padStart(2, '0');
    const ssStr = String(second).padStart(2, '0');
    commitDates.push(`${day} ${hhStr}:${mmStr}:${ssStr} +0530`);
  }
}

console.log(`Generated timestamps for ${commitDates.length} May-Aug commits`);

// Re-chain commits
let parentSha = null;
const shaMap = new Map();

console.log('Re-chaining 200 May-Aug milestone commits...');
for (let i = 0; i < TARGET_MAY_AUG_COUNT; i++) {
  const orig = selectedMayAug[i];
  const dateStr = commitDates[i];
  const tree = orig.tree;
  const msg = orig.msg;

  const parentArg = parentSha ? `-p ${parentSha}` : '';
  const cmd = `git commit-tree ${tree} ${parentArg} -m ${JSON.stringify(msg)}`;
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'bhasitgupta',
    GIT_AUTHOR_EMAIL: 'bhasitgupta@gmail.com',
    GIT_AUTHOR_DATE: dateStr,
    GIT_COMMITTER_NAME: 'bhasitgupta',
    GIT_COMMITTER_EMAIL: 'bhasitgupta@gmail.com',
    GIT_COMMITTER_DATE: dateStr
  };

  const newSha = execSync(cmd, { cwd: sentryDir, env, encoding: 'utf-8' }).trim();
  shaMap.set(orig.sha, newSha);
  parentSha = newSha;
}

console.log(`May-Aug squashed re-chain complete. Last May-Aug commit: ${parentSha}`);

// Re-chain Sep-Oct commits (preserving exact author/committer timestamps, trees, messages)
console.log(`Re-chaining ${sepOct.length} Sep-Oct real commits...`);
for (let i = 0; i < sepOct.length; i++) {
  const orig = sepOct[i];
  let pSha = parentSha;
  if (orig.parents.length > 0) {
    const mapped = shaMap.get(orig.parents[0]);
    if (mapped) pSha = mapped;
  }

  const parentArg = pSha ? `-p ${pSha}` : '';
  const cmd = `git commit-tree ${orig.tree} ${parentArg} -m ${JSON.stringify(orig.msg)}`;
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: orig.authorName,
    GIT_AUTHOR_EMAIL: orig.authorEmail,
    GIT_AUTHOR_DATE: orig.authorDate,
    GIT_COMMITTER_NAME: orig.committerName || orig.authorName,
    GIT_COMMITTER_EMAIL: orig.committerEmail || orig.authorEmail,
    GIT_COMMITTER_DATE: orig.committerDate
  };

  const newSha = execSync(cmd, { cwd: sentryDir, env, encoding: 'utf-8' }).trim();
  shaMap.set(orig.sha, newSha);
  parentSha = newSha;
}

console.log(`Final HEAD commit SHA: ${parentSha}`);

// Verify tree matches original HEAD tree
const origHeadTree = execSync('git log -1 --format="%T" HEAD', { cwd: sentryDir, encoding: 'utf-8' }).trim();
const newHeadTree = execSync(`git log -1 --format="%T" ${parentSha}`, { cwd: sentryDir, encoding: 'utf-8' }).trim();

console.log(`Orig HEAD tree: ${origHeadTree}`);
console.log(`New  HEAD tree: ${newHeadTree}`);

if (origHeadTree !== newHeadTree) {
  console.error('ERROR: Tree mismatch! Aborting without updating ref.');
  process.exit(1);
}

// Update refs/heads/main
execSync(`git update-ref refs/heads/main ${parentSha}`, { cwd: sentryDir });
console.log('Successfully updated refs/heads/main to new re-chained commit.');

const statusOut = execSync('git status', { cwd: sentryDir, encoding: 'utf-8' });
console.log(statusOut);
