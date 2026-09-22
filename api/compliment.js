import crypto from "node:crypto";

const COMPLIMENTS = [
  "You're the person people actually want on their team.",
  "That thing you shipped last week? Still impressive.",
  "Your code reviews make everyone around you better.",
  "You explain hard things so they feel easy.",
  "Meetings are better when you're in them. Seriously.",
  "You turn vague ideas into real plans.",
  "Your attention to detail saves us every single week.",
  "You make asking questions feel safe.",
  "You stay calm when things get messy, and it rubs off on everyone.",
  "Your docs are the ones people actually read.",
  "You always leave things better than you found them.",
  "You have great instincts for what matters most.",
];

// Slack signs every request; reject anything older than 5 minutes (replay protection).
const MAX_AGE_SECONDS = 60 * 5;

function isValidSlackRequest(rawBody, timestamp, signature, secret) {
  if (!timestamp || !signature || !secret) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;

  const expected =
    "v0=" +
    crypto
      .createHmac("sha256", secret)
      .update(`v0:${timestamp}:${rawBody}`)
      .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// With "Escape channels, users, and links" enabled, a mention arrives as <@U123> or <@U123|name>.
function findMentionedUser(text) {
  const match = /<@([A-Z0-9]+)(?:\|[^>]*)?>/.exec(text || "");
  return match ? match[1] : null;
}

export function buildReply(text, senderId) {
  const compliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
  const target = findMentionedUser(text);
  const message = target
    ? `:sparkles: <@${target}>, ${compliment}\n_— sent by <@${senderId}>_`
    : `:sparkles: ${compliment}`;
  return { response_type: "in_channel", text: message };
}

export async function POST(request) {
  const rawBody = await request.text();
  const valid = isValidSlackRequest(
    rawBody,
    request.headers.get("x-slack-request-timestamp"),
    request.headers.get("x-slack-signature"),
    process.env.SLACK_SIGNING_SECRET
  );
  if (!valid) return new Response("Invalid signature", { status: 401 });

  const params = new URLSearchParams(rawBody);

  // Slack occasionally sends an SSL check to the Request URL; it only needs a 200.
  if (params.get("ssl_check") === "1") return new Response("", { status: 200 });

  return Response.json(buildReply(params.get("text"), params.get("user_id")));
}

export function GET() {
  return new Response("Compliment app is running. Slack sends POST requests here.");
}
