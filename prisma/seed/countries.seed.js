// ─── PharmaVigil – Countries Seed ────────────────────────────────────────────
// Populates the spt_org_countries lookup table with ISO 3166-1 alpha-3 codes.
// Uses createMany with skipDuplicates for fast, idempotent loading.
// ──────────────────────────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const COUNTRIES = [
  // ─── Americas ──────────────────────────────────────────────────────────
  { iso_code: 'USA', name: 'United States of America',   region: 'Americas' },
  { iso_code: 'CAN', name: 'Canada',                     region: 'Americas' },
  { iso_code: 'MEX', name: 'Mexico',                     region: 'Americas' },
  { iso_code: 'BRA', name: 'Brazil',                     region: 'Americas' },
  { iso_code: 'ARG', name: 'Argentina',                  region: 'Americas' },
  { iso_code: 'COL', name: 'Colombia',                   region: 'Americas' },
  { iso_code: 'CHL', name: 'Chile',                      region: 'Americas' },
  { iso_code: 'PER', name: 'Peru',                       region: 'Americas' },
  { iso_code: 'CUB', name: 'Cuba',                       region: 'Americas' },
  { iso_code: 'CRI', name: 'Costa Rica',                 region: 'Americas' },

  // ─── Europe ────────────────────────────────────────────────────────────
  { iso_code: 'GBR', name: 'United Kingdom',             region: 'Europe' },
  { iso_code: 'DEU', name: 'Germany',                    region: 'Europe' },
  { iso_code: 'FRA', name: 'France',                     region: 'Europe' },
  { iso_code: 'ITA', name: 'Italy',                      region: 'Europe' },
  { iso_code: 'ESP', name: 'Spain',                      region: 'Europe' },
  { iso_code: 'NLD', name: 'Netherlands',                region: 'Europe' },
  { iso_code: 'SWE', name: 'Sweden',                     region: 'Europe' },
  { iso_code: 'NOR', name: 'Norway',                     region: 'Europe' },
  { iso_code: 'CHE', name: 'Switzerland',                region: 'Europe' },
  { iso_code: 'POL', name: 'Poland',                     region: 'Europe' },
  { iso_code: 'UKR', name: 'Ukraine',                    region: 'Europe' },
  { iso_code: 'ROU', name: 'Romania',                    region: 'Europe' },
  { iso_code: 'CZE', name: 'Czech Republic',             region: 'Europe' },
  { iso_code: 'HUN', name: 'Hungary',                    region: 'Europe' },
  { iso_code: 'AUT', name: 'Austria',                    region: 'Europe' },
  { iso_code: 'BEL', name: 'Belgium',                    region: 'Europe' },
  { iso_code: 'DNK', name: 'Denmark',                    region: 'Europe' },
  { iso_code: 'FIN', name: 'Finland',                    region: 'Europe' },
  { iso_code: 'GRC', name: 'Greece',                     region: 'Europe' },
  { iso_code: 'IRL', name: 'Ireland',                    region: 'Europe' },
  { iso_code: 'PRT', name: 'Portugal',                   region: 'Europe' },
  { iso_code: 'RUS', name: 'Russia',                     region: 'Europe' },

  // ─── Asia ──────────────────────────────────────────────────────────────
  { iso_code: 'IND', name: 'India',                      region: 'Asia' },
  { iso_code: 'JPN', name: 'Japan',                      region: 'Asia' },
  { iso_code: 'CHN', name: 'China',                      region: 'Asia' },
  { iso_code: 'KOR', name: 'South Korea',                region: 'Asia' },
  { iso_code: 'SGP', name: 'Singapore',                  region: 'Asia' },
  { iso_code: 'MYS', name: 'Malaysia',                   region: 'Asia' },
  { iso_code: 'THA', name: 'Thailand',                   region: 'Asia' },
  { iso_code: 'IDN', name: 'Indonesia',                  region: 'Asia' },
  { iso_code: 'PHL', name: 'Philippines',                region: 'Asia' },
  { iso_code: 'PAK', name: 'Pakistan',                   region: 'Asia' },
  { iso_code: 'BGD', name: 'Bangladesh',                 region: 'Asia' },
  { iso_code: 'LKA', name: 'Sri Lanka',                  region: 'Asia' },
  { iso_code: 'NPL', name: 'Nepal',                      region: 'Asia' },
  { iso_code: 'TUR', name: 'Turkey',                     region: 'Asia' },
  { iso_code: 'ISR', name: 'Israel',                     region: 'Asia' },
  { iso_code: 'VNM', name: 'Vietnam',                    region: 'Asia' },

  // ─── Middle East ───────────────────────────────────────────────────────
  { iso_code: 'SAU', name: 'Saudi Arabia',               region: 'Middle East' },
  { iso_code: 'ARE', name: 'United Arab Emirates',       region: 'Middle East' },
  { iso_code: 'QAT', name: 'Qatar',                      region: 'Middle East' },

  // ─── Africa ────────────────────────────────────────────────────────────
  { iso_code: 'ZAF', name: 'South Africa',               region: 'Africa' },
  { iso_code: 'NGA', name: 'Nigeria',                    region: 'Africa' },
  { iso_code: 'KEN', name: 'Kenya',                      region: 'Africa' },
  { iso_code: 'EGY', name: 'Egypt',                      region: 'Africa' },
  { iso_code: 'GHA', name: 'Ghana',                      region: 'Africa' },
  { iso_code: 'ETH', name: 'Ethiopia',                   region: 'Africa' },

  // ─── Oceania ───────────────────────────────────────────────────────────
  { iso_code: 'AUS', name: 'Australia',                  region: 'Oceania' },
  { iso_code: 'NZL', name: 'New Zealand',                region: 'Oceania' },
]

/**
 * Bulk-insert countries. Existing records (by iso_code) are skipped.
 * @returns {Promise<number>} Number of countries created
 */
async function loadCountries () {
  const result = await prisma.country.createMany({
    data: COUNTRIES,
    skipDuplicates: true,
  })

  return result.count
}

module.exports = { loadCountries }
