import { describe, it, expect } from 'vitest';
import { generateDailyQuiz, calculateNewStreak, type DailyQuizState } from '../../../lib/challenge/daily';

describe('Daily Quiz Generator', () => {
  it('generates the exact same quiz for the same date string', () => {
    const q1 = generateDailyQuiz('2026-07-28');
    const q2 = generateDailyQuiz('2026-07-28');

    expect(q1.cipherId).toBe(q2.cipherId);
    expect(q1.plaintext).toBe(q2.plaintext);
    expect(q1.key).toBe(q2.key);
    expect(q1.options).toEqual(q2.options);
  });

  it('generates different quizzes for different dates', () => {
    const q1 = generateDailyQuiz('2026-07-28');
    const q2 = generateDailyQuiz('2026-07-29');

    // While theoretically possible to collide, our word pool and options make it extremely unlikely
    const isDifferent = 
      q1.cipherId !== q2.cipherId || 
      q1.plaintext !== q2.plaintext || 
      q1.key !== q2.key || 
      q1.options[0] !== q2.options[0];

    expect(isDifferent).toBe(true);
  });

  it('includes the correct plaintext in the options', () => {
    const q = generateDailyQuiz('2026-07-28');
    expect(q.options).toContain(q.plaintext);
    expect(q.options.length).toBe(4);
    
    // Ensure all options are unique
    const uniqueOptions = new Set(q.options);
    expect(uniqueOptions.size).toBe(4);
  });
});

describe('Daily Quiz Streak Logic', () => {
  it('initializes streak to 1 on first play', () => {
    const state: DailyQuizState = { lastCompletedDate: '', currentStreak: 0, bestStreak: 0 };
    const newState = calculateNewStreak('2026-07-28', state);
    
    expect(newState.currentStreak).toBe(1);
    expect(newState.bestStreak).toBe(1);
    expect(newState.lastCompletedDate).toBe('2026-07-28');
  });

  it('increments streak on consecutive days', () => {
    const state: DailyQuizState = { lastCompletedDate: '2026-07-27', currentStreak: 1, bestStreak: 1 };
    const newState = calculateNewStreak('2026-07-28', state);
    
    expect(newState.currentStreak).toBe(2);
    expect(newState.bestStreak).toBe(2);
  });

  it('resets streak if a day is skipped', () => {
    const state: DailyQuizState = { lastCompletedDate: '2026-07-26', currentStreak: 5, bestStreak: 5 };
    const newState = calculateNewStreak('2026-07-28', state);
    
    expect(newState.currentStreak).toBe(1);
    expect(newState.bestStreak).toBe(5); // Best streak should remain 5
  });

  it('does not increment streak on same day replay', () => {
    const state: DailyQuizState = { lastCompletedDate: '2026-07-28', currentStreak: 2, bestStreak: 2 };
    const newState = calculateNewStreak('2026-07-28', state);
    
    expect(newState.currentStreak).toBe(2);
    expect(newState.bestStreak).toBe(2);
  });
});
