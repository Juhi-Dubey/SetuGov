/**
 * Canonical domain normalizer to prevent case, whitespace, and formatting duplicates.
 */
export const normalizeDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return '';
  const trimmed = domain.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  const canonicalMap = {
    'healthcare': 'Healthcare',
    'healthcare & medtech': 'Healthcare & MedTech',
    'healthtech': 'HealthTech',
    'public transit': 'Public Transit',
    'smart cities': 'Smart Cities',
    'transport': 'Transport',
    'urban mobility': 'Urban Mobility',
    'waste management': 'Waste Management',
    'technology': 'Technology',
    'urban governance & smart cities': 'Urban Governance & Smart Cities',
  };

  if (canonicalMap[lower]) {
    return canonicalMap[lower];
  }

  // Capitalize each word, preserving connectives
  return trimmed
    .split(/\s+/)
    .map((word) => {
      const wLower = word.toLowerCase();
      if (wLower === '&') return '&';
      if (wLower === 'and') return 'and';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
