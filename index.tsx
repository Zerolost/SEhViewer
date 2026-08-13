import {
  Script,
  Navigation,
  NavigationStack,
  TabView,
  List,
  VStack,
  HStack,
  ZStack,
  Text,
  Image,
  Button,
  TextField,
  NavigationLink,
  Label,
  Toggle,
  Spacer,
  Section,
  Rectangle,
  Menu,
  ScrollView,
  ScrollViewReader,
  useObservable,
  useEffect,
  useRef,
} from "scripting";
import type { Color, DynamicShapeStyle, ScrollViewProxy, VirtualNode } from "scripting";


declare function alert(options: { message: string; title?: string; buttonLabel?: string }): Promise<void>;
declare function confirm(options: { message: string; title?: string; cancelLabel?: string; confirmLabel?: string }): Promise<boolean>;
declare namespace Pasteboard {
  function setString(string: string | null): Promise<void>;
}
declare namespace Photos {
  function savePhoto(path: string, options?: { fileName?: string; shouldMoveFile?: boolean }): Promise<boolean>;
  function savePhoto(image: Data, options?: { fileName?: string }): Promise<boolean>;
}
declare namespace DocumentInteraction {
  function optionsMenu(filePath: string): Promise<string | null>;
  function openInMenu(filePath: string): Promise<string | null>;
}
import {
  api,
} from "./api";
import {
  EHGalleryListItem,
  EHGalleryDetail,
  EHImageItem,
  Config,
  defaultConfig,
  extractTitle,
  categoryTranslations,
  categoryColors,
  namespaceTranslations,
  ParsedCookie,
  AppearanceMode,
  formatFileSize,
} from "./types";



type GlassMaterial = "navigation" | "content" | "elevated" | "media";

const GLASS_TOKENS: {
  accent: Color;
  radius: { control: number; content: number; media: number };
  spacing: { compact: number; regular: number; comfortable: number; section: number };
  material: Record<GlassMaterial, { interactive: boolean; shadow: Color }>;
} = {
  accent: "accentColor",
  radius: { control: 12, content: 16, media: 18 },
  spacing: { compact: 8, regular: 12, comfortable: 16, section: 24 },
  material: {
    navigation: { interactive: true, shadow: "rgba(72,88,120,0.24)" },
    content: { interactive: false, shadow: "rgba(72,88,120,0.16)" },
    elevated: { interactive: true, shadow: "rgba(38,92,160,0.18)" },
    media: { interactive: false, shadow: "rgba(80,54,120,0.18)" },
  },
};


let currentAppearance: AppearanceMode = "system";


const appearanceSubscribers = new Set<(v: number) => void>();

function notifyAppearanceChanged(): void {
  const tick = Date.now();
  appearanceSubscribers.forEach((fn) => {
    try {
      fn(tick);
    } catch {}
  });
}

function pageBackgroundFill(): DynamicShapeStyle {
  if (currentAppearance === "dark") {
    return { light: "#161618", dark: "#161618" };
  }
  if (currentAppearance === "light") {
    return { light: "#f2f2f7", dark: "#f2f2f7" };
  }
  return { light: "#f2f2f7", dark: "#161618" };
}


function labelColor(): Color {
  if (currentAppearance === "light") return "#1a1a1c" as Color;
  if (currentAppearance === "dark") return "#ffffff" as Color;
  return "label" as Color;
}

function secondaryLabelColor(): Color {
  if (currentAppearance === "light") return "#3a3a3c" as Color;
  if (currentAppearance === "dark") return "#d6d6da" as Color;
  return "secondaryLabel" as Color;
}

function tertiaryLabelColor(): Color {
  if (currentAppearance === "light") return "#6e6e73" as Color;
  if (currentAppearance === "dark") return "#9a9aa0" as Color;
  return "tertiaryLabel" as Color;
}

function PageBackground() {

  const appearanceTick = useObservable(0);
  useEffect(() => {
    const listener = (v: number) => appearanceTick.setValue(v);
    appearanceSubscribers.add(listener);
    return () => {
      appearanceSubscribers.delete(listener);
    };
  }, []);
  void appearanceTick.value;

  return (
    <Rectangle
      fill={pageBackgroundFill()}
      ignoresSafeArea={true}
      allowsHitTesting={false}
    />
  );
}


function glassShape(material: GlassMaterial) {
  if (material === "navigation") return "capsule" as const;
  const radius =
    material === "media"
      ? GLASS_TOKENS.radius.media
      : material === "content"
      ? GLASS_TOKENS.radius.content
      : GLASS_TOKENS.radius.control;
  return {
    type: "rect" as const,
    cornerRadius: radius,
    style: "continuous" as const,
  };
}


function glassWithAppearance(glass: UIGlass): UIGlass {
  return glass;
}

function glassEffectFor(material: GlassMaterial, shape?: any, interactive?: boolean) {
  const def = GLASS_TOKENS.material[material];
  return {
    glass: glassWithAppearance(UIGlass.clear().interactive(interactive ?? def.interactive)),
    shape: shape ?? glassShape(material),
  };
}


