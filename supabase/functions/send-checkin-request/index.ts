import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\n/g, '');
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

function b64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getServiceAccountToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const sigInput = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  })}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  const jwt = `${sigInput}.${btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await res.json();
  if (!access_token) throw new Error('Failed to obtain service account access token');
  return access_token;
}

interface FCMResult {
  ok: boolean;
  status: number;
  body: string;
  unregistered: boolean;
}

async function sendFCM(fcmToken: string, projectId: string, data: Record<string, string>, accessToken: string): Promise<FCMResult> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: fcmToken, data,
        android: { priority: 'HIGH' },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { 'content-available': 1 } } },
      },
    }),
  });
  const body = res.ok ? '' : await res.text();
  return {
    ok: res.ok,
    status: res.status,
    body,
    unregistered: res.status === 404 && body.includes('UNREGISTERED'),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { check_in_id, target_user_id, requester_name, group_id } = await req.json();
    const saRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    const dbUrl = Deno.env.get('FIREBASE_DATABASE_URL');

    // Diagnostic: dumps config state (no secrets leaked).
    if (check_in_id === 'probe') {
      let parseError: string | null = null;
      let parsedKeys: string[] = [];
      let privateKeyLen = 0, privateKeyHead = '', hasLit = false, hasReal = false;
      if (saRaw) {
        try {
          const sa = JSON.parse(saRaw);
          parsedKeys = Object.keys(sa);
          if (typeof sa.private_key === 'string') {
            privateKeyLen = sa.private_key.length;
            privateKeyHead = sa.private_key.slice(0, 30);
            hasLit = sa.private_key.includes('\\n');
            hasReal = sa.private_key.includes('\n');
          }
        } catch (e) { parseError = e instanceof Error ? e.message : String(e); }
      }
      return new Response(JSON.stringify({
        diagnostic: true,
        FIREBASE_SERVICE_ACCOUNT_set: !!saRaw,
        FIREBASE_SERVICE_ACCOUNT_raw_length: saRaw?.length ?? 0,
        FIREBASE_DATABASE_URL_set: !!dbUrl,
        FIREBASE_DATABASE_URL_value: dbUrl ?? null,
        parseError, parsedKeys,
        privateKey: { present: privateKeyLen > 0, length: privateKeyLen, head: privateKeyHead, hasLiteralBackslashN: hasLit, hasRealNewlines: hasReal },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Diagnostic: full picture — every user's token, group, and live memberStatus.
    if (check_in_id === 'probe2') {
      if (!saRaw) return new Response(JSON.stringify({ error: 'SA not set' }), { status: 500, headers: corsHeaders });
      const sa: ServiceAccount = JSON.parse(saRaw);
      const accessToken = await getServiceAccountToken(sa);

      const usersRes = await fetch(`${dbUrl}/users.json?access_token=${accessToken}&shallow=true`);
      const usersBody = await usersRes.text();
      let uids: string[] = [];
      try { const p = JSON.parse(usersBody); uids = p ? Object.keys(p) : []; } catch {}

      const report: any[] = [];
      for (const uid of uids) {
        const [nameR, tokR, groupR] = await Promise.all([
          fetch(`${dbUrl}/users/${uid}/displayName.json?access_token=${accessToken}`),
          fetch(`${dbUrl}/users/${uid}/fcmToken.json?access_token=${accessToken}`),
          fetch(`${dbUrl}/users/${uid}/familyGroupId.json?access_token=${accessToken}`),
        ]);
        const displayName = JSON.parse(await nameR.text());
        const fcmToken = JSON.parse(await tokR.text());
        const familyGroupId = JSON.parse(await groupR.text());

        let memberStatus: any = null;
        if (familyGroupId) {
          const msRes = await fetch(`${dbUrl}/familyGroups/${familyGroupId}/memberStatus/${uid}.json?access_token=${accessToken}`);
          memberStatus = JSON.parse(await msRes.text());
        }

        report.push({
          uid,
          displayName,
          familyGroupId,
          fcmTokenShape: typeof fcmToken === 'string' ? `string(len=${fcmToken.length})` : String(fcmToken),
          memberStatus,
        });
      }

      return new Response(JSON.stringify({ diagnostic2: true, report }, null, 2),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Production path
    if (!saRaw) throw new Error('FIREBASE_SERVICE_ACCOUNT secret is not set');
    const sa: ServiceAccount = JSON.parse(saRaw);
    if (!sa.private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing private_key field');
    if (!sa.client_email) throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing client_email field');
    if (!sa.project_id) throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing project_id field');
    const accessToken = await getServiceAccountToken(sa);

    const tokenRes = await fetch(`${dbUrl}/users/${target_user_id}/fcmToken.json?access_token=${accessToken}`);
    const fcmToken = await tokenRes.json();

    if (typeof fcmToken !== 'string' || !fcmToken) {
      return new Response(JSON.stringify({
        error: `fcmToken at /users/${target_user_id}/fcmToken is not a string (got: ${typeof fcmToken}, value shape: ${JSON.stringify(fcmToken)?.substring(0, 200)})`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const result = await sendFCM(fcmToken, sa.project_id, {
      type: 'check_in_request', check_in_id, group_id, requester_name,
      title: `${requester_name} is checking on you`,
      body: 'Tap to respond — Are you okay?',
    }, accessToken);

    if (!result.ok) {
      if (result.unregistered) {
        await fetch(`${dbUrl}/users/${target_user_id}/fcmToken.json?access_token=${accessToken}`, { method: 'DELETE' });
        return new Response(
          JSON.stringify({ error: 'Target device is not registered. They need to open the app to refresh notifications.' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`FCM V1 error ${result.status}: ${result.body}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
