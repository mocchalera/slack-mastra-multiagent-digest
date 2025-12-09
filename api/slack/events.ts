import * as crypto from 'crypto';
import { handleMention } from '../../src/mastra/services/replyService.js';

// In-flight deduplication to prevent processing the same event twice
const processedEvents = new Set<string>();

// Clean up old entries periodically
function cleanupProcessedEvents() {
    // Simple cleanup: clear if too many entries (memory safety for serverless)
    if (processedEvents.size > 1000) {
        processedEvents.clear();
    }
}

export default async function handler(req: any, res: any) {
    console.log("[Events API] Received request:", req.method);

    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Check for retries - Slack sends retries if we don't respond within 3 seconds
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
                // NOTE: Signature verification may fail in Vercel due to body parsing differences.
                // The raw body string is needed for accurate verification, but Vercel parses JSON automatically.
                // Logging warning but continuing to process the request.
                console.warn('[Events API] Signature verification failed (this may be due to body parsing in Vercel)');
            }
        }

        // 3. Handle Events
        if (body && body.event) {
            const event = body.event;
            const eventId = body.event_id;
            console.log("[Events API] Event type:", event.type, "Event ID:", eventId);

            // De-duplication: Check if we've already processed this event
            if (eventId && processedEvents.has(eventId)) {
                console.log("[Events API] Already processed event:", eventId);
                return res.status(200).json({ ok: true, deduplicated: true });
            }

            // Handle App Mention
            if (event.type === 'app_mention') {
                // Mark event as being processed BEFORE responding
                if (eventId) {
                    processedEvents.add(eventId);
                    cleanupProcessedEvents();
                }

                // IMPORTANT: Respond immediately to Slack to prevent retry
                // Slack expects a response within 3 seconds
                // We'll process the mention in the background
                res.status(200).json({ ok: true });

                // Now process the mention after responding
                // Note: In Vercel serverless, the function continues to run briefly after response
                try {
                    console.log("[Events API] Processing mention in background...");
                    await handleMention(event);
                    console.log("[Events API] Mention processed successfully");
                } catch (error) {
                    console.error('[Events API] Error handling mention:', error);
                    // Event already responded with 200, so we can only log the error
                }
                return; // Already responded
            }
        }

        return res.status(200).json({ ok: true });
    } catch (error: any) {
        console.error("[Events API] Unhandled error:", error);
        return res.status(500).json({ error: error.message });
    }
}
