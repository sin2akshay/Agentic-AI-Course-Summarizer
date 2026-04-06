import { describe, expect, it } from 'vitest';
import { YoutubeService } from './youtube';

describe('YoutubeService', () => {
  const service = new YoutubeService();

  it('extracts ids from common YouTube URL formats', () => {
    expect(service.extractVideoId('https://www.youtube.com/watch?v=PsAQvHjxT7s')).toBe('PsAQvHjxT7s');
    expect(service.extractVideoId('https://youtu.be/PsAQvHjxT7s')).toBe('PsAQvHjxT7s');
    expect(service.extractVideoId('https://www.youtube.com/embed/PsAQvHjxT7s')).toBe('PsAQvHjxT7s');
  });

  it('returns null for invalid urls', () => {
    expect(service.extractVideoId('https://example.com/video')).toBeNull();
    expect(service.extractVideoId('not-a-url')).toBeNull();
  });
});