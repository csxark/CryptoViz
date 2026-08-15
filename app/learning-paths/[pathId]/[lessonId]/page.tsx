import { LEARNING_PATHS } from '@/lib/learning-paths/data'
import LessonDetailClient from '@/components/learning-paths/LessonDetailClient'

export async function generateStaticParams() {
  return LEARNING_PATHS.flatMap((path) =>
    path.lessons.map((lesson) => ({
      pathId: path.id,
      lessonId: lesson.id,
    }))
  )
}

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ pathId: string; lessonId: string }>
}) {
  const { pathId, lessonId } = await params
  return <LessonDetailClient pathId={pathId} lessonId={lessonId} />
}
