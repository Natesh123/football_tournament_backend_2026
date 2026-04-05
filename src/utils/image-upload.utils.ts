import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const saveBase64Image = (base64String: string, folder: string): string => {
    // Return early if not a base64 string
    if (!base64String || !base64String.startsWith('data:image')) {
        return base64String;
    }

    const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 image data');
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    const fileName = `${uuidv4()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'uploads', folder);

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    return `uploads/${folder}/${fileName}`;
};
