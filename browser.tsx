// ==UserScript==
// @name SEhViewer Cookie 助手 (browser.tsx)
// @namespace thomfang.scripting.ehviewer
// @description 在 E-Hentai / ExHentai 页面一键获取登录 Cookie，写入 Scripting 存储供 SEhViewer 导入；自动识别登录状态
// @match https://e-hentai.org/*
// @match https://exhentai.org/*
// @run-at document-idle
// @inject-into content
// @grant Scripting.FileManager
// @grant GM.setValue
// @grant GM.registerMenuCommand
// ==/UserScript==










declare const document: any;
declare const alert: any;
declare const confirm: any;
declare const navigator: any;
declare const window: any;

(function () {
  "use strict";

  function getCookie(name: string): string {
    var m = document.cookie.match(new RegExp("(?:^|;\\s*)?" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }


  function isLoggedIn(): boolean {
    return !!getCookie("ipb_member_id") && !!getCookie("ipb_pass_hash");
  }

  function loginStateText(): string {
    var state = isLoggedIn() ? "已登录" : "未登录";
    var ex = getCookie("igneous") ? " · 里站可用" : "";
    return state + ex;
  }


  function candidatePaths(): string[] {
    var paths: string[] = [];
    try {
      var docs = Scripting.FileManager.documentsDirectory;
      if (docs) paths.push(docs + "/ehviewer_cookie.txt");
    } catch (e) {}
    try {
      var appGroup = Scripting.FileManager.appGroupDocumentsDirectory;
      if (appGroup) paths.push(appGroup + "/ehviewer_cookie.txt");
    } catch (e) {}
    try {
      var icloud = Scripting.FileManager.iCloudDocumentsDirectory;
      if (icloud) paths.push(icloud + "/ehviewer_cookie.txt");
    } catch (e) {}
    try {
      paths.push(Scripting.FileManager.safariBrowserDirectory + "/ehviewer_cookie.txt");
    } catch (e) {}
    return paths;
  }

  async function writeCookieTo(path: string, contents: string): Promise<boolean> {
    try {
      await Scripting.FileManager.writeAsString(path, contents);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function writeCookie(): Promise<{ ok: boolean; writtenTo: string[]; failed: string[]; gmOk: boolean }> {
    var member = getCookie("ipb_member_id");
    var pass = getCookie("ipb_pass_hash");
    var igneous = getCookie("igneous");
    var parts: string[] = [];
    if (member) parts.push("ipb_member_id=" + member);
    if (pass) parts.push("ipb_pass_hash=" + pass);
    if (igneous) parts.push("igneous=" + igneous);
    if (!member || !pass) {
      alert("当前未登录（" + loginStateText() + "）。请先在 e-hentai.org 登录；若要用里站，请登录后打开 exhentai.org 再点此按钮。");
      return { ok: false, writtenTo: [], failed: [], gmOk: false };
    }
    var cookieStr = parts.join("; ");
    var paths = candidatePaths();
    var writtenTo: string[] = [];
    var failed: string[] = [];
    for (var i = 0; i < paths.length; i++) {
      var ok = await writeCookieTo(paths[i], cookieStr);
      if (ok) writtenTo.push(paths[i]);
      else failed.push(paths[i]);
    }

    var gmOk = false;
    try {
      await GM.setValue("ehviewer_cookie", cookieStr);
      gmOk = true;
    } catch (e) {}
    return { ok: writtenTo.length > 0 || gmOk, writtenTo: writtenTo, failed: failed, gmOk: gmOk };
  }


  function clearPageCookies(): string[] {
    var names = ["ipb_member_id", "ipb_pass_hash", "ipb_member_hash", "igneous", "yay"];
    var domains = ["", ".e-hentai.org", ".exhentai.org", ".s.exhentai.org"];
    var removed: string[] = [];
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var existed = document.cookie.split("; ").some(function (c: string) {
        return c.indexOf(name + "=") === 0;
      });
      for (var d = 0; d < domains.length; d++) {

        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + domains[d];
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      if (existed) removed.push(name);
    }
    return removed;
  }


  async function readCookieFile(): Promise<string> {
    var paths = candidatePaths();
    for (var i = 0; i < paths.length; i++) {
      try {
        if (Scripting.FileManager.existsSync(paths[i])) {
          var text = Scripting.FileManager.readAsStringSync(paths[i]);
          if (text && text.trim()) return text.trim();
        }
      } catch (e) {}
    }

    try {
      var gm = await GM.getValue("ehviewer_cookie");
      if (gm && gm.trim()) return gm.trim();
    } catch (e) {}
    return "";
  }


  async function clearCookie(): Promise<{
    pageRemoved: string[];
    removed: string[];
    failed: string[];
    skipped: string[];
    gmOk: boolean;
  }> {
    var paths = candidatePaths();
    var pageRemoved = clearPageCookies();
    var removed: string[] = [];
    var failed: string[] = [];
    var skipped: string[] = [];
    for (var i = 0; i < paths.length; i++) {
      var exists = false;
      try {
        exists = Scripting.FileManager.existsSync(paths[i]);
      } catch (e) {

        skipped.push(paths[i]);
        continue;
      }
      if (!exists) continue;
      try {
        Scripting.FileManager.removeSync(paths[i]);
        removed.push(paths[i]);
      } catch (e) {

        failed.push(paths[i]);
      }
    }
    var gmOk = false;
    try {
      await GM.setValue("ehviewer_cookie", "");
      gmOk = true;
    } catch (e) {}
    return { pageRemoved: pageRemoved, removed: removed, failed: failed, skipped: skipped, gmOk: gmOk };
  }


  async function cookieStatusText(): Promise<string> {
    var member = getCookie("ipb_member_id");
    var pass = getCookie("ipb_pass_hash");
    var igneous = getCookie("igneous");
    var lines = [
      "页面登录：" + loginStateText(),
      "ipb_member_id：" + (member ? member : "（无）"),
      "ipb_pass_hash：" + (pass ? pass.slice(0, 6) + "…（长度 " + pass.length + "）" : "（无）"),
      "igneous：" + (igneous ? igneous.slice(0, 8) + "…（长度 " + igneous.length + "）" : "（无）"),
    ];
    var file = await readCookieFile();
    lines.push("已写入文件：" + (file ? "是（" + file.length + " 字符）" : "否"));
    return lines.join("\n");
  }


  var BTN_ID = "__sehviewer_cookie_btn";
  if (!document.getElementById(BTN_ID)) {
    var btn = document.createElement("div");
    btn.id = BTN_ID;
    btn.textContent = "🍪 " + loginStateText() + " · 点此获取";
    Object.assign(btn.style, {
      position: "fixed",
      left: "12px",
      bottom: "12px",
      zIndex: "2147483647",
      background: isLoggedIn() ? "#1e7d32" : "#1a1a1c",
      color: "#ffffff",
      padding: "10px 16px",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "600",
      boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      cursor: "pointer",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      userSelect: "none"
    });
    btn.addEventListener("click", async function () {
      if (!isLoggedIn()) {
        btn.textContent = "❌ 未登录，请先登录";
        btn.style.background = "#b3261e";
        setTimeout(function () {
          btn.textContent = "🍪 " + loginStateText() + " · 点此获取";
          btn.style.background = "#1a1a1c";
        }, 2500);
        writeCookie();
        return;
      }
      var res = await writeCookie();
      if (res.ok) {
        var detail = res.writtenTo.length > 0 ? "" : "（GM 存储）";
        btn.textContent = "✅ 已写入" + detail + "，回 SEhViewer 点「从浏览器导入」";
        btn.style.background = "#1e7d32";
        setTimeout(function () {
          btn.textContent = "🍪 " + loginStateText() + " · 点此获取";
        }, 3000);
      } else {
        btn.textContent = "❌ 写入失败，请检查权限";
        btn.style.background = "#b3261e";
        setTimeout(function () {
          btn.textContent = "🍪 " + loginStateText() + " · 点此获取";
        }, 3000);
      }
    });
    document.body.appendChild(btn);
  }


  GM.registerMenuCommand("🍪 获取 EH Cookie 并写入", async function () {
    if (!isLoggedIn()) {
      alert("当前未登录（" + loginStateText() + "），无法获取 Cookie。请先登录 e-hentai.org；里站请打开 exhentai.org。");
      return;
    }
    var res = await writeCookie();
    if (res.ok) alert("✅ Cookie 已写入，回 SEhViewer 点「从浏览器导入」");
    else alert("❌ 写入失败（候选路径均无权限）");
  });


  GM.registerMenuCommand("🔍 查看当前 Cookie", async function () {
    alert(await cookieStatusText());
  });


  GM.registerMenuCommand("🗑️ 清除本地 Cookie", async function () {
    var res = await clearCookie();
    var pageNote = res.pageRemoved.length > 0 ? "页面 Cookie " + res.pageRemoved.join("/") + " 已清除" : "页面无可见 Cookie";
    alert(
      pageNote + "；已删除 Cookie 文件 " + res.removed.length + " 个" +
      (res.failed.length > 0 ? "，失败 " + res.failed.length + " 个" : "") +
      (res.gmOk ? "；GM 存储已清空" : "") +
      (res.skipped.length > 0 ? "；跳过不可访问路径 " + res.skipped.length + " 个" : "") +
      "\n\n提示：本页仅清除当前域名（" + location.host + "）的 cookie；若已登录 exhentai.org，请到 exhentai.org 再执行一次。"
    );
  });
})();
