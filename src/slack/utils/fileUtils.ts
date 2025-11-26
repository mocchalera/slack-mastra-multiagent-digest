import axios from 'axios';

export async function downloadSlackFile(url: string): Promise<Buffer> {
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

        return Buffer.from(response.data);
    } catch (error) {
        console.error(`[fileUtils] Failed to download file from ${url}:`, error);
        throw error;
    }
}