function glassListRowStyleProps() {
  return {
    frame: { maxWidth: "infinity" as const, alignment: "leading" as const },
    padding: { horizontal: 12, vertical: 10 },
    glassEffect: {
      glass: glassWithAppearance(UIGlass.clear().interactive(true)),
      shape: { type: "rect" as const, cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" as const },
    },
    listRowBackground: <></>,
    listRowSeparator: "hidden" as const,
    shadow: { color: "rgba(142,20,55,0.14)" as Color, radius: 10, y: 4 },
  };
}


function GlassSurface({ material = "content", children }: { material?: GlassMaterial; children?: any }) {
  return (
    <ZStack
      frame={{ maxWidth: "infinity" as const }}
      glassEffect={glassEffectFor(material)}
      shadow={{ color: GLASS_TOKENS.material[material].shadow, radius: 12, y: 5 }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      {children}
    </ZStack>
  );
}


function GlassListRow({ children }: { children?: any }) {
  return (
    <ZStack {...glassListRowStyleProps()}>
      {children}
    </ZStack>
  );
}


function ShelfHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <HStack
      alignment="center"
      spacing={10}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
      padding={{ top: 4, bottom: 2 }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      <ZStack
        frame={{ width: 4, height: 20 }}
        background={{ style: pageBackgroundFill(), shape: "capsule" }}
        clipShape="capsule"
      />
      <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Text font="headline" fontWeight="semibold" foregroundStyle={labelColor()} lineLimit={2} multilineTextAlignment="leading">
          {title}
        </Text>
        {caption ? (
          <Text font="caption2" foregroundStyle={secondaryLabelColor()} lineLimit={1} multilineTextAlignment="leading">
            {caption}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );
}


function GlassIconButton({
  title,
  systemName,
  tint = "accentColor",
  action,
}: {
  title: string;
  systemName: string;
  tint?: "accentColor" | "systemPink" | "systemBlue" | "systemRed" | "label";
  action: () => void;
}) {
  return (
    <Button
      action={action}
      buttonStyle="plain"
      frame={{ minWidth: 44, minHeight: 44 }}
      glassEffect={glassEffectFor("navigation", undefined, true)}
      glassEffectTransition="materialize"
    >
      <Image systemName={systemName} font="headline" foregroundStyle={tint} />
    </Button>
  );
}


function GlassActionButton({
  title,
  systemImage,
  tint = "label",
  destructive = false,
  loading = false,
  disabled = false,
  action,
}: {
  title: string;
  systemImage?: string;
  tint?: "label" | "accentColor" | "red" | "white";
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  action: () => void;
}) {
  return (
    <Button
      action={action}
      disabled={disabled}
      buttonStyle="plain"
      frame={{ maxWidth: "infinity" as const }}
      glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
      glassEffectTransition="materialize"
    >
      <HStack
        alignment="center"
        spacing={6}
        padding={{ horizontal: 14, vertical: 10 }}
        frame={{ maxWidth: "infinity" as const, minHeight: 46, alignment: "center" }}
      >
        {systemImage ? <Image systemName={systemImage} font="subheadline" foregroundStyle={destructive ? "#ff453a" as Color : tint} /> : null}
        <Text font="subheadline" fontWeight="semibold" foregroundStyle={destructive ? "#ff453a" as Color : tint}>
          {loading ? "处理中..." : title}
        </Text>
      </HStack>
    </Button>
  );
}


function GlassInputRow({ children }: { children?: any }) {
  return (
    <HStack
      spacing={8}
      padding={{ horizontal: 12, vertical: 2 }}
      frame={{ maxWidth: "infinity" as const, minHeight: 46 }}
      glassEffect={glassEffectFor("content", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, false)}
    >
      {children}
    </HStack>
  );
}


function roundedClip(radius: number) {
  return {
    type: "concentricRect" as const,
    corners: { style: "fixed" as const, radius },
    isUniform: true,
  };
}


function roundedImage(radius: number = 10) {
  return { clipShape: roundedClip(radius) };
}




function parseCookieString(cookieStr: string): ParsedCookie[] {
  return cookieStr
    .split(";")
    .map((pair: string) => {
      const [name, ...rest] = pair.trim().split("=");
      return { name: name.trim(), value: rest.join("=").trim() };
    })
    .filter((c: any) => c.name && c.value);
}


function GlassTextField({
  value,
  onChanged,
  prompt,
  title = "",
  systemImage,
  autofocus,
}: {
  value: string;
  onChanged: (v: string) => void;
  prompt?: string;
  title?: string;
  systemImage?: string;
  autofocus?: boolean;
}) {
  return (
    <GlassInputRow>
      {systemImage ? (
        <Image systemName={systemImage} font="caption" foregroundStyle={secondaryLabelColor()} />
      ) : null}
      <TextField
        title={title}
        value={value}
        onChanged={onChanged}
        prompt={prompt}
        textFieldStyle="plain"
        autofocus={autofocus}
        frame={{ maxWidth: "infinity" as const }}
      />
    </GlassInputRow>
  );
}



function LoginView({ onLogin }: { onLogin: () => void }) {

  const appearanceTick = useObservable(0);
  useEffect(() => {
    const listener = (v: number) => appearanceTick.setValue(v);
    appearanceSubscribers.add(listener);
    return () => {
      appearanceSubscribers.delete(listener);
    };
  }, []);
  void appearanceTick.value;
  const dismiss = Navigation.useDismiss();
  const cookieInput = useObservable("");
  const exhentaiToggle = useObservable(false);
  const loading = useObservable(false);
  const errorMsg = useObservable("");

  const handleLogin = async () => {
    const cookieStr = cookieInput.value.trim();
    if (!cookieStr) {
      errorMsg.setValue("请输入 Cookie");
      return;
    }

    loading.setValue(true);
    errorMsg.setValue("");

    try {
      const cookies = parseCookieString(cookieStr);

      if (!cookies.find((c: any) => c.name === "ipb_member_id") || !cookies.find((c: any) => c.name === "ipb_pass_hash")) {
        errorMsg.setValue("Cookie 缺少必要的 ipb_member_id 或 ipb_pass_hash");
        loading.setValue(false);
        return;
      }

      api.updateCookie(cookies);
      api.exhentai = exhentaiToggle.value;



      const valid = await api.validateLogin();
      if (!valid) {
        errorMsg.setValue("登录验证失败，Cookie 可能已过期");
        loading.setValue(false);
        return;
      }

      saveConfig({ cookie: cookieStr, exhentai: api.exhentai });
      onLogin();
      dismiss();
    } catch (e: any) {
      errorMsg.setValue(e.message || "登录失败");
      loading.setValue(false);
    }
  };

  return (
    <NavigationStack>
      <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} preferredColorScheme={currentAppearance === "system" ? undefined : (currentAppearance as any)}>
        <PageBackground />
        <List
          listStyle="inset"
          listRowSpacing={10}
          listSectionSpacing={24}
          scrollContentBackground="hidden"
          listRowBackground={<></>}
          listRowSeparator="hidden"
          navigationTitle="登录"
          navigationBarTitleDisplayMode="inline"
          toolbar={{
            cancellationAction: <Button title="取消" action={() => dismiss()} />,
          }}
        >
          <Section>
            <GlassSurface>
              <VStack alignment="leading" spacing={14} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="headline" fontWeight="semibold" foregroundStyle={labelColor()}>Cookie 登录</Text>
                <Text font="caption" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">
                  外站免登录即可浏览和搜索。{"\n"}
                  登录后可访问订阅/收藏，并可开启里站。
                </Text>

                <GlassTextField
                  value={cookieInput.value}
                  onChanged={(v) => cookieInput.setValue(v)}
                  title="Cookie"
                  prompt="ipb_member_id=xxx; ipb_pass_hash=xxx"
                  systemImage="key"
                />

                <Toggle
                  title="ExHentai（里站）"
                  value={exhentaiToggle.value}
                  onChanged={(v) => exhentaiToggle.setValue(v)}
                />

                {errorMsg.value ? (
                  <Text font="caption" foregroundStyle="red" multilineTextAlignment="leading">{errorMsg.value}</Text>
                ) : null}

                <GlassActionButton
                  title="从浏览器导入"
                  systemImage="square.and.arrow.down"
                  action={async () => {
                    try {
                      const p = cookieImportPath();
                      let text = "";
                      if (FileManager.existsSync(p)) {
                        text = FileManager.readAsStringSync(p);
                      } else {

                        const gm = cookieFromGMStorage();
                        if (gm) text = gm;
                      }
                      if (text && text.trim()) {
                        cookieInput.setValue(text.trim());
                        errorMsg.setValue("");
                      } else {
                        errorMsg.setValue("未找到浏览器写入的 Cookie，请先在 Safari 里点「获取 Cookie」按钮");
                      }
                    } catch (e: any) {
                      errorMsg.setValue(e.message || "导入失败");
                    }
                  }}
                />

                <GlassActionButton
                  title={loading.value ? "登录中" : "登录"}
                  systemImage="checkmark"
                  tint="accentColor"
                  loading={loading.value}
                  action={handleLogin}
                />
              </VStack>
            </GlassSurface>
          </Section>
        </List>
      </ZStack>
    </NavigationStack>
  );
}



function CategoryBadge({ category }: { category: string }) {
  const label = categoryTranslations[category] || category;
  const color = categoryColors[category] || "#999";
  return (
    <Text
      font="caption"
      foregroundStyle={color}
      background="thinMaterial"
      clipShape={roundedClip(8)}
      padding={{ horizontal: 6, vertical: 2 }}
    >
      {label}
    </Text>
  );
}



function GalleryRow({
  item,
  onLanguageDetected,
  onTagSearch,
}: {
  item: EHGalleryListItem;
  onLanguageDetected?: (gid: number, language: string) => void;
  onTagSearch?: (query: string) => void;
}) {
  const title = extractTitle(item);

  const thumbPath = useObservable<string | null>(null);
  useEffect(() => {
    if (!item.thumbnailUrl) return;
    let alive = true;

    const reload = () => {
      if (!alive) return;
      thumbPath.setValue(null);
      const cached = getCachedImagePath(item.thumbnailUrl);
      if (cached) {
        thumbPath.setValue(cached);
        return;
      }
      cacheImage(item.thumbnailUrl).then((p) => {
        if (alive && p) thumbPath.setValue(p);
      });
    };
    reload();
    imageCacheSubscribers.add(reload);
    return () => {
      alive = false;
      imageCacheSubscribers.delete(reload);
    };
  }, [item.thumbnailUrl]);

  return (
    <NavigationLink
      {...glassListRowStyleProps()}
      destination={
        <GalleryDetailView gid={item.gid} token={item.token} onLanguageDetected={onLanguageDetected} onTagSearch={onTagSearch} />
      }
    >
      <HStack spacing={12} alignment="top" frame={{ maxWidth: "infinity", alignment: "leading" }}>
        {item.thumbnailUrl ? (
          thumbPath.value ? (
            <Image
              filePath={thumbPath.value}
              frame={{ width: 80, height: 100 }}
              {...roundedImage(12)}
            />
          ) : (
            <Image
              imageUrl={item.thumbnailUrl}
              frame={{ width: 80, height: 100 }}
              {...roundedImage(12)}
            />
          )
        ) : (
          <VStack
            frame={{ width: 80, height: 100 }}
            background="thinMaterial"
            clipShape={roundedClip(12)}
            alignment="center"
          >
            <Text font="caption2" foregroundStyle={secondaryLabelColor()}>{categoryTranslations[item.category]}</Text>
          </VStack>
        )}
        <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font="subheadline" fontWeight="semibold" lineLimit={2} multilineTextAlignment="leading">{title}</Text>
          <HStack spacing={6}>
            <CategoryBadge category={item.category} />
            {item.language ? (
              <Text font="caption2" fontWeight="medium" foregroundStyle={secondaryLabelColor()}>{item.language}</Text>
            ) : null}
            {item.isAI ? (
              <Text font="caption2" fontWeight="bold" foregroundStyle="purple">AI</Text>
            ) : null}
            {item.rating > 0 ? (
              <Text font="caption" foregroundStyle="orange">★ {item.rating.toFixed(1)}</Text>
            ) : null}
            {item.fileCount > 0 ? (
              <Text font="caption" foregroundStyle={secondaryLabelColor()}>{item.fileCount}P</Text>
            ) : null}
          </HStack>
          {item.uploader ? (
            <Text font="caption" foregroundStyle={secondaryLabelColor()} lineLimit={1} multilineTextAlignment="leading">
              {item.uploader}
            </Text>
          ) : null}
        </VStack>
      </HStack>
    </NavigationLink>
  );
}



function GalleryDetailView({
  gid,
  token,
  onLanguageDetected,
  onTagSearch,
}: {
  gid: number;
  token: string;
  onLanguageDetected?: (gid: number, language: string) => void;
  onTagSearch?: (query: string) => void;
}) {

  const appearanceTick = useObservable(0);
  useEffect(() => {
    const listener = (v: number) => appearanceTick.setValue(v);
    appearanceSubscribers.add(listener);
    return () => {
      appearanceSubscribers.delete(listener);
    };
  }, []);
  void appearanceTick.value;

  const gallery = useObservable<EHGalleryDetail | null>(null);
  const loading = useObservable(true);
  const errorMsg = useObservable("");
  const moreError = useObservable("");
  const currentPage = useObservable(0);
  const images = useObservable<EHImageItem[]>([]);

  const zipDownloading = useObservable(false);
  const zipProgress = useObservable("");
  const savingPage = useObservable<number | null>(null);

  useEffect(() => {
    loadGallery(0);


  }, [gid, token]);

  const loadGallery = async (page: number) => {
    loading.setValue(true);
    errorMsg.setValue("");
    moreError.setValue("");
    try {
      const detail = await api.getGalleryInfo(gid, token, page);
      gallery.setValue(detail);
      if (page === 0) {
        images.setValue(detail.images);

        if (detail.language && onLanguageDetected) {
          onLanguageDetected(gid, detail.language);
        }
      } else {

        images.setValue([...images.value, ...detail.images]);
      }
      currentPage.setValue(page);
    } catch (e: any) {
      if (page === 0) {
        errorMsg.setValue(e.message || "加载失败");
      } else {

        moreError.setValue(e.message || "加载更多失败");
      }
    } finally {
      loading.setValue(false);
    }
  };


  const openReader = async (img: EHImageItem) => {
    await Navigation.present(
      <ReaderView
        gid={gid}
        token={token}
        images={images.value}
        startPage={img.page}
        fileCount={gallery.value?.fileCount ?? images.value.length}
      />
    );
  };


  const startZipDownload = async () => {
    if (zipDownloading.value) return;
    const g = gallery.value;
    if (!g) return;
    zipDownloading.setValue(true);
    zipProgress.setValue("准备中...");
    try {
      const zipPath = await downloadGalleryZip(
        gid,
        token,
        g.fileCount ?? images.value.length,
        images.value,
        (done, total) => {
          zipProgress.setValue(`${done}/${total}`);
        },
      );
      zipProgress.setValue("打包完成");

      try {
        await DocumentInteraction.optionsMenu(zipPath);
      } catch {

        await alert({
          title: "已打包",
          message: `zip 已保存到：\n${zipPath}\n\n可在「文件」App 的 Scripting 文档目录中找到。`,
        });
      }
    } catch (e: any) {
      if (e instanceof ZipCancelledError) {
        await alert({ title: "已取消", message: "打包下载已取消。" });
      } else {
        await alert({
          title: "下载失败",
          message: e?.message || "未知错误",
        });
      }
    } finally {
      zipDownloading.setValue(false);
      zipProgress.setValue("");
    }
  };


  const startSingleDownload = async (img: EHImageItem) => {
    if (savingPage.value !== null) return;
    savingPage.setValue(img.page);
    try {
      const ok = await saveSingleImageToPhotos(gid, img);
      if (ok) {
        await alert({
          title: "已保存",
          message: `第 ${img.page + 1} 页已保存到相册。`,
        });
      } else {
        await alert({
          title: "保存失败",
          message: "照片写入相册未成功，请检查相册权限。",
        });
      }
    } catch (e: any) {
      await alert({
        title: "保存失败",
        message: e?.message || "未知错误",
      });
    } finally {
      savingPage.setValue(null);
    }
  };

  const g = gallery.value;

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} preferredColorScheme={currentAppearance === "system" ? undefined : (currentAppearance as any)}>
      <PageBackground />
      <List
        listStyle="inset"
        listRowSpacing={10}
        listSectionSpacing={24}
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
        navigationTitle={g ? extractTitle(g as any) : "加载中..."}
        navigationBarTitleDisplayMode="inline"
      >
        {loading.value && !g ? (
          <Section>
            <GlassListRow>
              <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>加载中...</Text>
            </GlassListRow>
          </Section>
        ) : errorMsg.value ? (
          <Section>
            <GlassSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="subheadline" foregroundStyle="red" multilineTextAlignment="leading">{errorMsg.value}</Text>
                <GlassActionButton title="重试" systemImage="arrow.clockwise" action={() => loadGallery(0)} />
              </VStack>
            </GlassSurface>
          </Section>
        ) : g ? (
          <>
            <Section>
              <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
                <ShelfHeader title="基本信息" />
                <GlassSurface>
                  <VStack alignment="leading" spacing={10} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                    <HStack spacing={12} alignment="top" frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      {g.coverUrl ? (
                        <Image
                          imageUrl={g.coverUrl}
                          frame={{ width: 96, height: 140 }}
                          clipShape={roundedClip(10)}
                        />
                      ) : null}
                      <VStack alignment="leading" spacing={6} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                        <HStack alignment="center" spacing={8}>
                          <CategoryBadge category={g.category} />
                          {g.isAI ? (
                            <Text font="caption2" fontWeight="bold" foregroundStyle="purple">AI</Text>
                          ) : null}
                          <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>
                            ★ {g.rating.toFixed(1)} ({g.ratingCount})
                          </Text>
                          <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>{g.fileCount}P</Text>
                        </HStack>
                        {g.japaneseTitle ? (
                          <Text font="subheadline" foregroundStyle={secondaryLabelColor()} lineLimit={2} multilineTextAlignment="leading">
                            {g.japaneseTitle}
                          </Text>
                        ) : null}
                        {g.language ? <Text font="caption" foregroundStyle={secondaryLabelColor()}>语言: {g.language}</Text> : null}
                        <Text font="caption" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">
                          {g.uploader} · {g.postedTime}
                        </Text>
                      </VStack>
                    </HStack>
                    { }
                    <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Posted</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">{g.postedTime}</Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Parent</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">
                          {g.parentTitle ? g.parentTitle : g.parentGid ? `#${g.parentGid}` : "None"}
                        </Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Visible</Text>
                        <Text font="caption2" foregroundStyle={g.visible ? labelColor() : "red"} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">
                          {g.visibleText ?? (g.visible ? "Yes" : "No")}
                          {g.invisibleCause ? ` (${g.invisibleCause})` : ""}
                        </Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Language</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">{g.language || "—"}</Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>File Size</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">{g.fileSize}</Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Favorited</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">
                          {(g.favoriteCount ?? 0) > 0 ? `${g.favoriteCount} times` : g.favorited ? "Yes" : "Never"}
                        </Text>
                      </HStack>
                      { }
                      <HStack frame={{ maxWidth: "infinity", alignment: "trailing" }} spacing={8}>
                        <Button
                          buttonStyle="plain"
                          disabled={false}
                          glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                          glassEffectTransition="materialize"
                          action={zipDownloading.value ? cancelZipDownload : startZipDownload}
                        >
                          <HStack spacing={6} padding={{ horizontal: 14, vertical: 8 }}>
                            <Image systemName={zipDownloading.value ? "xmark.circle.fill" : "archivebox.fill"} font="subheadline" foregroundStyle={zipDownloading.value ? "#ff453a" : labelColor()} />
                            <Text font="subheadline" fontWeight="semibold" foregroundStyle={zipDownloading.value ? "#ff453a" : labelColor()}>
                              {zipDownloading.value ? (zipProgress.value ? `取消 (${zipProgress.value})` : "取消下载") : "打包下载"}
                            </Text>
                          </HStack>
                        </Button>
                        <Button
                          buttonStyle="plain"
                          disabled={images.value.length === 0}
                          glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                          glassEffectTransition="materialize"
                          action={() => {
                            const first = images.value[0];
                            if (first) openReader(first);
                          }}
                        >
                          <HStack spacing={6} padding={{ horizontal: 14, vertical: 8 }}>
                            <Image systemName="book.fill" font="subheadline" foregroundStyle={labelColor()} />
                            <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>阅读</Text>
                          </HStack>
                        </Button>
                      </HStack>
                    </VStack>
                    <HStack alignment="center" spacing={14}>
                      {g.favoriteCount ? <Text font="caption" foregroundStyle={secondaryLabelColor()}>♥ {g.favoriteCount}</Text> : null}
                    </HStack>
                  </VStack>
                </GlassSurface>
              </VStack>
            </Section>

            {g.tags.length > 0 ? (
              <Section>
                <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
                  <ShelfHeader title="标签" caption={`${g.tags.length} 个`} />
                  <GlassSurface>
                    <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      {groupTagsByNamespace(g.tags).map(([ns, names]: [string, string[]]) => (
                        <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }} key={ns}>
                          <Text font="caption2" fontWeight="semibold" foregroundStyle={tertiaryLabelColor()}>
                            {(namespaceTranslations as Record<string, string>)[ns] || ns}
                          </Text>
                          {names.map((name) => (
                            <Button
                              key={name}
                              buttonStyle="plain"
                              glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                              glassEffectTransition="materialize"
                              frame={{ maxWidth: "infinity", alignment: "leading" }}
                              action={() => onTagSearch?.(`${ns}:${name}`)}
                            >
                              <HStack spacing={5} padding={{ horizontal: 10, vertical: 6 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                                <Image systemName="magnifyingglass" font="caption2" foregroundStyle={secondaryLabelColor()} />
                                <Text font="caption" fontWeight="medium" foregroundStyle={labelColor()}>{name}</Text>
                              </HStack>
                            </Button>
                          ))}
                        </VStack>
                      ))}
                    </VStack>
                  </GlassSurface>
                </VStack>
              </Section>
            ) : null}

            {g.comments.length > 0 ? (
              <Section>
                <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
                  <ShelfHeader title="评论" caption={`${g.commentCount} 条`} />
                  <GlassSurface>
                    <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      {g.comments.map((c) => (
                        <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }} key={c.id}>
                          <HStack alignment="center" spacing={6} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                            <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()} lineLimit={1}>
                              {c.commenter}
                            </Text>
                            {c.isUploader ? (
                              <Text font="caption2" fontWeight="semibold" foregroundStyle="blue">上传者</Text>
                            ) : null}
                            <Spacer />
                            {c.score !== 0 || c.voteCount > 0 ? (
                              <Text font="caption" foregroundStyle={secondaryLabelColor()}>
                                {c.score > 0 ? `+${c.score}` : c.score} 分 · {c.voteCount} 票
                              </Text>
                            ) : null}
                          </HStack>
                          {c.postedTime ? (
                            <Text font="caption" foregroundStyle={tertiaryLabelColor()}>{c.postedTime}</Text>
                          ) : null}
                          {c.type && !c.isUploader ? (
                            <Text font="caption2" foregroundStyle={tertiaryLabelColor()}>{c.type}</Text>
                          ) : null}
                          <Text font="subheadline" foregroundStyle={labelColor()} multilineTextAlignment="leading">
                            {c.body}
                          </Text>
                        </VStack>
                      ))}
                    </VStack>
                  </GlassSurface>
                </VStack>
              </Section>
            ) : null}

            <Section>
              <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
                <ShelfHeader title="图片" caption={`${images.value.length}/${g.fileCount}`} />
                {images.value.map((img, idx) => (
                  <GlassListRow key={idx}>
                    <HStack spacing={6} frame={{ maxWidth: "infinity" as const }}>
                      <Button
                        buttonStyle="plain"
                        frame={{ maxWidth: "infinity" as const }}
                        action={() => openReader(img)}
                      >
                        <HStack spacing={12} alignment="center" frame={{ maxWidth: "infinity", alignment: "leading" }}>
                          {img.showkey && img.spriteX !== undefined && img.thumbnailUrl ? (
                            <SpriteThumb spriteUrl={img.thumbnailUrl} spriteX={img.spriteX} />
                          ) : img.thumbnailUrl ? (
                            <Image
                              imageUrl={img.thumbnailUrl}
                              frame={{ width: 100, height: 146 }}
                              clipShape={roundedClip(8)}
                            />
                          ) : (
                            <VStack
                              frame={{ width: 100, height: 75 }}
                              background="thinMaterial"
                              clipShape={roundedClip(8)}
                              alignment="center"
                            >
                              <Text font="subheadline" fontWeight="semibold" foregroundStyle={secondaryLabelColor()}>#{img.page + 1}</Text>
                            </VStack>
                          )}
                          <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                            <Text font="body" foregroundStyle={labelColor()} lineLimit={1} multilineTextAlignment="leading">
                              {img.name ? img.name : `第 ${img.page + 1} 页`}
                            </Text>
                            <Text font="caption" foregroundStyle={tertiaryLabelColor()}>点击查看原图</Text>
                          </VStack>
                        </HStack>
                      </Button>
                      <Button
                        buttonStyle="plain"
                        disabled={savingPage.value !== null}
                        glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                        glassEffectTransition="materialize"
                        action={() => startSingleDownload(img)}
                      >
                        <VStack alignment="center" spacing={2} padding={{ horizontal: 8, vertical: 6 }} frame={{ minWidth: 56 }}>
                          <Image
                            systemName={savingPage.value === img.page ? "arrow.down.circle.fill" : "square.and.arrow.down"}
                            font="body"
                            foregroundStyle={savingPage.value === img.page ? (GLASS_TOKENS.accent as Color) : secondaryLabelColor()}
                          />
                          <Text font="caption2" foregroundStyle={secondaryLabelColor()}>
                            {savingPage.value === img.page ? "保存中" : "保存"}
                          </Text>
                        </VStack>
                      </Button>
                    </HStack>
                  </GlassListRow>
                ))}
                {moreError.value ? (
                  <GlassSurface>
                    <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      <Text font="caption" foregroundStyle="orange" multilineTextAlignment="leading">
                        {moreError.value}
                      </Text>
                      <GlassActionButton
                        title="重试加载"
                        systemImage="arrow.clockwise"
                        action={() => loadGallery(currentPage.value + 1)}
                      />
                    </VStack>
                  </GlassSurface>
                ) : null}
                {g.pageCount && images.value.length < g.fileCount ? (
                  <GlassActionButton
                    title={`加载更多 (${images.value.length}/${g.fileCount})`}
                    systemImage="arrow.down.circle"
                    action={() => loadGallery(currentPage.value + 1)}
                  />
                ) : null}
              </VStack>
            </Section>
          </>
        ) : null}
      </List>
    </ZStack>
  );
}

