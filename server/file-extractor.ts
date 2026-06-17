export interface FileExtractResult {
  success: boolean;
  textContent?: string;
  base64Content?: string;
  mimeType: string;
  fileName?: string;
  fileSize: number;
  mediaUrl?: string;
  error?: string;
}

const TEXT_MIMES = new Set([
  'text/plain', 'text/html', 'text/csv', 'text/markdown', 'text/xml',
  'application/json', 'application/xml', 'application/javascript',
  'application/typescript', 'application/yaml',
]);

const TEXT_EXTENSIONS = new Set([
  'txt', 'csv', 'json', 'md', 'html', 'htm', 'xml', 'yaml', 'yml',
  'log', 'env', 'cfg', 'ini', 'toml', 'css', 'js', 'ts', 'py', 'sh',
  'bat', 'ps1', 'sql', 'r', 'lua', 'pl', 'rb', 'php', 'java', 'c',
  'cpp', 'h', 'hpp', 'go', 'rs', 'swift', 'kt', 'gradle', 'properties',
]);

export function extractFileContent(buffer: Buffer, mimeType: string, fileName?: string, mediaUrl?: string): FileExtractResult {
  const mime = mimeType || 'application/octet-stream';
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const base: Pick<FileExtractResult, 'mimeType' | 'fileName' | 'fileSize' | 'mediaUrl'> = { mimeType: mime, fileName, fileSize: buffer.length, mediaUrl };

  if (TEXT_MIMES.has(mime) || (ext && TEXT_EXTENSIONS.has(ext))) {
    const text = buffer.toString('utf-8');
    return { ...base, success: true, textContent: text };
  }

  if (mime.startsWith('image/')) {
    const b64 = buffer.toString('base64');
    return { ...base, success: true, base64Content: `data:${mime};base64,${b64}` };
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    const raw = buffer.toString('utf-8');
    const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length > 50) {
      return { ...base, success: true, textContent: cleaned.substring(0, 100000) };
    }
    return {
      ...base, success: true,
      textContent: `[PDF document: ${fileName || 'unnamed'}, ${(buffer.length / 1024).toFixed(1)} KB — plain text extraction unavailable. You can view it at ${mediaUrl || 'the media link'} or ask the user to open it in WhatsApp.]`,
    };
  }

  if (mime.startsWith('audio/')) {
    const b64 = buffer.toString('base64');
    return {
      ...base, success: true, base64Content: `data:${mime};base64,${b64}`,
      textContent: `[Audio file: ${fileName || 'unnamed'}, ${(buffer.length / 1024).toFixed(1)} KB — available for transcription. Use the transcribe_whatsapp_audio tool with this messageId to get a text transcript.]`,
    };
  }

  if (mime.startsWith('video/')) {
    return {
      ...base, success: true,
      textContent: `[Video file: ${fileName || 'unnamed'}, ${(buffer.length / 1024).toFixed(1)} KB — video content extraction not available. View at ${mediaUrl || 'the media link'} if needed.]`,
    };
  }

  return {
    ...base, success: true,
    textContent: `[File: ${fileName || 'unnamed'}, type: ${mime}, size: ${(buffer.length / 1024).toFixed(1)} KB — available at ${mediaUrl || 'the media link'}.]`,
  };
}
