// Upload course documents (drag & drop in the markdown editor). The file is sent
// as the raw request body; the server stores it under Kurse/<courseId>/ and returns
// a stable proxy URL to embed in markdown.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface UploadedDocument {
  url: string
  key: string
  contentType: string
  isImage: boolean
  filename: string
}

export async function uploadCourseDocument(courseId: string, file: File): Promise<UploadedDocument> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/admin/courses/${encodeURIComponent(courseId)}/documents`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name),
    },
    body: file,
  })
  if (!res.ok) {
    let msg = `Upload fehlgeschlagen (${res.status})`
    try {
      const b = await res.json()
      msg = b.error || msg
    } catch {
      /* no JSON body */
    }
    throw new Error(msg)
  }
  return (await res.json()) as UploadedDocument
}
