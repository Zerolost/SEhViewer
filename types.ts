

export type EHCategory =
  | "Doujinshi"
  | "Manga"
  | "Artist CG"
  | "Game CG"
  | "Western"
  | "Non-H"
  | "Image Set"
  | "Cosplay"
  | "Asian Porn"
  | "Misc"
  | "Private";

export type TagNamespace =
  | "artist"
  | "character"
  | "cosplayer"
  | "female"
  | "group"
  | "language"
  | "location"
  | "male"
  | "mixed"
  | "other"
  | "parody"
  | "reclass"
  | "temp";

export interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
}

export interface EHTagListItem {
  namespace: TagNamespace;
  name: string;
  tagid?: number;
  watched?: boolean;
  hidden?: boolean;
}

export interface EHGalleryListItem {
  gid: number;
  token: string;
  title: string;
  englishTitle?: string;
  japaneseTitle?: string;
  thumbnailUrl: string;
  category: EHCategory;
  postedTime: string;
  fileCount: number;
  fileSize?: string;
  rating: number;
  isMyRating?: boolean;
  visible: boolean;
  tags: EHTagListItem[];
  uploader?: string;
  expunged?: boolean;
  torrentCount?: number;
  pageCount?: number;
  language?: string;
  isAI?: boolean;
}

export interface EHGalleryDetail {
  gid: number;
  token: string;
  title: string;
  englishTitle?: string;
  japaneseTitle?: string;
  category: EHCategory;
  uploader: string;
  postedTime: string;
  rating: number;
  ratingCount: number;
  fileCount: number;
  fileSize: string;
  language?: string;
  tags: EHTagListItem[];
  parentGid?: number;
  parentKey?: string;
   
  parentTitle?: string;
   
  visibleText?: string;
   
  invisibleCause?: string;
  favorited: boolean;
  favcat?: number;
   
  coverUrl?: string;
  favoriteCount?: number;
  torrentCount: number;
  commentCount: number;
   
  comments: EHComment[];
  visible: boolean;
  expunged?: boolean;
  images: EHImageItem[];
  pageCount?: number;
  isAI?: boolean;
}

 
export interface EHComment {
   
  id: string;
  commenter: string;
   
  postedTime: string;
   
  type?: string;
  isUploader: boolean;
  body: string;
  score: number;
  voteCount: number;
}

export interface EHImageItem {
  page: number; 
  name: string;
  imgkey: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  showkey?: string;
   
  spriteX?: number;
}

export interface EHPageInfo {
  imageUrl: string;
  reloadKey?: string;
  page: number;
}

export interface EHMPVInfo {
  gid: number;
  token: string;
  mpvkey: string;
  imageKeys: string[];
}

export interface GidToken {
  gid: number;
  token: string;
}

export interface SearchOptions {
  keyword?: string;
  categories?: EHCategory[];
  excludedCategories?: EHCategory[];
  page?: number;
  minRating?: number;
  minPages?: number;
  maxPages?: number;
  searchInTitle?: boolean;
  searchInTags?: boolean;
  searchInDescription?: boolean;
  searchInTorrents?: boolean;
  onlyShowWithTorrents?: boolean;
  lowPowerTags?: boolean;
  searchDownvoted?: boolean;
  searchExpunged?: boolean;
  advsearch?: string;
  fSearch?: string;
}

export type AppearanceMode = "system" | "light" | "dark";

export type ReaderMode = "swipe" | "tap";
export type EdgeAction = "prev" | "next" | "none";

export interface Config {
  cookie: string;
  exhentai: boolean;
  githubToken: string;
  pageDirection: "left_to_right" | "right_to_left" | "vertical";
   
  readerMode: ReaderMode;
   
  leftEdgeAction: EdgeAction;
  rightEdgeAction: EdgeAction;
  autoClearCache: boolean;
  autoCacheWhenReading: boolean;
  appearance: AppearanceMode;
}

export const defaultConfig: Config = {
  cookie: "",
  exhentai: false,
  githubToken: "",
  pageDirection: "right_to_left",
  readerMode: "swipe",
  leftEdgeAction: "prev",
  rightEdgeAction: "next",
  autoClearCache: false,
  autoCacheWhenReading: false,
  appearance: "system",
};


export const categoryTranslations: Record<EHCategory, string> = {
  Doujinshi: "同人志",
  Manga: "漫画",
  "Artist CG": "画师CG",
  "Game CG": "游戏CG",
  Western: "西方",
  "Non-H": "非H",
  "Image Set": "图集",
  Cosplay: "Cosplay",
  "Asian Porn": "亚洲色情",
  Misc: "杂项",
  Private: "私有",
};


export const namespaceTranslations: Record<TagNamespace, string> = {
  artist: "艺术家",
  character: "角色",
  cosplayer: "Coser",
  female: "女性",
  group: "社团",
  language: "语言",
  location: "地点",
  male: "男性",
  mixed: "混合",
  other: "其他",
  parody: "原作",
  reclass: "重分类",
  temp: "临时",
};


export const categoryColors: Record<EHCategory, string> = {
  Doujinshi: "#F44336",
  Manga: "#FF9800",
  "Artist CG": "#FBC02D",
  "Game CG": "#4CAF50",
  Western: "#8BC34A",
  "Non-H": "#2196F3",
  "Image Set": "#3F51B5",
  Cosplay: "#9C27B0",
  "Asian Porn": "#9575CD",
  Misc: "#F06292",
  Private: "#5A5A5D",
};


export const namespaceColors: Record<TagNamespace, string> = {
  artist: "#E6D6D0",
  character: "#D5E4F7",
  cosplayer: "#F5D5E5",
  female: "#FAE0D4",
  group: "#DFD6F7",
  language: "#F5D5E5",
  location: "#F5DFF5",
  male: "#F9EED8",
  mixed: "#D7D7D6",
  other: "#FBD6D5",
  parody: "#D8E6E2",
  reclass: "#FBD6D5",
  temp: "#D7D7D6",
};

export function extractGidToken(url: string): GidToken | null {
  const match = url.match(/\/g\/(\d+)\/([a-f0-9]+)/);
  if (match) {
    return { gid: parseInt(match[1]), token: match[2] };
  }
  const altMatch = url.match(/gid=(\d+).*?token=([a-f0-9]+)/);
  if (altMatch) {
    return { gid: parseInt(altMatch[1]), token: altMatch[2] };
  }
  return null;
}

export function extractTitle(gallery: EHGalleryListItem): string {
  if (gallery.englishTitle) return gallery.englishTitle;
  if (gallery.japaneseTitle) return gallery.japaneseTitle;
  return gallery.title || "无标题";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
