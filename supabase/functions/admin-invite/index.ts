import { authorize, jsonResponse, preflight } from "../_shared/http.ts";

function equalDigest(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const { user, service } = await authorize(request);
    if (!user.email_confirmed_at) {
      return jsonResponse({ error: "Confirm your account email before redeeming an administrator invite." }, 403);
    }
    const initialAdminEmail = Deno.env.get("INITIAL_ADMIN_EMAIL")?.trim().toLowerCase();
    if (!initialAdminEmail || user.email?.trim().toLowerCase() !== initialAdminEmail) {
      return jsonResponse({ error: "This account is not eligible for the initial administrator invite." }, 403);
    }

    let body: { code?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid request body." }, 400);
    }
    if (typeof body.code !== "string" || body.code.length < 32 || body.code.length > 128) {
      return jsonResponse({ error: "Invalid administrator invite." }, 400);
    }

    const expectedCode = Deno.env.get("ADMIN_INVITE_CODE");
    if (!expectedCode || expectedCode.length < 32) {
      console.error("ADMIN_INVITE_CODE is missing or too short.");
      return jsonResponse({ error: "Administrator invites are not configured." }, 503);
    }
    if (!equalDigest(await digest(body.code), await digest(expectedCode))) {
      return jsonResponse({ error: "Invalid administrator invite." }, 403);
    }

    const { data, error } = await service.rpc("redeem_initial_admin_invite", {
      target_user_id: user.id,
    });
    if (error) {
      console.error("Could not redeem administrator invite:", error.message);
      return jsonResponse({ error: "Could not activate administrator access." }, 500);
    }
    if (data !== true) {
      return jsonResponse({ error: "This one-time administrator invite has already been used." }, 409);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    console.error("admin-invite request failed:", message);
    return jsonResponse({ error: message }, message === "Authentication required." ? 401 : 500);
  }
});
