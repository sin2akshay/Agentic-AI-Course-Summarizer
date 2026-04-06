import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'ai-course-summarizer-theme';
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  readonly isDarkMode = signal(this.getInitialTheme());

  constructor() {
    this.updateTheme();
  }

  toggleTheme() {
    this.isDarkMode.update((isDarkMode) => !isDarkMode);
    this.updateTheme();
  }

  private updateTheme() {
    const isDarkMode = this.isDarkMode();

    this.document.body.classList.toggle('light-theme', !isDarkMode);
    this.document.body.classList.toggle('dark-theme', isDarkMode);
    this.document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    this.window?.localStorage.setItem(this.storageKey, isDarkMode ? 'dark' : 'light');
  }

  private getInitialTheme(): boolean {
    const savedTheme = this.window?.localStorage.getItem(this.storageKey);
    if (savedTheme === 'dark') {
      return true;
    }

    if (savedTheme === 'light') {
      return false;
    }

    return this.window?.matchMedia('(prefers-color-scheme: dark)').matches ?? true;
  }
}
