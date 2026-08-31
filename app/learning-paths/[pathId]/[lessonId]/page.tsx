import { LEARNING_PATHS } from '@/lib/learning-paths/data'
import LessonDetailClient from './LessonDetailClient'

export function generateStaticParams() {
  return LEARNING_PATHS.flatMap((path) =>
    path.lessons.map((lesson) => ({ pathId: path.id, lessonId: lesson.id })),
  )
}

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ pathId: string; lessonId: string }>
}) {
  return <LessonDetailClient params={params} />
}
