import axios from 'axios';

// PNG, JPEG, GIF, WEBP magic bytes
const IMAGE_MAGIC_BYTES: { [key: string]: number[] } = {
    'image/png': [0x89, 0x50, 0x4E, 0x47], // \x89PNG
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/gif': [0x47, 0x49, 0x46],        // GIF
    'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF (WebP starts with RIFF)
};

function isValidImage(buffer: Buffer, expectedMimetype?: string): boolean {
    if (buffer.length < 8) return false;

    // Check if it starts with HTML (error page)
    const startStr = buffer.slice(0, 100).toString('utf8').toLowerCase();
    if (startStr.includes('<!doctype') || startStr.includes('<html')) {
        return false;
    }

    // If we know the expected mimetype, check magic bytes
    if (expectedMimetype && IMAGE_MAGIC_BYTES[expectedMimetype]) {
        const magic = IMAGE_MAGIC_BYTES[expectedMimetype];
        for (let i = 0; i < magic.length; i++) {
            if (buffer[i] !== magic[i]) return false;
        }
        return true;
    }

    // Check against all known magic bytes
    for (const mimetype in IMAGE_MAGIC_BYTES) {
        const magic = IMAGE_MAGIC_BYTES[mimetype];
        let match = true;
        for (let i = 0; i < magic.length; i++) {
            if (buffer[i] !== magic[i]) {
                match = false;
                break;
            }
        }
        if (match) return true;
    }

    return false;
}

export async function downloadSlackFile(url: string, expectedMimetype?: string): Promise<Buffer> {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
        throw new Error("SLACK_BOT_TOKEN is not set");
    }

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            responseType: 'arraybuffer',
        });

        const buffer = Buffer.from(response.data);

        // Validate that the response is actually an image
        if (!isValidImage(buffer, expectedMimetype)) {
            const preview = buffer.slice(0, 200).toString('utf8');
            console.error(`[fileUtils] Downloaded content is not a valid image. First 200 bytes: ${preview}`);
            throw new Error("Downloaded content is not a valid image (possibly an HTML error page or authentication failure)");
        }

        return buffer;
    } catch (error) {
        console.error(`[fileUtils] Failed to download file from ${url}:`, error);
        throw error;
    }
}
