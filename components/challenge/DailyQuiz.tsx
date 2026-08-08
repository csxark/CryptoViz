'use client'

import { useState, useEffect, useRef } from 'react';
import { useCipherWorker } from '../../lib/hooks/useCipherWorker';
import { generateDailyQuiz, getDailyQuizState, saveDailyQuizState, calculateNewStreak, type DailyQuizData, type DailyQuizState } from '../../lib/challenge/daily';
import { getWrongAnswerExplanation } from '../../lib/challenge/explain';
import { CIPHER_REGISTRY } from '../../lib/cipher/registry';
import SkeletonCard from '../ui/SkeletonCard';

function getLocalDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function DailyQuiz() {
  const { runCipher, loading } = useCipherWorker();
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [dailyData, setDailyData] = useState<DailyQuizData | null>(null);
  const [quizState, setQuizState] = useState<DailyQuizState | null>(null);
  const [expectedCiphertext, setExpectedCiphertext] = useState('');
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [explanation, setExplanation] = useState<{ title: string; details: string[] } | null>(null);

  const feedbackRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const today = getLocalDateString();
    const data = generateDailyQuiz(today);
    const state = getDailyQuizState();
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDailyData(data);
    setQuizState(state);
    setIsHydrated(true);
  }, []);

  // Fetch ciphertext
  useEffect(() => {
    if (!dailyData) return;
    
    runCipher('encrypt', dailyData.cipherId, dailyData.plaintext, dailyData.key)
      .then(res => setExpectedCiphertext(res.output))
      .catch(e => console.error('Failed to encrypt daily quiz', e));
  }, [dailyData, runCipher]);

  // Focus feedback when state changes
  useEffect(() => {
    if (feedback !== 'idle' && feedbackRef.current) {
      feedbackRef.current.focus();
    }
  }, [feedback]);

  if (!isHydrated || !dailyData || !quizState) {
    return (
      <div className="w-full animate-pulse border border-zinc-200 dark:border-zinc-800 rounded-xl h-64 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading Daily Quiz...</span>
      </div>
    );
  }

  const todayStr = getLocalDateString();
  const isAlreadyCompleted = quizState.lastCompletedDate === todayStr;
  const cipherMeta = CIPHER_REGISTRY.find(c => c.id === dailyData.cipherId);

  const handleSelect = (answer: string) => {
    if (selectedAnswer) return; // Prevent multiple selections
    setSelectedAnswer(answer);

    const isCorrect = answer === dailyData.plaintext;
    
    if (isCorrect) {
      setFeedback('correct');
      const newState = calculateNewStreak(todayStr, quizState);
      setQuizState(newState);
      saveDailyQuizState(newState);
    } else {
      setFeedback('incorrect');
      setExplanation(getWrongAnswerExplanation({ cipherId: dailyData.cipherId, difficulty: dailyData.difficulty }));
    }
  };

  // Completion UI for already completed
  if (isAlreadyCompleted) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-8 text-center dark:border-teal-900/30 dark:bg-teal-950/20 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
          <svg className="h-7 w-7 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-teal-900 dark:text-teal-100">Daily Quiz Completed</h2>
        <p className="mt-2 text-sm text-teal-700 dark:text-teal-300">Great job! Come back tomorrow for a new cryptography challenge.</p>
        
        <div className="mt-6 flex justify-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600/70 dark:text-teal-400/70">Current Streak</span>
            <span className="mt-1 text-3xl font-black text-teal-700 dark:text-teal-400">{quizState.currentStreak}</span>
          </div>
          <div className="w-px bg-teal-200 dark:bg-teal-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600/70 dark:text-teal-400/70">Best Streak</span>
            <span className="mt-1 text-3xl font-black text-teal-700 dark:text-teal-400">{quizState.bestStreak}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Daily Challenge
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Decrypt the following text encrypted with {cipherMeta?.name || 'Cipher'}.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <span className="text-orange-500">🔥</span> Streak: {quizState.currentStreak}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50 mb-8">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Ciphertext</div>
        {loading || !expectedCiphertext ? (
          <SkeletonCard />
        ) : (
          <div className="break-all font-mono text-lg font-bold text-zinc-900 dark:text-white">
            {expectedCiphertext}
          </div>
        )}
      </div>

      <fieldset>
        <legend className="sr-only">Choose the correct plaintext</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Multiple choice options">
          {dailyData.options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = isSelected && feedback === 'correct';
            const isWrong = isSelected && feedback === 'incorrect';
            
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={selectedAnswer !== null}
                onClick={() => handleSelect(option)}
                className={`
                  relative flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all
                  ${selectedAnswer === null 
                    ? 'border-zinc-200 bg-white hover:border-teal-500 hover:bg-teal-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-teal-500 dark:hover:bg-teal-900/20' 
                    : isCorrect 
                      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-900/20'
                      : isWrong
                        ? 'border-red-500 bg-red-50 dark:border-red-500/50 dark:bg-red-900/20'
                        : 'border-zinc-200 bg-zinc-50 opacity-50 dark:border-zinc-800 dark:bg-zinc-900/30'
                  }
                `}
              >
                <span className={`font-mono text-sm font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : isWrong ? 'text-red-700 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
                  {option}
                </span>
                
                {isCorrect && (
                  <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isWrong && (
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Feedback area */}
      <div 
        ref={feedbackRef} 
        tabIndex={-1} 
        aria-live="polite" 
        className="mt-6 outline-none"
      >
        {feedback === 'incorrect' && explanation && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2">{explanation.title}</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
              {explanation.details.map((detail, i) => (
                <li key={`${i}-${detail.slice(0, 20)}`}>{detail}</li>
              ))}
            </ul>
            <div className="mt-4 text-center">
              <button 
                onClick={() => {
                  setSelectedAnswer(null);
                  setFeedback('idle');
                  setExplanation(null);
                }}
                className="text-xs font-bold bg-white text-red-700 border border-red-200 hover:bg-red-100 rounded px-3 py-1.5 dark:bg-zinc-900 dark:text-red-400 dark:border-red-900"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {feedback === 'correct' && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/30 dark:bg-teal-950/20 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
              <svg className="h-5 w-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-teal-800 dark:text-teal-400 mb-1">Correct!</h4>
            <p className="text-sm text-teal-700 dark:text-teal-300">Great job! Come back tomorrow for a new challenge.</p>
          </div>
        )}
      </div>

    </div>
  );
}
