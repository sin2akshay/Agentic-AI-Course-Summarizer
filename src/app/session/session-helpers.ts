import { GeneratedData } from '../core/gemini';

// Analytical question framing — any single match adds 1 point (not per keyword, to avoid stacking)
const ANALYTICAL_SIGNALS = [
  'how', 'why', 'difference', 'compare', 'versus', 'vs ', 'instead of',
  'compared to', 'trade-off', 'limitation', 'implication', 'tradeoff'
];

// Tiered keyword list — each tier is scored and capped independently
const KEYWORD_TIERS: { terms: string[]; weight: number }[] = [
  {
    // Tier 2 — recognisable AI/engineering concepts (each worth 0.5, tier capped at 1.0)
    weight: 0.5,
    terms: [
      'agent', 'model', 'api', 'context', 'token', 'prompt',
      'deploy', 'docker', 'pipeline', 'tool', 'inference', 'framework'
    ]
  },
  {
    // Tier 3 — advanced agentic AI / architectural concepts (each worth 1.0, tier capped at 2.0)
    weight: 1.0,
    terms: [
      'orchestration', 'transformer', 'architecture', 'rag', 'mcp', 'memory',
      'embedding', 'fine-tun', 'multi-agent', 'function call', 'attention',
      'quantiz', 'grpc', 'planning', 'evaluation', 'benchmark', 'reasoning',
      'protocol', 'cognitive', 'scaling'
    ]
  }
];

export function calculateQuestionRating(question: string, answer = ''): number {
  const q = question.toLowerCase();

  let score = 1;

  // +1 for analytical framing — fires once regardless of how many signals match
  if (ANALYTICAL_SIGNALS.some((signal) => q.includes(signal))) {
    score += 1;
  }

  // Tiered keyword scoring — each tier is capped at 2× its weight
  for (const { terms, weight } of KEYWORD_TIERS) {
    const matchCount = terms.filter((term) => q.includes(term)).length;
    score += Math.min(weight * matchCount, weight * 2);
  }

  // Question complexity: long questions usually encode more sub-problems
  if (question.length > 100) score += 0.5;

  // Answer depth: a long answer signals the question demanded real explanation
  if (answer.length > 150) score += 0.5;

  return Math.min(5, Math.round(score));
}

export function decorateGeneratedDataWithRatings(data: GeneratedData): GeneratedData {
  return {
    ...data,
    qa: data.qa.map((question) => ({
      ...question,
      rating: calculateQuestionRating(question.question, question.answer)
    }))
  };
}

export function filterQuestions(questions: GeneratedData['qa'], searchQuery: string, ratingFilter: number): GeneratedData['qa'] {
  const normalizedQuery = searchQuery.toLowerCase().trim();

  return questions.filter((question) => {
    const matchesSearch = !normalizedQuery
      || question.question.toLowerCase().includes(normalizedQuery)
      || question.answer.toLowerCase().includes(normalizedQuery)
      || question.speaker?.toLowerCase().includes(normalizedQuery);
    const matchesRating = ratingFilter === 0 || (question.rating ?? 0) >= ratingFilter;

    return matchesSearch && matchesRating;
  });
}

export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map((value) => Number.parseInt(value, 10));
  if (parts.some(Number.isNaN)) {
    return 0;
  }

  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }

  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }

  return 0;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return minutes > 0 ? `${minutes}m` : '<1m';
}

export function estimateRuntime(summary: GeneratedData['summary'], questions: GeneratedData['qa']): string {
  const timestamps = [
    ...summary.map((item) => item.timestamp),
    ...questions.map((item) => item.timestamp).filter((timestamp): timestamp is string => Boolean(timestamp))
  ];

  const maxSeconds = timestamps.reduce((highestTimestamp, timestamp) => {
    const seconds = parseTimestamp(timestamp);
    return seconds > highestTimestamp ? seconds : highestTimestamp;
  }, 0);

  return maxSeconds > 0 ? formatDuration(maxSeconds) : 'N/A';
}