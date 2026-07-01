import path from "node:path";
import multer from "multer";

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

export async function storePetPhoto(file: Express.Multer.File): Promise<StoredPhoto> {
  const extension = file.mimetype === "image/png" ? ".png" : ".jpg";
  const safeBaseName = path
    .basename(file.originalname, path.extname(file.originalname))
    .replace(/[^a-z0-9_-]/gi, "-")
    .toLowerCase();

  // Placeholder local URL until object storage is introduced.
  return {
    photo_url: `/uploads/pets/${Date.now()}-${safeBaseName}${extension}`
  };
}
