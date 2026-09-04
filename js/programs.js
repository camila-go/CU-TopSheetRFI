/* Degree level → area of study → programmes.
 *
 * Shared by the desktop megamenu's third level (js/nav.js), the mobile nav tree
 * derived from it, and the hero's program finder (js/hero.js). Keeping it in one
 * module is deliberate: capella.edu drives all three from the same catalogue, and
 * the area/programme lists were verified to match the live site exactly
 * (Bachelor's → Business, Health Sciences, Information Technology, Nursing,
 * Psychology, Social Work; Bachelor's + Nursing → BSN (Prelicensure), RN-to-BSN).
 * Duplicating it would let the nav and the hero drift apart.
 */

// Third level of the Degrees megamenu: area of study → programs, mirroring
// capella.edu (where an area is a toggle, not a link, and swaps the right-hand
// column for its programs). Kept in JS rather than markup because it's ~50
// extra links that only ever appear on demand.
export const MEGA_PROGRAMS = {
  'area-bachelors': {
    Business: ['BS in Business'],
    'Health Sciences': ['BS in Health Care Administration'],
    'Information Technology': ['BS in Computer Science', 'BS in Information Technology'],
    Nursing: ['BSN (Prelicensure)', 'RN-to-BSN'],
    Psychology: ['BS in Psychology', 'BS in Psychology Pre-Counseling & Therapy'],
    'Social Work': ['BSW - Bachelor of Social Work'],
  },
  'area-masters': {
    Business: ['MBA - Master of Business Administration', 'MS in Human Resource Management'],
    'Counseling & Therapy': [
      'MS in Marriage & Family Therapy',
      'MS in Clinical Mental Health Counseling',
      'MS in School Counseling',
    ],
    Education: ['MS in Education'],
    'Health Sciences': ['MHA - Master of Health Administration', 'MPH - Master of Public Health'],
    'Information Technology': [
      'MS in Analytics',
      'MS in Cybersecurity and Applied AI',
      'MS in Information Technology',
    ],
    Nursing: [
      'MSN - Master of Science in Nursing',
      'MSN NP - Master of Science in Nursing, Nurse Practitioner',
    ],
    Psychology: [
      'MS in Applied Behavior Analysis',
      'MS in Clinical Psychology',
      'MS in Psychology',
      'MS in School Psychology',
    ],
    'Social Work': ['MSW - Master of Social Work', 'MSW - Master of Social Work Advanced Standing'],
  },
  'area-doctoral': {
    Business: ['DBA - Doctor of Business Administration'],
    Education: ['EdD - Doctor of Education'],
    'Health Sciences': ['DHA - Health Administration', 'DrPH - Doctor of Public Health'],
    'Information Technology': ['DIT - Doctor of Information Technology'],
    Nursing: ['DNP - Doctor of Nursing Practice'],
    Psychology: [
      'EdS in School Psychology',
      'PhD in Behavior Analysis',
      'PhD in Psychology',
      'PsyD in Clinical Psychology',
    ],
    'Social Work': ['DSW - Doctor of Social Work'],
  },
  'area-certificates': {
    Business: ['Graduate Certificate in Human Resource Management'],
    'Counseling & Therapy': ['Counseling Certificates'],
    'Health Sciences': ['Graduate Certificate in Public Health'],
    Nursing: ['Post-Master’s Nursing Certificates'],
    Psychology: ['Graduate Certificate in Applied Behavior Analysis'],
  },
  // Individual Courses has no third level — its rows are the final links.
};

