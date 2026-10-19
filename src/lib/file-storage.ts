// src/lib/file-storage.ts
// Private file storage — file disimpan DI LUAR public/
// Akses hanya melalui API route dengan otorisasi backend

import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.UPLOAD_DIR || path.join(process.cwd(), 'private-uploads')
)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export type StoredFile = {
  relativePath: string // Relatif terhadap UPLOAD_DIR, disimpan di database
  fileName: string
  mimeType: string
  sizeBytes: number
}

/**
 * Resolve path relatif ke absolut di dalam UPLOAD_DIR.
 * Menolak path yang keluar dari UPLOAD_DIR (path traversal).
 */
function resolveSafe(relativePath: string): string {
  const absolute = path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR, relativePath)
  if (absolute !== UPLOAD_DIR && !absolute.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error('Path tidak valid.')
  }
  return absolute
}

/**
 * Pastikan direktori tersedia
 */
export async function ensureUploadDir(subDir: string): Promise<string> {
  const dir = resolveSafe(subDir)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/**
 * Simpan file dari Buffer ke storage privat
 * Returns path relatif untuk disimpan di database
 */
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  subDir: string
): Promise<StoredFile> {
  // Validasi MIME type (bukan hanya ekstensi)
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Tipe file tidak diizinkan: ${mimeType}. Gunakan JPG, PNG, atau WebP.`)
  }

  // Validasi ukuran
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Ukuran file melebihi batas ${process.env.MAX_FILE_SIZE_MB || 10} MB.`)
  }

  // Validasi magic bytes (signature file)
  await validateFileMagicBytes(buffer, mimeType)

  // Tentukan ekstensi berdasarkan MIME (bukan ekstensi dari nama file asli)
  const ext = mimeTypeToExtension(mimeType)
  const fileName = `${randomUUID()}${ext}`
  const targetDir = await ensureUploadDir(subDir)
  const absolutePath = path.join(/*turbopackIgnore: true*/ targetDir, fileName)
  const relativePath = path.posix.join(subDir.replace(/\\/g, '/'), fileName)

  await fs.writeFile(absolutePath, buffer)

  return {
    relativePath: relativePath.replace(/\\/g, '/'),
    fileName,
    mimeType,
    sizeBytes: buffer.length,
  }
}

/**
 * Baca file dari storage, kembalikan Buffer
 * Gunakan hanya setelah otorisasi diverifikasi di API route
 */
export async function readFile(relativePath: string): Promise<Buffer> {
  return fs.readFile(resolveSafe(relativePath))
}

/**
 * Hapus file (soft delete: rename ke .deleted)
 * Tidak menghapus permanen untuk audit
 */
export async function softDeleteFile(relativePath: string): Promise<void> {
  const absolutePath = resolveSafe(relativePath)
  await fs.rename(absolutePath, absolutePath + '.deleted')
}

/**
 * Validasi magic bytes file
 */
async function validateFileMagicBytes(buffer: Buffer, mimeType: string): Promise<void> {
  if (buffer.length < 4) throw new Error('File terlalu kecil atau rusak.')

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46

  if (mimeType === 'image/jpeg' && !isJpeg) {
    throw new Error('File bukan gambar JPEG yang valid.')
  }
  if (mimeType === 'image/png' && !isPng) {
    throw new Error('File bukan gambar PNG yang valid.')
  }
  if (mimeType === 'image/webp' && !isWebp) {
    throw new Error('File bukan gambar WebP yang valid.')
  }
}

function mimeTypeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  }
  return map[mimeType] || '.bin'
}

export { UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIME_TYPES }
