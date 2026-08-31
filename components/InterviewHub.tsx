"use client";

import { useMemo, useState } from "react";
import { interviewQuestions } from "@/lib/interviewQuestions";

export default function InterviewHub() {
  const [type, setType] = useState<"mcq" | "flashcard" | "scenario">("mcq");
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const questions = useMemo(
    () => interviewQuestions.filter((q) => q.type === type),
    [type]
  );

  const current = questions[index];

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      setShowAnswer(false);
    }
  };

  const previous = () => {
    if (index > 0) {
      setIndex(index - 1);
      setShowAnswer(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Tabs */}

      <div className="flex gap-3 flex-wrap">

        {(["mcq", "flashcard", "scenario"] as const).map((tab) => (

          <button
            key={tab}
            onClick={() => {
              setType(tab);
              setIndex(0);
              setShowAnswer(false);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              type === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-zinc-800"
            }`}
          >
            {tab.toUpperCase()}
          </button>

        ))}

      </div>

      {/* Progress */}

      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>
            Question {index + 1} / {questions.length}
          </span>
        </div>

        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">

          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${((index + 1) / questions.length) * 100}%`,
            }}
          />

        </div>
      </div>

      {/* Question */}

      <div className="border rounded-xl p-6 shadow-sm bg-white dark:bg-zinc-900">

        <h2 className="text-2xl font-bold mb-5">
          {current.question}
        </h2>

        {current.options && (

          <div className="space-y-3 mb-5">

            {current.options.map((option) => (

              <div
                key={option}
                className="border rounded-lg p-3"
              >
                {option}
              </div>

            ))}

          </div>

        )}

        {!showAnswer ? (

          <button
            onClick={() => setShowAnswer(true)}
            className="bg-green-600 text-white px-5 py-2 rounded-lg"
          >
            Reveal Answer
          </button>

        ) : (

          <div className="mt-6 space-y-5">

            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950">

              <h3 className="font-bold mb-2">
                ✅ Answer
              </h3>

              <p>{current.answer}</p>

            </div>

            <div className="border rounded-lg p-4">

              <h3 className="font-bold mb-2">
                📖 Explanation
              </h3>

              <p>{current.explanation}</p>

            </div>

            <div className="inline-block bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded-lg">

              Reference: {current.reference}

            </div>

          </div>

        )}

      </div>

      {/* Controls */}

      <div className="flex justify-between">

        <button
          onClick={previous}
          disabled={index === 0}
          className="px-5 py-2 rounded-lg bg-gray-300 dark:bg-zinc-700 disabled:opacity-50"
        >
          ← Previous
        </button>

        <button
          onClick={next}
          disabled={index === questions.length - 1}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
        >
          Next →
        </button>

      </div>

    </div>
  );
}