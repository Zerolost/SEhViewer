import {
  ParsedCookie,
  EHGalleryListItem,
  EHGalleryDetail,
  EHImageItem,
  EHPageInfo,
  EHMPVInfo,
  SearchOptions,
  EHTagListItem,
  TagNamespace,
  EHCategory,
  EHComment,
  EHGallerySearchPage,
  EHGalleryBrowsePage,
} from "./types";


const EH_BASE = "https://e-hentai.org";
const EX_BASE = "https://exhentai.org";

export class EHApiClient {
  private _cookies: ParsedCookie[] = [];
  private _exhentai = false;
  private _userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
  private _galleryInfoInFlight = new Map<string, Promise<EHGalleryDetail>>();

  get baseUrl(): string {
    return this._exhentai ? EX_BASE : EH_BASE;
  }

  get exhentai(): boolean {
    return this._exhentai;
  }

  set exhentai(v: boolean) {
    
    if (v && !this.isLoggedIn) {
      console.warn('[SEhViewer] 无法开启里站：未登录');
      return;
    }
    this._exhentai = v;
  }

  updateCookie(cookies: ParsedCookie[]): void {
    this._cookies = cookies;
    this._galleryInfoInFlight.clear();
  }

  get cookies(): ParsedCookie[] {
    return this._cookies;
  }

  private getCookieString(): string {
    return this._cookies
      .filter((c) => {
        const domain = (c.domain || "").trim().toLowerCase().replace(/^\./, "");
        const allowedDomain =
          domain === "" ||
          domain === "e-hentai.org" ||
          domain.endsWith(".e-hentai.org") ||
          domain === "exhentai.org" ||
          domain.endsWith(".exhentai.org");
        const expiresAt = c.expires ? Date.parse(c.expires) : NaN;
        const isExpired = Number.isFinite(expiresAt) && expiresAt <= Date.now();
        return allowedDomain && !isExpired;
      })
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  }

  private getMemberId(): string {
    const c = this._cookies.find((c) => c.name === "ipb_member_id");
    return c?.value || "";
  }

  private getPassHash(): string {
    const c = this._cookies.find((c) => c.name === "ipb_pass_hash");
    return c?.value || "";
  }

  get isLoggedIn(): boolean {
    return !!this.getMemberId() && !!this.getPassHash();
  }

   
  get canAccessExhentai(): boolean {
    return this.isLoggedIn && this._exhentai;
  }

   
  get hasIgneous(): boolean {
    return !!this._cookies.find((c) => c.name === "igneous" && c.value);
  }

