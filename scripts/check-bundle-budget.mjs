#!/usr/bin/env node

import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'

const chunksDir = path.resolve('.next/static/chunks')
const budgetBytes = Number(process.env.BUNDLE_BUDGET_BYTES ?? 800 * 1024)
const failBytes = Number(process.env.BUNDLE_FAIL_BYTES ?? 1024 * 1024)

async function collectJavaScriptFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

async function gzipSize(file) {
  let bytes = 0
  const gzip = createGzip({ level: 9 })
  gzip.on('data', (chunk) => { bytes += chunk.length })
  await pipeline(createReadStream(file), gzip)
  return bytes
}

try {
  const files = await collectJavaScriptFiles(chunksDir)
  if (files.length === 0) {
    throw new Error(`No JavaScript chunks found under ${path.relative(process.cwd(), chunksDir)}.`)
  }

  const sizes = await Promise.all(files.map(async (file) => ({
    file,
    raw: (await stat(file)).size,
    gzip: await gzipSize(file),
  })))

  const totalGzip = sizes.reduce((sum, item) => sum + item.gzip, 0)
  const largest = [...sizes].sort((a, b) => b.gzip - a.gzip).slice(0, 5)

  console.log(`Bundle budget: ${totalGzip} bytes gzipped across ${files.length} JavaScript chunks.`)
  console.log(`Target budget: ${budgetBytes} bytes gzipped; hard-fail threshold: ${failBytes} bytes.`)
  console.log('Largest chunks:')
  for (const item of largest) {
    console.log(`  ${path.relative(process.cwd(), item.file)}: ${item.gzip} bytes gzipped (${item.raw} bytes raw)`)
  }

  if (totalGzip > failBytes) {
    console.error(`Bundle budget exceeded: ${totalGzip} > ${failBytes} bytes gzipped.`)
    process.exit(1)
  }

  if (totalGzip > budgetBytes) {
    console.warn(`Bundle is above the target budget but below the hard-fail threshold: ${totalGzip} > ${budgetBytes} bytes gzipped.`)
  } else {
    console.log('Bundle budget check passed.')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