function groupTagsByNamespace(
  tags: { namespace: string; name: string }[],
): [string, string[]][] {
  const map = new Map<string, string[]>();
  for (const tag of tags) {
    const list = map.get(tag.namespace) || [];
    list.push(tag.name);
    map.set(tag.namespace, list);
  }
  return Array.from(map.entries());
}



const IMAGE_CACHE_DIR = FileManager.documentsDirectory + "/ehviewer_cache";

function ensureImageCacheDir(): void {
  try {
    if (!FileManager.existsSync(IMAGE_CACHE_DIR)) {
      FileManager.createDirectorySync(IMAGE_CACHE_DIR, true);
    }
  } catch {}
}

function imageCacheKey(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function imageCachePath(url: string): string {
  return IMAGE_CACHE_DIR + "/" + imageCacheKey(url) + ".img";
}

function getCachedImagePath(url: string): string | null {
  try {
    const p = imageCachePath(url);
    return FileManager.existsSync(p) ? p : null;
  } catch {
    return null;
  }
}


const cacheImageInFlight = new Map<string, Promise<string | null>>();


const imageCacheSubscribers = new Set<() => void>();
function notifyImageCacheInvalidated(): void {
  for (const fn of imageCacheSubscribers) {
    try {
      fn();
    } catch {}
  }
}

async function cacheImage(url: string): Promise<string | null> {
  const inFlight = cacheImageInFlight.get(url);
  if (inFlight) return inFlight;
  const p = (async () => {
    try {
      ensureImageCacheDir();
      const p = imageCachePath(url);
      if (FileManager.existsSync(p)) return p;
      const bytes = await api.downloadImage(url);
      if (!bytes || bytes.length === 0) return null;
      await FileManager.writeAsBytes(p, bytes);
      return p;
    } catch {
      return null;
    }
  })();
  cacheImageInFlight.set(url, p);
  try {
    return await p;
  } finally {
    cacheImageInFlight.delete(url);
  }
}

function getImageCacheSize(): number {
  try {
    if (!FileManager.existsSync(IMAGE_CACHE_DIR)) return 0;
    const files = FileManager.readDirectorySync(IMAGE_CACHE_DIR);
    let total = 0;
    for (const f of files) {
      try {
        const full = f.startsWith(IMAGE_CACHE_DIR) ? f : IMAGE_CACHE_DIR + "/" + f;
        total += FileManager.statSync(full).size;
      } catch {}
    }
    return total;
  } catch {
    return 0;
  }
}


function clearImageCache(): { removed: number; freed: number } {
  let removed = 0;
  let freed = 0;
  try {
    if (!FileManager.existsSync(IMAGE_CACHE_DIR)) {
      ensureImageCacheDir();
      return { removed, freed };
    }
    const files = FileManager.readDirectorySync(IMAGE_CACHE_DIR);
    for (const f of files) {
      try {
        const full = f.startsWith(IMAGE_CACHE_DIR) ? f : IMAGE_CACHE_DIR + "/" + f;
        if (!FileManager.existsSync(full)) continue;
        try {
          freed += FileManager.statSync(full).size;
        } catch {}
        FileManager.removeSync(full);
        removed++;
      } catch {

      }
    }

    try {
      FileManager.removeSync(IMAGE_CACHE_DIR);
    } catch {}
    ensureImageCacheDir();

    notifyImageCacheInvalidated();
  } catch {}
  return { removed, freed };
}



const SEARCH_HISTORY_FILE = FileManager.documentsDirectory + "/ehviewer_search_history.json";
const SEARCH_HISTORY_LIMIT = 20;

function loadSearchHistory(): string[] {
  try {
    if (!FileManager.existsSync(SEARCH_HISTORY_FILE)) return [];
    const raw = FileManager.readAsStringSync(SEARCH_HISTORY_FILE);
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x: any) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(list: string[]): void {
  try {
    FileManager.writeAsStringSync(SEARCH_HISTORY_FILE, JSON.stringify(list.slice(0, SEARCH_HISTORY_LIMIT)));
  } catch {}
}


function addSearchHistory(q: string): string[] {
  const kw = q.trim();
  const list = loadSearchHistory().filter((x) => x !== kw);
  if (kw) list.unshift(kw);
  const trimmed = list.slice(0, SEARCH_HISTORY_LIMIT);
  saveSearchHistory(trimmed);
  return trimmed;
}


function removeSearchHistory(q: string): string[] {
  const list = loadSearchHistory().filter((x) => x !== q);
  saveSearchHistory(list);
  return list;
}


function clearSearchHistory(): string[] {
  saveSearchHistory([]);
  return [];
}



const DOWNLOAD_DIR = FileManager.documentsDirectory + "/ehviewer_downloads";

function ensureDownloadDir(): void {
  try {
    if (!FileManager.existsSync(DOWNLOAD_DIR)) {
      FileManager.createDirectorySync(DOWNLOAD_DIR, true);
    }
  } catch {}
}


function imageExtFromUrl(url: string): string {
  const m = url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i);
  return m ? m[1].toLowerCase() : "jpg";
}


let zipCancelRequested = false;
function cancelZipDownload(): void {
  zipCancelRequested = true;
}
class ZipCancelledError extends Error {
  constructor(message = "下载已取消") {
    super(message);
    this.name = "ZipCancelledError";
  }
}


async function downloadGalleryZip(
  gid: number,
  token: string,
  fileCount: number,
  knownImages: EHImageItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  ensureDownloadDir();
  zipCancelRequested = false;


  const all: EHImageItem[] = [...knownImages];
  let page = Math.floor(all.length / PER_PAGE);
  let guard = 0;
  while (all.length < fileCount && guard < 100) {
    guard++;
    const detail = await api.getGalleryInfo(gid, token, page);
    const existing = new Set(all.map((i) => i.page));
    const added = detail.images.filter((i: EHImageItem) => !existing.has(i.page));
    if (added.length === 0) break;
    all.push(...added);
    page++;
  }
  if (all.length === 0) throw new Error("没有可下载的图片");


  const tmpDir = `${DOWNLOAD_DIR}/${gid}`;
  let failed = 0;
  try {
    if (FileManager.existsSync(tmpDir)) FileManager.removeSync(tmpDir);
    FileManager.createDirectorySync(tmpDir, true);

    for (let i = 0; i < all.length; i++) {
      if (zipCancelRequested) throw new ZipCancelledError();
      const img = all[i];
      try {
        const info = await api.getPageInfo(gid, img.imgkey, img.page);
        if (!info.imageUrl) throw new Error("无图片地址");
        const bytes = await api.downloadImage(info.imageUrl);
        if (!bytes || bytes.length === 0) throw new Error("下载内容为空");
        const ext = imageExtFromUrl(info.imageUrl);
        const name = `${String(img.page + 1).padStart(3, "0")}.${ext}`;
        await FileManager.writeAsBytes(`${tmpDir}/${name}`, bytes);
      } catch {
        failed++;
      }
      onProgress?.(i + 1, all.length);
    }


    const zipPath = `${DOWNLOAD_DIR}/${gid}.zip`;
    if (FileManager.existsSync(zipPath)) FileManager.removeSync(zipPath);
    await FileManager.zip(tmpDir, zipPath, false);

    if (failed > 0) {

      console.log(`[download] ${failed} 页下载失败`);
    }
    return zipPath;
  } finally {

    try {
      if (FileManager.existsSync(tmpDir)) FileManager.removeSync(tmpDir);
    } catch {}
  }
}


async function saveSingleImageToPhotos(gid: number, img: EHImageItem): Promise<boolean> {
  const info = await api.getPageInfo(gid, img.imgkey, img.page);
  if (!info.imageUrl) throw new Error("无图片地址");
  const bytes = await api.downloadImage(info.imageUrl);
  if (!bytes || bytes.length === 0) throw new Error("下载内容为空");
  const ext = imageExtFromUrl(info.imageUrl);
  ensureDownloadDir();
  const tmpPath = `${DOWNLOAD_DIR}/single_${gid}_${img.page + 1}.${ext}`;
  try {
    await FileManager.writeAsBytes(tmpPath, bytes);
    const ok = await Photos.savePhoto(tmpPath, {
      fileName: `${gid}_p${img.page + 1}.${ext}`,
    });
    return !!ok;
  } finally {
    try {
      if (FileManager.existsSync(tmpPath)) FileManager.removeSync(tmpPath);
    } catch {}
  }
}




const spriteImageCache = new Map<string, Promise<UIImage | null>>();

function getSpriteImage(url: string): Promise<UIImage | null> {
  let p = spriteImageCache.get(url);
  if (!p) {
    p = UIImage.fromURL(url).catch(() => null);
    spriteImageCache.set(url, p);
    if (spriteImageCache.size > 800) {
      const keys = [...spriteImageCache.keys()];
      for (let i = 0; i < 400 && i < keys.length; i++) {
        spriteImageCache.delete(keys[i]);
      }
    }
  }
  return p;
}


function SpriteThumb({
  spriteUrl,
  spriteX,
  cellWidth = 200,
  cellHeight = 292,
  displayWidth = 100,
  displayHeight = 146,
}: {
  spriteUrl: string;
  spriteX: number;
  cellWidth?: number;
  cellHeight?: number;
  displayWidth?: number;
  displayHeight?: number;
}) {
  const thumb = useObservable<UIImage | null>(null);
  const failed = useObservable(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const img = await getSpriteImage(spriteUrl);
        if (cancelled || !img) {
          if (!cancelled) failed.setValue(true);
          return;
        }
        const cropped = img.renderedIn(
          { width: displayWidth, height: displayHeight },
          {
            position: { x: Math.abs(spriteX), y: 0 },
            size: { width: cellWidth, height: cellHeight },
          }
        );
        if (cancelled) return;
        if (cropped) thumb.setValue(cropped);
        else failed.setValue(true);
      } catch {
        if (!cancelled) failed.setValue(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spriteUrl, spriteX]);

  if (thumb.value) {
    return (
      <Image
        image={thumb.value}
        frame={{ width: displayWidth, height: displayHeight }}
        clipShape={roundedClip(8)}
      />
    );
  }


  return (
    <VStack
      frame={{ width: displayWidth, height: displayHeight }}
      background="thinMaterial"
      clipShape={roundedClip(8)}
      alignment="center"
    >
      <Text font="subheadline" fontWeight="semibold" foregroundStyle={secondaryLabelColor()}>
        {failed.value ? "!" : "…"}
      </Text>
    </VStack>
  );
}




function cookieImportPath(): string {
  const candidates: string[] = [];
  try {
    const docs = FileManager.documentsDirectory;
    if (docs) candidates.push(docs + "/ehviewer_cookie.txt");
  } catch (e) {}
  try {
    const appGroup = FileManager.appGroupDocumentsDirectory;
    if (appGroup) candidates.push(appGroup + "/ehviewer_cookie.txt");
  } catch (e) {}
  try {
    const icloud = FileManager.iCloudDocumentsDirectory;
    if (icloud) candidates.push(icloud + "/ehviewer_cookie.txt");
  } catch (e) {}
  try {
    candidates.push(FileManager.safariBrowserDirectory + "/ehviewer_cookie.txt");
  } catch (e) {}
  for (const p of candidates) {
    try {
      if (FileManager.existsSync(p)) return p;
    } catch (e) {}
  }
  return candidates[0] || (FileManager.documentsDirectory || FileManager.safariBrowserDirectory) + "/ehviewer_cookie.txt";
}


function cookieFromGMStorage(): string | null {
  try {
    const storageDir = FileManager.safariBrowserStorageDirectory;
    const files = FileManager.readDirectorySync(storageDir, false);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = FileManager.readAsStringSync(storageDir + "/" + f);
        const obj = JSON.parse(raw);
        if (obj && typeof obj["ehviewer_cookie"] === "string" && obj["ehviewer_cookie"].trim()) {
          return obj["ehviewer_cookie"].trim();
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}


const pageImageUrlCache = new Map<string, string>();

function cachePageUrl(key: string, url: string) {
  if (pageImageUrlCache.size > 800) {
    let i = 0;
    for (const k of pageImageUrlCache.keys()) {
      if (i++ >= 400) break;
      pageImageUrlCache.delete(k);
    }
  }
  pageImageUrlCache.set(key, url);
}


const PER_PAGE = 20;


const imageAreaHeight = Math.max(320, Device.screen.height - 250);

function ReaderView({
  gid,
  token,
  images: initialImages,
  startPage,
  fileCount,
}: {
  gid: number;
  token: string;
  images: EHImageItem[];
  startPage: number;
  fileCount: number;
}) {

  const appearanceTick = useObservable(0);
  useEffect(() => {
    const listener = (v: number) => appearanceTick.setValue(v);
    appearanceSubscribers.add(listener);
    return () => {
      appearanceSubscribers.delete(listener);
    };
  }, []);
  void appearanceTick.value;

  const dismiss = Navigation.useDismiss();
  const currentIdx = useObservable(startPage);
  const allImages = useObservable<EHImageItem[]>(initialImages);
  const moreLoading = useObservable(false);
  const displayPath = useObservable("");
  const pageInfo = useObservable("");
  const loading = useObservable(false);
  const requestSeq = useObservable(0);

  const savingCurrent = useObservable(false);

  const longPressSaved = useRef(false);


  const readerConfig = loadConfig();

  const pageDirection = readerConfig.pageDirection === "left_to_right" ? "right_to_left" : readerConfig.pageDirection;
  const readerMode = readerConfig.readerMode;
  const leftEdgeAction = readerConfig.leftEdgeAction;
  const rightEdgeAction = readerConfig.rightEdgeAction;


  const isAnimated = useObservable(false);
  const checkAnimated = (url: string) => {
    if (/\.gif(\?|$)/i.test(url)) isAnimated.setValue(true);
  };


  const ensureMore = async () => {
    if (moreLoading.value) return;
    if (allImages.value.length >= fileCount) return;
    moreLoading.setValue(true);
    try {
      const nextPage = Math.floor(allImages.value.length / PER_PAGE);
      const detail = await api.getGalleryInfo(gid, token, nextPage);
      const existing = new Set(allImages.value.map((i) => i.page));
      const added = detail.images.filter((i: EHImageItem) => !existing.has(i.page));
      if (added.length > 0) {
        allImages.setValue([...allImages.value, ...added]);
      }
    } catch {

    } finally {
      moreLoading.setValue(false);
    }
  };

  const maybeLoadMore = (idx: number) => {
    if (idx >= allImages.value.length - 3) ensureMore();
  };

  useEffect(() => {

    currentIdx.setValue(startPage);
    loadPage(startPage);
    maybeLoadMore(startPage);
  }, []);

  const preload = async (idx: number) => {
    if (idx < 0 || idx >= allImages.value.length) return;
    if (pageImageUrlCache.has(`${gid}-${idx}`)) return;
    const img = allImages.value[idx];
    if (!img) return;
    try {
      const info = await api.getPageInfo(gid, img.imgkey, idx);
      if (!info.imageUrl) return;
      pageImageUrlCache.set(`${gid}-${idx}`, info.imageUrl);

      if (!getCachedImagePath(info.imageUrl)) {
        cacheImage(info.imageUrl);
      }
    } catch {}
  };

  const loadPage = async (idx: number) => {
    if (idx < 0 || idx >= allImages.value.length) return;
    const seq = requestSeq.value + 1;
    requestSeq.setValue(seq);
    loading.setValue(true);
    const img = allImages.value[idx];
    if (!img) return;

    pageInfo.setValue(`第 ${idx + 1} / ${allImages.value.length} 页 · 加载中...`);
    try {
      const info = await api.getPageInfo(gid, img.imgkey, idx);
      if (requestSeq.value !== seq) return;
      const url = info.imageUrl;
      if (!url) {
        pageInfo.setValue(`第 ${idx + 1} 页加载失败`);
        return;
      }
      cachePageUrl(`${gid}-${idx}`, url);

      const cached = getCachedImagePath(url);
      if (cached) {
        displayPath.setValue(cached);
        pageInfo.setValue(`第 ${idx + 1} / ${allImages.value.length} 页`);
      } else {

        displayPath.setValue(url);
        pageInfo.setValue(`第 ${idx + 1} / ${allImages.value.length} 页`);
        cacheImage(url).then((p) => {
          if (requestSeq.value === seq && p) displayPath.setValue(p);
        });
      }

      preload(idx + 1);
      preload(idx - 1);
    } catch (e: any) {
      if (requestSeq.value !== seq) return;
      pageInfo.setValue(`第 ${idx + 1} 页加载失败: ${e.message}`);
    } finally {
      if (requestSeq.value === seq) loading.setValue(false);
    }
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= allImages.value.length) return;
    currentIdx.setValue(idx);
    displayPath.setValue("");
    loadPage(idx);
    maybeLoadMore(idx);
  };

  const isLocal = displayPath.value.startsWith("/");


  const stitched = readerMode === "swipe" && !isAnimated.value;
  const stitchedAxis = pageDirection === "vertical" ? "vertical" : "horizontal";
  const stitchedMirror = pageDirection === "right_to_left";

  const nextPage = () => goTo(currentIdx.value + 1);
  const prevPage = () => goTo(currentIdx.value - 1);


  const saveCurrentPage = async () => {
    if (savingCurrent.value) return;
    const idx = stitched ? allImages.value.length - 1 : currentIdx.value;
    const img = allImages.value[idx];
    if (!img) return;
    savingCurrent.setValue(true);
    try {
      const ok = await saveSingleImageToPhotos(gid, img);
      if (ok) {
        await alert({
          title: "已保存",
          message: stitched ? `第 ${idx + 1} 页已保存到相册（滚动浏览保存的是当前已加载的最后一张）。` : `第 ${idx + 1} 页已保存到相册。`,
        });
      } else {
        await alert({
          title: "保存失败",
          message: "照片写入相册未成功，请检查相册权限。",
        });
      }
    } catch (e: any) {
      await alert({
        title: "保存失败",
        message: e?.message || "未知错误",
      });
    } finally {
      savingCurrent.setValue(false);
    }
  };


  const leftAction = leftEdgeAction === "next" ? nextPage : leftEdgeAction === "prev" ? prevPage : null;
  const rightAction = rightEdgeAction === "next" ? nextPage : rightEdgeAction === "prev" ? prevPage : null;


  const handleTapLike = (d: any) => {

    if (longPressSaved.current) {
      longPressSaved.current = false;
      return;
    }
    if (Math.abs(d.translation.width) > 15 || Math.abs(d.translation.height) > 15) return;
    const x = d.startLocation.x;
    const w = Device.screen.width;
    if (x < w / 3) {
      leftAction?.();
    } else if (x > (w * 2) / 3) {
      rightAction?.();
    }
  };


  const handleDragEnded = (d: any) => {
    const dx = d.translation.width;
    const dy = d.translation.height;
    const threshold = 40;
    if (pageDirection === "vertical") {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
        if (dy < 0) nextPage();
        else prevPage();
      }
    } else {

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx > 0) nextPage();
        else prevPage();
      }
    }
  };

  return (
    <ZStack
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      preferredColorScheme={currentAppearance === "system" ? undefined : (currentAppearance as any)}
      navigationTitle={stitched ? `已加载 ${allImages.value.length} / ${fileCount} 张` : `${currentIdx.value + 1} / ${allImages.value.length}`}
      navigationBarTitleDisplayMode="inline"
    >
      <PageBackground />
      <VStack spacing={0} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        { }
        <HStack spacing={8} padding={{ horizontal: 16, vertical: 6 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          {stitched ? (
            <Text font="caption" foregroundStyle={secondaryLabelColor()}>拼接滚动 · 共 {fileCount} 张</Text>
          ) : (
            <Text font="caption" foregroundStyle={secondaryLabelColor()}>{pageInfo.value}</Text>
          )}
          {isAnimated.value ? (
            <Text font="caption" foregroundStyle="#ff9500">⚠ 此帖含动态图片，已切换为单张滑动切换</Text>
          ) : null}
          {moreLoading.value ? (
            <Text font="caption" foregroundStyle={tertiaryLabelColor()}>自动加载后续图片...</Text>
          ) : null}
        </HStack>

        { }
        {stitched ? (
          <ScrollViewReader>
            {(proxy) => (
                <StitchInitialScroll
                  proxy={proxy}
                  shouldScroll={stitchedAxis === "horizontal"}
                  targetPage={startPage}
                >
                <ScrollView
                  axes={stitchedAxis}
                  frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
                >
            {stitchedAxis === "vertical" ? (
              <VStack spacing={10} padding={{ horizontal: 12, vertical: 8 }} frame={{ maxWidth: "infinity" as const }}>
                {allImages.value.map((img, idx) => (
                  <StitchedPage key={img.page} tag={`stitch-${img.page}`} gid={gid} img={img} idx={idx} onUrl={checkAnimated} />
                ))}
                {allImages.value.length < fileCount ? (
                  <Button
                    buttonStyle="plain"
                    frame={{ minHeight: 44 }}
                    glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                    glassEffectTransition="materialize"
                    action={ensureMore}
                  >
                    <Text font="subheadline" fontWeight="semibold" foregroundStyle={GLASS_TOKENS.accent} padding={{ horizontal: 14, vertical: 8 }}>
                      {moreLoading.value ? "加载中..." : "加载更多"}
                    </Text>
                  </Button>
                ) : (
                  <Text font="caption" foregroundStyle={tertiaryLabelColor()} frame={{ maxWidth: "infinity" as const }}>
                    已加载全部 {allImages.value.length} 张
                  </Text>
                )}
              </VStack>
            ) : (
              <HStack
                spacing={10}
                padding={{ horizontal: 12, vertical: 8 }}
                scaleEffect={stitchedMirror ? { x: -1, y: 1 } : undefined}
              >
                { }
                {stitchedMirror ? (
                  <>
                    {allImages.value.length < fileCount ? (
                      <Button
                        buttonStyle="plain"
                        frame={{ width: Device.screen.width - 24, minHeight: imageAreaHeight }}
                        glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                        glassEffectTransition="materialize"
                        scaleEffect={{ x: -1, y: 1 }}
                        action={ensureMore}
                      >
                        <Text font="subheadline" fontWeight="semibold" foregroundStyle={GLASS_TOKENS.accent} padding={{ horizontal: 14, vertical: 8 }}>
                          {moreLoading.value ? "加载中..." : "加载更多"}
                        </Text>
                      </Button>
                    ) : (
                      <Text font="caption" foregroundStyle={tertiaryLabelColor()} frame={{ width: Device.screen.width - 24, minHeight: imageAreaHeight }} scaleEffect={{ x: -1, y: 1 }}>
                        已加载全部 {allImages.value.length} 张
                      </Text>
                    )}
                    {[...allImages.value].reverse().map((img, idx) => (
                      <StitchedPage key={img.page} tag={`stitch-${img.page}`} gid={gid} img={img} idx={allImages.value.length - 1 - idx} onUrl={checkAnimated} orientation="horizontal" mirrored={stitchedMirror} />
                    ))}
                  </>
                ) : (
                  <>
                    {allImages.value.map((img, idx) => (
                      <StitchedPage key={img.page} tag={`stitch-${img.page}`} gid={gid} img={img} idx={idx} onUrl={checkAnimated} orientation="horizontal" mirrored={false} />
                    ))}
                    {allImages.value.length < fileCount ? (
                      <Button
                        buttonStyle="plain"
                        frame={{ width: Device.screen.width - 24, minHeight: imageAreaHeight }}
                        glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                        glassEffectTransition="materialize"
                        action={ensureMore}
                      >
                        <Text font="subheadline" fontWeight="semibold" foregroundStyle={GLASS_TOKENS.accent} padding={{ horizontal: 14, vertical: 8 }}>
                          {moreLoading.value ? "加载中..." : "加载更多"}
                        </Text>
                      </Button>
                    ) : (
                      <Text font="caption" foregroundStyle={tertiaryLabelColor()} frame={{ width: Device.screen.width - 24, minHeight: imageAreaHeight }}>
                        已加载全部 {allImages.value.length} 张
                      </Text>
                    )}
                  </>
                )}
              </HStack>
            )}
                </ScrollView>
              </StitchInitialScroll>
            )}
          </ScrollViewReader>
        ) : (
          <ZStack
            frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
            onDragGesture={
              readerMode === "swipe"
                ? { minDistance: 15, onEnded: handleDragEnded }
                : { minDistance: 0, onEnded: handleTapLike }
            }
            onLongPressGesture={{
              minDuration: 500,
              perform: () => {
                longPressSaved.current = true;
                saveCurrentPage();
              },
            }}
          >
            { }
            <ZStack frame={{ width: Device.screen.width, height: imageAreaHeight }} clipShape={roundedClip(16)}>
              {displayPath.value ? (
                isLocal ? (
                  <Image
                    filePath={displayPath.value}
                    resizable
                    aspectRatio={{ value: null, contentMode: "fit" }}
                    frame={{ width: Device.screen.width, height: imageAreaHeight }}
                  />
                ) : (
                  <Image
                    imageUrl={displayPath.value}
                    placeholder={
                      <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>加载中...</Text>
                    }
                    resizable
                    aspectRatio={{ value: null, contentMode: "fit" }}
                    frame={{ width: Device.screen.width, height: imageAreaHeight }}
                  />
                )
              ) : (
                <VStack
                  frame={{ width: Device.screen.width, height: imageAreaHeight }}
                  padding={16}
                  alignment="center"
                >
                  <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>加载中...</Text>
                </VStack>
              )}
            </ZStack>
          </ZStack>
        )}

        { }
        <HStack
          spacing={8}
          padding={{ horizontal: 12, vertical: 8 }}
          frame={{ maxWidth: "infinity" as const }}
          glassEffect={glassEffectFor("navigation")}
          shadow={{ color: GLASS_TOKENS.material.navigation.shadow, radius: 12, y: 5 }}
        >
          <Button
            title="返回"
            systemImage="chevron.left"
            buttonStyle="plain"
            frame={{ minHeight: 40 }}
            glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
            action={dismiss}
          />
          <Spacer />
          {stitched ? (
            <Text font="body" foregroundStyle={labelColor()}>
              已加载 {allImages.value.length} / {fileCount} 张 · 滚动浏览
            </Text>
          ) : (
            <>
              <Button
                title="上一张"
                buttonStyle="plain"
                disabled={currentIdx.value === 0}
                frame={{ minHeight: 40 }}
                glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                action={prevPage}
              />
              <Text font="body" foregroundStyle={labelColor()}>
                {currentIdx.value + 1} / {allImages.value.length}
              </Text>
              <Button
                title="下一张"
                buttonStyle="plain"
                disabled={currentIdx.value >= allImages.value.length - 1}
                frame={{ minHeight: 40 }}
                glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                action={nextPage}
              />
            </>
          )}
          <Spacer />
          { }
          <Button
            title={savingCurrent.value ? "保存中" : "保存"}
            systemImage={savingCurrent.value ? "arrow.down.circle" : "square.and.arrow.down"}
            buttonStyle="plain"
            disabled={savingCurrent.value}
            frame={{ minHeight: 40 }}
            glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
            action={saveCurrentPage}
          />
        </HStack>
      </VStack>
    </ZStack>
  );
}


function StitchInitialScroll({
  proxy,
  shouldScroll,
  targetPage,
  children,
}: {
  proxy: ScrollViewProxy;
  shouldScroll: boolean;
  targetPage: number;
  children: VirtualNode;
}) {
  const didRef = useRef(false);
  const proxyRef = useRef(proxy);
  proxyRef.current = proxy;
  useEffect(() => {
    if (didRef.current) return;
    if (!shouldScroll) return;
    didRef.current = true;
    const timer = setTimeout(() => {
      try {
        proxyRef.current.scrollTo(`stitch-${targetPage}`, "center");
      } catch (e) {}
    }, 350);
    return () => clearTimeout(timer);


  }, [shouldScroll, targetPage]);
  return children;
}


function StitchedPage({
  gid,
  img,
  idx,
  onUrl,
  orientation = "vertical",
  mirrored = false,
  tag,
}: {
  gid: number;
  img: EHImageItem;
  idx: number;
  onUrl: (url: string) => void;
  orientation?: "vertical" | "horizontal";
  mirrored?: boolean;
  tag?: string;
}) {
  const path = useObservable("");
  const state = useObservable<"loading" | "ready" | "error">("loading");

  const saving = useRef(false);
  const handleSave = async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      const ok = await saveSingleImageToPhotos(gid, img);
      await alert({
        title: ok ? "已保存" : "保存失败",
        message: ok ? `第 ${idx + 1} 页已保存到相册。` : "照片写入相册未成功，请检查相册权限。",
      });
    } catch (e: any) {
      await alert({ title: "保存失败", message: e?.message || "未知错误" });
    } finally {
      saving.current = false;
    }
  };
  const horizontal = orientation === "horizontal";
  const pageSize = horizontal
    ? { width: Device.screen.width - 24, height: imageAreaHeight }
    : { maxWidth: "infinity" as const };

  useEffect(() => {
    let alive = true;
    (async () => {
      const cacheKey = `${gid}-${idx}`;
      const cachedUrl = pageImageUrlCache.get(cacheKey);
      try {
        let url: string | null = cachedUrl ?? null;
        if (!url) {

          await new Promise<void>((r) => setTimeout(() => r(), Math.min(idx * 80, 800)));
          if (!alive) return;
          const info = await api.getPageInfo(gid, img.imgkey, idx);
          if (!alive) return;
          url = info.imageUrl ?? null;
          if (url) cachePageUrl(cacheKey, url);
        }
        if (!alive) return;
        if (!url) {
          state.setValue("error");
          return;
        }
        onUrl(url);
        const cached = getCachedImagePath(url);
        if (cached) {
          path.setValue(cached);
          state.setValue("ready");
          return;
        }
        path.setValue(url);
        state.setValue("ready");
        cacheImage(url).then((p) => {
          if (alive && p) path.setValue(p);
        });
      } catch {
        if (alive) state.setValue("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state.value === "loading") {
    return (
      <VStack
        frame={horizontal ? { width: Device.screen.width - 24, height: imageAreaHeight } : { height: 220, maxWidth: "infinity" as const }}
        alignment="center"
        scaleEffect={mirrored ? { x: -1, y: 1 } : undefined}
        tag={tag}
      >
        <Text font="caption" foregroundStyle={secondaryLabelColor()}>第 {idx + 1} 张加载中...</Text>
      </VStack>
    );
  }
  if (state.value === "error") {
    return (
      <VStack frame={horizontal ? { width: Device.screen.width - 24, height: imageAreaHeight } : { height: 120, maxWidth: "infinity" as const }} alignment="center" scaleEffect={mirrored ? { x: -1, y: 1 } : undefined} tag={tag}>
        <Text font="caption" foregroundStyle={tertiaryLabelColor()}>第 {idx + 1} 张加载失败</Text>
      </VStack>
    );
  }
  return (
    <VStack
      spacing={4}
      frame={horizontal ? { width: Device.screen.width - 24, height: imageAreaHeight } : { maxWidth: "infinity" as const }}
      scaleEffect={mirrored ? { x: -1, y: 1 } : undefined}
      tag={tag}
      onLongPressGesture={{ minDuration: 500, perform: handleSave }}
    >
      {path.value.startsWith("/") ? (
        <Image
          filePath={path.value}
          resizable
          aspectRatio={{ value: null, contentMode: "fit" }}
          frame={horizontal ? { width: Device.screen.width - 24, height: imageAreaHeight } : { maxWidth: "infinity" as const }}
          clipShape={roundedClip(12)}
        />
      ) : (
        <Image
          imageUrl={path.value}
          resizable
          aspectRatio={{ value: null, contentMode: "fit" }}
          frame={horizontal ? { width: Device.screen.width - 24, height: imageAreaHeight } : { maxWidth: "infinity" as const }}
          clipShape={roundedClip(12)}
        />
      )}
      <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ maxWidth: "infinity" as const }}>
        第 {idx + 1} 张
      </Text>
    </VStack>
  );
}



const GALLERY_CATEGORIES: { value: string; label: string }[] = [
  { value: "Doujinshi", label: "同人志" },
  { value: "Manga", label: "漫画" },
  { value: "Artist CG", label: "画师CG" },
  { value: "Game CG", label: "游戏CG" },
  { value: "Image Set", label: "图集" },
  { value: "Cosplay", label: "Cosplay" },
  { value: "Asian Porn", label: "亚洲色情" },
  { value: "Western", label: "欧美" },
  { value: "Non-H", label: "非H" },
  { value: "Misc", label: "杂项" },
];

function BrowseView({ refreshSignal = 0, onTagSearch }: { refreshSignal?: boolean | number; onTagSearch?: (query: string) => void }) {

  const appearanceTick = useObservable(0);
  useEffect(() => {
    const listener = (v: number) => appearanceTick.setValue(v);
    appearanceSubscribers.add(listener);
    return () => {
      appearanceSubscribers.delete(listener);
    };
  }, []);
  void appearanceTick.value;
  const galleries = useObservable<EHGalleryListItem[]>([]);
  const loading = useObservable(false);
  const errorMsg = useObservable("");
  const currentPage = useObservable(0);
  const listType = useObservable("home");
  const selectedCategory = useObservable<string | null>(null);

  useEffect(() => {
    loadGalleries(0, listType.value);
  }, []);


  useEffect(() => {
    loadGalleries(0, listType.value);

  }, [refreshSignal]);


  const handleLanguageDetected = (gid: number, language: string) => {
    galleries.setValue(
      galleries.value.map((it) =>
        it.gid === gid && !it.language ? { ...it, language } : it
      )
    );
  };

  const loadGalleries = async (page: number, type: string) => {
    if (!api.isLoggedIn && (type === "watched" || type === "favorites")) {
      errorMsg.setValue("需要登录才能访问「订阅」和「收藏」");
      return;
    }
    loading.setValue(true);
    errorMsg.setValue("");
    try {
      let items: EHGalleryListItem[];
      switch (type) {
        case "home":

          items = api.isLoggedIn ? await api.getHome(page) : await api.getPopular(page);
          break;
        case "watched":
          items = await api.getWatched(page);
          break;
        case "popular":
          items = await api.getPopular(page);
          break;
        case "favorites":
          items = await api.getFavorites(page);
          break;
        case "category":
          items = await api.search({
            categories: selectedCategory.value ? [selectedCategory.value as any] : undefined,
            page,
          });
          break;
        default:
          items = await api.getFrontPage(page);
      }
      if (page === 0) {
        galleries.setValue(items);
      } else {
        galleries.setValue([...galleries.value, ...items]);
      }
      currentPage.setValue(page);
    } catch (e: any) {
      errorMsg.setValue(e.message || "加载失败");
    } finally {
      loading.setValue(false);
    }
  };

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} preferredColorScheme={currentAppearance === "system" ? undefined : (currentAppearance as any)}>
      <PageBackground />
      <VStack spacing={0} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        { }
        <HStack
          spacing={8}
          padding={{ horizontal: 12, vertical: 8 }}
          frame={{ maxWidth: "infinity", alignment: "leading" }}
          glassEffect={glassEffectFor("navigation")}
          shadow={{ color: GLASS_TOKENS.material.navigation.shadow, radius: 12, y: 5 }}
        >
          {[
            ["home", "推荐"],
            ["watched", "订阅"],
            ["popular", "热门"],
          ].map(([type, label]) => {
            const active = listType.value === type;
            return (
              <Button
                key={type}
                buttonStyle="plain"
                frame={{ minHeight: 40 }}
                glassEffect={active ? glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true) : undefined}
                glassEffectTransition="materialize"
                action={() => {
                  listType.setValue(type);
                  galleries.setValue([]);
                  loadGalleries(0, type);
                }}
              >
                <Text
                  font="subheadline"
                  fontWeight={active ? "semibold" : "regular"}
                  foregroundStyle={active ? GLASS_TOKENS.accent : "label"}
                  padding={{ horizontal: 14, vertical: 8 }}
                >
                  {label}
                </Text>
              </Button>
            );
          })}
          <Menu
            title={selectedCategory.value ? categoryTranslations[selectedCategory.value as any] || selectedCategory.value : "分类"}
            systemImage="square.grid.2x2"
            buttonStyle="plain"
            frame={{ minHeight: 40 }}
            padding={{ horizontal: 14, vertical: 8 }}
          >
            <Button
              title={selectedCategory.value ? "全部" : "✓ 全部"}
              buttonStyle="plain"
              action={() => {
                selectedCategory.setValue(null);
                listType.setValue("home");
                galleries.setValue([]);
                loadGalleries(0, "home");
              }}
            />
            {GALLERY_CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                title={selectedCategory.value === cat.value ? `✓ ${cat.label}` : cat.label}
                buttonStyle="plain"
                action={() => {
                  selectedCategory.setValue(cat.value);
                  listType.setValue("category");
                  galleries.setValue([]);
                  loadGalleries(0, "category");
                }}
              />
            ))}
          </Menu>
          <Spacer />
          <GlassIconButton
            title="刷新"
            systemName="arrow.clockwise"
            action={() => {
              galleries.setValue([]);
              loadGalleries(0, listType.value);
            }}
          />
        </HStack>

        { }
        <HStack padding={{ horizontal: 16, vertical: 6 }}>
          <Text font="caption" foregroundStyle={secondaryLabelColor()}>
            {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"}
          </Text>
        </HStack>

        <List
          listStyle="inset"
          listRowSpacing={10}
          listSectionSpacing={24}
          scrollContentBackground="hidden"
          listRowBackground={<></>}
          listRowSeparator="hidden"
          navigationTitle=""
          navigationBarTitleDisplayMode="inline"
          frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        >
          { }
          {errorMsg.value ? (
            <Section>
              <GlassSurface>
                <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Text font="caption" foregroundStyle="red" multilineTextAlignment="leading">{errorMsg.value}</Text>
                  <GlassActionButton title="重试" systemImage="arrow.clockwise" action={() => loadGalleries(0, listType.value)} />
                </VStack>
              </GlassSurface>
            </Section>
          ) : null}

          { }
          <Section>
            {galleries.value.map((item) => (
              <GalleryRow
                key={`${item.gid}-${item.token}`}
                item={item}
                onLanguageDetected={handleLanguageDetected}
                onTagSearch={onTagSearch}
              />
            ))}
          </Section>

          { }
          {galleries.value.length > 0 ? (
            <Section>
              <GlassActionButton
                title={loading.value ? "加载中" : "加载更多"}
                systemImage="arrow.down.circle"
                loading={loading.value}
                action={() => loadGalleries(currentPage.value + 1, listType.value)}
              />
            </Section>
          ) : null}

          {loading.value && galleries.value.length === 0 ? (
            <Section>
              <GlassListRow>
                <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>加载中...</Text>
              </GlassListRow>
            </Section>
          ) : null}

          {!loading.value && galleries.value.length === 0 && !errorMsg.value ? (
            <Section>
              <GlassListRow>
                <Text font="subheadline" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">
                  {listType.value === "watched"
                    ? "暂无订阅内容：请先在 E-Hentai 网站 My Tags 添加订阅标签（Watched Tags）后刷新"
                    : "暂无内容"}
                </Text>
              </GlassListRow>
            </Section>
          ) : null}
        </List>
      </VStack>
    </ZStack>
  );
}



