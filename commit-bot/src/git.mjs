import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export function gitCommit(config, files, message) {
  if (config.dryRun) {
    console.log(`[dry-run] would commit: ${files.join(", ")} — ${message}`);
    return { committed: false, dryRun: true };
  }

  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: config.gitAuthorName,
    GIT_AUTHOR_EMAIL: config.gitAuthorEmail,
    GIT_COMMITTER_NAME: config.gitAuthorName,
    GIT_COMMITTER_EMAIL: config.gitAuthorEmail,
  };

  const git = (args) =>
    execFileSync("git", args, {
      cwd: config.repoPath,
      env,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

  if (!existsSync(config.repoPath)) {
    throw new Error(`Repo path does not exist: ${config.repoPath}`);
  }

  try {
    git(["rev-parse", "--git-dir"]);
  } catch {
    throw new Error(`Not a git repository: ${config.repoPath}`);
  }

  for (const file of files) {
    git(["add", "--", file]);
  }

  const status = git(["status", "--porcelain"]).trim();
  if (!status) {
    console.log("[git] nothing to commit");
    return { committed: false, reason: "clean" };
  }

  git(["commit", "-m", message]);
  console.log(`[git] committed: ${message}`);

  if (config.gitRemote) {
    try {
      git(["push", config.gitRemote, config.gitBranch]);
      console.log(`[git] pushed to ${config.gitRemote}/${config.gitBranch}`);
    } catch (err) {
      console.error("[git] push failed:", err.stderr ?? err.message);
    }
  }

  return { committed: true };
}

export function configureGitIdentity(config) {
  if (config.dryRun) return;
  const git = (args) =>
    execFileSync("git", args, {
      cwd: config.repoPath,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  git(["config", "user.name", config.gitAuthorName]);
  git(["config", "user.email", config.gitAuthorEmail]);
}
