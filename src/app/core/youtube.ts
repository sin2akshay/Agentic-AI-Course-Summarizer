import { Injectable } from '@angular/core';

interface TranscriptSegment {
  offset: string;
  text: string;
}

interface TranscriptApiResponse {
  transcript?: TranscriptSegment[];
}

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {
  private readonly videoIdPattern = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;

  constructor() { }

  /**
   * Extracts the video ID from a YouTube URL
   */
  extractVideoId(url: string): string | null {
    const match = url.match(this.videoIdPattern);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  /**
   * Fetches transcript using a free public transcript API to avoid CORS and Node issues on the browser.
   * If this fails in the real world, you would proxy `youtube-transcript` on an Express backend.
   */
  async getTranscriptViaApi(videoId: string): Promise<string> {
    try {
      // For a pure client-side approach, we'll try to fetch using an open API
      // dash.kome.ai/api/v1/transcript is a known free tier transcript API for Chrome extensions.
      const response = await fetch(`https://dash.kome.ai/api/v1/transcript?video_id=${videoId}`);
      if (!response.ok) throw new Error('API failed');
      const data = await response.json() as TranscriptApiResponse;
      
      // Combine text segments into one big transcript string
      const text = data.transcript?.map((segment) => `[${segment.offset}] ${segment.text}`).join(' ');
      return text || '';
    } catch (error) {
      console.warn('Failed Kome API fetch, falling back to manual or error:', error);
      throw new Error('Could not fetch transcript purely from the client without a backend proxy.');
    }
  }
}