  private async request(
    path: string,
    options: {
      method?: string;
      body?: string;
      headers?: Record<string, string>;
      formData?: Record<string, string>;
      baseUrl?: string;
    } = {},
  ): Promise<{ text: string; status: number; url: string }> {
    const base = options.baseUrl || this.baseUrl;
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const requestHost = new URL(url).hostname;
    const isEHHost =
      requestHost === "e-hentai.org" || requestHost.endsWith(".e-hentai.org") ||
      requestHost === "exhentai.org" || requestHost.endsWith(".exhentai.org");
    const cookieStr = isEHHost ? this.getCookieString() : "";

    const headers: Record<string, string> = {
      "User-Agent": this._userAgent,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...(options.headers || {}),
    };

    if (cookieStr) {
      headers["Cookie"] = cookieStr;
    }

    let body: string | undefined;
    if (options.formData) {
      const params = new URLSearchParams(options.formData);
      body = params.toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (options.body) {
      body = options.body;
    }

    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      let timeoutId: any;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("请求超时，请检查网络")), 15000);
        });
        const resp = await Promise.race([
          fetch(url, {
            method: options.method || "GET",
            headers,
            body,
            redirect: "follow",
          }),
          timeout,
        ]);
        clearTimeout(timeoutId);

        const text = await resp.text();

        
        if (
          text.includes("Just a moment") ||
          text.includes("cf-browser-verification") ||
          text.includes("Attention Required! Cloudflare")
        ) {
          const error: any = new Error("站点反爬校验拦截，请稍后重试");
          error.retryable = true;
          throw error;
        }

        if (resp.status === 403 && this._exhentai) {
          const error: any = new Error(
            "里站访问被拒（403）：可能为 IP 受限、Cloudflare 拦截或会话已失效。请稍后重试；若持续失败，请在 Safari 打开 exhentai.org 确认可正常访问后，重新获取 Cookie"
          );
          error.retryable = false;
          throw error;
        }
        if (resp.status === 408 || resp.status === 429 || resp.status >= 500) {
          lastError = new Error(`站点暂时不可用：HTTP ${resp.status}`);
          lastError.retryable = true;
          if (attempt === 0) {
            await new Promise<void>((r) => setTimeout(() => r(), 800));
            continue;
          }
          throw lastError;
        }

        return { text, status: resp.status, url: resp.url };
      } catch (e: any) {
        clearTimeout(timeoutId);
        lastError = e;
        if (e?.retryable === false) throw e;
        if (attempt === 0) {
          await new Promise<void>((r) => setTimeout(() => r(), 800));
        }
      }
    }
    throw lastError || new Error("请求失败");
  }

  

  async getFrontPage(page: number = 0, forceNetwork: boolean = false): Promise<EHGalleryListItem[]> {
    const url = page === 0 ? "/" : `/?page=${page}`;
    return this.parseGalleryList(url, "front_page", forceNetwork);
  }

   
  async getHome(page: number = 0, forceNetwork: boolean = false): Promise<EHGalleryListItem[]> {
    if (this._exhentai && !this.isLoggedIn) throw new Error("需要登录才能访问里站推荐");
    const url = page === 0 ? "/" : `/?page=${page}`;
    return this.parseGalleryList(url, "home", forceNetwork);
  }

  async getPopular(page: number = 0, forceNetwork: boolean = false): Promise<EHGalleryListItem[]> {
    if (page > 0) return [];
    return this.parseGalleryList("/popular", "popular", forceNetwork);
  }
  async getBrowsePage(options: {
    type: "home" | "category";
    category?: EHCategory;
    cursor?: number;
  }, forceNetwork: boolean = false): Promise<EHGalleryBrowsePage> {
    if (options.type === "home" && this._exhentai && !this.isLoggedIn) {
      throw new Error("需要登录才能访问里站推荐");
    }
    const path = this.buildSearchPath({
      categories: options.category ? [options.category] : undefined,
      cursor: options.cursor,
    }, true);
    const requestPath = forceNetwork
      ? `${path}${path.includes("?") ? "&" : "?"}_refresh=${Date.now()}`
      : path;
    const response = await this.request(requestPath, forceNetwork ? {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    } : undefined);
    const { text, status } = response;
    if (status < 200 || status >= 300) throw new Error(`图库请求失败：HTTP ${status}`);
    if (
      /\/bounce_login\.php(?:\?|$)/i.test(response.url || "") ||
      /<title>[^<]*(?:login|log on)[^<]*<\/title>/i.test(text) ||
      /this page requires you to log on/i.test(text)
    ) {
      throw new Error("登录会话已失效，请重新获取 Cookie");
    }
    const items = this.parseGalleryListHTML(text);
    const nextMatch = text.match(/(?:[?&]|&amp;)next=(\d+)/i);
    const nextCursor = nextMatch ? parseInt(nextMatch[1], 10) : undefined;
    if (items.length === 0 && !/class="[^"]*\b(?:itg|gl1t|gl1m)\b/i.test(text)) {
      throw new Error(`${options.type === "home" ? "推荐" : "分类"}页面结构无法识别，请稍后重试`);
    }
    return { items, nextCursor };
  }

  async getFavorites(page: number = 0, favcat: string = "all"): Promise<EHGalleryListItem[]> {
    if (!this.isLoggedIn) throw new Error("需要登录才能访问收藏");
    const favParam = favcat === "all" ? "" : `&favcat=${favcat}`;
    return this.parseGalleryList(`/favorites.php?page=${page}${favParam}`, "favorites");
  }

  async getToplist(page: number = 0): Promise<EHGalleryListItem[]> {
    return this.parseGalleryList(`/toplist.php?page=${page}`, "toplist");
  }

  async getUpload(page: number = 0): Promise<EHGalleryListItem[]> {
    return this.parseGalleryList(`/upload.php?page=${page}`, "upload");
  }
  async search(options: SearchOptions, forceNetwork: boolean = false): Promise<EHGalleryListItem[]> {
    const path = this.buildSearchPath(options);
    const requestPath = forceNetwork
      ? `${path}${path.includes("?") ? "&" : "?"}_refresh=${Date.now()}`
      : path;
    const { text } = await this.request(requestPath, forceNetwork ? {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    } : undefined);
    return this.parseGalleryListHTML(text);
  }
  async searchPage(options: SearchOptions): Promise<EHGallerySearchPage> {
    const response = await this.request(this.buildSearchPath(options, true));
    const { text, status } = response;
    const finalUrl = response.url || "";
    if (status < 200 || status >= 300) {
      throw new Error(`搜索请求失败：HTTP ${status}`);
    }
    if (
      /\/bounce_login\.php(?:\?|$)/i.test(finalUrl) ||
      /<title>[^<]*(?:login|log on)[^<]*<\/title>/i.test(text) ||
      /this page requires you to log on/i.test(text)
    ) {
      throw new Error("登录会话已失效，请重新获取 Cookie");
    }

    const parsedItems = this.parseGalleryListHTML(text);
    const noHits = /No hits found/i.test(text);
    const totalMatch = text.match(/Found\s+(about\s+)?([\d,]+)\s+results?/i);
    if (!noHits && !totalMatch && parsedItems.length === 0) {
      throw new Error("搜索页面结构无法识别，请稍后重试");
    }

    const totalCount = noHits
      ? 0
      : totalMatch
        ? parseInt(totalMatch[2].replace(/,/g, ""), 10)
        : parsedItems.length;
    const totalIsApproximate = !!totalMatch?.[1];
    const items = parsedItems.slice(0, 20);
    const nativeHasNext = /\bnexturl\s*=\s*["'][^"']+["']/i.test(text);
    const nextCursor = items.length === 20 && (parsedItems.length > 20 || nativeHasNext)
      ? items[19].gid
      : undefined;

    return { items, totalCount, totalIsApproximate, nextCursor };
  }

  private buildSearchPath(options: SearchOptions, useCursor: boolean = false): string {
    const query: Record<string, string> = {};

    if (options.keyword) {
      query.f_search = options.keyword;
    } else if (options.fSearch) {
      query.f_search = options.fSearch;
    }

    if (options.categories && options.categories.length > 0) {
      const categoryBits: Record<EHCategory, number> = {
        "Misc": 1,
        "Doujinshi": 2,
        "Manga": 4,
        "Artist CG": 8,
        "Game CG": 16,
        "Image Set": 32,
        "Cosplay": 64,
        "Asian Porn": 128,
        "Non-H": 256,
        "Western": 512,
      };
      const includedMask = options.categories.reduce<number>(
        (mask: number, category: EHCategory) => mask | categoryBits[category],
        0,
      );
      query.f_cats = String(1023 & ~includedMask);
    }

    if (useCursor && options.cursor !== undefined && options.cursor > 0) {
      query.next = String(options.cursor);
    } else if (options.page !== undefined && options.page > 0) {
      query.page = String(options.page);
    }

    if (options.minRating !== undefined) {
      query.f_sr = "on";
      query.f_srdd = String(options.minRating + 1);
    }

    if (options.minPages !== undefined) {
      query.f_sp = "on";
      query.f_spf = String(options.minPages);
      if (options.maxPages !== undefined) {
        query.f_spt = String(options.maxPages);
      }
    }

    if (options.searchInTitle) query.f_sto = "on";
    if (options.searchInTags) query.f_sta = "on";
    if (options.searchInDescription === false) query.f_sdt1 = "on";
    if (options.searchInTorrents) query.f_sht = "on";
    if (options.onlyShowWithTorrents) query.f_sdt2 = "on";
    if (options.lowPowerTags) query.f_sfl = "on";
    if (options.searchDownvoted) query.f_sh = "on";
    if (options.searchExpunged) query.f_sfd = "on";

    const searchParams = Object.entries(query)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
    return searchParams ? `/?${searchParams}` : "/";
  }

  

  async getGalleryInfo(gid: number, token: string, page: number = 0): Promise<EHGalleryDetail> {
    const key = `${this.baseUrl}:${gid}:${token}:${page}`;
    const existing = this._galleryInfoInFlight.get(key);
    if (existing) return existing;

    const task = (async () => {
      const url = `/g/${gid}/${token}/?p=${page}`;
      const { text } = await this.request(url);

      if (text.includes("Gallery Not Available") || /content warning/i.test(text)) {
        throw new Error("图库不可用");
      }
      if (!/<(?:h1|div)\b[^>]*(?:id=["'](?:gn|gdc)|class=["'][^"']*gdt)/i.test(text)) {
        throw new Error("图库详情页面结构无法识别，请稍后重试");
      }

      return this.parseGalleryDetail(text, gid, token, page);
    })();
    this._galleryInfoInFlight.set(key, task);
    try {
      return await task;
    } finally {
      if (this._galleryInfoInFlight.get(key) === task) this._galleryInfoInFlight.delete(key);
    }
  }

  

  async getMPVInfo(gid: number, token: string): Promise<EHMPVInfo | null> {
    try {
      const { text } = await this.request(`/g/${gid}/${token}/?p=0`);
      return this.parseMPVInfo(text, gid, token);
    } catch {
      return null;
    }
  }

  

  async getPageInfo(
    gid: number,
    imgkey: string,
    page: number,
    reloadKey?: string,
  ): Promise<EHPageInfo> {
    return this.fetchImageInfoByShowpage(gid, imgkey, page, reloadKey);
  }

   
  async fetchImageInfoByShowpage(
    gid: number,
    showkey: string,
    page: number,
    reloadKey?: string,
  ): Promise<EHPageInfo> {
    const reloadQuery = reloadKey ? `?nl=${encodeURIComponent(reloadKey)}` : "";
    const { text } = await this.request(`/s/${showkey}/${gid}-${page + 1}${reloadQuery}`, {
      headers: { Accept: "text/html" },
    });

    return this.parseImagePageHTML(text, page);
  }

  async fetchImageInfoByShowpageAPI(
    gid: number,
    imgkey: string,
    showkey: string,
    page: number,
  ): Promise<EHPageInfo> {
    const { text } = await this.request("/api.php", {
      method: "POST",
      body: JSON.stringify({
        method: "showpage",
        gid,
        page: page + 1,
        imgkey,
        showkey,
      }),
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(`解析 showpage 响应失败: ${error}`);
    }
    if (data.error) throw new Error(String(data.error));
    const html = String(data.i3 || "");
    const imageHTML = String(data.i3 || data.i || "");
    const imageUrl = this.extractImageUrl(imageHTML);
    if (!imageUrl) throw new Error("showpage 响应中没有有效图片");
    const metadata = this.parseImageMetadata(String(data.i || ""));
    return {
      imageUrl,
      page,
      reloadKey: this.extractReloadKey(String(data.i6 || html)),
      size: {
        width: Number(data.x) || metadata.size?.width || 0,
        height: Number(data.y) || metadata.size?.height || 0,
      },
      fileSize: metadata.fileSize,
    };
  }

  async fetchImageInfoByImageDispatch(
    gid: number,
    imgkey: string,
    mpvkey: string,
    page: number,
    reloadKey?: string,
  ): Promise<EHPageInfo> {
    const body: Record<string, number | string> = {
      method: "imagedispatch",
      gid,
      page: page + 1,
      imgkey,
      mpvkey,
    };
    if (reloadKey) body.nl = reloadKey;
    const { text } = await this.request("/api.php", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(`解析 imagedispatch 响应失败: ${error}`);
    }
    if (data.error) throw new Error(String(data.error));
    const imageUrl = this.normalizeResourceUrl(String(data.i || ""));
    if (!imageUrl) throw new Error("imagedispatch 响应中没有有效图片");
    const metadata = this.parseImageMetadata(String(data.d || ""));
    const original = String(data.o || "").match(/Download original\s+(\d+)\s+x\s+(\d+)\s+(.+?)(?:\s+source)?$/i);
    return {
      imageUrl,
      page,
      reloadKey: data.s ? String(data.s) : undefined,
      size: {
        width: Number(data.xres) || metadata.size?.width || 0,
        height: Number(data.yres) || metadata.size?.height || 0,
      },
      fileSize: metadata.fileSize,
      fullSizeUrl: data.lf ? this.normalizeResourceUrl(String(data.lf)) : undefined,
      fullSize: original ? { width: parseInt(original[1]), height: parseInt(original[2]) } : metadata.size,
      fullFileSize: original?.[3] || metadata.fileSize,
    };
  }

  private parseImagePageHTML(html: string, page: number): EHPageInfo {
    const imageUrl = this.extractImageUrl(html);
    if (!imageUrl) throw new Error("图片页面结构无法识别，请稍后重试");
    const metadata = this.parseImageMetadata(html);
    const showkey = this.extractShowkey(html);
    const original = html.match(/<a\b[^>]*href=["']([^"']*\/fullimg\/[^"']+)["'][^>]*>[\s\S]*?Download original\s+(\d+)\s+x\s+(\d+)\s+([^<]+)</i);
    return {
      imageUrl,
      page,
      showkey: showkey || undefined,
      reloadKey: this.extractReloadKey(html) || undefined,
      size: metadata.size,
      fileSize: metadata.fileSize,
      fullSizeUrl: original ? this.normalizeResourceUrl(original[1]) : undefined,
      fullSize: original ? { width: parseInt(original[2]), height: parseInt(original[3]) } : metadata.size,
      fullFileSize: original?.[4]?.trim() || metadata.fileSize,
    };
  }

  private parseImageMetadata(html: string): { size?: { width: number; height: number }; fileSize?: string } {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    const match = text.match(/(?:^|::)\s*(\d+)\s*x\s*(\d+)\s*::\s*(\d+(?:\.\d+)?\s*(?:B|KB|MB|GB|KiB|MiB|GiB))\b/i) || text.match(/(\d+)\s*x\s*(\d+)\s*::\s*(\d+(?:\.\d+)?\s*\S+)/i);
    if (!match) return {};
    return {
      size: { width: parseInt(match[1]), height: parseInt(match[2]) },
      fileSize: match[3].trim(),
    };
  }

  private extractShowkey(html: string): string {
    return html.match(/\bvar\s+showkey\s*=\s*["']([^"']+)["']/i)?.[1] || "";
  }

  private extractReloadKey(html: string): string {
    return html.match(/\b(?:return\s+)?nl\(\s*["']([^"']+)["']\s*\)/i)?.[1] || "";
  }

  async downloadImage(url: string): Promise<Uint8Array> {
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      let timeoutId: any;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("图片请求超时")), 15000);
        });
        const resp = await Promise.race([
          fetch(url, {
            headers: {
              Referer: this.baseUrl + "/",
              "User-Agent": this._userAgent,
            },
          }),
          timeout,
        ]);
        clearTimeout(timeoutId);
        if (!resp.ok) {
          const error: any = new Error(`图片请求失败：HTTP ${resp.status}`);
          error.retryable = resp.status === 408 || resp.status === 429 || resp.status >= 500;
          throw error;
        }
        const contentType = resp.headers.get("content-type") || "";
        if (contentType && !contentType.toLowerCase().startsWith("image/")) {
          const error: any = new Error(`图片响应类型异常：${contentType}`);
          error.retryable = contentType.toLowerCase().includes("text/html");
          throw error;
        }
        const arrayBuffer = await resp.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (e: any) {
        clearTimeout(timeoutId);
        lastError = e;
        if (e?.retryable === false || attempt > 0) break;
        await new Promise<void>((r) => setTimeout(() => r(), 500));
      }
    }
    throw lastError || new Error("图片请求失败");
  }

  

  private async parseGalleryList(
    url: string,
    type: string,
    forceNetwork: boolean = false,
  ): Promise<EHGalleryListItem[]> {
    const requestUrl = forceNetwork
      ? `${url}${url.includes("?") ? "&" : "?"}_refresh=${Date.now()}`
      : url;
    const response = await this.request(requestUrl, forceNetwork ? {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    } : undefined);
    const { text, status } = response;
    const finalUrl = response.url || "";
    if (status < 200 || status >= 300) {
      throw new Error(`图库请求失败：HTTP ${status}`);
    }
    if (
      /\/bounce_login\.php(?:\?|$)/i.test(finalUrl) ||
      /<title>[^<]*(?:login|log on)[^<]*<\/title>/i.test(text) ||
      /this page requires you to log on/i.test(text)
    ) {
      throw new Error("登录会话已失效，请重新获取 Cookie");
    }

    const items = this.parseGalleryListHTML(text);
    if (items.length > 0) return items;

    const looksLikeGalleryList =
      /class="[^"]*\bitg\b/i.test(text) ||
      /class="[^"]*\bgl1t\b/i.test(text) ||
      /class="[^"]*\bgl1m\b/i.test(text);
    if (looksLikeGalleryList) return [];
    throw new Error(`${type === "home" ? "推荐" : "图库"}页面结构无法识别，请稍后重试`);
  }

  private parseGalleryListHTML(html: string): EHGalleryListItem[] {
    const results: EHGalleryListItem[] = [];

    // E-Hentai 的 Thumbnail 模式使用 gl1t，而不是旧版 gl1c/gl2c 表格。
    // 必须优先解析它，否则会退化为空列表并被错误地当成其它数据源。
    const thumbnailCards = /<div\b[^>]*class="[^"]*\bgl1t\b[^"]*"[^>]*>([\s\S]*?)(?=<div\b[^>]*class="[^"]*\bgl1t\b|<div id="gdf"|$)/gi;
    let cardMatch;
    while ((cardMatch = thumbnailCards.exec(html)) !== null) {
      const card = cardMatch[1] || "";
      const item = this.parseThumbnailCard(card);
      if (item) results.push(item);
    }
    if (results.length > 0) return results;

    const itgRowRegex =
      /<tr><td class="gl1c glcat"[^>]*>([\s\S]*?)<\/td><td class="gl2c"[^>]*>([\s\S]*?)<\/td><td class="gl3c glname"[^>]*>([\s\S]*?)<\/td><td class="gl4c glhide"[^>]*>([\s\S]*?)<\/td><\/tr>/g;
    let itgMatch;
    while ((itgMatch = itgRowRegex.exec(html)) !== null) {
      try {
        const item = this.parseItgRow(itgMatch[1], itgMatch[2], itgMatch[3], itgMatch[4]);
        if (item) results.push(item);
      } catch {
        
      }
    }
    if (results.length > 0) return results;

    // 账户显示设置或站点小改版可能改变 td 属性顺序与额外 class，
    // 用 class 名宽松提取，避免推荐页因旧正则过严而单独失败。
    const flexibleRows = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let flexibleMatch;
    while ((flexibleMatch = flexibleRows.exec(html)) !== null) {
      const row = flexibleMatch[1];
      const cat = row.match(/<td\b[^>]*class="[^"]*\bgl1c\b[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1];
      const thumb = row.match(/<td\b[^>]*class="[^"]*\bgl2c\b[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1];
      const name = row.match(/<td\b[^>]*class="[^"]*\bgl3c\b[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1];
      const info = row.match(/<td\b[^>]*class="[^"]*\bgl4c\b[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1];
      if (cat === undefined || thumb === undefined || name === undefined || info === undefined) continue;
      try {
        const item = this.parseItgRow(cat, thumb, name, info);
        if (item) results.push(item);
      } catch {}
    }

    if (results.length === 0) {
      const rowRegex = /<tr class="(gtr0|gtr1)">([\s\S]*?)<\/tr>/g;
      const rows: string[] = [];
      let match;
      while ((match = rowRegex.exec(html)) !== null) {
        rows.push(match[0]);
      }

      for (let i = 0; i < rows.length - 1; i += 2) {
        try {
          const item = this.parseGalleryRow(rows[i], rows[i + 1]);
          if (item) results.push(item);
        } catch {
          
        }
      }
    }

    
    if (results.length === 0) {
      const gl1mRegex = /<div class="gl1m">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
      let m;
      while ((m = gl1mRegex.exec(html)) !== null) {
        try {
          const item = this.parseMinimalGalleryItem(m[1]);
          if (item) results.push(item);
        } catch {
          
        }
      }
    }

    return results;
  }

   
  private parseThumbnailCard(cardHtml: string): EHGalleryListItem | null {
    const linkMatch = cardHtml.match(/href="[^"]*\/g\/(\d+)\/([a-f0-9]+)\/"/);
    if (!linkMatch) return null;
    const gid = parseInt(linkMatch[1]);
    const token = linkMatch[2];
    const titleMatch = cardHtml.match(/class="[^"]*\bgl(?:4t\s+)?(?:glname\s+)?glink\b[^"]*">([\s\S]*?)<\/div>/i) || cardHtml.match(/class="[^"]*\bglink\b[^"]*">([\s\S]*?)<\/div>/i);
    const title = titleMatch ? this.decodeHTML(titleMatch[1].trim()) : "无标题";
    const imgMatch = cardHtml.match(/<img\b([^>]+)>/i);
    const imgAttributes = imgMatch?.[1] || "";
    const srcMatch = imgAttributes.match(/\bdata-src="([^"]+)"/i) || imgAttributes.match(/\bdata-original="([^"]+)"/i) || imgAttributes.match(/\bsrc="([^"]+)"/i);
    const thumbnailUrl = this.normalizeThumbnailUrl(srcMatch?.[1] && !srcMatch[1].startsWith("data:image/") ? srcMatch[1] : "");
    const style = imgAttributes.match(/\bstyle="([^"]*)"/i)?.[1] || "";
    const widthMatch = style.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i);
    const heightMatch = style.match(/(?:^|;)\s*height\s*:\s*(\d+(?:\.\d+)?)px/i);
    const width = widthMatch ? Math.round(parseFloat(widthMatch[1])) : undefined;
    const height = heightMatch ? Math.round(parseFloat(heightMatch[1])) : undefined;
    const categoryMatch = cardHtml.match(/class="cs\s+(ct\w+)"[^>]*>([^<]*)<\/div>/i);
    const category = categoryMatch ? this.parseCategoryClass(categoryMatch[1]) : "Doujinshi";
    const postedMatch = cardHtml.match(/id="posted_\d+">([^<]+)/i);
    const pagesMatch = cardHtml.match(/(\d+)\s*pages/i);
    return {
      gid, token, title, thumbnailUrl, thumbnailWidth: width, thumbnailHeight: height,
      category, postedTime: postedMatch?.[1]?.trim() || "", rating: 0,
      fileCount: pagesMatch ? parseInt(pagesMatch[1]) : 0, visible: true, tags: [],
    };
  }

  private parseItgRow(
    catHtml: string,
    thumbHtml: string,
    nameHtml: string,
    infoHtml: string,
  ): EHGalleryListItem | null {
    
    const linkMatch = nameHtml.match(/href="[^"]*\/g\/(\d+)\/([a-f0-9]+)\/"/);
    if (!linkMatch) return null;

    const gid = parseInt(linkMatch[1]);
    const token = linkMatch[2];

    
    const titleMatch = nameHtml.match(/<div class="glink"[^>]*>([\s\S]*?)<\/div>/);
    const title = titleMatch ? this.decodeHTML(titleMatch[1].trim()) : "无标题";

    
    let category: EHCategory = "Doujinshi";
    const catClassMatch = catHtml.match(/class="cn\s+(ct\w+)"/);
    if (catClassMatch) {
      category = this.parseCategoryClass(catClassMatch[1]);
    } else {
      const catNameMatch = catHtml.match(/class="cn[^"]*"[^>]*>([^<]+)</);
      if (catNameMatch) category = this.parseCategory(catNameMatch[1].trim());
    }

    
    const dataSrcMatch = thumbHtml.match(/data-src="([^"]+)"/);
    const srcMatch = thumbHtml.match(/src="(https?:\/\/[^"]+)"/);
    const thumbnailUrl = this.normalizeThumbnailUrl(
      dataSrcMatch
        ? dataSrcMatch[1]
        : srcMatch
          ? srcMatch[1]
          : ""
    );

    
    const postedMatch = thumbHtml.match(/id="posted_\d+">([^<]+)</);
    const postedTime = postedMatch ? postedMatch[1].trim() : "";

    
    const pagesMatch = (thumbHtml + infoHtml).match(/(\d+)\s*pages/);
    const fileCount = pagesMatch ? parseInt(pagesMatch[1]) : 0;

    
    const tags: EHTagListItem[] = [];
    const tagRegex = /<div class="gt" title="([^:]+):([^"]+)"/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(nameHtml)) !== null) {
      const nsRaw = tagMatch[1].trim().toLowerCase().replace(/\s+/g, "");
      const name = tagMatch[2].trim();
      if (!nsRaw || !name) continue;
      tags.push({ namespace: nsRaw as TagNamespace, name });
    }

    
    const uploaderMatch = infoHtml.match(/<a href="[^"]*\/uploader\/[^"]*">([^<]+)<\/a>/);
    const uploader = uploaderMatch ? uploaderMatch[1].trim() : undefined;

    
    const languageTag = tags.find((t) => t.namespace === "language");
    const language = languageTag ? languageTag.name : undefined;

    
    const isAI =
      /class="[^"]*\bai\b[^"]*"/i.test(nameHtml) ||
      /ai[-_ ]?generated/i.test(nameHtml) ||
      /title="[^"]*ai[-_ ]?generated[^"]*"/i.test(nameHtml);

    return {
      gid,
      token,
      title,
      thumbnailUrl,
      category,
      postedTime,
      rating: 0,
      isMyRating: false,
      fileCount,
      visible: true,
      tags,
      uploader,
      language,
      isAI,
    };
  }

   
  private parseCategoryClass(cls: string): EHCategory {
    const map: Record<string, EHCategory> = {
      ct1: "Misc",
      ct2: "Doujinshi",
      ct3: "Manga",
      ct4: "Artist CG",
      ct5: "Game CG",
      ct6: "Image Set",
      ct7: "Cosplay",
      ct8: "Asian Porn",
      ct9: "Non-H",
      cta: "Western",
    };
    return map[cls] || "Doujinshi";
  }

  private parseGalleryRow(row1: string, row2: string): EHGalleryListItem | null {
    
    const linkMatch = row1.match(/<a href="\/g\/(\d+)\/([a-f0-9]+)\/"/);
    if (!linkMatch) return null;

    const gid = parseInt(linkMatch[1]);
    const token = linkMatch[2];

    
    const titleMatch = row1.match(/<a href="\/g\/\d+\/[a-f0-9]+\/" title="([^"]*)"/);
    let title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"') : "";
    
    title = this.decodeHTML(title);

    
    const thumbMatch = row1.match(/src="([^"]*(?:ehgt\.org|hath\.network|s\.exhentai\.org)[^"]*\.(?:jpg|png|jpeg|gif|webp))"/i);
    const thumbnailUrl = this.normalizeThumbnailUrl(thumbMatch ? thumbMatch[1] : "");

    
    const catMatch = row1.match(/<div class="cs"[^>]*style="[^"]*">([^<]+)<\/div>/);
    const category = catMatch ? this.parseCategory(catMatch[1].trim()) : "Doujinshi";

    
    const postedMatch = row2.match(/Posted:[\s\S]*?>([^<]+)</);
    const postedTime = postedMatch ? postedMatch[1].trim() : "";

    const ratingMatch = row2.match(/id="rating_label_(\d+)">([\d.]+)/);
    let rating = 0;
    let isMyRating = false;
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[2]) || 0;
      isMyRating = row2.includes("irr") || row2.includes("irg") || row2.includes("irb");
    }

    const pagesMatch = row2.match(/(\d+)\s*pages/);
    const fileCount = pagesMatch ? parseInt(pagesMatch[1]) : 0;

    
    const tags: EHTagListItem[] = [];
    const tagRegex = /<div class="gt[^"]*" title="([^:]+):([^"]+)"/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(row2)) !== null) {
      const ns = tagMatch[1].trim().toLowerCase().replace(/\s+/g, "") as TagNamespace;
      const name = tagMatch[2].trim();
      if (ns && name) {
        tags.push({ namespace: ns, name });
      }
    }

    
    const uploaderMatch = row2.match(/<a href="\/uploader\/([^"]+)"/);
    const uploader = uploaderMatch ? uploaderMatch[1] : undefined;

    return {
      gid,
      token,
      title,
      thumbnailUrl,
      category,
      postedTime,
      rating,
      isMyRating,
      fileCount,
      visible: true,
      tags,
      uploader,
    };
  }

  private parseMinimalGalleryItem(html: string): EHGalleryListItem | null {
    const linkMatch = html.match(/<a href="\/g\/(\d+)\/([a-f0-9]+)\/"/);
    if (!linkMatch) return null;

    const gid = parseInt(linkMatch[1]);
    const token = linkMatch[2];

    const titleMatch = html.match(/<a[^>]*title="([^"]*)"/);
    const title = titleMatch
      ? this.decodeHTML(titleMatch[1].replace(/&amp;/g, "&"))
      : "无标题";

    const thumbMatch = html.match(/src="([^"]*(?:ehgt\.org|hath\.network|s\.exhentai\.org)[^"]*)"/i);
    const thumbnailUrl = this.normalizeThumbnailUrl(thumbMatch ? thumbMatch[1] : "");

    const catMatch = html.match(/<div class="cs"[^>]*style="[^"]*">([^<]+)<\/div>/);
    const category = catMatch ? this.parseCategory(catMatch[1].trim()) : "Doujinshi";

    return {
      gid,
      token,
      title,
      thumbnailUrl,
      category,
      postedTime: "",
      rating: 0,
      fileCount: 0,
      visible: true,
      tags: [],
    };
  }

  private parseGalleryDetail(html: string, gid: number, token: string, detailPage: number = 0): EHGalleryDetail {
    
    const titleMatch = html.match(/<h1 id="gn">([^<]+)<\/h1>/);
    const title1Match = html.match(/<h1 id="gj">([^<]+)<\/h1>/);
    let title = titleMatch ? this.decodeHTML(titleMatch[1].trim()) : "";
    const japaneseTitle = title1Match ? this.decodeHTML(title1Match[1].trim()) : "";
    const englishTitle = title;

    
    let category: EHCategory = "Doujinshi";
    const catImgMatch = html.match(/<div id="gdc">.*?<img[^>]*alt="([^"]*)"/);
    if (catImgMatch) {
      category = this.parseCategory(catImgMatch[1].trim());
    } else {
      const catDivMatch = html.match(/<div id="gdc">[\s\S]*?class="cs\s+(ct\w+)"/);
      if (catDivMatch) category = this.parseCategoryClass(catDivMatch[1]);
      else {
        const catNameMatch = html.match(/<div id="gdc">[\s\S]*?class="cs[^"]*"[^>]*>([^<]+)</);
        if (catNameMatch) category = this.parseCategory(catNameMatch[1].trim());
      }
    }

    
    const uploaderMatch = html.match(/<div id="gdn">.*?<a[^>]*>([^<]+)<\/a>/);
    const uploader = uploaderMatch ? uploaderMatch[1].trim() : "未知";

    
    const timeMatch = html.match(/<td class="gdt1">Posted:<\/td><td class="gdt2">([^<]+)<\/td>/);
    const postedTime = timeMatch ? timeMatch[1].trim() : "";

    
    const ratingMatch =
      html.match(/<td id="rating_label"[^>]*>Average:\s*([\d.]+)<\/td>/) ||
      html.match(/<td id="rating_label">([\d.]+)<\/td>/) ||
      html.match(/var average_rating\s*=\s*([\d.]+)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    const ratingCountMatch = html.match(/<span id="rating_count">(\d+)<\/span>/);
    const ratingCount = ratingCountMatch ? parseInt(ratingCountMatch[1]) : 0;

    
    const pagesMatch = html.match(/(\d+)\s*pages/);
    const fileCount = pagesMatch ? parseInt(pagesMatch[1]) : 0;

    
    const sizeMatch = html.match(/<td class="gdt1">File Size:<\/td><td class="gdt2">([^<]+)<\/td>/);
    const fileSize = sizeMatch ? sizeMatch[1].trim() : "未知";

    
    const langMatch = html.match(/<td class="gdt1">Language:<\/td><td class="gdt2">([^<]+)<\/td>/);
    const language = langMatch ? this.decodeHTML(langMatch[1].trim()) : undefined;

    
    const tags = this.parseTagsFromDetail(html);

    
    const coverMatch = html.match(/<div id="gd1"[^>]*>[\s\S]*?url\(['"]?([^'")\)]+)['"]?\)/);
    const coverUrl = coverMatch ? this.normalizeThumbnailUrl(coverMatch[1]) : undefined;

    
    const favorited = html.includes("Remove from Favorites");

    
    const torrentMatch = html.match(/Torrent Download\s*\((\d+)\)/) || html.match(/<p class="g2 gsp">(\d+)\s*torrent/);
    const torrentCount = torrentMatch ? parseInt(torrentMatch[1]) : 0;

    
    let favoriteCount = 0;
    const favTextMatch = html.match(/<td class="gdt1">Favorited:<\/td><td class="gdt2"[^>]*>([^<]+)<\/td>/);
    if (favTextMatch) {
      const favText = favTextMatch[1].trim().toLowerCase();
      if (favText === "once") favoriteCount = 1;
      else if (favText !== "never") {
        const favNum = favText.match(/(\d+)\s*times/);
        if (favNum) favoriteCount = parseInt(favNum[1]) || 0;
      }
    }
    if (favoriteCount === 0) {
      const favMatch = html.match(/<p class="g2 gsp">(\d+)\s*favorites/);
      if (favMatch) favoriteCount = parseInt(favMatch[1]) || 0;
    }

    
    let parentGid: number | undefined;
    let parentToken: string | undefined;
    let parentTitle: string | undefined;
    const parentRowMatch = html.match(/<td class="gdt1">Parent:<\/td><td class="gdt2">([\s\S]*?)<\/td>/);
    if (parentRowMatch) {
      const parentVal = parentRowMatch[1].trim();
      if (parentVal && parentVal !== "None") {
        const parentLink = parentVal.match(/href="[^"]*\/g\/(\d+)\/([a-f0-9]+)\//);
        if (parentLink) {
          parentGid = parseInt(parentLink[1]);
          parentToken = parentLink[2];
        }
        const parentTitleMatch = parentVal.match(/>([^<]+)<\/a>/);
        parentTitle = parentTitleMatch ? this.decodeHTML(parentTitleMatch[1].trim()) : undefined;
      }
    }

    const visibleRowMatch = html.match(/<td class="gdt1">Visible:<\/td><td class="gdt2">([^<]+)<\/td>/);
    const visibleText = visibleRowMatch ? visibleRowMatch[1].trim() : undefined;
    const visible = visibleText === undefined ? !html.includes("Gallery Not Available") : visibleText === "Yes";
    let invisibleCause: string | undefined;
    if (!visible && visibleText) {
      const causeMatch = visibleText.match(/\(([^)]+)\)/);
      const cause = causeMatch ? causeMatch[1].trim().toLowerCase() : "";
      invisibleCause =
        cause === "expunged" || cause === "replaced" || cause === "private" ? cause : "unknown";
    }

    
    const comments = this.parseComments(html);
    
    const commentCount = comments.length;

    
    const images = this.parseImages(html, detailPage);

    
    const pageCount = images.length > 0 ? Math.max(...images.map(i => i.page)) + 1 : undefined;

    return {
      gid,
      token,
      title: englishTitle || title,
      englishTitle: englishTitle || title,
      japaneseTitle,
      category,
      uploader,
      postedTime,
      rating,
      ratingCount,
      fileCount,
      fileSize,
      language,
      tags,
      parentGid,
      parentKey: parentToken,
      parentTitle,
      favorited,
      coverUrl,
      favoriteCount,
      torrentCount,
      commentCount,
      comments,
      visible,
      visibleText,
      invisibleCause,
      images,
      pageCount,
      isAI:
        /class="[^"]*\bai\b[^"]*"/i.test(html) ||
        /ai[-_ ]?generated/i.test(html),
    };
  }

   
  private parseComments(html: string): EHComment[] {
    const comments: EHComment[] = [];
    const container = html.match(/<div id="cdiv" class="gm">([\s\S]*?)(?:<div id="cdiv"|<div id="chd"|<div id="cnew"|$)/);
    if (!container) return comments;
    const section = container[1];

    
    const parts = section.split(/<div class="c1">/);
    for (let i = 1; i < parts.length; i++) {
      const block = parts[i];
      if (!block.trim()) continue;

      const commenterMatch = block.match(/<div class="c3[^"]*">[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
      const timeMatch = block.match(/Posted on\s*([\s\S]*?)\s*by:/);
      
      const typeMatch = block.match(/<div class="c4 nosel"[^>]*>([\s\S]*?)<\/div>/);
      const bodyMatch = block.match(/<div class="c6"[^>]*id="comment_(\d+)"[^>]*>([\s\S]*?)<\/div>/);
      const votesMatch = block.match(/<div class="c7"[^>]*>([\s\S]*?)<\/div>/);

      const typeRaw = typeMatch ? this.decodeHTML(typeMatch[1].trim()) : "";
      const type = typeRaw ? typeRaw.replace(/<[^>]*>/g, "").trim() : undefined;
      const isUploader = !!type && type.toLowerCase().includes("uploader comment");

      let score = 0;
      let voteCount = 0;
      
      const c5Match = block.match(/<div class="c5"[^>]*>[\s\S]*?<span>([+-]?\d+)<\/span>/);
      if (c5Match) {
        score = parseInt(c5Match[1]) || 0;
      } else if (votesMatch) {
        const scoreMatch = votesMatch[1].match(/Score\s*([+-]?\d+)/);
        if (scoreMatch) score = parseInt(scoreMatch[1]) || 0;
      }
      if (votesMatch) {
        const voteCountMatch = votesMatch[1].match(/(\d+)\s*votes?/);
        if (voteCountMatch) voteCount = parseInt(voteCountMatch[1]) || 0;
        else {
          
          const helpfulMatch = votesMatch[1].match(/(\d+)\s*people found this helpful/);
          if (helpfulMatch) {
            voteCount = parseInt(helpfulMatch[1]) || 0;
            if (score === 0) score = voteCount;
          }
        }
      }

      comments.push({
        id: bodyMatch ? bodyMatch[1] : String(i),
        commenter: commenterMatch ? commenterMatch[1].trim() : "未知",
        postedTime: timeMatch ? this.decodeHTML(timeMatch[1].trim()) : "",
        type,
        isUploader,
        body: bodyMatch ? this.decodeHTML(bodyMatch[2].trim()) : "",
        score,
        voteCount,
      });
    }
    return comments;
  }

  private parseTagsFromDetail(html: string): EHTagListItem[] {
    const tags: EHTagListItem[] = [];
    
    const tagSection =
      html.match(/<div id="taglist">([\s\S]*?)<\/table>/) ||
      html.match(/<div id="taglist">([\s\S]*?)<\/div>/);
    if (!tagSection) return tags;

    const tagRegex = /<td class="tc">([^<]+)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
    let match;
    const namespaceMap: Record<string, TagNamespace> = {
      artist: "artist",
      character: "character",
      cosplayer: "cosplayer",
      female: "female",
      group: "group",
      language: "language",
      male: "male",
      mixed: "mixed",
      other: "other",
      parody: "parody",
      reclass: "reclass",
      temp: "temp",
      "parody/fanfiction": "parody",
      "parody/fantasia": "parody",
    };

    while ((match = tagRegex.exec(tagSection[1])) !== null) {
      
      const nsRaw = match[1]
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/:+$/, "");
      const ns = namespaceMap[nsRaw];
      if (!ns) continue;

      const tagsHTML = match[2];
      
      const tagLinkRegex = /<a[^>]*id="ta_([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let tagLinkMatch;
      while ((tagLinkMatch = tagLinkRegex.exec(tagsHTML)) !== null) {
        const tagid = parseInt(tagLinkMatch[1]) || undefined;
        const name = this.decodeHTML(tagLinkMatch[2].trim());
        tags.push({ namespace: ns, name, tagid });
      }
    }

    return tags;
  }

  private parseImages(html: string, detailPage: number = 0): EHImageItem[] {
    const images: EHImageItem[] = [];

    
    
    const spriteRegex = /<a\b[^>]*href=["'][^"']*\/s\/([^/?#]+)\/(\d+)-(\d+)[^"']*["'][^>]*>\s*<div\b([^>]*)>/gi;
    let spriteMatch;
    while ((spriteMatch = spriteRegex.exec(html)) !== null) {
      const attributes = spriteMatch[4];
      const titleMatch = attributes.match(/\btitle=["']Page\s+\d+:\s*([^"']*)["']/i);
      const styleMatch = attributes.match(/\bstyle=["'][^"']*url\(\s*(?:["']?)([^)"']+)(?:["']?)\s*\)\s*(-?\d+)(?:px)?\s+(-?\d+)(?:px)?(?:\s+no-repeat)?[^"']*["']/i);
      if (!styleMatch) continue;
      const showkey = spriteMatch[1];
      const pageNum = parseInt(spriteMatch[3]);
      const name = titleMatch ? this.decodeHTML(titleMatch[1].trim()) : String(pageNum);
      const spriteUrl = this.normalizeThumbnailUrl(styleMatch[1]);
      const spriteX = parseInt(styleMatch[2]);
      const spriteY = parseInt(styleMatch[3]);
      const widthMatch = attributes.match(/\bwidth\s*:\s*(\d+)px/i);
      const heightMatch = attributes.match(/\bheight\s*:\s*(\d+)px/i);
      const spriteWidth = widthMatch ? parseInt(widthMatch[1]) : undefined;
      const spriteHeight = heightMatch ? parseInt(heightMatch[1]) : undefined;
      images.push({
        page: pageNum - 1,
        name,
        imgkey: showkey, 
        thumbnailUrl: spriteUrl,
        showkey,
        spriteX,
        spriteY,
        spriteWidth,
        spriteHeight,
      });
    }
    if (images.length > 0) return images;

    
    const pageStart = this.extractDetailPageStart(html, detailPage);
    const gdtmRegex = /<div class=["'][^"']*\bgdtm\b[^"']*["'][^>]*>[\s\S]*?<div[^>]*style=["'][^"']*width:\s*(\d+)[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']*)["'][^>]*>[\s\S]*?<img\b[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["']/gi;
    let match;
    let pageIndex = 0;

    while ((match = gdtmRegex.exec(html)) !== null) {
      const width = parseInt(match[1]);
      const href = match[2];
      const thumbnailUrl = this.normalizeThumbnailUrl(match[3]);

      const imgkey = this.extractImgkey(href, thumbnailUrl);
      const absolutePage = this.extractGalleryImagePage(href) ?? (pageStart + pageIndex);

      images.push({
        page: absolutePage,
        name: `${absolutePage + 1}`,
        imgkey: imgkey || "",
        thumbnailUrl,
        width,
      });
      pageIndex++;
    }

    
    if (images.length === 0) {
      const gdtlRegex = /<div class=["'][^"']*\bgdtl\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']*)["'][^>]*>[\s\S]*?<img\b[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["']/gi;
      pageIndex = 0;
      while ((match = gdtlRegex.exec(html)) !== null) {
        const href = match[1];
        const thumbnailUrl = this.normalizeThumbnailUrl(match[2]);
        const imgkey = this.extractImgkey(href, thumbnailUrl);
        const absolutePage = this.extractGalleryImagePage(href) ?? (pageStart + pageIndex);

        images.push({
          page: absolutePage,
          name: `${absolutePage + 1}`,
          imgkey: imgkey || "",
          thumbnailUrl,
        });
        pageIndex++;
      }
    }

    return images;
  }

  private parseMPVInfo(html: string, gid: number, token: string): EHMPVInfo | null {
    const mpvMatch = html.match(/var\s+mpvkey\s*=\s*"([^"]+)"/);
    if (!mpvMatch) return null;

    const mpvkey = mpvMatch[1];
    const imgkeys: string[] = [];
    const imgRegex = /var\s+imglist\s*=\s*(\[[^\]]*\])/;
    const imgMatch = html.match(imgRegex);
    if (imgMatch) {
      try {
        const list = JSON.parse(imgMatch[1]);
        list.forEach((item: any) => {
          if (item.k) imgkeys.push(item.k);
        });
      } catch {
        
      }
    }

    return { gid, token, mpvkey, imageKeys: imgkeys };
  }

  private extractImageUrl(html: string): string {
    const imageTag = html.match(/<img\b[^>]*\bid=["']img["'][^>]*>/i);
    const source = imageTag?.[0].match(/\b(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/i)?.[1];
    if (source) return this.normalizeResourceUrl(source);
    const imageSource = html.match(/<img\b[^>]*(?:src|data-src|data-original|data-lazy-src)=["']((?:https?:)?\/\/[^"']+)["'][^>]*>/i)?.[1];
    if (imageSource && /(?:ehgt\.org|hath\.network|exhentai\.org|e-hentai\.org)/i.test(imageSource)) {
      return this.normalizeResourceUrl(imageSource);
    }
    return "";
  }

  private extractGalleryImagePage(href: string): number | null {
    const match = href.match(/\/s\/[^/?#]+\/\d+-(\d+)(?:[/?#]|$)/i);
    if (!match) return null;
    const oneBasedPage = parseInt(match[1]);
    return Number.isFinite(oneBasedPage) && oneBasedPage > 0 ? oneBasedPage - 1 : null;
  }

  private extractImgkey(href: string, thumbnailUrl: string): string {
    const showpageMatch = href.match(/\/s\/([^/?#]+)\/\d+-(?:\d+)(?:[/?#]|$)/i);
    if (showpageMatch) return showpageMatch[1];
    const keyMatch = href.match(/[?&]key=([^&#]+)/i);
    if (keyMatch) return keyMatch[1];
    const thumbMatch = thumbnailUrl.match(/\/([a-f0-9]{32,})\//i);
    if (thumbMatch) return thumbMatch[1];
    return "";
  }

  private extractDetailPageStart(html: string, detailPage: number): number {
    const showingMatch = html.match(/\bShowing\s+(\d+)\s*-\s*(\d+)\b/i);
    if (showingMatch) {
      const start = parseInt(showingMatch[1], 10);
      if (Number.isFinite(start) && start > 0) return start - 1;
    }
    return detailPage * 20;
  }

  private parseCategory(cat: string): any {
    const map: Record<string, string> = {
      doujinshi: "Doujinshi",
      manga: "Manga",
      "artist cg": "Artist CG",
      "game cg": "Game CG",
      western: "Western",
      "non-h": "Non-H",
      "image set": "Image Set",
      cosplay: "Cosplay",
      "asian porn": "Asian Porn",
      misc: "Misc",
      private: "Private",
    };
    return map[cat.toLowerCase()] || "Doujinshi";
  }

  private decodeHTML(html: string): string {
    return html
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#x2019;/g, "'")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "");
  }

   
  private normalizeResourceUrl(url: string): string {
    if (!url) return url;
    const decoded = url.replace(/&amp;/gi, "&").replace(/\\\//g, "/").trim();
    if (decoded.startsWith("//")) return `https:${decoded}`;
    if (decoded.startsWith("/")) return `${this.baseUrl}${decoded}`;
    if (/^https?:\/\//i.test(decoded)) return decoded;
    if (/^(?:s\/|fullimg(?:\/|\?))/i.test(decoded)) return `${this.baseUrl}/${decoded}`;
    return decoded;
  }

  private normalizeThumbnailUrl(url: string): string {
    const normalized = this.normalizeResourceUrl(url);
    if (!normalized) return normalized;
    return normalized.replace(/^https?:\/\/s\.exhentai\.org\//i, "https://ehgt.org/");
  }

  

  async validateLogin(): Promise<boolean> {
    try {
      const { text, status, url } = await this.request("/home.php", { baseUrl: EH_BASE });
      if (status < 200 || status >= 300) return false;
      if (/\/bounce_login\.php(?:\?|$)/i.test(url)) return false;
      if (/this page requires you to log on/i.test(text)) return false;
      return /(?:uconfig\.php|favorites\.php|mytags|stats\.php|hentaiathome\.php)/i.test(text) ||
        /(?:uconfig\.php|favorites\.php|mytags|stats\.php|hentaiathome\.php)/i.test(url);
    } catch {
      return false;
    }
  }

  
  getLoginUrl(): string {
    return `${EH_BASE}/bounce_login.php?b=d&bt=1-1`;
  }
}


export const api = new EHApiClient();