function SearchView({
  onTagSearch,
}: {
  onTagSearch?: (query: string) => void;
}) {

  const appearanceTick = useObservable(0);
  useEffect(() => {
    const listener = (v: number) => appearanceTick.setValue(v);
    appearanceSubscribers.add(listener);
    return () => {
      appearanceSubscribers.delete(listener);
    };
  }, []);
  void appearanceTick.value;
  const keyword = useObservable("");
  const results = useObservable<EHGalleryListItem[]>([]);
  const loading = useObservable(false);
  const errorMsg = useObservable("");
  const currentPage = useObservable(0);

  const history = useObservable<string[]>(loadSearchHistory());


  const resetSearch = () => {
    Keyboard.hide();
    keyword.setValue("");
    results.setValue([]);
    errorMsg.setValue("");
    currentPage.setValue(0);
  };

  const doSearch = async (page: number = 0, kw?: string) => {
    const q = kw ?? keyword.value;
    if (!q.trim()) return;
    Keyboard.hide();
    loading.setValue(true);
    errorMsg.setValue("");
    try {
      const items = await api.search({ keyword: q, page });
      if (page === 0) {
        results.setValue(items);

        history.setValue(addSearchHistory(q));
      } else {
        results.setValue([...results.value, ...items]);
      }
      currentPage.setValue(page);
    } catch (e: any) {
      errorMsg.setValue(e.message || "搜索失败");
    } finally {
      loading.setValue(false);
    }
  };


  const handleLanguageDetected = (gid: number, language: string) => {
    results.setValue(
      results.value.map((it) =>
        it.gid === gid && !it.language ? { ...it, language } : it
      )
    );
  };

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} preferredColorScheme={currentAppearance === "system" ? undefined : (currentAppearance as any)}>
      <PageBackground />
      <VStack spacing={0} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        { }
        <HStack
          spacing={8}
          padding={{ horizontal: 12, vertical: 8 }}
          frame={{ maxWidth: "infinity", alignment: "leading" }}
          glassEffect={glassEffectFor("navigation")}
          shadow={{ color: GLASS_TOKENS.material.navigation.shadow, radius: 12, y: 5 }}
        >
          <Button
            buttonStyle="plain"
            frame={{ minHeight: 46 }}
            glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
            glassEffectTransition="materialize"
            action={resetSearch}
          >
            <HStack spacing={6} padding={{ horizontal: 14, vertical: 10 }} frame={{ minHeight: 46 }}>
              <Image systemName="chevron.left" font="caption" foregroundStyle={labelColor()} />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>返回</Text>
            </HStack>
          </Button>
          <HStack
            spacing={8}
            padding={{ horizontal: 12, vertical: 2 }}
            frame={{ maxWidth: "infinity", minHeight: 46 }}
            glassEffect={glassEffectFor("content", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, false)}
          >
            <Image systemName="magnifyingglass" font="caption" foregroundStyle={secondaryLabelColor()} />
            <TextField
              title="关键词"
              value={keyword.value}
              onChanged={(v) => keyword.setValue(v)}
              prompt="输入标题、作者或标签"
              onSubmit={() => doSearch(0)}
              textFieldStyle="plain"
              frame={{ maxWidth: "infinity" }}
            />
          </HStack>
          <Button
            action={() => doSearch(0)}
            disabled={loading.value || !keyword.value.trim()}
            buttonStyle="plain"
            frame={{ minHeight: 46 }}
            glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
            glassEffectTransition="materialize"
          >
            <HStack spacing={6} padding={{ horizontal: 14, vertical: 10 }} frame={{ minHeight: 46 }}>
              <Image systemName="arrow.right" font="caption" foregroundStyle={labelColor()} />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>搜索</Text>
            </HStack>
          </Button>
        </HStack>

        { }
        <HStack padding={{ horizontal: 16, vertical: 6 }}>
          <Text font="caption" foregroundStyle={secondaryLabelColor()}>
            {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"}
            {results.value.length > 0 ? ` · 已找到 ${results.value.length} 条结果` : ""}
          </Text>
        </HStack>
        {!loading.value && results.value.length === 0 ? (

          <HStack padding={{ horizontal: 16, vertical: 6 }} frame={{ maxWidth: "infinity" }} alignment="center">
            <Text font="caption" foregroundStyle={tertiaryLabelColor()}>
              输入关键词搜索
            </Text>
            <Spacer />
            {history.value.length > 0 ? (
              <Button
                buttonStyle="plain"
                glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
                glassEffectTransition="materialize"
                action={() => history.setValue(clearSearchHistory())}
              >
                <HStack spacing={4} padding={{ horizontal: 12, vertical: 8 }}>
                  <Image systemName="trash" font="caption" foregroundStyle={labelColor()} />
                  <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>全部删除</Text>
                </HStack>
              </Button>
            ) : null}
          </HStack>
        ) : null}

        <List
          listStyle="inset"
          listRowSpacing={10}
          listSectionSpacing={24}
          scrollContentBackground="hidden"
          listRowBackground={<></>}
          listRowSeparator="hidden"
          navigationTitle="搜索作品"
          navigationBarTitleDisplayMode="inline"
          frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        >
          { }
          {!loading.value && results.value.length === 0 && history.value.length > 0 ? (
            <Section>
              <ZStack
                frame={{ maxWidth: "infinity", alignment: "leading" }}
                listRowBackground={<></>}
                listRowSeparator="hidden"
              >
                <VStack spacing={4} frame={{ maxWidth: "infinity" }}>
                  {history.value.map((h) => (
                    <HStack key={h} spacing={8} frame={{ maxWidth: "infinity" }} alignment="center">
                      <Button
                        buttonStyle="plain"
                        frame={{ maxWidth: "infinity" }}
                        action={() => {
                          keyword.setValue(h);
                          doSearch(0);
                        }}
                      >
                        <HStack spacing={8} padding={{ horizontal: 4, vertical: 2 }} frame={{ maxWidth: "infinity" }} alignment="center">
                          <Image systemName="clock.arrow.circlepath" font="caption" foregroundStyle={secondaryLabelColor()} />
                          <Text font="subheadline" foregroundStyle={labelColor()} lineLimit={1} multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
                            {h}
                          </Text>
                        </HStack>
                      </Button>
                      <Button
                        buttonStyle="plain"
                        frame={{ width: 36, height: 36 }}
                        action={() => history.setValue(removeSearchHistory(h))}
                      >
                        <Image systemName="xmark.circle.fill" font="subheadline" foregroundStyle={tertiaryLabelColor()} />
                      </Button>
                    </HStack>
                  ))}
                </VStack>
              </ZStack>
            </Section>
          ) : null}

          { }
          {errorMsg.value ? (
            <Section>
              <GlassSurface>
                <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Text font="caption" foregroundStyle="red" multilineTextAlignment="leading">{errorMsg.value}</Text>
                  <GlassActionButton title="重试" systemImage="arrow.clockwise" action={() => doSearch(0)} />
                </VStack>
              </GlassSurface>
            </Section>
          ) : null}

          { }
          {results.value.length > 0 ? (
            <Section>
              {results.value.map((item) => (
                <GalleryRow
                  key={`${item.gid}-${item.token}`}
                  item={item}
                  onLanguageDetected={handleLanguageDetected}
                  onTagSearch={onTagSearch}
                />
              ))}
              <GlassActionButton
                title={loading.value ? "加载中" : "加载更多"}
                systemImage="arrow.down.circle"
                loading={loading.value}
                action={() => doSearch(currentPage.value + 1)}
              />
            </Section>
          ) : null}

          {loading.value ? (
            <Section>
              <GlassListRow>
                <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>搜索中...</Text>
              </GlassListRow>
            </Section>
          ) : null}
        </List>
      </VStack>
    </ZStack>
  );
}



