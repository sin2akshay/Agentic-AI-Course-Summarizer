import { GeneratedData } from '../core/gemini';

const DEPTH_KEYWORDS = ['orchestration', 'agent', 'mcp', 'rag', 'context', 'scaling', 'transformer', 'architecture', 'api', 'protocol', 'cognitive'];

export function calculateQuestionRating(question: string): number {
  let score = 1;
  const normalizedQuestion = question.toLowerCase();

  if (normalizedQuestion.includes('how') || normalizedQuestion.includes('why') || normalizedQuestion.includes('difference')) {
    score += 1;
  }

  const matches = DEPTH_KEYWORDS.filter((keyword) => normalizedQuestion.includes(keyword)).length;
  if (matches > 0) {
    score += Math.min(2, matches + 1);
  }

  if (question.length > 80) {
    score += 1;
  }

  return Math.min(5, score);
}

export function decorateGeneratedDataWithRatings(data: GeneratedData): GeneratedData {
  return {
    ...data,
    qa: data.qa.map((question) => ({
      ...question,
      rating: calculateQuestionRating(question.question)
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