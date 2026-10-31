import { withSupabase } from "npm:@supabase/server@^1";

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
    if (_req.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers: { Allow: "POST" } });
    try {
      const bucket = ctx.supabaseAdmin.storage.from("avatars");
      // Always consume the first page: successful removal shifts remaining files
      // forward, so offsets would skip objects when there are many stale avatars.
      while (true) {
        const { data: objects, error: listError } = await bucket.list(userId, { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } });
        if (listError || !objects) throw listError || new Error("Avatar listing returned no data.");
        if (objects.length === 0) break;
        // Avatar uploads are flat files inside the owner's folder. Abort rather
        // than ignore an unexpected nested folder or unsafe object name.
        if (objects.some((object) => !object.id || !object.name || object.name.includes("/") || object.name === "." || object.name === "..")) {
          throw new Error("Unexpected object in avatar folder.");
        }
        const paths = objects.map((object) => `${userId}/${object.name}`);
        const { data: removed, error: removeError } = await bucket.remove(paths);
        if (removeError || !removed || removed.length !== paths.length) throw removeError || new Error("Avatar cleanup was incomplete.");
      }
      const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId, false);
      if (error) throw error;
      return Response.json({ success: true });
    } catch (error) {
      console.error("Account deletion failed:", error);
      return Response.json({ error: "Unable to delete account. Please try again." }, { status: 500 });
    }
  }),
};
