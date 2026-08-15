import { LEARNING_PATHS } from '@/lib/learning-paths/data'
import CertificateClient from '@/components/learning-paths/CertificateClient'

export async function generateStaticParams() {
  return LEARNING_PATHS.map((path) => ({
    pathId: path.id,
  }))
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ pathId: string }>
}) {
  const { pathId } = await params
  return <CertificateClient pathId={pathId} />
}
