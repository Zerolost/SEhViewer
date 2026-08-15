import {
  exportLocalLibrarySnapshot,
  mergeRemoteLibrarySnapshot,
} from "./local-library";

const TOKEN_KEY = "sehviewer.github.token.v1";
const DATA_KEY = "sehviewer.github.data-key.v1";
const META_KEY = "sehviewer.github.sync.meta.v1";
const FILE_PATH = "sehviewer/data-v1.enc";
const API_ROOT = "https://api.github.com";
const API_VERSION = "2022-11-28";
const USER_AGENT = "SEhViewer/1.3.2";
const AUTO_UPLOAD_DELAY = 10 * 60 * 1000;

export interface GitHubSyncMeta {
  owner: string;
  repository: string;
  branch: string;
  fileSha?: string;
  lastUploadAt?: number;
  lastDownloadAt?: number;
  lastRemoteDeleteAt?: number;
  lastLocalChangeAt?: number;
  lastError?: string;
}

export interface GitHubSyncStatus {
  connected: boolean;
  busy: boolean;
  message: string;
  meta: GitHubSyncMeta | null;
}

export class GitHubSyncError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GitHubSyncError";
  }
}

let autoUploadTimer: ReturnType<typeof setTimeout> | null = null;
let busy = false;
let statusListener: (() => void) | null = null;

function readMeta(): GitHubSyncMeta | null {
  try {
    const raw = Storage.get(META_KEY) as string;
    return raw ? JSON.parse(raw) as GitHubSyncMeta : null;
  } catch {
    return null;
  }
}

function writeMeta(meta: GitHubSyncMeta | null): void {
  try {
    if (meta) Storage.set(META_KEY, JSON.stringify(meta));
    else Storage.remove(META_KEY);
  } catch {}
  statusListener?.();
}

export function subscribeGitHubSync(listener: () => void): () => void {
  statusListener = listener;
  return () => { if (statusListener === listener) statusListener = null; };
}

export function getGitHubSyncStatus(): GitHubSyncStatus {
  const meta = readMeta();
  return {
    connected: !!getGitHubToken() && !!meta?.owner && !!meta.repository,
    busy,
    message: meta?.lastError || (meta?.lastRemoteDeleteAt
      ? `远端加密数据已删除：${new Date(meta.lastRemoteDeleteAt).toLocaleString()}`
      : meta?.lastUploadAt ? `上次上传：${new Date(meta.lastUploadAt).toLocaleString()}` : "尚未同步"),
    meta,
  };
}

export function getGitHubToken(): string {
  try {
    const secure = Keychain.get(TOKEN_KEY);
    if (secure) return secure;
  } catch {}
  try {
    const raw = Storage.get("ehviewer_config") as string;
    const legacy = raw ? (JSON.parse(raw).githubToken || "") : "";
    if (legacy) {
      const saved = Keychain.set(TOKEN_KEY, legacy, { accessibility: "unlocked_this_device", synchronizable: false });
      if (saved && Keychain.get(TOKEN_KEY) === legacy) {
        const config = JSON.parse(raw);
        delete config.githubToken;
        Storage.set("ehviewer_config", JSON.stringify(config));
      }
      return legacy;
    }
  } catch {}
  return "";
}

export function saveGitHubToken(token: string): boolean {
  const value = token.trim();
  if (!value) return false;
  try {
    return Keychain.set(TOKEN_KEY, value, { accessibility: "unlocked_this_device", synchronizable: false });
  } catch {
    return false;
  }
}

export function destroyGitHubToken(): boolean {
  try { return Keychain.remove(TOKEN_KEY); } catch { return false; }
}

function bytesToBase64(data: Data): string {
  return data.toBase64String();
}

function base64ToData(value: string): Data {
  const data = Data.fromBase64String(value.replace(/\s/g, ""));
  if (!data) throw new GitHubSyncError("远程数据编码无效");
  return data;
}

function encryptionKey(): Data {
  try {
    const existing = Keychain.getData(DATA_KEY, { synchronizable: false });
    if (existing) return existing;
    const generated = Crypto.generateSymmetricKey(256);
    if (!Keychain.setData(DATA_KEY, generated, { accessibility: "unlocked_this_device", synchronizable: false })) throw new GitHubSyncError("无法保存本地加密密钥");
    return generated;
  } catch (e) {
    if (e instanceof GitHubSyncError) throw e;
    throw new GitHubSyncError("无法生成本地加密密钥");
  }
}

