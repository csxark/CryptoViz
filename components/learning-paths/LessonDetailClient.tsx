'use client'

import { useEffect } from 'react'
import { notFound } from 'next/navigation'
import { getLessonById } from '@/lib/learning-paths/data'
import { useLearningPath } from '@/lib/hooks/useLearningPath'
import LessonViewer from '@/components/learning-paths/LessonViewer'

export default function LessonDetailClient({
  pathId,
  lessonId,
}: {
  pathId: string
  lessonId: string
}) {
  const result = getLessonById(pathId, lessonId)
  const { progress, markLessonComplete, recordQuizScore, setLastActiveLesson } = useLearningPath()

  useEffect(() => {
    if (result) {
      setLastActiveLesson(result.path.id, result.lesson.id)
    }
  }, [result, setLastActiveLesson])

  if (!result) {
    notFound()
  }

  const { path, lesson, lessonIndex } = result
  const lessonKey = `${path.id}:${lesson.id}`
  const isCompleted = !!progress.completedLessons[lessonKey]

  const prevLesson = lessonIndex > 0 ? path.lessons[lessonIndex - 1] : undefined
  const nextLesson = lessonIndex < path.lessons.length - 1 ? path.lessons[lessonIndex + 1] : undefined

  const handleToggleComplete = () => {
    markLessonComplete(path.id, lesson.id)
  }

  const handleQuizScore = (score: number) => {
    recordQuizScore(lesson.id, score)
    if (score >= 70) {
      markLessonComplete(path.id, lesson.id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <LessonViewer
        path={path}
        lesson={lesson}
        lessonIndex={lessonIndex}
        isCompleted={isCompleted}
        onToggleComplete={handleToggleComplete}
        onQuizScore={handleQuizScore}
        prevLessonId={prevLesson?.id}
        nextLessonId={nextLesson?.id}
      />
    </div>
  )
}
