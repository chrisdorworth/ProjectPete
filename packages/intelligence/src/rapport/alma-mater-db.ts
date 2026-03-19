export interface UniversityInfo {
  name: string;
  mascot: string;
  colors: string;
  tier: 1 | 2 | 3;
  conferenceOrLeague: string | null;
  openers: string[];
}

// Top 50 universities (Tier 1 sample)
const UNIVERSITIES: Record<string, UniversityInfo> = {
  "university of florida": { name: "University of Florida", mascot: "Gators", colors: "Orange & Blue", tier: 1, conferenceOrLeague: "SEC", openers: ["Go Gators!", "How about them Gators?", "UF alum — what year did you graduate?"] },
  "florida state university": { name: "Florida State University", mascot: "Seminoles", colors: "Garnet & Gold", tier: 1, conferenceOrLeague: "ACC", openers: ["Go Noles!", "FSU grad — great school"] },
  "university of central florida": { name: "University of Central Florida", mascot: "Knights", colors: "Black & Gold", tier: 2, conferenceOrLeague: "Big 12", openers: ["Charge On!", "UCF Knight — love Orlando"] },
  "university of miami": { name: "University of Miami", mascot: "Hurricanes", colors: "Orange & Green", tier: 1, conferenceOrLeague: "ACC", openers: ["Go Canes!", "The U — great tradition"] },
  "harvard university": { name: "Harvard University", mascot: "Crimson", colors: "Crimson", tier: 1, conferenceOrLeague: "Ivy League", openers: ["Harvard — impressive", "Crimson pride"] },
  "stanford university": { name: "Stanford University", mascot: "Cardinal", colors: "Cardinal & White", tier: 1, conferenceOrLeague: "ACC", openers: ["Stanford — exceptional school"] },
  "yale university": { name: "Yale University", mascot: "Bulldogs", colors: "Yale Blue", tier: 1, conferenceOrLeague: "Ivy League", openers: ["Go Bulldogs!", "Yale — wonderful program"] },
  "princeton university": { name: "Princeton University", mascot: "Tigers", colors: "Orange & Black", tier: 1, conferenceOrLeague: "Ivy League", openers: ["Princeton Tiger — great school"] },
  "mit": { name: "MIT", mascot: "Engineers", colors: "Cardinal Red & Gray", tier: 1, conferenceOrLeague: null, openers: ["MIT — brilliant", "An Engineer — love it"] },
  "duke university": { name: "Duke University", mascot: "Blue Devils", colors: "Duke Blue & White", tier: 1, conferenceOrLeague: "ACC", openers: ["Go Blue Devils!", "Duke — especially during March Madness"] },
  "university of georgia": { name: "University of Georgia", mascot: "Bulldogs", colors: "Red & Black", tier: 1, conferenceOrLeague: "SEC", openers: ["Go Dawgs!", "How bout them Dawgs?"] },
  "ohio state university": { name: "Ohio State University", mascot: "Buckeyes", colors: "Scarlet & Gray", tier: 1, conferenceOrLeague: "Big Ten", openers: ["O-H!", "Go Bucks!"] },
  "university of michigan": { name: "University of Michigan", mascot: "Wolverines", colors: "Maize & Blue", tier: 1, conferenceOrLeague: "Big Ten", openers: ["Go Blue!", "Hail to the Victors"] },
  "university of texas": { name: "University of Texas", mascot: "Longhorns", colors: "Burnt Orange & White", tier: 1, conferenceOrLeague: "SEC", openers: ["Hook 'em!", "Texas Longhorn — love Austin"] },
  "notre dame": { name: "University of Notre Dame", mascot: "Fighting Irish", colors: "Blue & Gold", tier: 1, conferenceOrLeague: "Independent", openers: ["Go Irish!", "Notre Dame — incredible campus"] },
};

export function lookupUniversity(name: string): UniversityInfo | null {
  const normalized = name.toLowerCase().trim();
  return UNIVERSITIES[normalized] ?? null;
}

export function getUniversityTier(name: string): 1 | 2 | 3 {
  const info = lookupUniversity(name);
  return info?.tier ?? 3;
}

export function getOpeners(name: string): string[] {
  const info = lookupUniversity(name);
  return info?.openers ?? [];
}