function TagSearchPage({ query }: { query: string }) {

  const appearanceTick = useObservable(0);
  useEffect(() => {
    const listener = (v: number) => appearanceTick.setValue(v);
    appearanceSubscribers.add(listener);
    return () => {
      appearanceSubscribers.delete(listener);
    };
  }, []);
  void appearanceTick.value;

  const dismiss = Navigation.useDismiss();
  const keyword = useObservable(query);
  const results = useObservable<EHGalleryListItem[]>([]);
  const loading = useObservable(true);
  const errorMsg = useObservable("");
  const currentPage = useObservable(0);


  const doSearch = async (page: number = 0, kw?: string) => {
    const q = kw ?? keyword.value;
    if (!q.trim()) return;
    loading.setValue(true);
    errorMsg.setValue("");
    try {
      const items = await api.search({ keyword: q, page });
      if (page === 0) {
        results.setValue(items);
      } else {
        results.setValue([...results.value, ...items]);
      }
      currentPage.setValue(page);
    } catch (e: any) {
      errorMsg.setValue(e.message || "搜索失败");
    } finally {
      loading.setValue(false);
    }
  };


  useEffect(() => {
    doSearch(0, query);

  }, [query]);


  const handleLanguageDetected = (gid: number, language: string) => {
    results.setValue(
      results.value.map((it) =>
        it.gid === gid && !it.language ? { ...it, language } : it
      )
    );
  };


  const handleTagSearch = (q: string) => {
    Navigation.present(
      <NavigationStack>
        <TagSearchPage query={q} />
      </NavigationStack>
    );
  };

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} preferredColorScheme={currentAppearance === "system" ? undefined : (currentAppearance as any)}>
      <PageBackground />
      <VStack spacing={0} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        { }
        <HStack
          spacing={8}
          padding={{ horizontal: 12, vertical: 8 }}
          frame={{ maxWidth: "infinity", alignment: "leading" }}
          glassEffect={glassEffectFor("navigation")}
          shadow={{ color: GLASS_TOKENS.material.navigation.shadow, radius: 12, y: 5 }}
        >
          <Button
            buttonStyle="plain"
            frame={{ minHeight: 46 }}
            glassEffect={glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)}
            glassEffectTransition="materialize"
            action={dismiss}
          >
            <HStack spacing={6} padding={{ horizontal: 14, vertical: 10 }} frame={{ minHeight: 46 }}>
              <Image systemName="chevron.left" font="caption" foregroundStyle={labelColor()} />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>返回</Text>
            </HStack>
          </Button>
          <HStack
            spacing={8}
            padding={{ horizontal: 12, vertical: 2 }}
            frame={{ maxWidth: "infinity", minHeight: 46 }}
            glassEffect={glassEffectFor("content", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, false)}
          >
            <Image systemName="magnifyingglass" font="caption" foregroundStyle={secondaryLabelColor()} />
            <Text font="subheadline" fontWeight="medium" foregroundStyle={labelColor()} lineLimit={1} multilineTextAlignment="leading">{keyword.value}</Text>
          </HStack>
        </HStack>

        { }
        <HStack padding={{ horizontal: 16, vertical: 6 }}>
          <Text font="caption" foregroundStyle={secondaryLabelColor()}>
            {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"} · 标签搜索 · 已找到 {results.value.length} 条结果
          </Text>
        </HStack>

        <List
          listStyle="inset"
          listRowSpacing={10}
          listSectionSpacing={24}
          scrollContentBackground="hidden"
          listRowBackground={<></>}
          listRowSeparator="hidden"
          navigationTitle=""
          navigationBarTitleDisplayMode="inline"
          frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        >
          { }
          {errorMsg.value ? (
            <Section>
              <GlassSurface>
                <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Text font="caption" foregroundStyle="red" multilineTextAlignment="leading">{errorMsg.value}</Text>
                  <GlassActionButton title="重试" systemImage="arrow.clockwise" action={() => doSearch(0)} />
                </VStack>
              </GlassSurface>
            </Section>
          ) : null}

          { }
          {results.value.length > 0 ? (
            <Section>
              {results.value.map((item) => (
                <GalleryRow
                  key={`${item.gid}-${item.token}`}
                  item={item}
                  onLanguageDetected={handleLanguageDetected}
                  onTagSearch={handleTagSearch}
                />
              ))}
              <GlassActionButton
                title={loading.value ? "加载中" : "加载更多"}
                systemImage="arrow.down.circle"
                loading={loading.value}
                action={() => doSearch(currentPage.value + 1)}
              />
            </Section>
          ) : null}

          {loading.value && results.value.length === 0 ? (
            <Section>
              <GlassListRow>
                <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>搜索中...</Text>
              </GlassListRow>
            </Section>
          ) : null}

          {!loading.value && results.value.length === 0 && !errorMsg.value ? (
            <Section>
              <GlassListRow>
                <Text font="subheadline" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">无结果</Text>
              </GlassListRow>
            </Section>
          ) : null}
        </List>
      </VStack>
    </ZStack>
  );
}



