import type { APIRoute } from "astro";
import buildInfo from "../data/build.json";

export const GET: APIRoute = (context) => {
    const payload = {
        success: true,
        message: "OK",
        commit: buildInfo.commit || "",
        lastmod: buildInfo.lastmod || "",
        timestamp: new Date().toISOString(),
        tech: context.generator,
    };

    return new Response(JSON.stringify(payload), {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Content-Type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
        },
    });
};
