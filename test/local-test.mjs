// Simulates Slack calling the endpoint: signs a fake /compliment request and checks the reply.
import crypto from "node:crypto";
import assert from "node:assert/strict";

const SECRET = "test-signing-secret";
process.env.SLACK_SIGNING_SECRET = SECRET;
const { POST, GET } = await import("../api/compliment.js");

function slackRequest(fields, { secret = SECRET, timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const body = new URLSearchParams(fields).toString();
  const signature =
    "v0=" + crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex");
  return new Request("https://example.com/api/compliment", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-slack-request-timestamp": String(timestamp),
      "x-slack-signature": signature,
    },
    body,
  });
}

const base = { command: "/compliment", user_id: "USENDER1", channel_id: "C123" };

// 1. Mentioned user gets the compliment, visible to the whole channel.
let res = await POST(slackRequest({ ...base, text: "<@UFRIEND9|priya>" }));
assert.equal(res.status, 200);
let json = await res.json();
assert.equal(json.response_type, "in_channel");
assert.match(json.text, /<@UFRIEND9>, /);
assert.match(json.text, /sent by <@USENDER1>/);
console.log("PASS mention  ->", json.text.replace("\n", " | "));

// 2. No mention: a general compliment to the channel.
res = await POST(slackRequest({ ...base, text: "" }));
json = await res.json();
assert.equal(json.response_type, "in_channel");
assert.doesNotMatch(json.text, /<@/);
console.log("PASS no text  ->", json.text);

// 3. Wrong secret is rejected.
res = await POST(slackRequest({ ...base, text: "" }, { secret: "wrong" }));
assert.equal(res.status, 401);
console.log("PASS bad signature rejected (401)");

// 4. Replayed old request is rejected.
res = await POST(slackRequest({ ...base, text: "" }, { timestamp: Math.floor(Date.now() / 1000) - 600 }));
assert.equal(res.status, 401);
console.log("PASS 10-min-old request rejected (401)");

// 5. SSL check gets a plain 200.
res = await POST(slackRequest({ ssl_check: "1" }));
assert.equal(res.status, 200);
console.log("PASS ssl_check -> 200");

// 6. Browser visit shows a status message.
res = GET();
assert.equal(res.status, 200);
console.log("PASS GET      ->", await res.text());

console.log("\nAll tests passed.");
