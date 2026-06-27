import type { APIRoute } from "astro";
import { execSync } from "node:child_process";

const COMMIT_ENV_VARS = [
    "COMMIT_REF", // Netlify
    "GITHUB_SHA", // Github Actions
    "WORKERS_CI_COMMIT_SHA", // Cloudflare Workers CI
    "CF_PAGES_COMMIT_SHA", // Cloudflare Pages
    "CI_COMMIT_SHA", // Gitlab CI
];

const getCommit = () => {
    for (const envVar of COMMIT_ENV_VARS) {
        const commit = process.env[envVar];
        if (commit) {
            return commit.slice(0, 7);
        }
    }

    let retVal = "null";
    try {
        retVal = execSync("git rev-parse --short HEAD").toString().trim();
    } catch (err) {
        return `error-${err}`;
    }

    try {
        const isDirty = execSync('git diff --quiet || echo "dirty"')
            .toString()
            .trim();
        if (isDirty === "dirty") {
            retVal = `${retVal}-dirty`;
        }
    } catch {
        return `${retVal}-error`;
    }
    return retVal;
};

export const GET: APIRoute = (context) => {
    const payload = {
        success: true,
        message: "OK",
        commit: getCommit(),
        lastmod: new Date().toISOString(),
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

export const prerender = true;