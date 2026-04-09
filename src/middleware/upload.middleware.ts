import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/** Ensure a directory exists */
function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/** Only accept image files */
const imageFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = /jpeg|jpg|png|gif|svg|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, svg, webp)'));
    }
};

/** Unique filename generator */
function uniqueFilename(file: Express.Multer.File) {
    const ts = Date.now();
    const rand = Math.round(Math.random() * 1e6);
    return `${ts}-${rand}${path.extname(file.originalname)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM LOGO  (single file, temp folder during creation → moved after save)
// ─────────────────────────────────────────────────────────────────────────────
const tempLogoDir = path.join(UPLOADS_ROOT, 'temp');
ensureDir(tempLogoDir);

const tempLogoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        ensureDir(tempLogoDir);
        cb(null, tempLogoDir);
    },
    filename: (_req, file, cb) => cb(null, uniqueFilename(file))
});

/** Upload logo to temp folder; controller moves it after team is saved */
export const uploadTempLogo = multer({
    storage: tempLogoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: imageFileFilter
}).single('logo');

/** Move logo from temp to uploads/teams/{teamId}/logo/ and return the relative URL */
export function moveLogoToTeamFolder(tempFilePath: string, teamId: string): string {
    const targetDir = path.join(UPLOADS_ROOT, 'teams', teamId, 'logo');
    ensureDir(targetDir);
    const filename = path.basename(tempFilePath);
    const targetPath = path.join(targetDir, filename);
    fs.renameSync(tempFilePath, targetPath);
    return `/uploads/teams/${teamId}/logo/${filename}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM GALLERY  (multiple files, straight to uploads/teams/{teamId}/gallery/)
// ─────────────────────────────────────────────────────────────────────────────
const galleryStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const teamId = req.params['teamId'] as string;
        const dir = path.join(UPLOADS_ROOT, 'teams', teamId, 'gallery');
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, uniqueFilename(file))
});

/** Upload up to 10 gallery photos for a team (field name: "photos") */
export const uploadGalleryPhotos = multer({
    storage: galleryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB each
    fileFilter: imageFileFilter
}).array('photos', 10);

// ─────────────────────────────────────────────────────────────────────────────
// MATCH PHOTOS  (future — uploads/matches/{matchId}/)
// ─────────────────────────────────────────────────────────────────────────────
const matchPhotoStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const matchId = req.params['matchId'] as string;
        const dir = path.join(UPLOADS_ROOT, 'matches', matchId);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, uniqueFilename(file))
});

/** Upload match photos (field name: "photos", max 20) */
export const uploadMatchPhotos = multer({
    storage: matchPhotoStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter
}).array('photos', 20);

// ─────────────────────────────────────────────────────────────────────────────
// SPONSOR LOGO
// ─────────────────────────────────────────────────────────────────────────────
const sponsorLogoDir = path.join(UPLOADS_ROOT, 'sponsors');
ensureDir(sponsorLogoDir);

const sponsorLogoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        ensureDir(sponsorLogoDir);
        cb(null, sponsorLogoDir);
    },
    filename: (_req, file, cb) => cb(null, uniqueFilename(file))
});

/** Upload sponsor logo */
export const uploadSponsorLogo = multer({
    storage: sponsorLogoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: imageFileFilter
}).single('logo');

/** Get all gallery image URLs for a team from disk */
export function getTeamGalleryUrls(teamId: string): string[] {
    const galleryDir = path.join(UPLOADS_ROOT, 'teams', teamId, 'gallery');
    if (!fs.existsSync(galleryDir)) return [];
    return fs
        .readdirSync(galleryDir)
        .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
        .map(f => `/uploads/teams/${teamId}/gallery/${f}`);
}
