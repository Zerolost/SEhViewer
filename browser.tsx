// ==UserScript==
// @name SEhViewer Cookie 助手
// @namespace thomfang.scripting.ehviewer
// @description 在 E-Hentai / ExHentai 页面一键获取登录 Cookie，写入 Scripting 存储供 SEhViewer 导入；自动识别登录状态
// @match https://e-hentai.org/*
// @match https://*.e-hentai.org/*
// @match https://exhentai.org/*
// @match https://*.exhentai.org/*
// @run-at document-start
// @inject-into content
// @noframes
// @weight 900
// @grant Scripting.FileManager
// @grant GM.getValue
// @grant GM.setValue
// @grant GM.cookie
// @grant GM.registerMenuCommand
// @connect e-hentai.org
// @connect *.e-hentai.org
// @connect exhentai.org
// @connect *.exhentai.org
// ==/UserScript==
declare const document: any;
declare const window: any;
declare const alert: any;
declare const location: any;
declare const Scripting: any;
declare const GM: any;

type CookieValues = {
  ipb_member_id: string;
  ipb_pass_hash: string;
  igneous: string;
};

type BrowserCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
};

(function () {
  "use strict";

  var BTN_ID = "__sehviewer_cookie_btn";
  var COOKIE_NAMES = ["ipb_member_id", "ipb_pass_hash", "igneous"];
  var CLEAR_COOKIE_NAMES = ["ipb_member_id", "ipb_pass_hash", "ipb_member_hash", "igneous", "yay"];
  var COOKIE_URLS = ["https://e-hentai.org/", "https://exhentai.org/"];
  var buttonBusy = false;
  var resetButtonTimer: any = null;
  var cachedCookies: CookieValues = emptyCookies();
  var btn: any = null;
  var host: any = null;
  var mountCheckTimer: any = null;

  function emptyCookies(): CookieValues {
    return { ipb_member_id: "", ipb_pass_hash: "", igneous: "" };
  }

  function safeDecode(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function cookieValue(name: string, source: string): string {
    var match = (source || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return match ? safeDecode(match[1]) : "";
  }

  function visiblePageCookies(): CookieValues {
    var source = document.cookie || "";
    return {
      ipb_member_id: cookieValue("ipb_member_id", source),
      ipb_pass_hash: cookieValue("ipb_pass_hash", source),
      igneous: cookieValue("igneous", source),
    };
  }

  function mergeCookie(values: CookieValues, cookie: BrowserCookie): void {
    if (COOKIE_NAMES.indexOf(cookie.name) < 0 || !cookie.value) return;
    var name = cookie.name as keyof CookieValues;
    if (!values[name] || cookie.name === "igneous") values[name] = cookie.value;
  }

  async function listCookies(url: string): Promise<BrowserCookie[]> {
    try {
      var cookies = await GM.cookie.list({ url: url });
      return Array.isArray(cookies) ? cookies : [];
    } catch {
      return [];
    }
  }

  async function readBrowserCookies(): Promise<CookieValues> {
    var values = visiblePageCookies();
    for (var i = 0; i < COOKIE_URLS.length; i++) {
      var cookies = await listCookies(COOKIE_URLS[i]);
      for (var j = 0; j < cookies.length; j++) mergeCookie(values, cookies[j]);
    }
    cachedCookies = values;
    return values;
  }

  function isLoggedIn(values: CookieValues): boolean {
    return !!values.ipb_member_id && !!values.ipb_pass_hash;
  }

  function loginStateText(values: CookieValues): string {
    var state = isLoggedIn(values) ? "已登录" : "未登录";
    return state + (values.igneous ? " · 里站可用" : "");
  }

  function isValidCookieText(source: string): boolean {
    var text = (source || "").trim();
    return !!cookieValue("ipb_member_id", text) && !!cookieValue("ipb_pass_hash", text);
  }

  function cookieText(values: CookieValues): string {
    var parts: string[] = [];
    if (values.ipb_member_id) parts.push("ipb_member_id=" + values.ipb_member_id);
    if (values.ipb_pass_hash) parts.push("ipb_pass_hash=" + values.ipb_pass_hash);
    if (values.igneous) parts.push("igneous=" + values.igneous);
    return parts.join("; ");
  }

  function candidatePaths(): string[] {
    var paths: string[] = [];
    function add(path: string) {
      if (path && paths.indexOf(path) < 0) paths.push(path);
    }
    try {
      var docs = Scripting.FileManager.documentsDirectory;
      if (docs) add(docs + "/ehviewer_cookie.txt");
    } catch {}
    try {
      var appGroup = Scripting.FileManager.appGroupDocumentsDirectory;
      if (appGroup) add(appGroup + "/ehviewer_cookie.txt");
    } catch {}
    try {
      var icloud = Scripting.FileManager.iCloudDocumentsDirectory;
      if (icloud) add(icloud + "/ehviewer_cookie.txt");
    } catch {}
    try {
      var safari = Scripting.FileManager.safariBrowserDirectory;
      if (safari) add(safari + "/ehviewer_cookie.txt");
    } catch {}
    return paths;
  }

  async function writeCookieTo(path: string, contents: string): Promise<boolean> {
    try {
      await Scripting.FileManager.writeAsString(path, contents);
      if (!Scripting.FileManager.existsSync(path)) return false;
      var saved = Scripting.FileManager.readAsStringSync(path);
      return isValidCookieText(saved) && saved.trim() === contents.trim();
    } catch {
      return false;
    }
  }

  function redirectToLogin(): void {
    location.href = "https://e-hentai.org/bounce_login.php?b=d&bt=1-1";
  }

  async function writeCookie(): Promise<{ ok: boolean; writtenTo: string[]; failed: string[]; gmOk: boolean }> {
    var values = await readBrowserCookies();
    if (!isLoggedIn(values)) {
      setButtonMessage("🔐 未登录，正在打开登录页…", "#6b4e9b");
      setTimeout(redirectToLogin, 120);
      return { ok: false, writtenTo: [], failed: [], gmOk: false };
    }
    var contents = cookieText(values);
    var paths = candidatePaths();
    var writtenTo: string[] = [];
    var failed: string[] = [];
    for (var i = 0; i < paths.length; i++) {
      if (await writeCookieTo(paths[i], contents)) writtenTo.push(paths[i]);
      else failed.push(paths[i]);
    }
    var gmOk = false;
    try {
      await GM.setValue("ehviewer_cookie", contents);
      var stored = await GM.getValue("ehviewer_cookie");
      gmOk = typeof stored === "string" && stored.trim() === contents.trim() && isValidCookieText(stored);
    } catch {}
    return { ok: writtenTo.length > 0 || gmOk, writtenTo: writtenTo, failed: failed, gmOk: gmOk };
  }

  async function readCookieFile(): Promise<string> {
    var paths = candidatePaths();
    for (var i = 0; i < paths.length; i++) {
      try {
        if (Scripting.FileManager.existsSync(paths[i])) {
          var text = Scripting.FileManager.readAsStringSync(paths[i]);
          if (text && isValidCookieText(text)) return text.trim();
        }
      } catch {}
    }
    try {
      var gm = await GM.getValue("ehviewer_cookie");
      if (gm && isValidCookieText(gm)) return gm.trim();
    } catch {}
    return "";
  }

  async function deleteBrowserCookies(): Promise<number> {
    var deleted = 0;
    for (var i = 0; i < COOKIE_URLS.length; i++) {
      var url = COOKIE_URLS[i];
      var cookies = await listCookies(url);
      for (var j = 0; j < cookies.length; j++) {
        var cookie = cookies[j];
        if (CLEAR_COOKIE_NAMES.indexOf(cookie.name) < 0) continue;
        try {
          var result = await GM.cookie.delete({
            url: url,
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.path || "/",
          });
          if (result) deleted++;
        } catch {}
      }
    }
    var domains = ["", ".e-hentai.org", ".exhentai.org", ".s.exhentai.org"];
    for (var n = 0; n < CLEAR_COOKIE_NAMES.length; n++) {
      for (var d = 0; d < domains.length; d++) {
        var suffix = domains[d] ? "; domain=" + domains[d] : "";
        document.cookie = CLEAR_COOKIE_NAMES[n] + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + suffix;
      }
    }
    cachedCookies = emptyCookies();
    return deleted;
  }

  async function clearCookie(): Promise<{ cookieCount: number; removed: number; failed: number; gmOk: boolean }> {
    var cookieCount = await deleteBrowserCookies();
    var paths = candidatePaths();
    var removed = 0;
    var failed = 0;
    for (var i = 0; i < paths.length; i++) {
      try {
        if (!Scripting.FileManager.existsSync(paths[i])) continue;
        Scripting.FileManager.removeSync(paths[i]);
        removed++;
      } catch {
        failed++;
      }
    }
    var gmOk = false;
    try {
      await GM.setValue("ehviewer_cookie", "");
      gmOk = true;
    } catch {}
    return { cookieCount: cookieCount, removed: removed, failed: failed, gmOk: gmOk };
  }

  async function cookieStatusText(): Promise<string> {
    var values = await readBrowserCookies();
    var file = await readCookieFile();
    return [
      "当前页面：" + location.host,
      "页面登录：" + loginStateText(values),
      "ipb_member_id：" + (values.ipb_member_id || "（无）"),
      "ipb_pass_hash：" + (values.ipb_pass_hash ? values.ipb_pass_hash.slice(0, 6) + "…（长度 " + values.ipb_pass_hash.length + "）" : "（无）"),
      "igneous：" + (values.igneous ? values.igneous.slice(0, 8) + "…（长度 " + values.igneous.length + "）" : "（无）"),
      "已写入文件：" + (file ? "是（" + file.length + " 字符）" : "否"),
    ].join("\n");
  }

  function setButtonMessage(text: string, color: string): void {
    if (!btn) return;
    btn.textContent = text;
    btn.style.background = color;
  }

  function renderButtonState(values: CookieValues): void {
    setButtonMessage("🍪 " + loginStateText(values) + " · 点此获取", isLoggedIn(values) ? "#1e7d32" : "#1a1a1c");
  }

  async function refreshButtonState(): Promise<void> {
    renderButtonState(await readBrowserCookies());
  }

  function resetButton(): void {
    if (resetButtonTimer) clearTimeout(resetButtonTimer);
    resetButtonTimer = setTimeout(async function () {
      await refreshButtonState();
      buttonBusy = false;
    }, 3000);
  }

  function mountButton(): void {
    if (!document.body) return;
    host = document.getElementById(BTN_ID + "_host");
    if (host && host.isConnected) {
      btn = host.querySelector("#" + BTN_ID);
      if (btn) return;
    }
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = document.createElement("div");
    host.id = BTN_ID + "_host";
    host.className = "eh-syringe-ignore";
    host.setAttribute("translate", "no");
    host.style.position = "fixed";
    host.style.left = "0";
    host.style.bottom = "0";
    host.style.zIndex = "2147483647";
    host.style.pointerEvents = "none";
    btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.setAttribute("translate", "no");
    btn.textContent = "🍪 正在检测登录状态…";
    Object.assign(btn.style, {
      position: "fixed",
      left: "max(12px, env(safe-area-inset-left))",
      bottom: "max(12px, env(safe-area-inset-bottom))",
      zIndex: "2147483647",
      pointerEvents: "auto",
      border: "0",
      background: "#1a1a1c",
      color: "#ffffff",
      padding: "10px 16px",
      borderRadius: "12px",
      fontSize: "14px",
      lineHeight: "20px",
      fontWeight: "600",
      boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      cursor: "pointer",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      userSelect: "none",
      WebkitAppearance: "none",
    });
    btn.addEventListener("click", async function () {
      if (buttonBusy) return;
      buttonBusy = true;
      setButtonMessage("⏳ 正在读取并写入…", "#6b4e9b");
      var result = await writeCookie();
      if (result.ok) {
        var detail = result.writtenTo.length > 0 ? "文件 " + result.writtenTo.length + " 个" : "GM 存储";
        setButtonMessage("✅ 已写入 " + detail + "，回 SEhViewer 导入", "#1e7d32");
      } else {
        setButtonMessage("❌ 未找到 Cookie 或写入失败", "#b3261e");
      }
      resetButton();
    });
    host.appendChild(btn);
    document.body.appendChild(host);
    refreshButtonState();
  }

  function ensureButton(): void {
    if (!document.body) return;
    var currentHost = document.getElementById(BTN_ID + "_host");
    var currentButton = currentHost ? currentHost.querySelector("#" + BTN_ID) : null;
    if (!currentHost || !currentButton || !currentHost.isConnected) mountButton();
  }

  function startMountLifecycle(): void {
    ensureButton();
    document.addEventListener("DOMContentLoaded", ensureButton, { once: true });
    document.addEventListener("visibilitychange", ensureButton);
    window.addEventListener("pageshow", ensureButton);
    if (!mountCheckTimer) mountCheckTimer = window.setInterval(ensureButton, 1500);
  }

  GM.registerMenuCommand("🍪 获取 EH Cookie 并写入", async function () {
    var values = await readBrowserCookies();
    if (!isLoggedIn(values)) {
      redirectToLogin();
      return;
    }
    var result = await writeCookie();
    if (result.ok) alert("✅ Cookie 已写入，回 SEhViewer 点「从浏览器导入」");
    else alert("❌ 未找到有效 Cookie 或候选路径无权限");
    await refreshButtonState();
  });

  startMountLifecycle();

  GM.registerMenuCommand("🔄 重新检测登录状态", async function () {
    await refreshButtonState();
    alert("已重新检测：" + loginStateText(cachedCookies));
  });

  GM.registerMenuCommand("🔍 查看当前 Cookie", async function () {
    alert(await cookieStatusText());
  });

  GM.registerMenuCommand("🗑️ 清除本地 Cookie", async function () {
    var result = await clearCookie();
    alert(
      "已清除 Safari Cookie " + result.cookieCount + " 项；已删除 Cookie 文件 " + result.removed + " 个" +
      (result.failed > 0 ? "，文件删除失败 " + result.failed + " 个" : "") +
      (result.gmOk ? "；GM 存储已清空" : "") +
      "。如仍显示登录，请刷新页面。"
    );
    await refreshButtonState();
  });
})();
