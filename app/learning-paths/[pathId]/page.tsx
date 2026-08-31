import { LEARNING_PATHS } from '@/lib/learning-paths/data'
import PathDetailClient from './PathDetailClient'

export function generateStaticParams() {
  return LEARNING_PATHS.map((path) => ({ pathId: path.id }))
}

export default function PathDetailPage({ params }: { params: Promise<{ pathId: string }> }) {
  return <PathDetailClient params={params} />
}
