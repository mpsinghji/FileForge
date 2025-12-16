
import fs from 'fs';
import path from 'path';

export function getUniqueFilename(directory, filename) {
    // If the file doesn't exist, return the filename as is
    if (!fs.existsSync(path.join(directory, filename))) {
        return filename;
    }

    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    let counter = 1;

    while (true) {
        const newFilename = `${name} (${counter})${ext}`;
        if (!fs.existsSync(path.join(directory, newFilename))) {
            return newFilename;
        }
        counter++;
    }
}
