import { handle } from "hono/vercel";
import { app } from "../server/app.js";

const honoHandler = handle(app);

export default async function handler(req: Request): Promise<Response> {
  try {
    return await honoHandler(req);
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: "handler_failed",
        message: e?.message || String(e),
        name: e?.name,
        stack: e?.stack?.split("\n").slice(0, 15) || null,
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
