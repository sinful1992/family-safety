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
    .replace(/\n/g, '');
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buf;
}

function b64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getServiceAccountToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const sigInput = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(sigInput),
  );

  const jwt = `${sigInput}.${btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const { access_token } = await res.json();
  if (!access_token) throw new Error('Failed to obtain service account access token');
  return access_token;
}

async function sendFCM(
  fcmToken: string,
  projectId: string,
  data: Record<string, string>,
  accessToken: string,
): Promise<void> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          data,
          android: { priority: 'HIGH' },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { 'content-available': 1 } },
          },
        },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FCM V1 error ${res.status}: ${body}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sender_user_id, sender_name, group_id } = await req.json();

    const sa: ServiceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!);
    const accessToken = await getServiceAccountToken(sa);
    const dbUrl = Deno.env.get('FIREBASE_DATABASE_URL');

    // Fetch all member UIDs in the group
    const memberIdsRes = await fetch(
      `${dbUrl}/familyGroups/${group_id}/memberIds.json?access_token=${accessToken}`,
    );
    const memberIds: Record<string, boolean> | null = await memberIdsRes.json();

    if (!memberIds) {
      return new Response(JSON.stringify({ error: 'Group not found or has no members' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fan out to all members except the sender
    const targets = Object.keys(memberIds).filter((uid) => uid !== sender_user_id);

    const results = await Promise.allSettled(
      targets.map(async (uid) => {
        const tokenRes = await fetch(
          `${dbUrl}/users/${uid}/fcmToken.json?access_token=${accessToken}`,
        );
        const fcmToken: string | null = await tokenRes.json();
        if (!fcmToken) return;

        await sendFCM(
          fcmToken,
          sa.project_id,
          {
            type: 'help_alert',
            group_id,
            sender_user_id,
            sender_name,
            title: `${sender_name} needs help!`,
            body: 'They tapped "I need help". Check on them now.',
          },
          accessToken,
        );
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ success: true, sent: targets.length - failed, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
