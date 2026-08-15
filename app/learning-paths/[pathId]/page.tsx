import { LEARNING_PATHS } from '@/lib/learning-paths/data'
import PathDetailClient from '@/components/learning-paths/PathDetailClient'

export async function generateStaticParams() {
  return LEARNING_PATHS.map((path) => ({
    pathId: path.id,
  }))
}

export default async function PathDetailPage({
  params,
}: {
  params: Promise<{ pathId: string }>
}) {
  const { pathId } = await params
  return <PathDetailClient pathId={pathId} />
}
