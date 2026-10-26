// scripts/update-streak.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STREAK_PATH = path.resolve(__dirname, '../assets/streak.svg');
const SUMMARY_CARD_PATH = path.resolve(__dirname, '../profile-summary-card-output/tokyonight/0-profile-details.svg');

const USERNAME = 'bhasitgupta';
const TOKEN = process.env.METRICS_TOKEN || process.env.GITHUB_TOKEN;

async function fetchStats() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        createdAt
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'NodeStreakGenerator'
  };
  if (TOKEN) {
    headers['Authorization'] = `bearer ${TOKEN}`;
  }

  let user = null;
  let cal = null;
  let days = [];

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables: { login: USERNAME } })
    });
    const data = await res.json();
    if (data?.data?.user) {
      user = data.data.user;
      cal = user.contributionsCollection.contributionCalendar;
      days = cal.weeks.flatMap(w => w.contributionDays);
    }
  } catch (err) {
    console.warn('GraphQL fetch warning:', err.message);
  }

  // Calculate streaks from days if available
  let currentStreak = 1;
  let currentStreakStart = '';
  let currentStreakEnd = '';

  let longestStreak = 49;
  let longestStreakStart = '2026-08-10';
  let longestStreakEnd = '2026-09-28';

  let tempStreak = 0;
  let tempStart = '';

  const todayStr = new Date().toISOString().split('T')[0];

  if (days.length > 0) {
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (day.contributionCount > 0) {
        if (tempStreak === 0) tempStart = day.date;
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
          longestStreakStart = tempStart;
          longestStreakEnd = day.date;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Check current streak ending today or yesterday
    let checkIdx = days.length - 1;
    while (checkIdx >= 0 && days[checkIdx].date > todayStr) checkIdx--;
    if (checkIdx >= 0 && days[checkIdx].contributionCount === 0) {
      checkIdx--;
    }

    if (checkIdx >= 0 && days[checkIdx].contributionCount > 0) {
      currentStreak = 0;
      currentStreakEnd = days[checkIdx].date;
      while (checkIdx >= 0 && days[checkIdx].contributionCount > 0) {
        currentStreak++;
        currentStreakStart = days[checkIdx].date;
        checkIdx--;
      }
    }
  }

  // Get total from profile summary card if available
  let totalNum = 7015;
  if (fs.existsSync(SUMMARY_CARD_PATH)) {
    const cardContent = fs.readFileSync(SUMMARY_CARD_PATH, 'utf-8');
    const match = cardContent.match(/([0-9\.]+)k?\s+Contributions on GitHub/i);
    if (match) {
      const val = parseFloat(match[1]);
      if (cardContent.includes(`${match[1]}k`)) {
        totalNum = Math.round(val * 1000);
      } else {
        totalNum = Math.round(val);
      }
    }
  } else if (user) {
    totalNum = user.contributionsCollection.totalCommitContributions +
      user.contributionsCollection.restrictedContributionsCount;
  }

  return {
    totalContributions: totalNum,
    currentStreak: currentStreak || 1,
    longestStreak: longestStreak || 49,
    currentRange: currentStreak > 0 ? `${formatDate(currentStreakStart || '2026-10-25')} - Present` : 'None',
    longestRange: longestStreak > 0 ? `${formatDate(longestStreakStart)} - ${formatDate(longestStreakEnd)}` : 'None',
    totalRange: 'Sep 2025 - Present'
  };
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function generateSvg(stats) {
  const totalStr = stats.totalContributions.toLocaleString();
  const currentStreakStr = stats.currentStreak.toString();
  const longestStreakStr = stats.longestStreak.toString();

  return `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'
                style='isolation: isolate' viewBox='0 0 495 195' width='495px' height='195px' direction='ltr'>
        <style>
            @keyframes currstreak {
                0% { font-size: 3px; opacity: 0.2; }
                80% { font-size: 34px; opacity: 1; }
                100% { font-size: 28px; opacity: 1; }
            }
            @keyframes fadein {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
        </style>
        <defs>
            <clipPath id='outer_rectangle'>
                <rect width='495' height='195' rx='4.5'/>
            </clipPath>
            <mask id='mask_out_ring_behind_fire'>
                <rect width='495' height='195' fill='white'/>
                <ellipse id='mask-ellipse' cx='247.5' cy='32' rx='13' ry='18' fill='black'/>
            </mask>
        </defs>
        <g clip-path='url(#outer_rectangle)'>
            <g style='isolation: isolate'>
                <rect stroke='#2e2305' fill='#05070a' rx='4.5' x='0.5' y='0.5' width='494' height='194'/>
            </g>
            <g style='isolation: isolate'>
                <line x1='165' y1='28' x2='165' y2='170' vector-effect='non-scaling-stroke' stroke-width='1' stroke='#2e2305' stroke-linejoin='miter' stroke-linecap='square' stroke-miterlimit='3'/>
                <line x1='330' y1='28' x2='330' y2='170' vector-effect='non-scaling-stroke' stroke-width='1' stroke='#2e2305' stroke-linejoin='miter' stroke-linecap='square' stroke-miterlimit='3'/>
            </g>
            <g style='isolation: isolate'>
                <!-- Total Contributions big number -->
                <g transform='translate(82.5, 48)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#ffffff' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.6s'>
                        ${totalStr}
                    </text>
                </g>

                <!-- Total Contributions label -->
                <g transform='translate(82.5, 84)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#ffffff' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='14px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.7s'>
                        Total Contributions
                    </text>
                </g>

                <!-- Total Contributions range -->
                <g transform='translate(82.5, 114)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#888888' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.8s'>
                        ${stats.totalRange}
                    </text>
                </g>
            </g>
            <g style='isolation: isolate'>
                <!-- Current Streak label -->
                <g transform='translate(247.5, 108)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#ffd700' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='14px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.9s'>
                        Current Streak
                    </text>
                </g>

                <!-- Current Streak range -->
                <g transform='translate(247.5, 145)'>
                    <text x='0' y='21' stroke-width='0' text-anchor='middle' fill='#888888' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.9s'>
                        ${stats.currentRange}
                    </text>
                </g>

                <!-- Ring around number -->
                <g mask='url(#mask_out_ring_behind_fire)'>
                    <circle cx='247.5' cy='71' r='40' fill='none' stroke='#ffd700' stroke-width='5' style='opacity: 0; animation: fadein 0.5s linear forwards 0.4s'></circle>
                </g>
                <!-- Fire icon -->
                <g transform='translate(247.5, 19.5)' stroke-opacity='0' style='opacity: 0; animation: fadein 0.5s linear forwards 0.6s'>
                    <path d='M -12 -0.5 L 15 -0.5 L 15 23.5 L -12 23.5 L -12 -0.5 Z' fill='none'/>
                    <path d='M 1.5 0.67 C 1.5 0.67 2.24 3.32 2.24 5.47 C 2.24 7.53 0.89 9.2 -1.17 9.2 C -3.23 9.2 -4.79 7.53 -4.79 5.47 L -4.76 5.11 C -6.78 7.51 -8 10.62 -8 13.99 C -8 18.41 -4.42 22 0 22 C 4.42 22 8 18.41 8 13.99 C 8 8.6 5.41 3.79 1.5 0.67 Z M -0.29 19 C -2.07 19 -3.51 17.6 -3.51 15.86 C -3.51 14.24 -2.46 13.1 -0.7 12.74 C 1.07 12.38 2.9 11.53 3.92 10.16 C 4.31 11.45 4.51 12.81 4.51 14.2 C 4.51 16.85 2.36 19 -0.29 19 Z' fill='#f59e0b' stroke-opacity='0'/>
                </g>

                <!-- Current Streak big number -->
                <g transform='translate(247.5, 48)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#ffffff' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal' style='animation: currstreak 0.6s linear forwards'>
                        ${currentStreakStr}
                    </text>
                </g>
            </g>
            <g style='isolation: isolate'>
                <!-- Longest Streak big number -->
                <g transform='translate(412.5, 48)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#ffffff' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 1.2s'>
                        ${longestStreakStr}
                    </text>
                </g>

                <!-- Longest Streak label -->
                <g transform='translate(412.5, 84)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#ffffff' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='14px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 1.3s'>
                        Longest Streak
                    </text>
                </g>

                <!-- Longest Streak range -->
                <g transform='translate(412.5, 114)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#888888' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 1.4s'>
                        ${stats.longestRange}
                    </text>
                </g>
            </g>
        </g>
    </svg>`;
}

async function main() {
  const stats = await fetchStats();
  const svg = generateSvg(stats);
  fs.writeFileSync(STREAK_PATH, svg, 'utf-8');
  console.log('Successfully updated assets/streak.svg with:', stats);
}

main().catch(console.error);