function encryptSnapshot(snapshot: unknown, token: string): string {
  const plain = Data.fromRawString(JSON.stringify(snapshot));
  if (!plain) throw new GitHubSyncError("无法编码本地资料库");
  const encrypted = Crypto.encryptAESGCM(plain, encryptionKey());
  if (!encrypted) throw new GitHubSyncError("本地加密失败");
  return JSON.stringify({ version: 1, algorithm: "AES-256-GCM", createdAt: Date.now(), content: bytesToBase64(encrypted) });
}

function decryptSnapshot(text: string, token: string): any {
  let envelope: any;
  try { envelope = JSON.parse(text); } catch { throw new GitHubSyncError("远程同步文件不是有效 JSON"); }
  if (envelope?.version !== 1 || envelope?.algorithm !== "AES-256-GCM" || typeof envelope.content !== "string") throw new GitHubSyncError("不支持的同步文件格式");
  const plain = Crypto.decryptAESGCM(base64ToData(envelope.content), encryptionKey());
  if (!plain) throw new GitHubSyncError("无法解密远程资料：Token 不匹配或数据已损坏");
  try { return JSON.parse(plain.toDecodedString()); } catch { throw new GitHubSyncError("解密后的资料格式无效"); }
}

async function request<T>(token: string, path: string, init: any = {}): Promise<{ status: number; value: T | null; response: any }> {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": API_VERSION,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let value: any = null;
  if (text) { try { value = JSON.parse(text); } catch { value = text; } }
  if (!response.ok) {
    const message = value && typeof value === "object" && value.message ? value.message : `GitHub 请求失败（HTTP ${response.status}）`;
    throw new GitHubSyncError(message, response.status);
  }
  return { status: response.status, value: value as T, response };
}

function encodePath(path: string): string { return path.split("/").map(encodeURIComponent).join("/"); }
function repositoryName(login: string): string { return `sehviewer-private-sync-${login.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 30)}`; }

