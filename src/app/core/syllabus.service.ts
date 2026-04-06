import { Injectable, computed, signal } from '@angular/core';

export interface SessionMetadata {
  id: number;
  title: string;
  category: string;
  isLocked: boolean;
  recordingUrl?: string; // Opt-out if not uploaded yet
}

export interface SessionGroup {
  phase: string;
  sessions: SessionMetadata[];
}

@Injectable({
  providedIn: 'root'
})
export class SyllabusService {
  // MASTER LIST: Adding a session here instantly updates the Sidebar and Forum.
  private readonly sessions = signal<SessionMetadata[]>([
    { id: 1, title: 'Foundations of Transformer Architecture', category: 'PHASE 1: FOUNDATIONS', isLocked: false, recordingUrl: 'https://youtu.be/PsAQvHjxT7s' },
    { id: 2, title: 'Modern LLM Internals & The 2026 Landscape', category: 'PHASE 1: FOUNDATIONS', isLocked: true },
    { id: 3, title: 'Developer Foundations & Your AI Roadmap', category: 'PHASE 1: FOUNDATIONS', isLocked: true },
    { id: 4, title: 'MCP — The Tool Protocol', category: 'PHASE 1: FOUNDATIONS', isLocked: true },
    { id: 5, title: 'Planning, Reasoning & Structured Thinking', category: 'PHASE 2: CORE ARCHITECTURE', isLocked: true },
    { id: 6, title: 'Cognitive Architecture & Adaptive Agents', category: 'PHASE 2: CORE ARCHITECTURE', isLocked: true },
    { id: 7, title: 'Memory Systems & Modern RAG', category: 'PHASE 2: CORE ARCHITECTURE', isLocked: true },
    { id: 8, title: 'Multi Agent Systems & DAQ Architecture', category: 'PHASE 2: CORE ARCHITECTURE', isLocked: true },
    { id: 9, title: 'Browser Agents & Autonomous Browsing', category: 'PHASE 2: CORE ARCHITECTURE', isLocked: true },
    { id: 10, title: 'Computer Use & Desktop Agents', category: 'PHASE 2: CORE ARCHITECTURE', isLocked: true },
    { id: 11, title: 'Channel Architecture, Voice & Vision', category: 'PHASE 3: SPECIALIZED AGENTS', isLocked: true },
    { id: 12, title: 'Error Correction, Safety & Content Policies', category: 'PHASE 3: SPECIALIZED AGENTS', isLocked: true },
    { id: 13, title: 'A2A — Agent-to-Agent Protocol', category: 'PHASE 3: SPECIALIZED AGENTS', isLocked: true },
    { id: 14, title: 'A2UI / AG-UI — Agent-to-User Interface', category: 'PHASE 3: SPECIALIZED AGENTS', isLocked: true },
    { id: 15, title: 'Model Routing, Agent Economics & Scaling', category: 'PHASE 3: SPECIALIZED AGENTS', isLocked: true },
    { id: 16, title: 'Event-Driven Autonomous Agents', category: 'PHASE 4: DEPLOYMENT', isLocked: true },
    { id: 17, title: 'Agentic Coding & Markdown-as-Code', category: 'PHASE 4: DEPLOYMENT', isLocked: true },
    { id: 18, title: 'Agent Evaluation, Benchmarking & Testing', category: 'PHASE 4: DEPLOYMENT', isLocked: true },
    { id: 19, title: 'Arcturus 2.0 — Full Integration & Launch', category: 'PHASE 4: DEPLOYMENT', isLocked: true }
  ]);

  readonly sessionGroups = computed<SessionGroup[]>(() => {
    const grouped = new Map<string, SessionMetadata[]>();

    for (const session of this.sessions()) {
      const sessions = grouped.get(session.category) ?? [];
      sessions.push(session);
      grouped.set(session.category, sessions);
    }

    return Array.from(grouped.entries()).map(([phase, sessions]) => ({ phase, sessions }));
  });

  readonly totalSessions = computed(() => this.sessions().length);
  readonly unlockedSessions = computed(() => this.sessions().filter((session) => !session.isLocked).length);
  readonly progressPercent = computed(() => {
    const totalSessions = this.totalSessions();
    return totalSessions > 0 ? Math.round((this.unlockedSessions() / totalSessions) * 100) : 0;
  });

  getSessions() {
    return this.sessions();
  }

  getSessionsByCategory() {
    const grouped: { [key: string]: SessionMetadata[] } = {};
    for (const session of this.sessions()) {
      if (!grouped[session.category]) {
        grouped[session.category] = [];
      }

      grouped[session.category].push(session);
    }

    return grouped;
  }

  getSessionById(id: number) {
    return this.sessions().find((session) => session.id === id);
  }

  // To unlock a session, just change its flag in the master list.
  unlockSession(id: number, url: string) {
    this.sessions.update((sessions) => sessions.map((session) => {
      if (session.id !== id) {
        return session;
      }

      return {
        ...session,
        isLocked: false,
        recordingUrl: url
      };
    }));
  }
}
