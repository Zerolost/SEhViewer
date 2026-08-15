import type { EHCategory, EHGalleryDetail, EHGalleryListItem, EHTagListItem } from "./types";

const LOCAL_LIBRARY_KEY = "sehviewer_local_library_v1";
const PRIVATE_BROWSING_KEY = "sehviewer_private_browsing_v1";
const HISTORY_LIMIT = 800;

export interface LocalGalleryRecord {
  key: string;
  gid: number;
  token: string;
  site: "eh" | "ex";
  title: string;
  englishTitle?: string;
  japaneseTitle?: string;
  thumbnailUrl: string;
  category: EHCategory;
  postedTime: string;
  fileCount: number;
  rating: number;
  uploader?: string;
  language?: string;
  isAI?: boolean;
  tags?: EHTagListItem[];
  firstVisitedAt: number;
  lastVisitedAt: number;
  visitCount: number;
  favoritedAt?: number;
}

export interface LocalTagFavoriteRecord {
  key: string;
  site: "eh" | "ex";
  namespace: string;
  name: string;
  query: string;
  favoritedAt: number;
}

export interface LocalLibraryData {
  version: 2;
  records: Record<string, LocalGalleryRecord>;
  historyOrder: string[];
  favoriteOrder: string[];
  tagRecords: Record<string, LocalTagFavoriteRecord>;
  tagFavoriteOrder: string[];
}

const subscribers = new Set<() => void>();
let cachedLibrary: LocalLibraryData | null = null;
let applyingRemoteMerge = false;

function emptyLibrary(): LocalLibraryData {
  return { version: 2, records: {}, historyOrder: [], favoriteOrder: [], tagRecords: {}, tagFavoriteOrder: [] };
}

