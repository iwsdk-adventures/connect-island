#!/usr/bin/env node
/**
 * Build connect-island and produce a hub-ready artifact under `dist/`.
 *
 *   dist/
 *   ├── index.html / assets / stockfish / textures / ui / gltf / audio / ...
 *   └── journal/
 *       ├── session.jsonl         (from .claude/journal/session-{id}.jsonl)
 *       ├── stats.json            (aggregated from multiple sources)
 *       └── checkpoints/<flat>    (copied from .claude/journal/checkpoints/{id}/)
 *
 * Intended to be consumed by iwsdk-adventures: one invocation → one artifact
 * that gets dropped wholesale into `public/apps/connect-island/`.
 *
 * `--drop-turns` removes whole turns from the *published* transcript and
 * renumbers what is left from 1. The journal under `.claude/journal/` stays
 * the complete record; only the artifact is edited, and every stat is
 * recomputed from what survives.
 *
 * Usage:
 *   pnpm package:hub
 *   node scripts/package-for-hub.mjs [--session-id <uuid>] [--base /path/] \
 *                                    [--home-dir /Users/x] [--slug connect-island] \
 *                                    [--thumbnail <file>] [--drop-turns 1,2,13]
 */

import { spawn } from "node:child_process";
import {
  cp,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = {
    base: "/apps/connect-island/",
    slug: "connect-island",
    homeDir: os.homedir(),
    dropTurns: new Set(),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--session-id") out.sessionId = argv[++i];
    else if (a === "--base") out.base = argv[++i];
    else if (a === "--home-dir") out.homeDir = argv[++i];
    else if (a === "--slug") out.slug = argv[++i];
    else if (a === "--thumbnail") out.thumbnail = argv[++i];
    else if (a === "--drop-turns") {
      out.dropTurns = new Set(
        argv[++i]
          .split(",")
          .map((t) => Number(t.trim()))
          .filter((t) => Number.isInteger(t)),
      );
    }
  }
  return out;
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function latestSessionId(journalDir) {
  const files = (await readdir(journalDir)).filter(
    (f) => f.startsWith("session-") && f.endsWith(".jsonl"),
  );
  if (files.length === 0) throw new Error(`no session-*.jsonl in ${journalDir}`);
  const withStats = await Promise.all(
    files.map(async (f) => {
      const p = path.join(journalDir, f);
      const { mtimeMs } = await (await import("node:fs/promises")).stat(p);
      return { p, f, mtimeMs };
    }),
  );
  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withStats[0].f.replace(/^session-|\.jsonl$/g, "");
}

async function loadJsonl(file) {
  if (!existsSync(file)) return null;
  try {
    const text = await readFile(file, "utf8");
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    console.warn(`  WARN: could not read ${file}: ${err.message}`);
    return null;
  }
}

async function countPromptsFromHistory(sessionId, homeDir) {
  const file = path.join(homeDir, ".claude", "history.jsonl");
  const rows = await loadJsonl(file);
  if (!rows) return null;
  return rows.filter((r) => {
    const sid = r.session_id ?? r.sessionId ?? r.session ?? null;
    return sid === sessionId;
  }).length;
}

/** Claude Code writes its project transcripts under
 *  ~/.claude/projects/-<cwd-with-slashes-replaced-by-dashes>/<session_id>.jsonl */
function transcriptPathFor(sessionId, cwd, homeDir) {
  const dirKey = cwd.replace(/[\\/]/g, "-");
  return path.join(homeDir, ".claude", "projects", dirKey, `${sessionId}.jsonl`);
}

async function analyzeTranscript(transcriptFile) {
  const rows = await loadJsonl(transcriptFile);
  if (!rows) return null;
  let assistantText = 0;
  const turnDurations = [];
  for (const r of rows) {
    if (r.type === "assistant") {
      const msg = r.message ?? {};
      const contents = Array.isArray(msg.content) ? msg.content : [];
      const hasText = contents.some(
        (c) => c.type === "text" && (c.text ?? "").trim().length > 0,
      );
      if (hasText) assistantText += 1;
    }
    if (
      r.type === "system" &&
      r.subtype === "turn_duration" &&
      typeof r.durationMs === "number"
    ) {
      turnDurations.push(r.durationMs);
    }
    if (typeof r.turn_duration === "number") turnDurations.push(r.turn_duration);
    if (typeof r.turnDuration === "number") turnDurations.push(r.turnDuration);
  }
  return { assistantText, turnDurations };
}

/** Auto-compaction injects a continuation message as a plain user row. It is
 *  machine-written, not a human prompt, so it is excluded from the count. */
const COMPACT_PREFIX = "This session is being continued from a previous conversation";

/** Longest gap between consecutive journal events still counted as work.
 *  Anything longer is the human being away, not the agent thinking. */
const ACTIVE_GAP_CAP_MS = 60_000;

/**
 * Drop whole turns and renumber the survivors from 1, so the published
 * transcript reads as a clean run rather than one starting at "TURN 03".
 * Returns the kept events (session_meta excluded — it is rebuilt from these).
 */
function trimTurns(rows, dropTurns) {
  const kept = rows.filter((r) => r.type !== "session_meta" && !dropTurns.has(r.turn));
  const renumber = new Map(
    [...new Set(kept.map((r) => r.turn))].sort((a, b) => a - b).map((t, i) => [t, i + 1]),
  );
  return kept.map((r) => ({ ...r, turn: renumber.get(r.turn) }));
}

function analyzeEvents(events) {
  let toolCalls = 0;
  let checkpoints = 0;
  let userMessages = 0;
  let assistantMessages = 0;
  const byTurn = new Map();
  for (const r of events) {
    if (r.type === "tool_call") {
      toolCalls += 1;
      if (r.checkpoint_path) checkpoints += 1;
    }
    if (r.type === "assistant_text") assistantMessages += 1;
    if (r.type === "user_message" && !r.content?.trimStart().startsWith(COMPACT_PREFIX)) {
      userMessages += 1;
    }
    if (!r.ts) continue;
    const list = byTurn.get(r.turn) ?? [];
    list.push(Date.parse(r.ts));
    byTurn.set(r.turn, list);
  }

  // Claude Code 2.1.219 no longer writes `system/turn_duration` rows, so the
  // canonical active-time source is gone. Fall back to the brushspace rule:
  // sum the gaps between consecutive events, capping each at 60s. A raw
  // first-to-last span would score this session at 14h — it ran overnight
  // with multi-hour idle stretches between prompts.
  const turnDurations = [...byTurn.keys()]
    .sort((a, b) => a - b)
    .map((t) => {
      const ts = byTurn.get(t).sort((a, b) => a - b);
      let sum = 0;
      for (let i = 1; i < ts.length; i++) {
        sum += Math.min(ts[i] - ts[i - 1], ACTIVE_GAP_CAP_MS);
      }
      return sum;
    });

  const stamps = events.map((r) => r.ts).filter(Boolean).sort();

  return {
    toolCalls,
    checkpoints,
    userMessages,
    assistantMessages,
    turnDurations,
    startedAt: stamps[0],
    updatedAt: stamps[stamps.length - 1],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // 1. Build the app at the desired base.
  console.log(`▶ vite build --base ${args.base}`);
  await run("npx", ["vite", "build", "--base", args.base], REPO);

  const distDir = path.join(REPO, "dist");
  if (!existsSync(distDir)) throw new Error(`expected build output at ${distDir}`);

  // 2. Resolve the session to package.
  const journalDir = path.join(REPO, ".claude", "journal");
  if (!existsSync(journalDir)) throw new Error(`no .claude/journal in ${REPO}`);
  const sessionId = args.sessionId ?? (await latestSessionId(journalDir));
  const journalFile = path.join(journalDir, `session-${sessionId}.jsonl`);
  if (!existsSync(journalFile)) throw new Error(`journal not found: ${journalFile}`);
  console.log(`▶ packaging session ${sessionId}`);

  // 3. Load, trim, and write the transcript.
  const rows = await loadJsonl(journalFile);
  if (!rows) throw new Error(`required journal missing: ${journalFile}`);
  const meta = rows.find((r) => r.type === "session_meta");
  if (!meta) throw new Error(`session_meta missing in ${journalFile}`);

  const events = trimTurns(rows, args.dropTurns);
  if (args.dropTurns.size > 0) {
    const turns = new Set(events.map((r) => r.turn));
    console.log(
      `  dropped turns ${[...args.dropTurns].sort((a, b) => a - b).join(", ")} ` +
        `(${rows.length - 1 - events.length} events); ${turns.size} turns renumbered from 1`,
    );
  }

  const {
    toolCalls,
    checkpoints,
    userMessages,
    assistantMessages,
    turnDurations,
    startedAt,
    updatedAt,
  } = analyzeEvents(events);

  const outJournalDir = path.join(distDir, "journal");
  await rm(outJournalDir, { recursive: true, force: true });
  await mkdir(outJournalDir, { recursive: true });

  const outMeta = {
    ...meta,
    started_at: startedAt,
    updated_at: updatedAt,
    ts: startedAt,
    user_messages: userMessages,
    assistant_messages: assistantMessages,
    tool_uses: toolCalls,
  };
  await writeFile(
    path.join(outJournalDir, "session.jsonl"),
    [outMeta, ...events].map((e) => JSON.stringify(e)).join("\n") + "\n",
  );

  // 4. Flatten checkpoints — only the ones a surviving event still points at.
  const referenced = new Set(
    events.filter((r) => r.checkpoint_path).map((r) => path.basename(r.checkpoint_path)),
  );
  const srcCheckpoints = path.join(journalDir, "checkpoints", sessionId);
  const outCheckpoints = path.join(outJournalDir, "checkpoints");
  await mkdir(outCheckpoints, { recursive: true });
  if (existsSync(srcCheckpoints)) {
    const all = (await readdir(srcCheckpoints)).filter((f) => !f.startsWith("."));
    const files = all.filter((f) => referenced.has(f));
    for (const f of files) {
      await copyFile(path.join(srcCheckpoints, f), path.join(outCheckpoints, f));
    }
    console.log(`  checkpoints: ${files.length} copied (${all.length - files.length} orphaned)`);
  } else {
    console.warn(`  no checkpoints dir at ${srcCheckpoints}`);
  }

  // 5. Aggregate stats.
  // history.jsonl only holds a rolling window and no longer covers this
  // session, so the journal's own prompt rows are the count of record.
  const promptCount = args.dropTurns.size
    ? 0
    : await countPromptsFromHistory(sessionId, args.homeDir);
  const transcriptFile = transcriptPathFor(sessionId, meta.cwd, args.homeDir);
  const transcript = await analyzeTranscript(transcriptFile);

  // The transcript's turn_duration rows (when present) cover the whole
  // session, so they can only be trusted when nothing was dropped.
  const ccTurnDurations = args.dropTurns.size ? [] : (transcript?.turnDurations ?? []);
  const useCcDurations = ccTurnDurations.length > 0;
  const durations = useCcDurations ? ccTurnDurations : turnDurations;

  const stats = {
    slug: args.slug,
    session_id: sessionId,
    user_messages: promptCount || userMessages,
    user_messages_source:
      promptCount > 0
        ? "history.jsonl"
        : "journal user_message rows excluding the auto-compaction continuation",
    assistant_messages: assistantMessages,
    assistant_messages_source: "journal assistant_text rows",
    tool_calls: toolCalls,
    checkpoints,
    turns: durations.length,
    active_ms: durations.reduce((a, b) => a + b, 0),
    active_ms_source: useCcDurations
      ? "cc-transcript.turn_duration"
      : "sum of per-turn journal event gaps capped at 60s per gap (Claude Code 2.1.219 dropped turn_duration rows)",
    turn_durations_ms: durations,
    model: meta.model,
    built_with: "Claude Code",
    claude_code_version: meta.claude_code_version,
    started_at: startedAt,
    updated_at: updatedAt,
    ...(args.dropTurns.size > 0
      ? {
          dropped_turns: [...args.dropTurns].sort((a, b) => a - b),
          dropped_turns_note:
            "off-topic turns removed from the published transcript; the full journal lives in the source repo under .claude/journal/",
        }
      : {}),
  };

  await writeFile(
    path.join(outJournalDir, "stats.json"),
    JSON.stringify(stats, null, 2) + "\n",
  );

  console.log(`✓ packaged:`, {
    user: stats.user_messages,
    assistant: stats.assistant_messages,
    tools: stats.tool_calls,
    checkpoints: stats.checkpoints,
    active_ms: stats.active_ms,
  });
  if (!useCcDurations) {
    console.warn(
      `  note: no turn_duration rows in ${transcriptFile}; active_ms is the gap-capped estimate.`,
    );
  }

  // 6. Thumbnail. The hub's ProjectCard hardcodes thumbnail.png, and these
  //    checkpoints are JPEG, so re-encode rather than mislabel the extension.
  //    Defaults to the last checkpoint (the most-built view); --thumbnail
  //    overrides it with a hand-picked hero shot.
  let thumbSrc = args.thumbnail;
  if (!thumbSrc && existsSync(srcCheckpoints)) {
    const shots = (await readdir(srcCheckpoints)).filter((f) => !f.startsWith(".")).sort();
    if (shots.length > 0) thumbSrc = path.join(srcCheckpoints, shots[shots.length - 1]);
  }
  if (thumbSrc) {
    const thumbOut = path.join(distDir, "thumbnail.png");
    if (path.extname(thumbSrc).toLowerCase() === ".png") {
      await copyFile(thumbSrc, thumbOut);
    } else {
      await run("sips", ["-s", "format", "png", thumbSrc, "--out", thumbOut], REPO);
    }
    console.log(`  thumbnail: ${path.basename(thumbSrc)}`);
  }

  console.log(`✓ dist/ ready to drop into iwsdk-adventures/public/apps/${args.slug}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