function SettingsView({
  isLoggedIn,
  onLogin,
  onExhentaiChange,
  onAppearanceChange,
}: {
  isLoggedIn: Observable<boolean>;
  onLogin: () => void;
  onExhentaiChange: () => void;
  onAppearanceChange: () => void;
}) {

  const appearanceTick = useObservable(0);
  useEffect(() => {
    const listener = (v: number) => appearanceTick.setValue(v);
    appearanceSubscribers.add(listener);
    return () => {
      appearanceSubscribers.delete(listener);
    };
  }, []);
  void appearanceTick.value;
  const config = useObservable(loadConfig());
  const cookieDraft = useObservable("");
  const cookieLoading = useObservable(false);
  const cookieError = useObservable("");
  const cacheTick = useObservable(0);
  const cacheSize = useObservable(getImageCacheSize());

  const handleSaveCookie = async () => {
    const cookieStr = cookieDraft.value.trim();
    if (!cookieStr) {
      cookieError.setValue("请输入 Cookie");
      return;
    }
    const cookies = parseCookieString(cookieStr);
    if (
      !cookies.find((c: any) => c.name === "ipb_member_id") ||
      !cookies.find((c: any) => c.name === "ipb_pass_hash")
    ) {
      cookieError.setValue("Cookie 缺少 ipb_member_id 或 ipb_pass_hash");
      return;
    }
    cookieLoading.setValue(true);
    cookieError.setValue("");
    try {
      api.updateCookie(cookies);
      const valid = await api.validateLogin();
      if (!valid) {
        cookieError.setValue("登录验证失败，Cookie 可能已过期");
        return;
      }
      saveConfig({ cookie: cookieStr });
      onLogin();
    } catch (e: any) {
      cookieError.setValue(e.message || "登录失败");
    } finally {
      cookieLoading.setValue(false);
    }
  };

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} preferredColorScheme={currentAppearance === "system" ? undefined : (currentAppearance as any)}>
      <PageBackground />
      <List
        listStyle="inset"
        listRowSpacing={10}
        listSectionSpacing={24}
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
        navigationTitle=""
        navigationBarTitleDisplayMode="inline"
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      >
        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="外观" caption="界面深浅模式" />
            <GlassSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="body" foregroundStyle={labelColor()}>深浅模式</Text>
                <HStack spacing={8} frame={{ maxWidth: "infinity" }}>
                  {[
                    ["system", "跟随系统"],
                    ["light", "浅色"],
                    ["dark", "深色"],
                  ].map(([mode, label]) => {
                    const active = (config.value.appearance || "system") === mode;
                    return (
                      <Button
                        key={mode}
                        buttonStyle="plain"
                        frame={{ maxWidth: "infinity", minHeight: 40 }}
                        glassEffect={
                          active
                            ? glassEffectFor("elevated", { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }, true)
                            : undefined
                        }
                        glassEffectTransition="materialize"
                        action={() => {
                          const next = mode as AppearanceMode;
                          config.setValue({ ...config.value, appearance: next });
                          saveConfig({ appearance: next });
                          currentAppearance = next;
                          notifyAppearanceChanged();
                          onAppearanceChange();
                        }}
                      >
                        <Text
                          font="subheadline"
                          fontWeight={active ? "semibold" : "regular"}
                          foregroundStyle={active ? GLASS_TOKENS.accent : "label"}
                          padding={{ horizontal: 8, vertical: 8 }}
                        >
                          {label}
                        </Text>
                      </Button>
                    );
                  })}
                </HStack>
                <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ maxWidth: "infinity" as const }}>
                  切换后若部分界面（导航栏/玻璃材质）未跟随，请退出 App 重新打开
                </Text>
              </VStack>
            </GlassSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="站点" caption={api.exhentai ? "当前：ExHentai 里站" : "当前：E-Hentai 表站"} />
            <GlassSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>当前站点</Text>
                  <Spacer />
                  <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>
                    {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"}
                  </Text>
                </HStack>
                <Toggle
                  title="启用里站 (ExHentai)"
                  value={api.exhentai}
                  onChanged={(v) => {
                    if (v && !isLoggedIn.value) {
                      return;
                    }
                    api.exhentai = v;
                    config.setValue({ ...config.value, exhentai: api.exhentai });
                    saveConfig({ exhentai: api.exhentai });
                    onExhentaiChange();
                  }}
                />
                {!isLoggedIn.value ? (
                  <Text font="caption" foregroundStyle="orange" multilineTextAlignment="leading">
                    ⚠️ 里站需要登录才能使用
                  </Text>
                ) : api.exhentai && !api.hasIgneous ? (
                  <Text font="caption" foregroundStyle="orange" multilineTextAlignment="leading">
                    ⚠️ 当前 Cookie 未检测到 igneous：通常不影响里站访问。若访问异常，请在 Safari 打开 exhentai.org（需登录）重新获取 Cookie
                  </Text>
                ) : null}
              </VStack>
            </GlassSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="账号" caption={isLoggedIn.value ? "已登录 ✓" : "未登录"} />
            <GlassSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                {!isLoggedIn.value ? (
                  <>
                    <Text font="caption" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">
                      粘贴登录后的 Cookie（含 ipb_member_id 与 ipb_pass_hash）：
                    </Text>
                    <GlassTextField
                      value={cookieDraft.value}
                      onChanged={(v) => cookieDraft.setValue(v)}
                      title="Cookie"
                      prompt="ipb_member_id=xxx; ipb_pass_hash=xxx"
                      systemImage="key"
                    />
                    {cookieError.value ? (
                      <Text font="caption" foregroundStyle="red" multilineTextAlignment="leading">{cookieError.value}</Text>
                    ) : null}
                    <GlassActionButton
                      title="从浏览器导入"
                      systemImage="square.and.arrow.down"
                      action={async () => {
                        try {
                          const p = cookieImportPath();
                          let text = "";
                          if (FileManager.existsSync(p)) {
                            text = FileManager.readAsStringSync(p);
                          } else {

                            const gm = cookieFromGMStorage();
                            if (gm) text = gm;
                          }
                          if (text && text.trim()) {
                            cookieDraft.setValue(text.trim());
                            cookieError.setValue("");
                          } else {
                            cookieError.setValue("未找到浏览器写入的 Cookie。请先在 Safari 打开 e-hentai.org，点扩展图标确认「SEhViewer Cookie 助手」已启用，再点页面左下角获取 Cookie");
                          }
                        } catch (e: any) {
                          cookieError.setValue(e.message || "导入失败");
                        }
                      }}
                    />
                    <GlassActionButton
                      title="保存并验证"
                      systemImage="checkmark"
                      tint="accentColor"
                      loading={cookieLoading.value}
                      action={handleSaveCookie}
                    />
                    <Text font="caption2" foregroundStyle={tertiaryLabelColor()} multilineTextAlignment="leading">
                      快速获取：{"\n"}
                      1. Cookie 脚本已写入项目 browser.tsx（随项目构建为 browser.js，Safari 扩展自动加载）{"\n"}
                      2. Safari 打开 e-hentai.org，点扩展图标确认「SEhViewer Cookie 助手」已启用{"\n"}
                      3. 登录后点页面左下角「🍪 获取 Cookie」（或扩展菜单里的同名命令）{"\n"}
                      4. 回到这里点「从浏览器导入」→「保存并验证」
                    </Text>
                  </>
                ) : (
                  <>
                    <GlassActionButton
                      title="重新登录"
                      systemImage="arrow.counterclockwise"
                      action={async () => {
                        await Navigation.present(
                          <LoginView onLogin={() => onLogin()} />,
                        );
                      }}
                    />
                    <GlassActionButton
                      title="退出登录"
                      systemImage="rectangle.portrait.and.arrow.right"
                      destructive
                      action={() => {
                        api.updateCookie([]);
                        api.exhentai = false;
                        saveConfig({ cookie: "", exhentai: false });

                        cookieDraft.setValue("");
                        cookieError.setValue("");
                        onLogin();
                        onExhentaiChange();
                      }}
                    />
                  </>
                )}
              </VStack>
            </GlassSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="阅读" caption="翻页方式、方向与缓存" />
            <GlassSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                { }
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>翻页方式</Text>
                  <Spacer />
                  <Menu
                    title={config.value.readerMode === "swipe" ? "滑动翻页" : "点击边缘翻页"}
                    systemImage="hand.draw"
                    buttonStyle="plain"
                    frame={{ minHeight: 40 }}
                    padding={{ horizontal: 14, vertical: 8 }}
                  >
                    <Button
                      title={config.value.readerMode === "swipe" ? "✓ 滑动翻页" : "滑动翻页"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, readerMode: "swipe" });
                        saveConfig({ readerMode: "swipe" });
                      }}
                    />
                    <Button
                      title={config.value.readerMode === "tap" ? "✓ 点击边缘翻页" : "点击边缘翻页"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, readerMode: "tap" });
                        saveConfig({ readerMode: "tap" });
                      }}
                    />
                  </Menu>
                </HStack>

                { }
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>翻页方向</Text>
                  <Spacer />
                  <Menu
                    title={config.value.pageDirection === "vertical" ? "上下滑动" : "从左往右滑动"}
                    systemImage="arrow.left.and.right"
                    buttonStyle="plain"
                    frame={{ minHeight: 40 }}
                    padding={{ horizontal: 14, vertical: 8 }}
                  >
                    <Button
                      title={config.value.pageDirection !== "vertical" ? "✓ 从左往右滑动（右滑下页）" : "从左往右滑动（右滑下页）"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, pageDirection: "right_to_left" });
                        saveConfig({ pageDirection: "right_to_left" });
                      }}
                    />
                    <Button
                      title={config.value.pageDirection === "vertical" ? "✓ 上下滑动（上滑下页）" : "上下滑动（上滑下页）"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, pageDirection: "vertical" });
                        saveConfig({ pageDirection: "vertical" });
                      }}
                    />
                  </Menu>
                </HStack>

                { }
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>左缘点击</Text>
                  <Spacer />
                  <Menu
                    title={config.value.leftEdgeAction === "prev" ? "上一页" : config.value.leftEdgeAction === "next" ? "下一页" : "无"}
                    systemImage="hand.tap"
                    buttonStyle="plain"
                    frame={{ minHeight: 40 }}
                    padding={{ horizontal: 14, vertical: 8 }}
                  >
                    <Button
                      title={config.value.leftEdgeAction === "prev" ? "✓ 上一页" : "上一页"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, leftEdgeAction: "prev" });
                        saveConfig({ leftEdgeAction: "prev" });
                      }}
                    />
                    <Button
                      title={config.value.leftEdgeAction === "next" ? "✓ 下一页" : "下一页"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, leftEdgeAction: "next" });
                        saveConfig({ leftEdgeAction: "next" });
                      }}
                    />
                    <Button
                      title={config.value.leftEdgeAction === "none" ? "✓ 无" : "无"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, leftEdgeAction: "none" });
                        saveConfig({ leftEdgeAction: "none" });
                      }}
                    />
                  </Menu>
                </HStack>

                { }
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>右缘点击</Text>
                  <Spacer />
                  <Menu
                    title={config.value.rightEdgeAction === "prev" ? "上一页" : config.value.rightEdgeAction === "next" ? "下一页" : "无"}
                    systemImage="hand.tap"
                    buttonStyle="plain"
                    frame={{ minHeight: 40 }}
                    padding={{ horizontal: 14, vertical: 8 }}
                  >
                    <Button
                      title={config.value.rightEdgeAction === "prev" ? "✓ 上一页" : "上一页"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, rightEdgeAction: "prev" });
                        saveConfig({ rightEdgeAction: "prev" });
                      }}
                    />
                    <Button
                      title={config.value.rightEdgeAction === "next" ? "✓ 下一页" : "下一页"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, rightEdgeAction: "next" });
                        saveConfig({ rightEdgeAction: "next" });
                      }}
                    />
                    <Button
                      title={config.value.rightEdgeAction === "none" ? "✓ 无" : "无"}
                      buttonStyle="plain"
                      action={() => {
                        config.setValue({ ...config.value, rightEdgeAction: "none" });
                        saveConfig({ rightEdgeAction: "none" });
                      }}
                    />
                  </Menu>
                </HStack>
              </VStack>
            </GlassSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="存储" caption="图片缓存与本地 Cookie" />
            <GlassSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>图片缓存</Text>
                  <Spacer />
                  <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>{formatFileSize(cacheSize.value)}</Text>
                </HStack>
                <GlassActionButton
                  title="清理图片缓存"
                  systemImage="trash"
                  destructive
                  action={async () => {
                    const res = clearImageCache();
                    cacheTick.setValue(cacheTick.value + 1);
                    cacheSize.setValue(getImageCacheSize());
                    await alert({
                      title: res.removed > 0 ? "清理完成" : "无需清理",
                      message:
                        res.removed > 0
                          ? `已删除 ${res.removed} 个缓存文件，释放 ${formatFileSize(res.freed)}。`
                          : "图片缓存目录已是空的。",
                    });
                  }}
                />
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>本地 Cookie</Text>
                  <Spacer />
                  <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>
                    {isLoggedIn.value ? "已保存" : "无"}
                  </Text>
                </HStack>
                <Text font="caption2" foregroundStyle={tertiaryLabelColor()} multilineTextAlignment="leading">
                  清除本地保存的 Cookie（含登录状态），图片缓存不受影响。退出登录只清输入框，这里会同时清除本机存储。
                </Text>
                <GlassActionButton
                  title="清除本地 Cookie"
                  systemImage="key.slash"
                  destructive
                  action={async () => {
                    const ok = await confirm({
                      title: "清除本地 Cookie",
                      message: "将清除本机保存的 Cookie 并退出登录，确定？",
                      confirmLabel: "清除",
                      cancelLabel: "取消",
                    });
                    if (!ok) return;
                    api.updateCookie([]);
                    api.exhentai = false;
                    saveConfig({ cookie: "", exhentai: false });
                    cookieDraft.setValue("");
                    cookieError.setValue("");
                    onLogin();
                    onExhentaiChange();
                    await alert({
                      title: "已清除",
                      message: "本地 Cookie 已清除，并已退出登录。",
                    });
                  }}
                />
              </VStack>
            </GlassSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="关于" caption="SEhViewer v1.3.1" />
            <GlassSurface>
              <VStack alignment="leading" spacing={4} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="body" foregroundStyle={labelColor()}>SEhViewer</Text>
                <Text font="caption" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">
                  基于JSEhViewer修改
                </Text>
              </VStack>
            </GlassSurface>
          </VStack>
        </Section>
      </List>
    </ZStack>
  );
}



