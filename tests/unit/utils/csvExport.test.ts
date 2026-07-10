import { describe, it, expect, vi } from 'vitest' // or jest, check repo's test runner in package.json
import { exportToCSV } from '@/lib/utils/csvExport'

describe('csvExport', () => {
  it('revokes the object URL after download', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    // ... call exportToCSV with mock results, then:
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url')
  })
})