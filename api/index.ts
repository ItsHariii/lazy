export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  try {
    const { handle } = await import("hono/vercel");
    const { app } = await import("../server/app");
    return handle(app)(req);
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: "boot_failed",
        message: e?.message || String(e),
        stack: e?.stack?.split("\n").slice(0, 12) || null,
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
