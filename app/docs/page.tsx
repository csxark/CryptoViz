import { serialize } from 'next-mdx-remote/serialize'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { readFileSync } from 'fs'

import Navbar from '../../components/layout/Navbar'
import DocsShell from '../../components/docs/DocsShell'
import { DOC_METAS } from '../../content/docs'

export default async function DocsPage() {
  const docs = await Promise.all(
    DOC_METAS.map(async (meta) => {
      const source = readFileSync(meta.filePath, 'utf-8')
      const serialized = await serialize(source, {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
      })
      return { ...meta, serialized }
    })
  )

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors duration-300">
      <Navbar />
      <DocsShell docs={docs} />
    </div>
  )
}