function loadConfig(): Config {
  try {
    const raw: string = Storage.get("ehviewer_config") as string;
    if (raw) {
      return { ...defaultConfig, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...defaultConfig };
}

function saveConfig(partial: Partial<Config>): void {
  const current = loadConfig();
  const updated = { ...current, ...partial };
  try {
    Storage.set("ehviewer_config", JSON.stringify(updated));
  } catch {}
}



function MainApp() {
  const tabIndex = useObservable(0);
  const isLoggedIn = useObservable(api.isLoggedIn);
  const exhentaiEnabled = useObservable(api.exhentai);
  const appearanceTick = useObservable(0);



  const handleTagSearch = (query: string) => {
    Navigation.present(
      <NavigationStack>
        <TagSearchPage query={query} />
      </NavigationStack>
    );
  };


  const appearanceMode = useObservable<AppearanceMode>(currentAppearance);


  useEffect(() => {
    const config = loadConfig();
    currentAppearance = config.appearance || "system";
    if (config.cookie) {
      const cookies = config.cookie
        .split(";")
        .map((pair: string) => {
          const [name, ...rest] = pair.trim().split("=");
          return { name: name.trim(), value: rest.join("=").trim() };
        })
        .filter((c: any) => c.name && c.value);
      if (cookies.length > 0) {
        api.updateCookie(cookies);
        isLoggedIn.setValue(api.isLoggedIn);
      }
    }
    api.exhentai = config.exhentai;
    exhentaiEnabled.setValue(api.exhentai);
  }, []);

  return (
    <TabView
      tabIndex={tabIndex.value}
      onTabIndexChanged={(v) => tabIndex.setValue(v)}
      preferredColorScheme={appearanceMode.value === "system" ? undefined : appearanceMode.value}
    >
      { }
      <NavigationStack tag={0} tabItem={<Label title="浏览" systemImage="photo.on.rectangle" />}>
        <BrowseView refreshSignal={exhentaiEnabled.value} onTagSearch={handleTagSearch} />
      </NavigationStack>

      { }
      <NavigationStack tag={1} tabItem={<Label title="搜索" systemImage="magnifyingglass" />}>
        <SearchView onTagSearch={handleTagSearch} />
      </NavigationStack>

      { }
      <NavigationStack tag={2} tabItem={<Label title="设置" systemImage="gearshape.fill" />}>
        <SettingsView
          isLoggedIn={isLoggedIn}
          onLogin={() => { isLoggedIn.setValue(api.isLoggedIn); }}
          onExhentaiChange={() => { exhentaiEnabled.setValue(api.exhentai); }}
          onAppearanceChange={() => {
            appearanceMode.setValue(currentAppearance);
            appearanceTick.setValue(appearanceTick.value + 1);
          }}
        />
      </NavigationStack>
    </TabView>
  );
}



async function run() {

  currentAppearance = loadConfig().appearance || "system";
  await Navigation.present(
    <NavigationStack>
      <MainApp />
    </NavigationStack>,
  );
  Script.exit();
}

run();
