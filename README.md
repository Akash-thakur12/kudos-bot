# Kudos Bot

A Slack app with one job: `/compliment @teammate` posts a random, work-friendly compliment for that person in the channel.

## How it works

```
Slack  --- signed POST /api/compliment --->  Vercel function
       <-- 200, response_type: in_channel --
```

1. Someone runs `/compliment @teammate`.
2. Slack sends a signed form POST to the Request URL.
3. The function verifies the `X-Slack-Signature` HMAC with the signing secret and rejects requests older than 5 minutes.
4. It replies inside Slack's 3-second window with `response_type: "in_channel"`, so the whole channel sees the compliment.

## Why only the `commands` scope

The reply goes back in the slash command's HTTP response, so the app never calls `chat.postMessage`. That means no `chat:write` scope and no bot token. The app can only speak when a person runs the command, and only in that channel.

If the reply ever needed slow work (like an LLM call), the pattern would change: acknowledge with an empty 200 right away, then post the result to the `response_url`.

## Setup

1. Create a Slack app from scratch and add a slash command:
   - Command: `/compliment`
   - Request URL: `https://<your-deployment>/api/compliment`
   - Usage hint: `@teammate`
   - Turn on **Escape channels, users, and links** so mentions arrive as `<@U123>`.
2. Deploy to Vercel and set `SLACK_SIGNING_SECRET` (Basic Information → App Credentials).
3. Install the app to your workspace. The only scope should be `commands`.

## Tests

```
npm test
```

The tests sign fake Slack requests and check the mention reply, the no-mention reply, a bad signature (401), a replayed request (401), Slack's SSL check, and the GET health check.