export async function connectGitHub(token: string): Promise<GitHubSyncMeta> {
  if (!saveGitHubToken(token)) throw new GitHubSyncError("Token 无法保存到本机安全存储");
  try {
    const user = await request<any>(token, "/user");
    const owner = user.value?.login;
    if (!owner) throw new GitHubSyncError("无法读取 GitHub 用户名");
    let meta = readMeta();
    if (!meta || meta.owner !== owner) {
      const name = repositoryName(owner);
      try {
        const created = await request<any>(token, "/user/repos", { method: "POST", body: JSON.stringify({ name, description: "Encrypted private data for SEhViewer", private: true, auto_init: true, has_issues: false, has_projects: false, has_wiki: false }) });
        meta = { owner, repository: created.value.name, branch: created.value.default_branch || "main" };
      } catch (e: any) {
        if (e.status !== 422) throw e;
        const existing = await request<any>(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
        if (existing.value?.private !== true) throw new GitHubSyncError("同名仓库已存在但不是私有仓库");
        meta = { owner, repository: name, branch: existing.value.default_branch || "main" };
      }
    }
    writeMeta({ ...meta, lastError: undefined });
    return meta;
  } catch (e) {
    destroyGitHubToken();
    throw e;
  }
}

export async function uploadGitHubData(): Promise<void> {
  const token = getGitHubToken();
  const meta = readMeta();
  if (!token || !meta) throw new GitHubSyncError("请先连接 GitHub");
  if (busy) return;
  busy = true; statusListener?.();
  try {
    const body = encryptSnapshot({ schema: 1, recordedAt: Date.now(), library: exportLocalLibrarySnapshot() }, token);
    const path = `/repos/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repository)}/contents/${encodePath(FILE_PATH)}`;
    let sha = meta.fileSha;
    if (!sha) { try { sha = (await request<any>(token, path)).value?.sha; } catch (e: any) { if (e.status !== 404) throw e; } }
    const payload: any = { message: "Update encrypted application data", content: bytesToBase64(Data.fromRawString(body)!), branch: meta.branch };
    if (sha) payload.sha = sha;
    const result = await request<any>(token, path, { method: "PUT", body: JSON.stringify(payload) });
    writeMeta({ ...meta, fileSha: result.value?.content?.sha || sha, lastUploadAt: Date.now(), lastRemoteDeleteAt: undefined, lastLocalChangeAt: undefined, lastError: undefined });
  } catch (e: any) {
    writeMeta({ ...meta, lastError: e.message || "上传失败" });
    throw e;
  } finally { busy = false; statusListener?.(); }
}

export async function downloadAndMergeGitHubData(): Promise<void> {
  const token = getGitHubToken();
  const meta = readMeta();
  if (!token || !meta) throw new GitHubSyncError("请先连接 GitHub");
  if (busy) return;
  busy = true; statusListener?.();
  try {
    const path = `/repos/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repository)}/contents/${encodePath(FILE_PATH)}?ref=${encodeURIComponent(meta.branch)}`;
    const result = await request<any>(token, path);
    const content = result.value?.content;
    if (typeof content !== "string") throw new GitHubSyncError("同步文件内容为空");
    const envelope = base64ToData(content).toDecodedString();
    const decoded = decryptSnapshot(envelope, token);
    if (!decoded?.library) throw new GitHubSyncError("远程同步资料缺少本地资料库");
    mergeRemoteLibrarySnapshot(decoded.library);
    writeMeta({ ...meta, fileSha: result.value.sha, lastDownloadAt: Date.now(), lastRemoteDeleteAt: undefined, lastError: undefined });
  } catch (e: any) {
    writeMeta({ ...meta, lastError: e.message || "读取失败" });
    throw e;
  } finally { busy = false; statusListener?.(); }
}

export async function deleteRemoteGitHubData(): Promise<void> {
  const token = getGitHubToken();
  const meta = readMeta();
  if (!token || !meta) throw new GitHubSyncError("请先连接 GitHub");
  if (busy) throw new GitHubSyncError("GitHub 同步操作正在进行，请稍后再试");
  busy = true; statusListener?.();
  try {
    const path = `/repos/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repository)}/contents/${encodePath(FILE_PATH)}`;
    let sha = "";
    try {
      const current = await request<any>(token, `${path}?ref=${encodeURIComponent(meta.branch)}`);
      sha = current.value?.sha || "";
      if (!sha) throw new GitHubSyncError("无法获取远端加密数据文件信息");
    } catch (e: any) {
      if (e?.status !== 404) throw e;
    }
    if (sha) {
      try {
        await request<any>(token, path, {
          method: "DELETE",
          body: JSON.stringify({ message: "Delete encrypted application data", sha, branch: meta.branch }),
        });
      } catch (e: any) {
        if (e?.status !== 404) throw e;
      }
    }
    if (autoUploadTimer) {
      clearTimeout(autoUploadTimer);
      autoUploadTimer = null;
    }
    writeMeta({
      ...meta,
      fileSha: undefined,
      lastUploadAt: undefined,
      lastRemoteDeleteAt: Date.now(),
      lastLocalChangeAt: undefined,
      lastError: undefined,
    });
  } catch (e: any) {
    writeMeta({ ...meta, lastError: e.message || "删除 GitHub 数据失败" });
    throw e;
  } finally { busy = false; statusListener?.(); }
}

export function scheduleGitHubUpload(): void {
  const meta = readMeta();
  if (!getGitHubToken() || !meta) return;
  const next = { ...meta, lastLocalChangeAt: Date.now(), lastError: undefined };
  writeMeta(next);
  if (autoUploadTimer) clearTimeout(autoUploadTimer);
  autoUploadTimer = setTimeout(() => { uploadGitHubData().catch(() => {}); }, AUTO_UPLOAD_DELAY);
}

export function githubSyncFilePath(): string { return FILE_PATH; }
export function getGitHubSyncDebugInfo(): string {
  const status = getGitHubSyncStatus();
  const meta = status.meta;
  return [
    `Token: ${getGitHubToken() ? "present" : "missing"}`,
    `Connected: ${status.connected}`,
    `Busy: ${status.busy}`,
    `Owner: ${meta?.owner || "-"}`,
    `Repository: ${meta?.repository || "-"}`,
    `Branch: ${meta?.branch || "-"}`,
    `File: ${FILE_PATH}`,
    `Dirty since: ${meta?.lastLocalChangeAt ? new Date(meta.lastLocalChangeAt).toISOString() : "-"}`,
    `Last upload: ${meta?.lastUploadAt ? new Date(meta.lastUploadAt).toISOString() : "-"}`,
    `Last download: ${meta?.lastDownloadAt ? new Date(meta.lastDownloadAt).toISOString() : "-"}`,
    `Last remote delete: ${meta?.lastRemoteDeleteAt ? new Date(meta.lastRemoteDeleteAt).toISOString() : "-"}`,
    `Last error: ${meta?.lastError || "-"}`,
    `Encryption: AES-256-GCM / local Keychain key`,
  ].join("\n");
}

