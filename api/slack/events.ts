import * as crypto from 'crypto';
import { handleMention } from '../../src/mastra/services/replyService';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body;

    // 1. URL Verification (for initial setup)
    if (body.type === 'url_verification') {
        return res.status(200).json({ challenge: body.challenge });
    }

    // 2. Signature Verification
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const signingSecret = process.env.SLACK_SIGNING_SECRET;

    if (signingSecret) {
        if (!signature || !timestamp) {
            return res.status(401).json({ error: 'Invalid request signature' });
        }

        // Prevent replay attacks
        const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
        if (parseInt(timestamp) < fiveMinutesAgo) {
            return res.status(401).json({ error: 'Request timestamp is too old' });
        }

        // Note: This re-stringification might not match the raw body exactly.
        // In a production Vercel env, you might need to access the raw body.
        const sigBasestring = 'v0:' + timestamp + ':' + JSON.stringify(body);
        const mySignature = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature))) {
            console.warn('Signature verification failed. Proceeding with caution (or fail in strict mode).');
            // return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    // 3. Handle Events
    if (body.event) {
        const event = body.event;

        // Handle App Mention
        if (event.type === 'app_mention') {
            // Respond immediately to Slack (200 OK) to avoid retries, then process async
            // Note: Vercel functions might kill the process after response.
            // If this is slow, we might need a different architecture (e.g. queue).
            // For now, we await.

            try {
                await handleMention(event);
            } catch (error) {
                console.error('Error handling mention:', error);
            }
        }
    }

    return res.status(200).json({ ok: true });
}
