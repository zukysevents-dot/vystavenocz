import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  del: vi.fn(),
  isApiMode: vi.fn(() => true),
}))

vi.mock('@/lib/http', () => ({
  http: { get: mocks.get, upload: mocks.upload, download: mocks.download, del: mocks.del },
  isApiMode: mocks.isApiMode,
}))

import { useDocuments } from '@/composables/useDocuments'

describe('useDocuments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mapuje list a endpointy zakázky', async () => {
    mocks.get.mockResolvedValue({
      items: [
        {
          id: 'f1',
          originalFileName: 'foto.webp',
          contentType: 'image/webp',
          sizeBytes: 123,
          createdAt: '2026-07-11T10:00:00Z',
          uploadedByName: 'Anna',
        },
      ],
    })
    mocks.download.mockResolvedValue({
      blob: new Blob(),
      fileName: 'foto.webp',
      contentType: 'image/webp',
    })

    const documents = useDocuments('job-1')
    await expect(documents.list()).resolves.toEqual([
      {
        id: 'f1',
        fileName: 'foto.webp',
        contentType: 'image/webp',
        size: 123,
        uploadedAt: '2026-07-11T10:00:00Z',
        uploadedByName: 'Anna',
      },
    ])
    await documents.download('f1')
    await documents.remove('f1')

    expect(mocks.get).toHaveBeenCalledWith('/jobs/job-1/files?pageSize=100')
    expect(mocks.download).toHaveBeenCalledWith('/jobs/job-1/files/f1/content')
    expect(mocks.del).toHaveBeenCalledWith('/jobs/job-1/files/f1')
  })

  it('posílá multipart pole file a předává progress callback', async () => {
    mocks.upload.mockResolvedValue({ id: 'f2', fileName: 'doklad.pdf', size: 4 })
    const file = new File(['test'], 'doklad.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    await useDocuments('job-1').upload(file, onProgress)

    const [path, body, options] = mocks.upload.mock.calls[0]
    expect(path).toBe('/jobs/job-1/files')
    expect(body.get('file')).toBe(file)
    expect(options.onProgress).toBe(onProgress)
  })

  it('v mock režimu nelistuje neexistující přílohy', async () => {
    mocks.isApiMode.mockReturnValueOnce(false)
    await expect(useDocuments('job-1').list()).resolves.toEqual([])
    expect(mocks.get).not.toHaveBeenCalled()
  })
})
