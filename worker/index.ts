import { liveApi } from "./live-api";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    if (new URL(request.url).pathname.startsWith("/api/live/")) return liveApi(request, env);
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    // Health reports only the presence of bindings; never exposes private records.
    if (new URL(request.url).pathname === "/api/system/health") {
      if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
      const bindings = env as unknown as {
        VANSHAWALI_DB?: { prepare: (sql: string) => { first: () => Promise<unknown> } };
        VANSHAWALI_FILES?: { head: (key: string) => Promise<unknown> };
      };
      const headers = { "Cache-Control": "no-store" };
      if (!bindings.VANSHAWALI_DB) {
        return Response.json({ service: "vanshawali360", database: "unavailable", storage: bindings.VANSHAWALI_FILES ? "bound" : "unavailable" }, { status: 503, headers });
      }
      return bindings.VANSHAWALI_DB.prepare("SELECT 1 AS ready").first()
        .then(() => Response.json({ service: "vanshawali360", database: "connected", storage: bindings.VANSHAWALI_FILES ? "bound" : "unavailable" }, { headers }))
        .catch(() => Response.json({ service: "vanshawali360", database: "unavailable", storage: bindings.VANSHAWALI_FILES ? "bound" : "unavailable" }, { status: 503, headers }));
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
