import { http, isApiMode } from '@/lib/http'

export interface EntityDocument {
  id: string
  fileName: string
  contentType: string
  size: number
  uploadedAt: string
  uploadedByName: string | null
}

type DocumentDto = Partial<EntityDocument> & {
  name?: string
  originalFileName?: string
  sizeBytes?: number
  createdAt?: string
  authorName?: string
  uploadedBy?: string
}

function normalizeDocument(dto: DocumentDto): EntityDocument {
  return {
    id: dto.id ?? '',
    fileName: dto.fileName ?? dto.originalFileName ?? dto.name ?? 'Soubor',
    contentType: dto.contentType ?? 'application/octet-stream',
    size: dto.size ?? dto.sizeBytes ?? 0,
    uploadedAt: dto.uploadedAt ?? dto.createdAt ?? '',
    uploadedByName: dto.uploadedByName ?? dto.authorName ?? dto.uploadedBy ?? null,
  }
}

// Sdílený souborový panel. Backendové endpointy mají stejný kontrakt pro zakázky i skladové doklady;
// `entitySegment` je vždy interně daný volajícím, nikdy nevychází z uživatelského vstupu.
export function useDocuments(entityId: string, entitySegment: 'jobs' | 'stock-documents' = 'jobs') {
  async function list(): Promise<EntityDocument[]> {
    if (!isApiMode()) return []
    const response = await http.get<DocumentDto[] | { items: DocumentDto[] }>(
      `/${entitySegment}/${entityId}/files?pageSize=100`,
    )
    const items = Array.isArray(response) ? response : response.items
    return items.map(normalizeDocument)
  }

  async function upload(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<EntityDocument> {
    const formData = new FormData()
    formData.append('file', file)
    const document = await http.upload<DocumentDto>(`/${entitySegment}/${entityId}/files`, formData, {
      onProgress,
    })
    return normalizeDocument(document)
  }

  async function download(fileId: string) {
    return http.download(`/${entitySegment}/${entityId}/files/${fileId}/content`)
  }

  async function remove(fileId: string): Promise<void> {
    await http.del(`/${entitySegment}/${entityId}/files/${fileId}`)
  }

  return { list, upload, download, remove }
}