function uniqueExisting<T>(keys: unknown, records: Record<string, T>): string[] {
  if (!Array.isArray(keys)) return [];
  const seen = new Set<string>();
  return keys.filter((value): value is string => {
    if (typeof value !== "string" || !records[value] || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function loadData(): LocalLibraryData {
  if (cachedLibrary) return cachedLibrary;
  try {
    const raw = Storage.get(LOCAL_LIBRARY_KEY) as string;
    if (!raw) {
      cachedLibrary = emptyLibrary();
      return cachedLibrary;
    }
    const parsed = JSON.parse(raw);
    const records = parsed && typeof parsed.records === "object" && parsed.records ? parsed.records as Record<string, LocalGalleryRecord> : {};
    const tagRecords = parsed && typeof parsed.tagRecords === "object" && parsed.tagRecords ? parsed.tagRecords as Record<string, LocalTagFavoriteRecord> : {};
    cachedLibrary = {
      version: 2,
      records,
      historyOrder: uniqueExisting(parsed.historyOrder, records),
      favoriteOrder: uniqueExisting(parsed.favoriteOrder, records),
      tagRecords,
      tagFavoriteOrder: uniqueExisting(parsed.tagFavoriteOrder, tagRecords),
    };
    return cachedLibrary;
  } catch {
    cachedLibrary = emptyLibrary();
    return cachedLibrary;
  }
}

function saveData(data: LocalLibraryData): void {
  cachedLibrary = data;
  Storage.set(LOCAL_LIBRARY_KEY, JSON.stringify(data));
  subscribers.forEach((listener) => {
    try { listener(); } catch {}
  });
}

function recordKey(gid: number, site: "eh" | "ex"): string {
  return `${site}:${gid}`;
}

function moveToFront(list: string[], key: string): string[] {
  return [key, ...list.filter((item) => item !== key)];
}

function prune(data: LocalLibraryData): void {
  if (data.historyOrder.length > HISTORY_LIMIT) {
    const removed = data.historyOrder.splice(HISTORY_LIMIT);
    removed.forEach((key) => {
      if (!data.favoriteOrder.includes(key)) delete data.records[key];
    });
  }
}

export function isApplyingRemoteLibraryMerge(): boolean {
  return applyingRemoteMerge;
}

export function exportLocalLibrarySnapshot(): LocalLibraryData {
  const data = loadData();
  return JSON.parse(JSON.stringify(data)) as LocalLibraryData;
}

export function mergeRemoteLibrarySnapshot(remote: LocalLibraryData): void {
  if (!remote || remote.version !== 2 || typeof remote.records !== "object" || typeof remote.tagRecords !== "object") {
    throw new Error("远程资料库版本不受支持");
  }
  const local = loadData();
  const merged: LocalLibraryData = {
    version: 2,
    records: { ...local.records },
    historyOrder: [],
    favoriteOrder: [],
    tagRecords: { ...local.tagRecords },
    tagFavoriteOrder: [],
  };
  Object.keys(remote.records).forEach((key) => {
    const incoming = remote.records[key];
    const current = merged.records[key];
    if (!current || (incoming.lastVisitedAt || 0) >= (current.lastVisitedAt || 0)) {
      merged.records[key] = { ...incoming, visitCount: Math.max(current?.visitCount || 0, incoming.visitCount || 0) };
    } else if (current) {
      current.visitCount = Math.max(current.visitCount || 0, incoming.visitCount || 0);
    }
  });
  Object.keys(remote.tagRecords).forEach((key) => {
    const incoming = remote.tagRecords[key];
    const current = merged.tagRecords[key];
    if (!current || incoming.favoritedAt >= current.favoritedAt) merged.tagRecords[key] = incoming;
  });
  merged.historyOrder = Object.values(merged.records)
    .filter((record) => record.lastVisitedAt > 0)
    .sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
    .map((record) => record.key).slice(0, HISTORY_LIMIT);
  merged.favoriteOrder = Object.values(merged.records)
    .filter((record) => record.favoritedAt)
    .sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
    .map((record) => record.key);
  merged.tagFavoriteOrder = Object.values(merged.tagRecords)
    .sort((a, b) => b.favoritedAt - a.favoritedAt)
    .map((record) => record.key);
  applyingRemoteMerge = true;
  try { saveData(merged); } finally { applyingRemoteMerge = false; }
}

export function invalidateLocalLibraryCache(): void {
  cachedLibrary = null;
}

export function subscribeLocalLibrary(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function isPrivateBrowsingEnabled(): boolean {
  try {
    return Storage.get(PRIVATE_BROWSING_KEY) === true;
  } catch {
    return false;
  }
}

export function setPrivateBrowsingEnabled(enabled: boolean): void {
  try {
    Storage.set(PRIVATE_BROWSING_KEY, enabled);
  } catch {}
}

export function recordGalleryVisit(detail: EHGalleryDetail, site: "eh" | "ex"): LocalGalleryRecord | null {
  if (isPrivateBrowsingEnabled()) return null;
  const data = loadData();
  const key = recordKey(detail.gid, site);
  const previous = data.records[key];
  const now = Date.now();
  const record: LocalGalleryRecord = {
    key,
    gid: detail.gid,
    token: detail.token,
    site,
    title: detail.title || detail.englishTitle || detail.japaneseTitle || `#${detail.gid}`,
    englishTitle: detail.englishTitle,
    japaneseTitle: detail.japaneseTitle,
    thumbnailUrl: detail.coverUrl || previous?.thumbnailUrl || "",
    category: detail.category,
    postedTime: detail.postedTime || previous?.postedTime || "",
    fileCount: detail.fileCount || previous?.fileCount || 0,
    rating: detail.rating || 0,
    uploader: detail.uploader,
    language: detail.language,
    isAI: detail.isAI,
    tags: detail.tags.map((tag: EHTagListItem) => ({ namespace: tag.namespace, name: tag.name })),
    firstVisitedAt: previous?.firstVisitedAt || now,
    lastVisitedAt: now,
    visitCount: (previous?.visitCount || 0) + 1,
    favoritedAt: previous?.favoritedAt,
  };
  data.records[key] = record;
  data.historyOrder = moveToFront(data.historyOrder, key);
  prune(data);
  saveData(data);
  return record;
}

export function isLocalFavorite(gid: number, site: "eh" | "ex"): boolean {
  const data = loadData();
  return data.favoriteOrder.includes(recordKey(gid, site));
}

export function setLocalFavorite(detail: EHGalleryDetail, site: "eh" | "ex", favorite: boolean): boolean {
  const data = loadData();
  const key = recordKey(detail.gid, site);
  const now = Date.now();
  const previous = data.records[key];
  data.records[key] = {
    key,
    gid: detail.gid,
    token: detail.token,
    site,
    title: detail.title || detail.englishTitle || detail.japaneseTitle || `#${detail.gid}`,
    englishTitle: detail.englishTitle,
    japaneseTitle: detail.japaneseTitle,
    thumbnailUrl: detail.coverUrl || previous?.thumbnailUrl || "",
    category: detail.category,
    postedTime: detail.postedTime || previous?.postedTime || "",
    fileCount: detail.fileCount || previous?.fileCount || 0,
    rating: detail.rating || 0,
    uploader: detail.uploader,
    language: detail.language,
    isAI: detail.isAI,
    tags: detail.tags.map((tag: EHTagListItem) => ({ namespace: tag.namespace, name: tag.name })),
    firstVisitedAt: previous?.firstVisitedAt || now,
    lastVisitedAt: previous?.lastVisitedAt || now,
    visitCount: previous?.visitCount || 0,
    favoritedAt: favorite ? now : undefined,
  };
  data.favoriteOrder = favorite ? moveToFront(data.favoriteOrder, key) : data.favoriteOrder.filter((item) => item !== key);
  if (!favorite && !data.historyOrder.includes(key)) delete data.records[key];
  saveData(data);
  return favorite;
}

export function listLocalHistory(): LocalGalleryRecord[] {
  const data = loadData();
  return data.historyOrder.map((key) => data.records[key]).filter(Boolean);
}

export function listLocalFavorites(): LocalGalleryRecord[] {
  const data = loadData();
  return data.favoriteOrder.map((key) => data.records[key]).filter(Boolean);
}

export function removeLocalHistory(key: string): void {
  const data = loadData();
  data.historyOrder = data.historyOrder.filter((item) => item !== key);
  if (!data.favoriteOrder.includes(key)) delete data.records[key];
  saveData(data);
}

export function clearLocalHistory(): void {
  const data = loadData();
  const favoriteKeys = new Set(data.favoriteOrder);
  data.historyOrder.forEach((key) => {
    if (!favoriteKeys.has(key)) delete data.records[key];
  });
  data.historyOrder = [];
  saveData(data);
}

export function removeLocalFavorite(key: string): void {
  const data = loadData();
  data.favoriteOrder = data.favoriteOrder.filter((item) => item !== key);
  if (data.records[key]) data.records[key].favoritedAt = undefined;
  if (!data.historyOrder.includes(key)) delete data.records[key];
  saveData(data);
}

export function clearLocalFavorites(): void {
  const data = loadData();
  const historyKeys = new Set(data.historyOrder);
  data.favoriteOrder.forEach((key) => {
    if (!historyKeys.has(key)) delete data.records[key];
    else if (data.records[key]) data.records[key].favoritedAt = undefined;
  });
  data.favoriteOrder = [];
  saveData(data);
}

function normalizeTagPart(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function localTagFavoriteKey(site: "eh" | "ex", namespace: string, name: string): string {
  return `${site}:${encodeURIComponent(normalizeTagPart(namespace))}:${encodeURIComponent(normalizeTagPart(name))}`;
}

export function listLocalTagFavorites(): LocalTagFavoriteRecord[] {
  const data = loadData();
  return data.tagFavoriteOrder.map((key) => data.tagRecords[key]).filter(Boolean);
}

export function isLocalTagFavorite(site: "eh" | "ex", namespace: string, name: string): boolean {
  return !!loadData().tagRecords[localTagFavoriteKey(site, namespace, name)];
}

export function setLocalTagFavorite(input: Omit<LocalTagFavoriteRecord, "key" | "favoritedAt">): LocalTagFavoriteRecord | null {
  const namespace = input.namespace.trim();
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return null;
  const data = loadData();
  const key = localTagFavoriteKey(input.site, namespace, name);
  const record: LocalTagFavoriteRecord = {
    key,
    site: input.site,
    namespace,
    name,
    query: input.query,
    favoritedAt: data.tagRecords[key]?.favoritedAt || Date.now(),
  };
  data.tagRecords[key] = record;
  data.tagFavoriteOrder = moveToFront(data.tagFavoriteOrder, key);
  saveData(data);
  return { ...record };
}

export function removeLocalTagFavorite(key: string): void {
  const data = loadData();
  delete data.tagRecords[key];
  data.tagFavoriteOrder = data.tagFavoriteOrder.filter((item) => item !== key);
  saveData(data);
}

export function clearLocalTagFavorites(): void {
  const data = loadData();
  data.tagRecords = {};
  data.tagFavoriteOrder = [];
  saveData(data);
}

export function localRecordToGalleryItem(record: LocalGalleryRecord): EHGalleryListItem {
  return {
    gid: record.gid,
    token: record.token,
    title: record.title,
    englishTitle: record.englishTitle,
    japaneseTitle: record.japaneseTitle,
    thumbnailUrl: record.thumbnailUrl,
    category: record.category,
    postedTime: record.postedTime,
    fileCount: record.fileCount,
    rating: record.rating,
    visible: true,
    tags: (record.tags || []).map((tag) => ({ namespace: tag.namespace, name: tag.name })),
    uploader: record.uploader,
    language: record.language,
    isAI: record.isAI,
  };
}
