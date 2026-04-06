import { describe, expect, it } from 'vitest';
import { SyllabusService } from './syllabus.service';

describe('SyllabusService', () => {
  it('derives grouped sessions and progress from the master list', () => {
    const service = new SyllabusService();

    expect(service.totalSessions()).toBe(19);
    expect(service.unlockedSessions()).toBe(1);
    expect(service.progressPercent()).toBe(5);
    expect(service.sessionGroups().map((group) => group.phase)).toEqual([
      'PHASE 1: FOUNDATIONS',
      'PHASE 2: CORE ARCHITECTURE',
      'PHASE 3: SPECIALIZED AGENTS',
      'PHASE 4: DEPLOYMENT'
    ]);
  });

  it('updates a locked session immutably when unlocked', () => {
    const service = new SyllabusService();

    service.unlockSession(2, 'https://youtu.be/example12345');

    expect(service.getSessionById(2)).toMatchObject({
      id: 2,
      isLocked: false,
      recordingUrl: 'https://youtu.be/example12345'
    });
    expect(service.unlockedSessions()).toBe(2);
    expect(service.progressPercent()).toBe(11);
  });
});