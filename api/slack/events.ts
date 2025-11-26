import * as crypto from 'crypto';
import { handleMention } from '../../src/mastra/services/replyService.js';

export default async function handler(req: any, res: any) {
    console.log("[Events API] Received request:", req.method);

    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Check for retries
        if (req.headers['x-slack-retry-num']) {
            console.log("[Events API] Ignoring retry:", req.headers['x-slack-retry-num']);
            return res.status(200).json({ ok: true });
        }

        const body = req.body;
        console.log("[Events API] Body:", JSON.stringify(body));

        // 1. URL Verification (for initial setup)
        // This must be first and fail-safe.
        if (body && body.type === 'url_verification') {
            console.log("[Events API] Handling url_verification");
            return res.status(200).json({ challenge: body.challenge });
        }

        // 2. Signature Verification
        const signature = req.headers['x-slack-signature'] as string;
        const timestamp = req.headers['x-slack-request-timestamp'] as string;
        const signingSecret = process.env.SLACK_SIGNING_SECRET;

        if (signingSecret) {
            if (!signature || !timestamp) {
                console.warn("[Events API] Missing signature headers");
                return res.status(401).json({ error: 'Invalid request signature' });
            }

            // Prevent replay attacks
            const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
            if (parseInt(timestamp) < fiveMinutesAgo) {
                console.warn("[Events API] Timestamp too old");
                return res.status(401).json({ error: 'Request timestamp is too old' });
            }

            const sigBasestring = 'v0:' + timestamp + ':' + JSON.stringify(body);
            const mySignature = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

            if (!crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature))) {
                console.warn('[Events API] Signature verification failed');
                // return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        // 3. Handle Events
        if (body && body.event) {
            const event = body.event;
            console.log("[Events API] Event type:", event.type);

            // Handle App Mention
            if (event.type === 'app_mention') {
                try {
                    await handleMention(event);
                } catch (error) {
                    console.error('[Events API] Error handling mention:', error);
                }
            }
        }

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error("[Events API] Unhandled error:", error);
        return res.status(500).json({ error: error.message });
    }
}
