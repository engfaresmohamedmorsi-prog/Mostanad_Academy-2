import { authorize, jsonResponse, preflight } from "../_shared/http.ts";

type AdminAction =
  | { action: "list-invites" }
  | { action: "invite-user"; email: string; role: "student" | "instructor"; full_name?: string }
  | { action: "set-role"; user_id: string; role: "student" | "instructor" }
  | { action: "set-active"; user_id: string; is_active: boolean }
  | { action: "revoke-invite"; invite_id: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function updateInviteStatus(
  service: Awaited<ReturnType<typeof authorize>>["service"],
  userId: string,
  status: "active" | "suspended",
) {
  const { error } = await service.from("academy_invites")
    .update({ status }).eq("user_id", userId);
  if (error) {
    console.error("Could not update invite status:", error.message);
    throw new Error("The account access changed, but its invitation record could not be updated.");
  }
}

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const { user, service } = await authorize(request);
    let body: AdminAction;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid request body." }, 400);
    }

    const { data: actingProfile, error: actingError } = await service.from("profiles")
      .select("role,is_active").eq("id", user.id).single();
    if (actingError || actingProfile?.role !== "admin" || !actingProfile.is_active) {
      return jsonResponse({ error: "Active administrator access is required." }, 403);
    }

    if (body.action === "list-invites") {
      const { data, error } = await service.from("academy_invites")
        .select("id,email,role,status,invited_at,accepted_at,user_id")
        .order("invited_at", { ascending: false }).limit(200);
      if (error) {
        console.error("Could not list academy invitations:", error.message);
        return jsonResponse({ error: "Could not load academy invitations." }, 500);
      }
      return jsonResponse({ invites: data || [] });
    }

    if (body.action === "invite-user") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const role = body.role;
      const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
      const redirectTo = Deno.env.get("ACADEMY_REDIRECT_URL");
      if (!emailPattern.test(email) || email.length > 254
        || !["student", "instructor"].includes(role)
        || fullName.length > 100) {
        return jsonResponse({ error: "Enter a valid email address, name, and student or instructor role." }, 400);
      }
      if (!redirectTo) {
        console.error("ACADEMY_REDIRECT_URL is not configured.");
        return jsonResponse({ error: "Academy invitation email links are not configured." }, 503);
      }
      try {
        const redirect = new URL(redirectTo);
        if (redirect.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(redirect.hostname)) {
          return jsonResponse({ error: "The academy invitation URL must use HTTPS." }, 503);
        }
      } catch {
        return jsonResponse({ error: "The academy invitation URL is invalid." }, 503);
      }

      const { data: existingUser, error: existingUserError } = await service.from("profiles")
        .select("id").ilike("email", email).maybeSingle();
      if (existingUserError) {
        console.error("Could not check the invited email:", existingUserError.message);
        return jsonResponse({ error: "Could not verify this email address." }, 500);
      }
      if (existingUser) return jsonResponse({ error: "An academy account already exists for this email." }, 409);

      const { data: existingInvite, error: inviteLookupError } = await service.from("academy_invites")
        .select("id,status").ilike("email", email).maybeSingle();
      if (inviteLookupError) {
        console.error("Could not check the invitation list:", inviteLookupError.message);
        return jsonResponse({ error: "Could not check the invitation list." }, 500);
      }
      if (existingInvite && existingInvite.status !== "failed") {
        return jsonResponse({ error: "This email already has an invitation or an access decision." }, 409);
      }

      const inviteValues = {
        email,
        role,
        status: "inviting",
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        accepted_at: null,
        user_id: null,
      };
      const { data: invitation, error: invitationError } = existingInvite
        ? await service.from("academy_invites").update(inviteValues)
          .eq("id", existingInvite.id).select("id").single()
        : await service.from("academy_invites").insert(inviteValues).select("id").single();
      if (invitationError || !invitation) {
        console.error("Could not approve the invited email:", invitationError?.message);
        return jsonResponse({ error: "Could not add this email to the approved list." }, 500);
      }

      const { data: invited, error: sendError } = await service.auth.admin.inviteUserByEmail(email, {
        data: fullName ? { full_name: fullName } : {},
        redirectTo,
      });
      if (sendError || !invited.user) {
        const { error: failedStatusError } = await service.from("academy_invites")
          .update({ status: "failed" }).eq("id", invitation.id);
        if (failedStatusError) console.error("Could not mark failed invitation:", failedStatusError.message);
        console.error("Supabase could not send the academy invitation:", sendError?.message);
        return jsonResponse({ error: "Supabase could not send the invitation. Check the email provider and try again." }, 502);
      }

      const { error: profileError } = await service.from("profiles")
        .update({ role, is_active: true }).eq("id", invited.user.id);
      if (profileError) {
        console.error("Could not assign the invited account role:", profileError.message);
        const { error: banError } = await service.auth.admin.updateUserById(invited.user.id, { ban_duration: "876000h" });
        if (banError) console.error("Could not suspend account after role assignment failed:", banError.message);
        return jsonResponse({ error: "The invitation was sent, but its role could not be assigned. Keep the account suspended and contact the academy owner." }, 500);
      }

      const { error: finalizeError } = await service.from("academy_invites")
        .update({ user_id: invited.user.id, status: "invited" }).eq("id", invitation.id);
      if (finalizeError) {
        console.error("Could not finalize the academy invitation:", finalizeError.message);
        const { error: banError } = await service.auth.admin.updateUserById(invited.user.id, { ban_duration: "876000h" });
        if (banError) console.error("Could not suspend account after invitation finalization failed:", banError.message);
        return jsonResponse({ error: "The invitation was sent, but its approval record could not be finalized. Keep the account suspended and contact the academy owner." }, 500);
      }
      return jsonResponse({ ok: true, invite_id: invitation.id, email, role }, 201);
    }

    if (body.action === "set-role") {
      if (typeof body.user_id !== "string" || !["student", "instructor"].includes(body.role)) {
        return jsonResponse({ error: "Invalid user-role update." }, 400);
      }
      if (body.user_id === user.id) return jsonResponse({ error: "You cannot change your own role." }, 403);
      const { data: target, error: targetError } = await service.from("profiles")
        .select("id,role,is_active").eq("id", body.user_id).single();
      if (targetError || !target) return jsonResponse({ error: "User not found." }, 404);
      if (target.role === "admin") {
        return jsonResponse({ error: "Administrator roles can only be changed by the academy owner." }, 403);
      }
      const { error } = await service.from("profiles")
        .update({ role: body.role }).eq("id", target.id);
      if (error) {
        console.error("Could not update user role:", error.message);
        return jsonResponse({ error: "Could not update the user role." }, 500);
      }
      const { error: inviteError } = await service.from("academy_invites")
        .update({ role: body.role }).eq("user_id", target.id);
      if (inviteError) {
        const { error: rollbackError } = await service.from("profiles")
          .update({ role: target.role }).eq("id", target.id);
        if (rollbackError) console.error("Could not roll back user role after invitation update failed:", rollbackError.message);
        console.error("Could not update invitation role:", inviteError.message);
        return jsonResponse({ error: rollbackError
          ? "The role could not be synchronized. Contact the academy owner to verify this account."
          : "Could not synchronize the account and invitation roles." }, 500);
      }
      return jsonResponse({ ok: true, user_id: target.id, role: body.role });
    }

    if (body.action === "set-active") {
      if (typeof body.user_id !== "string" || typeof body.is_active !== "boolean") {
        return jsonResponse({ error: "Invalid account access update." }, 400);
      }
      if (body.user_id === user.id) return jsonResponse({ error: "You cannot suspend your own account." }, 403);
      const { data: target, error: targetError } = await service.from("profiles")
        .select("id,role,is_active").eq("id", body.user_id).single();
      if (targetError || !target) return jsonResponse({ error: "User not found." }, 404);
      if (target.role === "admin") {
        return jsonResponse({ error: "Administrator access can only be changed by the academy owner." }, 403);
      }

      if (!body.is_active) {
        const { error: profileError } = await service.from("profiles")
          .update({ is_active: false }).eq("id", target.id);
        if (profileError) {
          console.error("Could not suspend academy profile:", profileError.message);
          return jsonResponse({ error: "Could not suspend this account." }, 500);
        }
        const { error: banError } = await service.auth.admin.updateUserById(target.id, { ban_duration: "876000h" });
        if (banError) {
          const { error: restoreError } = await service.from("profiles").update({ is_active: true }).eq("id", target.id);
          if (restoreError) console.error("Could not restore profile after ban failure:", restoreError.message);
          console.error("Could not suspend Supabase account:", banError.message);
          return jsonResponse({ error: "Could not suspend sign-in for this account." }, 500);
        }
        try {
          await updateInviteStatus(service, target.id, "suspended");
        } catch {
          return jsonResponse({ error: "Account access is suspended, but its invitation status needs owner review." }, 500);
        }
      } else {
        const { error: unbanError } = await service.auth.admin.updateUserById(target.id, { ban_duration: "none" });
        if (unbanError) {
          console.error("Could not restore Supabase account:", unbanError.message);
          return jsonResponse({ error: "Could not restore sign-in for this account." }, 500);
        }
        const { error: profileError } = await service.from("profiles")
          .update({ is_active: true }).eq("id", target.id);
        if (profileError) {
          const { error: rebanError } = await service.auth.admin.updateUserById(target.id, { ban_duration: "876000h" });
          if (rebanError) console.error("Could not re-suspend account after profile update failed:", rebanError.message);
          console.error("Could not restore academy profile:", profileError.message);
          return jsonResponse({ error: "Could not restore academy access." }, 500);
        }
        try {
          await updateInviteStatus(service, target.id, "active");
        } catch {
          return jsonResponse({ error: "Account access is restored, but its invitation status needs owner review." }, 500);
        }
      }
      return jsonResponse({ ok: true, user_id: target.id, is_active: body.is_active });
    }

    if (body.action === "revoke-invite") {
      if (typeof body.invite_id !== "string") return jsonResponse({ error: "Invalid invitation." }, 400);
      const { data: invitation, error: invitationError } = await service.from("academy_invites")
        .select("id,user_id,status,role").eq("id", body.invite_id).single();
      if (invitationError || !invitation) return jsonResponse({ error: "Invitation not found." }, 404);
      if (invitation.role === "admin") return jsonResponse({ error: "Administrator access can only be changed by the academy owner." }, 403);
      if (invitation.user_id) {
        if (invitation.user_id === user.id) return jsonResponse({ error: "You cannot revoke your own access." }, 403);
        const { data: target } = await service.from("profiles")
          .select("role").eq("id", invitation.user_id).maybeSingle();
        if (target?.role === "admin") return jsonResponse({ error: "Administrator access can only be changed by the academy owner." }, 403);
        if (target) {
          const { error: profileError } = await service.from("profiles")
            .update({ is_active: false }).eq("id", invitation.user_id);
          if (profileError) {
            console.error("Could not disable the invited account:", profileError.message);
            return jsonResponse({ error: "Could not revoke account access." }, 500);
          }
          const { error: banError } = await service.auth.admin.updateUserById(invitation.user_id, { ban_duration: "876000h" });
          if (banError) {
            const { error: restoreError } = await service.from("profiles")
              .update({ is_active: true }).eq("id", invitation.user_id);
            if (restoreError) console.error("Could not restore profile after invite-revocation failure:", restoreError.message);
            console.error("Could not ban revoked invite account:", banError.message);
            return jsonResponse({ error: "Could not block sign-in for this account." }, 500);
          }
        }
      }
      const { error } = await service.from("academy_invites")
        .update({ status: "revoked" }).eq("id", invitation.id);
      if (error) {
        console.error("Could not revoke academy invitation:", error.message);
        return jsonResponse({ error: "The account was blocked, but its invitation record could not be revoked." }, 500);
      }
      return jsonResponse({ ok: true, invite_id: invitation.id });
    }

    return jsonResponse({ error: "Unknown administrator action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    console.error("admin-users request failed:", message);
    return jsonResponse({ error: message }, message === "Authentication required." ? 401 : 500);
  }
});
