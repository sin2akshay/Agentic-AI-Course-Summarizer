import { ChangeDetectionStrategy, Component, ElementRef, NgZone, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom, map } from 'rxjs';
import { YoutubeService } from '../core/youtube';
import { GeminiService, GeneratedData } from '../core/gemini';
import { SyllabusService } from '../core/syllabus.service';
import { decorateGeneratedDataWithRatings, estimateRuntime, filterQuestions, parseTimestamp } from './session-helpers';

interface SummaryStat {
  label: string;
  value: string;
  detail: string;
}

interface LearningInsight {
  title: string;
  body: string;
}

@Component({
  selector: 'app-session',
  imports: [FormsModule],
  templateUrl: './session.html',
  styleUrl: './session.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly ytService = inject(YoutubeService);
  private readonly geminiService = inject(GeminiService);
  private readonly syllabusService = inject(SyllabusService);
  private readonly ngZone = inject(NgZone);

  private readonly videoSection = viewChild<ElementRef<HTMLElement>>('videoSection');
  private readonly forumSearchInput = viewChild<ElementRef<HTMLInputElement>>('forumSearchInput');
  private loadRequestId = 0;

  readonly ratingOptions = [1, 2, 3, 4, 5] as const;
  readonly sessionId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')) || 1)),
    { initialValue: 1 }
  );
  readonly videoUrl = signal('');
  readonly safeVideoUrl = signal<SafeResourceUrl | null>(null);
  readonly isLoading = signal(false);
  readonly isGenerating = signal(false);
  readonly isFloating = signal(false);
  readonly searchQuery = signal('');
  readonly ratingFilter = signal(0);
  readonly error = signal<string | null>(null);
  readonly adminTranscript = signal('');
  readonly adminUrl = signal('');
  readonly availableModels = signal<string[]>(['gemini-1.5-flash']);
  readonly selectedModel = signal('gemini-2.5-flash');
  readonly data = signal<GeneratedData | null>(null);

  readonly sessionMeta = computed(() => this.syllabusService.getSessionById(this.sessionId()) ?? null);
  readonly sessionTitle = computed(() => this.sessionMeta()?.title ?? `Session ${this.sessionId()}`);
  readonly filteredQa = computed(() => {
    const data = this.data();
    if (!data) {
      return [];
    }

    return filterQuestions(data.qa, this.searchQuery(), this.ratingFilter());
  });
  readonly sessionOverview = computed(() => this.data()?.sessionOverview?.trim()
    || 'This session brings together the core ideas, milestones, and open questions covered in the recording.');
  readonly sessionStats = computed<SummaryStat[]>(() => {
    const data = this.data();
    const chapterCount = data?.summary?.length ?? 0;
    const questionCount = data?.qa?.length ?? 0;

    return [
      {
        label: 'Chapters',
        value: `${chapterCount}`,
        detail: 'Structured checkpoints from the lecture timeline.'
      },
      {
        label: 'Questions',
        value: `${questionCount}`,
        detail: 'Audience prompts captured in the forum below.'
      },
      {
        label: 'Runtime',
        value: this.estimatedRuntime(),
        detail: 'Based on the furthest timestamp captured in the session data.'
      }
    ];
  });
  readonly hasSummarySection = computed(() => {
    const data = this.data();
    return Boolean(data && (
      data.sessionOverview
      || data.instructorTakeaways?.length
      || data.summary?.length
    ));
  });
  readonly learningInsights = computed<LearningInsight[]>(() => this.data()?.instructorTakeaways?.filter((item) => {
    return item.title.trim().length > 0 && item.body.trim().length > 0;
  }) ?? []);
  readonly estimatedRuntime = computed(() => estimateRuntime(this.data()?.summary ?? [], this.data()?.qa ?? []));

  constructor() {
    effect(() => {
      void this.loadSession(this.sessionId());
    }, { allowSignalWrites: true });

    effect((onCleanup) => {
      const videoSection = this.videoSection()?.nativeElement;
      const safeVideoUrl = this.safeVideoUrl();

      if (!videoSection || !safeVideoUrl) {
        this.isFloating.set(false);
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        const shouldFloat = Boolean(entry) && !entry.isIntersecting && entry.boundingClientRect.top < 0;

        this.ngZone.run(() => this.isFloating.set(shouldFloat));
      }, { root: null, threshold: 0 });

      observer.observe(videoSection);

      onCleanup(() => {
        observer.disconnect();
        this.isFloating.set(false);
      });
    }, { allowSignalWrites: true });

    void this.fetchModels();
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  setRatingFilter(stars: number) {
    this.ratingFilter.update((currentFilter) => currentFilter === stars ? 0 : stars);
  }

  async fetchModels() {
    const list = await this.geminiService.listAvailableModels();
    if (list.length > 0) {
      this.availableModels.set(list);
      this.selectedModel.set(list.find((model) => model.includes('2.5-flash')) ?? list[0]);
    }
  }

  async loadSession(sessionId: number) {
    const requestId = ++this.loadRequestId;

    this.error.set(null);
    this.isLoading.set(true);
    this.data.set(null);
    this.isFloating.set(false);
    this.adminTranscript.set('');
    this.adminUrl.set('');

    const sessionMeta = this.syllabusService.getSessionById(sessionId);
    const videoUrl = sessionMeta?.recordingUrl ?? '';
    this.videoUrl.set(videoUrl);

    const videoId = this.resolveVideoId(sessionId, videoUrl);
    if (videoId) {
      this.safeVideoUrl.set(this.buildSafeVideoUrl(videoId));
    } else {
      this.safeVideoUrl.set(null);
    }

    try {
      const json = await firstValueFrom(this.http.get<GeneratedData>(`/data/session-${sessionId}.json`));
      if (requestId !== this.loadRequestId) {
        return;
      }

      // Prefer the URL embedded in the JSON over the syllabus hardcode
      const resolvedUrl = json.videoUrl || videoUrl;
      if (resolvedUrl) {
        this.videoUrl.set(resolvedUrl);
        const resolvedId = this.ytService.extractVideoId(resolvedUrl);
        if (resolvedId) {
          this.safeVideoUrl.set(this.buildSafeVideoUrl(resolvedId));
        }
      }

      this.data.set(decorateGeneratedDataWithRatings(json));

      // Auto-unlock the session in the sidebar if it was still marked locked
      const meta = this.syllabusService.getSessionById(sessionId);
      if (meta?.isLocked) {
        this.syllabusService.unlockSession(sessionId, json.videoUrl ?? videoUrl);
      }
    } catch {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.error.set(sessionId === 1 ? 'Error loading session data.' : 'This session recording is not available yet.');
    } finally {
      if (requestId === this.loadRequestId) {
        this.isLoading.set(false);
      }
    }
  }

  async generateSessionLive() {
    const adminTranscript = this.adminTranscript().trim();
    const adminUrl = this.adminUrl().trim();

    if (!adminTranscript || !adminUrl) {
      return;
    }

    this.error.set(null);
    this.isGenerating.set(true);

    try {
      const result = await this.geminiService.processTranscript(
        adminTranscript,
        adminUrl,
        this.sessionId(),
        this.selectedModel()
      );

      this.data.set(decorateGeneratedDataWithRatings(result));

      const videoId = this.ytService.extractVideoId(adminUrl);
      if (videoId) {
        this.safeVideoUrl.set(this.buildSafeVideoUrl(videoId));
      }
    } catch (error) {
      this.error.set(this.getErrorMessage(error));
    } finally {
      this.isGenerating.set(false);
    }
  }

  downloadJson() {
    const data = this.data();
    if (!data) {
      return;
    }

    const exportedData: GeneratedData = {
      ...data,
      videoUrl: this.adminUrl() || data.videoUrl,
      qa: data.qa.map(({ rating, ...question }) => question)
    };
    const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${this.sessionId()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  seekTo(timestamp: string) {
    const seconds = parseTimestamp(timestamp);
    const videoId = this.ytService.extractVideoId(this.videoUrl() || this.adminUrl());
    if (!videoId) return;
    this.safeVideoUrl.set(this.buildSafeVideoUrl(videoId, seconds));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setAdminUrl(url: string) {
    this.adminUrl.set(url);
  }

  setAdminTranscript(transcript: string) {
    this.adminTranscript.set(transcript);
  }

  setSelectedModel(model: string) {
    this.selectedModel.set(model);
  }

  focusForumSearch() {
    const searchInput = this.forumSearchInput()?.nativeElement;
    if (!searchInput) {
      return;
    }

    searchInput.focus();
    searchInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  private buildSafeVideoUrl(videoId: string, startSeconds?: number): SafeResourceUrl {
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      iv_load_policy: '3',
      fs: '1'
    });

    if (startSeconds !== undefined) {
      params.set('start', `${startSeconds}`);
      params.set('autoplay', '1');
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
    );
  }

  private resolveVideoId(sessionId: number, videoUrl: string): string | null {
    const videoId = videoUrl ? this.ytService.extractVideoId(videoUrl) : null;
    return sessionId === 1 && !videoId ? 'PsAQvHjxT7s' : videoId;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong while generating the session.';
  }
}
