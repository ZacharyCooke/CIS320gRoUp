import path from "node:path";
import fs from "node:fs/promises";
import multer from "multer";
import { env } from "../config/env.js";

// Uploaded files land in memory (multer.memoryStorage below) and are written
// out here, rather than using multer's diskStorage directly, since the
// destination subfolder ("pets" vs "found-reports") isn't known until the
// route handler runs, not at multer-config time.
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png"]);

export const petPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_SIZE_BYTES,
    files: 1
  },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("photo must be a JPEG or PNG"));
      return;
    }

    callback(null, true);
  }
});

export interface StoredPhoto {
  photo_url: string;
}

async function persistPhoto(folder: string, file: Express.Multer.File): Promise<StoredPhoto> {
  const extension = file.mimetype === "image/png" ? ".png" : ".jpg";
  const safeBaseName = path
    .basename(file.originalname, path.extname(file.originalname))
    .replace(/[^a-z0-9_-]/gi, "-")
    .toLowerCase();
  const filename = `${Date.now()}-${safeBaseName}${extension}`;

  const dir = path.join(UPLOADS_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), file.buffer);

  // Must be an absolute URL, not a root-relative path: the frontend (Vite,
  // port 5173) and backend (port 3000) are different origins, so a bare
  // "/uploads/..." path would resolve against the frontend's own origin
  // in an <img src> and 404 there instead of hitting this server.
  return { photo_url: `${env.PUBLIC_API_URL.replace(/\/$/, "")}/uploads/${folder}/${filename}` };
}

export async function storePetPhoto(file: Express.Multer.File): Promise<StoredPhoto> {
  return persistPhoto("pets", file);
}

export const foundReportPhotoUpload = petPhotoUpload;

export async function storeFoundReportPhoto(file: Express.Multer.File): Promise<StoredPhoto> {
  return persistPhoto("found-reports", file);
}
