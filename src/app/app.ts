import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from './core/theme.service';
import { SyllabusService } from './core/syllabus.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  readonly theme = inject(ThemeService);
  private readonly syllabusService = inject(SyllabusService);
  readonly phaseGroups = this.syllabusService.sessionGroups;
  readonly progressPercent = this.syllabusService.progressPercent;
  readonly unlockedSessions = this.syllabusService.unlockedSessions;
  readonly totalSessions = this.syllabusService.totalSessions;
  readonly isDarkMode = computed(() => this.theme.isDarkMode());

  toggleTheme() {
    this.theme.toggleTheme();
  }
}
