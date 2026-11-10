import { randomUUID } from 'node:crypto';
import { AccessToken } from 'livekit-server-sdk';
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol';

const recentRequests = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;

function response(statusCode, body, origin = '*') {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    },
    body: JSON.stringify(body),
  };
}

function websocketUrl(value) {
  const url = String(value || '').trim();
  if (url.startsWith('https://')) return `wss://${url.slice(8)}`;
  if (url.startsWith('http://')) return `ws://${url.slice(7)}`;
  return url;
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigin = (process.env.ALLOWED_ORIGIN || '').trim();

  if (event.httpMethod === 'OPTIONS') {
    return response(204, {}, allowedOrigin || origin || '*');
  }
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed.' }, allowedOrigin || '*');
  }
  if (allowedOrigin && origin !== allowedOrigin) {
    return response(403, { error: 'This website origin is not allowed.' }, allowedOrigin);
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = websocketUrl(process.env.LIVEKIT_URL);
  const agentName = (process.env.LIVEKIT_AGENT_NAME || '').trim();

  if (!apiKey || !apiSecret || !serverUrl || !agentName) {
    return response(500, {
      error: 'Voice service is not configured yet. Add the LiveKit environment variables in Netlify Site configuration.',
    }, allowedOrigin || origin || '*');
  }
  if (!/^wss?:\/\//.test(serverUrl)) {
    return response(500, { error: 'LIVEKIT_URL must be your LiveKit Project URL (wss://...).' }, allowedOrigin || origin || '*');
  }

  // Best-effort per-instance request cap. Use a production rate-limit service for high-traffic sites.
  const ip = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['client-ip'] || 'unknown';
  const now = Date.now();
  const recent = (recentRequests.get(ip) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return response(429, { error: 'Too many attempts. Please try again in a few minutes.' }, allowedOrigin || origin || '*');
  }
  recent.push(now);
  recentRequests.set(ip, recent);

  try {
    const roomName = `yogendra-${randomUUID()}`;
    const token = new AccessToken(apiKey, apiSecret, {
      identity: `visitor-${randomUUID()}`,
      name: 'Website Visitor',
      ttl: '15m',
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    token.roomConfig = new RoomConfiguration({
      agents: [new RoomAgentDispatch({ agentName })],
    });

    const participantToken = await token.toJwt();
    return response(200, { serverUrl, participantToken, roomName }, allowedOrigin || origin || '*');
  } catch (error) {
    console.error('Token creation failed:', error);
    return response(500, { error: 'Could not start the voice session. Check the LiveKit settings and agent name.' }, allowedOrigin || origin || '*');
  }
}
