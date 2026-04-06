import { describe, expect, it } from 'vitest';
import { decorateGeneratedDataWithRatings, estimateRuntime, filterQuestions, parseTimestamp } from './session-helpers';
import { GeneratedData } from '../core/gemini';

const sessionFixture: GeneratedData = {
  sessionId: 1,
  sessionOverview: 'Overview',
  instructorTakeaways: [],
  summary: [
    { timestamp: '00:45', title: 'Warm-up' },
    { timestamp: '01:14:20', title: 'Deep dive' }
  ],
  qa: [
    {
      timestamp: '02:10',
      speaker: 'Riya',
      question: 'How does MCP orchestration work across multiple agent steps when context, API boundaries, and transformer-driven planning all need to stay aligned?',
      answer: 'It coordinates tools, context, and execution boundaries.'
    },
    {
      timestamp: '15:05',
      speaker: 'Dev',
      question: 'What is the difference between context and memory?',
      answer: 'Context is the active working state, while memory is persisted for later reuse.'
    },
    {
      speaker: 'Sam',
      question: 'Can we revisit deployment?',
      answer: 'Yes, that comes later in the course.'
    }
  ]
};

describe('session helpers', () => {
  it('filters questions by search query across question, answer, and speaker', () => {
    const ratedData = decorateGeneratedDataWithRatings(sessionFixture);

    expect(filterQuestions(ratedData.qa, 'mcp', 0)).toHaveLength(1);
    expect(filterQuestions(ratedData.qa, 'persisted', 0)).toHaveLength(1);
    expect(filterQuestions(ratedData.qa, 'riya', 0)).toHaveLength(1);
  });

  it('applies rating filters after ratings are computed', () => {
    const ratedData = decorateGeneratedDataWithRatings(sessionFixture);

    expect(filterQuestions(ratedData.qa, '', 4)).toHaveLength(2);
    expect(filterQuestions(ratedData.qa, '', 5)).toHaveLength(1);
  });

  it('estimates runtime from the furthest summary or question timestamp', () => {
    expect(estimateRuntime(sessionFixture.summary, sessionFixture.qa)).toBe('1h 14m');
    expect(parseTimestamp('01:14:20')).toBe(4460);
    expect(parseTimestamp('invalid')).toBe(0);
  });
});