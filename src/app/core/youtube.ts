import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {
  private readonly videoIdPattern = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  private readonly validVideoId = /^[a-zA-Z0-9_-]{11}$/;

  constructor() { }

  /**
   * Extracts the video ID from a YouTube URL.
   * Validates the ID is exactly 11 alphanumeric/dash/underscore characters.
   */
  extractVideoId(url: string): string | null {
    const match = url.match(this.videoIdPattern);
    const id = match?.[2] ?? null;
    return id && this.validVideoId.test(id) ? id : null;
  }
}
