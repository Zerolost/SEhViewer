import {
  Script,
  Navigation,
  NavigationStack,
  TabView,
  List,
  VStack,
  HStack,
  LazyVStack,
  LazyHStack,
  ZStack,
  Text,
  Image,
  Button,
  TextField,
  Toolbar,
  ToolbarItem,
  Label,
  Toggle,
  Spacer,
  Section,
  Rectangle,
  ProgressView,
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
  EHGallerySearchPage,
  EHGalleryDetail,
  EHComment,
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
  const lightGradient = {
    colors: ["#ece7f8", "#dcd4f0"] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  if (currentAppearance === "dark") {
    return { light: "#161618", dark: "#161618" };
  }
  if (currentAppearance === "light") {
    return { light: lightGradient, dark: lightGradient };
  }
  return { light: lightGradient, dark: "#161618" };
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
  if (currentAppearance === "light") return "#45454d" as Color;
  if (currentAppearance === "dark") return "#a8a8b0" as Color;
  return "tertiaryLabel" as Color;
}

function controlFill(lightColor: Color, darkColor: Color): DynamicShapeStyle {
  return { light: lightColor, dark: darkColor };
}

function glassShadowColor(material: GlassMaterial): Color {
  if (currentAppearance === "light") {
    const opacity = material === "navigation" ? "0.40" : "0.36";
    return `rgba(72,88,120,${opacity})` as Color;
  }
  return GLASS_TOKENS.material[material].shadow;
}

function glassRowShadow() {
  if (currentAppearance === "light") {
    return { color: "rgba(72,88,120,0.42)" as Color, radius: 15, y: 8 };
  }
  return { color: "rgba(142,20,55,0.14)" as Color, radius: 10, y: 4 };
}

function spinnerTint(): DynamicShapeStyle {
  return controlFill("#7C6CF0", "#C4B5FD");
}

function coverBackdropFill(): DynamicShapeStyle {
  const light = {
    colors: ["rgba(255,255,255,0.42)", "rgba(205,196,229,0.38)"] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  const dark = {
    colors: ["rgba(64,61,72,0.58)", "rgba(31,29,36,0.72)"] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  if (currentAppearance === "light") return light as any;
  if (currentAppearance === "dark") return dark as any;
  return controlFill(light as any, dark as any);
}

function detailImageLighting(): DynamicShapeStyle {
  const light = {
    colors: [
      "rgba(255,255,255,0.48)",
      "rgba(255,255,255,0.10)",
      "rgba(125,102,176,0.08)",
      "rgba(61,45,94,0.25)",
    ] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  const dark = {
    colors: [
      "rgba(255,255,255,0.22)",
      "rgba(255,255,255,0.04)",
      "rgba(42,34,61,0.13)",
      "rgba(5,4,9,0.42)",
    ] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  if (currentAppearance === "light") return light as any;
  if (currentAppearance === "dark") return dark as any;
  return controlFill(light as any, dark as any);
}

function detailSurfaceFill(): DynamicShapeStyle {
  const light = {
    colors: ["rgba(255,255,255,0.98)", "rgba(250,248,253,0.97)", "rgba(239,233,248,0.94)"] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  const dark = {
    colors: ["rgba(55,52,64,0.92)", "rgba(31,29,37,0.94)", "rgba(16,15,20,0.98)"] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  if (currentAppearance === "light") return light as any;
  if (currentAppearance === "dark") return dark as any;
  return controlFill(light as any, dark as any);
}

function elevatedControlFill(): DynamicShapeStyle {
  // A restrained lavender slope keeps light controls distinguishable without looking glossy or loud.
  const light = {
    colors: ["rgba(255,255,255,0.98)", "rgba(244,240,250,0.97)", "rgba(224,215,240,0.94)"] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  const dark = {
    colors: ["rgba(91,86,104,0.86)", "rgba(53,50,62,0.90)", "rgba(29,27,34,0.96)"] as Color[],
    startPoint: "topLeading" as const,
    endPoint: "bottomTrailing" as const,
  };
  if (currentAppearance === "light") return light as any;
  if (currentAppearance === "dark") return dark as any;
  return controlFill(light as any, dark as any);
}

function elevatedControlShadow() {
  return currentAppearance === "dark"
    ? { color: "rgba(0,0,0,0.76)" as Color, radius: 11, y: 7 }
    : { color: "rgba(105,82,158,0.26)" as Color, radius: 11, y: 5 };
}

function detailSurfaceShadow() {
  return currentAppearance === "dark"
    ? { color: "rgba(0,0,0,0.76)" as Color, radius: 11, y: 7 }
    : { color: "rgba(111,88,171,0.34)" as Color, radius: 18, y: 6 };
}

function detailImageShadow() {
  return currentAppearance === "dark"
    ? { color: "rgba(0,0,0,0.82)" as Color, radius: 12, y: 9 }
    : { color: "rgba(72,55,101,0.22)" as Color, radius: 8, y: 5 };
}

// 图片列表滚动时避免为每个单元叠加玻璃材质、宽阴影和渐变打光。
function detailImageRowFill(): DynamicShapeStyle {
  if (currentAppearance === "light") return "#F7F4FB" as any;
  if (currentAppearance === "dark") return "#27252D" as any;
  return controlFill("#F7F4FB", "#27252D");
}

function detailThumbnailFill(): DynamicShapeStyle {
  if (currentAppearance === "light") return "#ECE7F2" as any;
  if (currentAppearance === "dark") return "#211F26" as any;
  return controlFill("#ECE7F2", "#211F26");
}

function reloginLabelColor(): Color {
  if (currentAppearance === "light") return "#302F36" as Color;
  if (currentAppearance === "dark") return "#E2DFE8" as Color;
  return "label" as Color;
}

function browserImportLabelColor(): Color {
  if (currentAppearance === "light") return "#3D354B" as Color;
  if (currentAppearance === "dark") return "#EEE9F6" as Color;
  return "label" as Color;
}

function shelfAccentGradient(): DynamicShapeStyle {
  const lightGradient = {
    colors: ["#A78BFA", "#9B8CFB"] as Color[],
    startPoint: "leading" as const,
    endPoint: "trailing" as const,
  };
  if (currentAppearance === "dark") {
    return { light: "#6D5BD0", dark: "#6D5BD0" };
  }
  if (currentAppearance === "light") {
    return { light: lightGradient, dark: lightGradient };
  }
  return { light: lightGradient, dark: "#6D5BD0" };
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
  const base = {
    frame: { maxWidth: "infinity" as const, alignment: "leading" as const },
    padding: { horizontal: 12, vertical: 10 },
    clipShape: roundedClip(GLASS_TOKENS.radius.content),
    glassEffect: {
      glass: glassWithAppearance(UIGlass.clear().interactive(true)),
      shape: { type: "rect" as const, cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" as const },
    },
    listRowBackground: <></>,
    listRowSeparator: "hidden" as const,
    shadow: glassRowShadow(),
  };
  if (currentAppearance === "light") {
    return {
      ...base,
      background: {
        style: controlFill("rgba(255,255,255,0.60)", "rgba(255,255,255,0.60)"),
        shape: { type: "rect" as const, cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" as const },
      },
    };
  }
  return base;
}

 
function GlassSurface({ material = "content", sculpted = false, children }: { material?: GlassMaterial; sculpted?: boolean; children?: any }) {
  const radius = currentAppearance === "light" ? 14 : 12;
  const y = currentAppearance === "light" ? 6 : 5;
  return (
    <ZStack
      frame={{ maxWidth: "infinity" as const }}
      background={sculpted ? { style: detailSurfaceFill(), shape: glassShape(material) } : undefined}
      clipShape={sculpted ? glassShape(material) : undefined}
      glassEffect={sculpted && currentAppearance === "light" ? undefined : glassEffectFor(material)}
      shadow={sculpted ? detailSurfaceShadow() : { color: glassShadowColor(material), radius, y }}
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

// Gallery cards keep the established glass-backed surface so semantic label colors
// remain readable in both appearances. Detail image rows stay on the lighter fill.
function GalleryListRow({ children, onAppear }: { children?: any; onAppear?: () => void }) {
  return (
    <ZStack {...glassListRowStyleProps()} onAppear={onAppear}>
      {children}
    </ZStack>
  );
}

function DetailImageListRow({ children }: { children?: any }) {
  return (
    <ZStack
      frame={{ maxWidth: "infinity" as const, alignment: "leading" as const }}
      padding={{ horizontal: 12, vertical: 10 }}
      background={{
        style: detailImageRowFill(),
        shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" },
      }}
      clipShape={roundedClip(GLASS_TOKENS.radius.content)}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
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
        background={{ style: shelfAccentGradient(), shape: "capsule" }}
        clipShape="capsule"
        shadow={{ color: "rgba(124,108,240,0.28)", radius: 5, y: 2 }}
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
      glassEffect={glassEffectFor("navigation", "capsule", true)}
      background={{ style: controlFill("rgba(255,255,255,0.78)", "rgba(120,120,128,0.30)"), shape: "capsule" }}
      shadow={{ color: glassShadowColor("navigation"), radius: 8, y: 3 }}
    >
      <Image systemName={systemName} font="headline" foregroundStyle={tint} />
    </Button>
  );
}

 
function GlassActionButton({
  title,
  systemImage,
  tint = "label" as Color,
  destructive = false,
  loading = false,
  disabled = false,
  action,
}: {
  title: string;
  systemImage?: string;
  tint?: Color;
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
      background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
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

function LoadingRow() {
  return (
    <ZStack
      frame={{ maxWidth: "infinity", alignment: "center" }}
      padding={{ horizontal: 20 }}
      allowsHitTesting={false}
    >
      <ZStack
        {...glassListRowStyleProps()}
        frame={{ maxWidth: "infinity", alignment: "center" }}
      >
        <VStack spacing={8} alignment="center">
          <ProgressView tint={spinnerTint()} />
          <Text font="caption2" foregroundStyle={secondaryLabelColor()}>加载中...</Text>
        </VStack>
      </ZStack>
    </ZStack>
  );
}

 
function GlassInputRow({ children }: { children?: any }) {
  return (
    <HStack
      spacing={8}
      padding={{ horizontal: 12, vertical: 2 }}
      frame={{ maxWidth: "infinity" as const, minHeight: 46 }}
      background={{ style: controlFill("rgba(255,255,255,0.72)", "rgba(120,120,128,0.18)"), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={{ color: glassShadowColor("content"), radius: 8, y: 3 }}
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
                  tint={browserImportLabelColor()}
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
      padding={{ horizontal: 10, vertical: 3 }}
      background={{ style: "thinMaterial" as Color, shape: "capsule" }}
    >
      {label}
    </Text>
  );
}



function GalleryRow({
  item,
  onLanguageDetected,
  onTagSearch,
  onAppear,
}: {
  item: EHGalleryListItem;
  onLanguageDetected?: (gid: number, language: string) => void;
  onTagSearch?: (query: string) => void;
  onAppear?: () => void;
}) {
  const title = extractTitle(item);
  const sourceRatio = item.thumbnailWidth && item.thumbnailHeight
    ? item.thumbnailWidth / item.thumbnailHeight
    : 0.72;
  const thumbnailRatio = Math.max(0.55, Math.min(1.65, sourceRatio));
  const thumbnailWidth = thumbnailRatio >= 1.15 ? 116 : thumbnailRatio >= 0.88 ? 102 : 92;
  const thumbnailHeight = Math.round(thumbnailWidth / thumbnailRatio);
  // Keep the source ratio, but center short/wide covers inside the row instead of pinning them to its top edge.
  const mediaSlotHeight = Math.max(104, thumbnailHeight);
  const rowMinHeight = mediaSlotHeight;
  
  const thumbPath = useObservable<string | null>(null);
  useEffect(() => {
    if (!item.thumbnailUrl) return;
    let alive = true;
    
    // The native network Image already downloads the thumbnail. Starting a second
    // cacheImage task for every mounted row doubled network/decode/disk work.
    const reload = () => {
      if (!alive) return;
      thumbPath.setValue(getCachedImagePath(item.thumbnailUrl));
    };
    reload();
    imageCacheSubscribers.add(reload);
    return () => {
      alive = false;
      imageCacheSubscribers.delete(reload);
    };
  }, [item.thumbnailUrl]);

  const openDetail = async () => {
    await Navigation.present(
      <NavigationStack>
        <GalleryDetailView gid={item.gid} token={item.token} initialTitle={title} onLanguageDetected={onLanguageDetected} onTagSearch={onTagSearch} />
      </NavigationStack>
    );
  };

  return (
    <GalleryListRow onAppear={onAppear}>
      <Button
        buttonStyle="plain"
        action={openDetail}
        frame={{ maxWidth: "infinity", alignment: "leading" }}
        listRowBackground={<></>}
        listRowSeparator="hidden"
      >
        <HStack spacing={12} alignment="top" frame={{ maxWidth: "infinity", minHeight: rowMinHeight, alignment: "leading" }}>
        <ZStack frame={{ width: thumbnailWidth, height: mediaSlotHeight }} alignment="center">
          {item.thumbnailUrl ? (
            thumbPath.value ? (
              <Image
                filePath={thumbPath.value}
                resizable={true}
                aspectRatio={{ value: null, contentMode: "fit" }}
                frame={{ width: thumbnailWidth, height: thumbnailHeight }}
                background={{ style: coverBackdropFill(), shape: { type: "rect", cornerRadius: 12, style: "continuous" } }}
                {...roundedImage(12)}
              />
            ) : (
              <Image
                imageUrl={item.thumbnailUrl}
                resizable={true}
                aspectRatio={{ value: null, contentMode: "fit" }}
                frame={{ width: thumbnailWidth, height: thumbnailHeight }}
                background={{ style: coverBackdropFill(), shape: { type: "rect", cornerRadius: 12, style: "continuous" } }}
                placeholder={
                  <ZStack frame={{ width: thumbnailWidth, height: thumbnailHeight }} background={{ style: coverBackdropFill(), shape: { type: "rect", cornerRadius: 12, style: "continuous" } }} />
                }
                {...roundedImage(12)}
              />
            )
          ) : (
            <VStack
              frame={{ width: thumbnailWidth, height: thumbnailHeight }}
              background="thinMaterial"
              clipShape={roundedClip(12)}
              alignment="center"
            >
              <Text font="caption2" foregroundStyle={secondaryLabelColor()}>{categoryTranslations[item.category]}</Text>
            </VStack>
          )}
        </ZStack>
        <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text
            font="subheadline"
            fontWeight="semibold"
            foregroundStyle={labelColor()}
            lineLimit={2}
            multilineTextAlignment="leading"
          >
            {title}
          </Text>
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
      </Button>
    </GalleryListRow>
  );
}



function GalleryZipButton({
  downloading,
  progress,
  onStart,
  onCancel,
}: {
  downloading: Observable<boolean>;
  progress: Observable<string>;
  onStart: () => void;
  onCancel: () => void;
}) {
  const active = downloading.value;
  return (
    <Button
      buttonStyle="plain"
      disabled={false}
      background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
      action={active ? onCancel : onStart}
    >
      <HStack spacing={6} padding={{ horizontal: 14, vertical: 8 }}>
        <Image systemName={active ? "xmark.circle.fill" : "archivebox.fill"} font="subheadline" foregroundStyle={active ? "#ff453a" : labelColor()} />
        <Text font="subheadline" fontWeight="semibold" foregroundStyle={active ? "#ff453a" : labelColor()}>
          {active ? (progress.value ? `取消 (${progress.value})` : "取消下载") : "打包下载"}
        </Text>
      </HStack>
    </Button>
  );
}

function DetailGalleryImageRow({
  gid,
  img,
  downloadLock,
  onOpen,
}: {
  gid: number;
  img: EHImageItem;
  downloadLock: { current: boolean };
  onOpen: () => void;
}) {
  const saving = useObservable(false);

  const saveImage = async () => {
    if (downloadLock.current) return;
    downloadLock.current = true;
    saving.setValue(true);
    try {
      const ok = await saveSingleImageToPhotos(gid, img);
      if (ok) {
        await alert({ title: "已保存", message: `第 ${img.page + 1} 页已保存到相册。` });
      } else {
        await alert({ title: "保存失败", message: "照片写入相册未成功，请检查相册权限。" });
      }
    } catch (e: any) {
      await alert({ title: "保存失败", message: e?.message || "未知错误" });
    } finally {
      saving.setValue(false);
      downloadLock.current = false;
    }
  };

  return (
    <DetailImageListRow>
      <Button
        buttonStyle="plain"
        frame={{ maxWidth: "infinity" as const }}
        action={onOpen}
        onLongPressGesture={{ minDuration: 500, perform: saveImage }}
      >
          <HStack spacing={12} alignment="center" frame={{ maxWidth: "infinity", alignment: "leading" }}> 
            {img.showkey && img.spriteX !== undefined && img.thumbnailUrl ? (
              <SpriteThumb spriteUrl={img.thumbnailUrl} spriteX={img.spriteX} />
            ) : img.thumbnailUrl ? (
              <ZStack
                frame={{ width: 100, height: 150 }}
                background={{ style: detailThumbnailFill(), shape: { type: "rect", cornerRadius: 10, style: "continuous" } }}
                clipShape={roundedClip(10)}
              >
                <Image
                  imageUrl={img.thumbnailUrl}
                  resizable
                  aspectRatio={{ value: null, contentMode: "fit" }}
                  frame={{ width: 100, height: 150 }}
                />
              </ZStack>
            ) : (
              <VStack frame={{ width: 100, height: 75 }} background="thinMaterial" clipShape={roundedClip(8)} alignment="center">
                <Text font="subheadline" fontWeight="semibold" foregroundStyle={secondaryLabelColor()}>#{img.page + 1}</Text>
              </VStack>
            )}
            <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <Text font="body" foregroundStyle={labelColor()} lineLimit={1} multilineTextAlignment="leading">
                {img.name ? img.name : `第 ${img.page + 1} 页`}
              </Text>
              <Text font="caption" foregroundStyle={tertiaryLabelColor()}>{saving.value ? "正在保存..." : "点击查看原图 · 长按保存"}</Text>
            </VStack>
            <Image
              systemName={saving.value ? "arrow.down.circle.fill" : "chevron.right"}
              font="caption"
              foregroundStyle={saving.value ? (GLASS_TOKENS.accent as Color) : tertiaryLabelColor()}
            />
          </HStack>
      </Button>
    </DetailImageListRow>
  );
}

function DetailLoadMoreRow({
  loaded,
  total,
  action,
}: {
  loaded: number;
  total: number;
  action: () => void;
}) {
  return (
    <ZStack
      frame={{ maxWidth: "infinity" as const, minHeight: 56, alignment: "center" }}
      background={{
        style: detailImageRowFill(),
        shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" },
      }}
      clipShape={roundedClip(GLASS_TOKENS.radius.content)}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      <Button
        buttonStyle="plain"
        frame={{ maxWidth: "infinity" as const, minHeight: 56 }}
        action={action}
      >
        <HStack spacing={7} padding={{ horizontal: 14, vertical: 10 }} frame={{ maxWidth: "infinity", alignment: "center" }}>
          <Image systemName="arrow.down.circle" font="subheadline" foregroundStyle={secondaryLabelColor()} />
          <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>
            {`加载更多 (${loaded}/${total})`}
          </Text>
        </HStack>
      </Button>
    </ZStack>
  );
}

function GalleryImagesSection({
  gid,
  images,
  fileCount,
  pageCount,
  moreError,
  currentPage,
  downloadLock,
  onOpen,
  onLoadPage,
}: {
  gid: number;
  images: Observable<EHImageItem[]>;
  fileCount: number;
  pageCount?: number;
  moreError: Observable<string>;
  currentPage: { current: number };
  downloadLock: { current: boolean };
  onOpen: (img: EHImageItem) => void;
  onLoadPage: (page: number) => void;
}) {
  const loadedImages = images.value;
  return (
    <Section>
      <ShelfHeader title="图片" caption={`${loadedImages.length}/${fileCount}`} />
      {loadedImages.map((img) => (
        <DetailGalleryImageRow
          key={img.page}
          gid={gid}
          img={img}
          downloadLock={downloadLock}
          onOpen={() => onOpen(img)}
        />
      ))}
      {moreError.value ? (
        <GlassSurface>
          <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text font="caption" foregroundStyle="orange" multilineTextAlignment="leading">{moreError.value}</Text>
            <GlassActionButton title="重试加载" systemImage="arrow.clockwise" action={() => onLoadPage(currentPage.current + 1)} />
          </VStack>
        </GlassSurface>
      ) : null}
      {pageCount && loadedImages.length < fileCount ? (
        <DetailLoadMoreRow
          loaded={loadedImages.length}
          total={fileCount}
          action={() => onLoadPage(currentPage.current + 1)}
        />
      ) : null}
    </Section>
  );
}

function GalleryDetailView({
  gid,
  token,
  initialTitle,
  onLanguageDetected,
  onTagSearch,
}: {
  gid: number;
  token: string;
  initialTitle: string;
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

  const dismiss = Navigation.useDismiss();
  const isActive = useRef(true);
  const gallery = useObservable<EHGalleryDetail | null>(null);
  const loading = useObservable(true);
  const errorMsg = useObservable("");
  const moreError = useObservable("");
  const currentPage = useRef(0);
  const images = useObservable<EHImageItem[]>([]);
  const detailPagesInFlight = useRef(new Set<number>());
  const singleDownloadLock = useRef(false);
  
  const zipDownloading = useObservable(false);
  const zipProgress = useObservable("");
  const zipCancelToken = useRef<ZipCancelToken | null>(null);
  const lastZipProgressAt = useRef(0);
  const copyNotice = useObservable("");
  const copyNoticeTimer = useRef<any>(null);

  useEffect(() => {
    isActive.current = true;
    const timer = setTimeout(() => {
      if (isActive.current) loadGallery(0);
    }, 0);
    return () => {
      clearTimeout(timer);
      isActive.current = false;
      if (copyNoticeTimer.current) clearTimeout(copyNoticeTimer.current);
      if (zipCancelToken.current) zipCancelToken.current.cancelled = true;
    };
  }, [gid, token]);

  const loadGallery = async (page: number) => {
    if (detailPagesInFlight.current.has(page)) return;
    detailPagesInFlight.current.add(page);
    if (page === 0) {
      loading.setValue(true);
      errorMsg.setValue("");
    } else if (moreError.value) {
      moreError.setValue("");
    }
    try {
      const detail = await api.getGalleryInfo(gid, token, page);
      if (!isActive.current) return;
      if (page === 0) {
        gallery.setValue(detail);
        images.setValue(detail.images);
        if (detail.language && onLanguageDetected) {
          onLanguageDetected(gid, detail.language);
        }
      } else {
        // Pages arrive in order; only append unseen rows instead of rebuilding and sorting all rows.
        const seenPages = new Set(images.value.map((item) => item.page));
        const incoming = detail.images.filter((item: EHImageItem) => !seenPages.has(item.page));
        if (incoming.length > 0) images.setValue([...images.value, ...incoming]);
      }
      currentPage.current = Math.max(currentPage.current, page);
    } catch (e: any) {
      if (!isActive.current) return;
      if (page === 0) errorMsg.setValue(e.message || "加载失败");
      else moreError.setValue(e.message || "加载更多失败");
    } finally {
      detailPagesInFlight.current.delete(page);
      if (isActive.current && page === 0) loading.setValue(false);
    }
  };

   
  const readerPresenting = useRef(false);
  const openReader = async (img: EHImageItem) => {
    if (readerPresenting.current) return;
    const readerImages = images.value;
    if (readerImages.length === 0) return;
    const startIndex = readerImages.findIndex((item) => item.page === img.page);
    if (startIndex < 0) return;
    readerPresenting.current = true;
    try {
      await Navigation.present(
        <ReaderView
          gid={gid}
          token={token}
          images={readerImages}
          startPage={startIndex}
          fileCount={gallery.value?.fileCount ?? readerImages.length}
        />
      );
    } finally {
      readerPresenting.current = false;
    }
  };

   
  const startZipDownload = async () => {
    if (zipDownloading.value) return;
    const g = gallery.value;
    if (!g) return;
    const cancelToken: ZipCancelToken = { cancelled: false };
    zipCancelToken.current = cancelToken;
    zipDownloading.setValue(true);
    zipProgress.setValue("准备中...");
    try {
      const zipPath = await downloadGalleryZip(
        gid,
        token,
        g.fileCount ?? images.value.length,
        images.value,
        cancelToken,
        (done, total) => {
          if (!isActive.current || cancelToken.cancelled) return;
          const now = Date.now();
          if (done === total || now - lastZipProgressAt.current >= 250) {
            lastZipProgressAt.current = now;
            zipProgress.setValue(`${done}/${total}`);
          }
        },
      );
      if (!isActive.current) return;
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
      if (!isActive.current) return;
      if (e instanceof ZipCancelledError) {
        await alert({ title: "已取消", message: "打包下载已取消。" });
      } else {
        await alert({
          title: "下载失败",
          message: e?.message || "未知错误",
        });
      }
    } finally {
      if (zipCancelToken.current === cancelToken) zipCancelToken.current = null;
      if (isActive.current) {
        zipDownloading.setValue(false);
        zipProgress.setValue("");
      }
    }
  };

  const requestZipCancellation = () => {
    const cancelToken = zipCancelToken.current;
    if (!cancelToken || cancelToken.cancelled) return;
    cancelToken.cancelled = true;
    zipProgress.setValue("正在取消...");
  };

   
  const g = gallery.value;

  const showCopyNotice = (message: string) => {
    if (copyNoticeTimer.current) clearTimeout(copyNoticeTimer.current);
    copyNotice.setValue(message);
    copyNoticeTimer.current = setTimeout(() => {
      if (isActive.current) copyNotice.setValue("");
    }, 1400);
  };

  const copyText = async (label: string, value: string) => {
    await Pasteboard.setString(value);
    showCopyNotice(`已复制${label}`);
  };

  const copyAllInfo = async () => {
    if (!g) return;
    const lines = [
      `标题: ${g.title || g.englishTitle || g.japaneseTitle || "未知"}`,
      `Posted: ${g.postedTime}`,
      `Parent: ${g.parentTitle ? g.parentTitle : g.parentGid ? `#${g.parentGid}` : "None"}`,
      `Visible: ${g.visibleText ?? (g.visible ? "Yes" : "No")}${g.invisibleCause ? ` (${g.invisibleCause})` : ""}`,
      `Language: ${g.language || "—"}`,
      `File Size: ${g.fileSize}`,
      `Favorited: ${(g.favoriteCount ?? 0) > 0 ? `${g.favoriteCount} times` : g.favorited ? "Yes" : "Never"}`,
    ];
    await Pasteboard.setString(lines.join("\n"));
    showCopyNotice("已复制全部作品信息");
  };

  const copyTag = async (namespace: string, name: string) => {
    const text = `${namespace}:${name}`;
    await Pasteboard.setString(text);
    showCopyNotice(`已复制标签：${name}`);
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
        navigationTitle={g ? extractTitle(g as any) : initialTitle}
        navigationBarTitleDisplayMode="inline"
        navigationBarBackButtonHidden={true}
        toolbar={
          <Toolbar>
            <ToolbarItem placement="topBarLeading">
              <Button title="返回" systemImage="chevron.left" action={dismiss} />
            </ToolbarItem>
          </Toolbar>
        }
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
                <GlassSurface sculpted={true}>
                  <VStack alignment="leading" spacing={10} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                    <Text
                      font="headline"
                      fontWeight="semibold"
                      foregroundStyle={labelColor()}
                      frame={{ maxWidth: "infinity", alignment: "leading" }}
                      multilineTextAlignment="leading"
                      onLongPressGesture={{ minDuration: 500, perform: () => copyText("标题", extractTitle(g as any)) }}
                    >
                      {extractTitle(g as any)}
                    </Text>
                    <HStack spacing={12} alignment="top" frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      {g.coverUrl ? (
                        <ZStack frame={{ width: 96, height: 140 }} shadow={detailImageShadow()}>
                          <ZStack frame={{ width: 96, height: 140 }} background={{ style: detailSurfaceFill(), shape: { type: "rect", cornerRadius: 10, style: "continuous" } }} clipShape={roundedClip(10)}>
                            <Image
                              imageUrl={g.coverUrl}
                              resizable
                              aspectRatio={{ value: null, contentMode: "fit" }}
                              frame={{ width: 96, height: 140 }}
                            />
                            <Rectangle
                              fill={detailImageLighting()}
                              frame={{ width: 96, height: 140 }}
                              allowsHitTesting={false}
                            />
                          </ZStack>
                        </ZStack>
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
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }} onLongPressGesture={{ minDuration: 500, perform: () => copyText(" Posted", g.postedTime) }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Posted</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">{g.postedTime}</Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }} onLongPressGesture={{ minDuration: 500, perform: () => copyText(" Parent", g.parentTitle ? g.parentTitle : g.parentGid ? `#${g.parentGid}` : "None") }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Parent</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">
                          {g.parentTitle ? g.parentTitle : g.parentGid ? `#${g.parentGid}` : "None"}
                        </Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }} onLongPressGesture={{ minDuration: 500, perform: () => copyText(" Visible", `${g.visibleText ?? (g.visible ? "Yes" : "No")}${g.invisibleCause ? ` (${g.invisibleCause})` : ""}`) }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Visible</Text>
                        <Text font="caption2" foregroundStyle={g.visible ? labelColor() : "red"} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">
                          {g.visibleText ?? (g.visible ? "Yes" : "No")}
                          {g.invisibleCause ? ` (${g.invisibleCause})` : ""}
                        </Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }} onLongPressGesture={{ minDuration: 500, perform: () => copyText(" Language", g.language || "—") }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Language</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">{g.language || "—"}</Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }} onLongPressGesture={{ minDuration: 500, perform: () => copyText(" File Size", g.fileSize) }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>File Size</Text>
                        <Text font="caption2" foregroundStyle={labelColor()} frame={{ maxWidth: "infinity", alignment: "leading" }} multilineTextAlignment="leading">{g.fileSize}</Text>
                      </HStack>
                      <HStack spacing={8} frame={{ maxWidth: "infinity", alignment: "leading" }} onLongPressGesture={{ minDuration: 500, perform: () => copyText(" Favorited", `${g.favoriteCount ?? (g.favorited ? 1 : 0)}`) }}>
                        <Text font="caption2" foregroundStyle={tertiaryLabelColor()} frame={{ width: 72, alignment: "leading" }}>Favorited</Text>
                        <HStack spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                          <Image systemName="heart.fill" font="caption2" foregroundStyle="#ff2d55" />
                          <Text font="caption2" foregroundStyle={labelColor()} multilineTextAlignment="leading">
                            {(g.favoriteCount ?? 0) > 0 ? `${g.favoriteCount}` : g.favorited ? "1" : "0"}
                          </Text>
                        </HStack>
                      </HStack>
                      { }
                      <HStack frame={{ maxWidth: "infinity", alignment: "trailing" }} spacing={8}>
                        <GalleryZipButton
                          downloading={zipDownloading}
                          progress={zipProgress}
                          onStart={startZipDownload}
                          onCancel={requestZipCancellation}
                        />
                        <Button
                          buttonStyle="plain"
                          background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
                          shadow={elevatedControlShadow()}
                          action={copyAllInfo}
                        >
                          <HStack spacing={6} padding={{ horizontal: 14, vertical: 8 }}>
                            <Image systemName="doc.on.doc" font="subheadline" foregroundStyle={labelColor()} />
                            <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>全部复制</Text>
                          </HStack>
                        </Button>
                        <Button
                          buttonStyle="plain"
                          background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
                          
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
                  </VStack>
                </GlassSurface>
              </VStack>
            </Section>

            {g.tags.length > 0 ? (
              <Section>
                <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
                  <ShelfHeader title="标签" caption={`${g.tags.length} 个 · 点击搜索，长按复制`} />
                  <GlassSurface sculpted={true}>
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
                              background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
                              shadow={elevatedControlShadow()}
                              frame={{ maxWidth: "infinity", alignment: "leading" }}
                              action={() => onTagSearch?.(formatTagSearchQuery(ns, name))}
                              onLongPressGesture={{ minDuration: 500, perform: () => copyTag(ns, name) }}
                            >
                              <HStack spacing={5} padding={{ horizontal: 10, vertical: 6 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                                <Image systemName="magnifyingglass" font="caption2" foregroundStyle={secondaryLabelColor()} />
                                <Text font="caption" fontWeight="medium" foregroundStyle={labelColor()}>{name}</Text>
                                <Spacer />
                                
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
                  <GlassSurface sculpted={true}>
                    <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      {g.comments.map((c: EHComment) => (
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

            <GalleryImagesSection
              gid={gid}
              images={images}
              fileCount={g.fileCount}
              pageCount={g.pageCount}
              moreError={moreError}
              currentPage={currentPage}
              downloadLock={singleDownloadLock}
              onOpen={openReader}
              onLoadPage={loadGallery}
            />
          </>
        ) : null}
      </List>
      {copyNotice.value ? (
        <ZStack
          frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "bottom" }}
          padding={{ bottom: 24 }}
          allowsHitTesting={false}
        >
          <HStack
            spacing={7}
            padding={{ horizontal: 14, vertical: 9 }}
            background={{ style: controlFill("rgba(255,255,255,0.94)", "rgba(44,44,46,0.94)"), shape: "capsule" }}
            shadow={{ color: glassShadowColor("elevated"), radius: 10, y: 4 }}
          >
            <Image systemName="checkmark.circle.fill" font="subheadline" foregroundStyle="#7C6CF0" />
            <Text
              font="subheadline"
              fontWeight="semibold"
              foregroundStyle={controlFill("#211A2F", "#FFFFFF")}
            >
              {copyNotice.value}
            </Text>
          </HStack>
        </ZStack>
      ) : null}
    </ZStack>
  );
}

function formatTagSearchQuery(namespace: string, name: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) return `${namespace}:`;
  const escapedName = normalizedName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return /\s/.test(escapedName)
    ? `${namespace}:"${escapedName}"`
    : `${namespace}:${escapedName}`;
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

const cachedImagePathMemory = new Map<string, string | null>();

function getCachedImagePath(url: string): string | null {
  if (cachedImagePathMemory.has(url)) return cachedImagePathMemory.get(url) ?? null;
  try {
    const p = imageCachePath(url);
    const result = FileManager.existsSync(p) ? p : null;
    cachedImagePathMemory.set(url, result);
    return result;
  } catch {
    cachedImagePathMemory.set(url, null);
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
      if (FileManager.existsSync(p)) {
        cachedImagePathMemory.set(url, p);
        return p;
      }
      const bytes = await api.downloadImage(url);
      if (!bytes || bytes.length === 0) return null;
      await FileManager.writeAsBytes(p, bytes);
      cachedImagePathMemory.set(url, p);
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
    cachedImagePathMemory.clear();
    
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

 
type ZipCancelToken = { cancelled: boolean };

function throwIfZipCancelled(cancelToken: ZipCancelToken): void {
  if (cancelToken.cancelled) throw new ZipCancelledError();
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
  cancelToken: ZipCancelToken,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  ensureDownloadDir();
  throwIfZipCancelled(cancelToken);

  
  const all: EHImageItem[] = [...knownImages];
  const existingPages = new Set(all.map((item) => item.page));
  let page = Math.floor(all.length / PER_PAGE);
  let guard = 0;
  while (all.length < fileCount && guard < 100) {
    throwIfZipCancelled(cancelToken);
    guard++;
    const detail = await api.getGalleryInfo(gid, token, page);
    throwIfZipCancelled(cancelToken);
    const added: EHImageItem[] = [];
    for (const item of detail.images) {
      if (existingPages.has(item.page)) continue;
      existingPages.add(item.page);
      added.push(item);
    }
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
      throwIfZipCancelled(cancelToken);
      const img = all[i];
      try {
        const info = await api.getPageInfo(gid, img.imgkey, img.page);
        throwIfZipCancelled(cancelToken);
        if (!info.imageUrl) throw new Error("无图片地址");
        const bytes = await api.downloadImage(info.imageUrl);
        throwIfZipCancelled(cancelToken);
        if (!bytes || bytes.length === 0) throw new Error("下载内容为空");
        const ext = imageExtFromUrl(info.imageUrl);
        const name = `${String(img.page + 1).padStart(3, "0")}.${ext}`;
        await FileManager.writeAsBytes(`${tmpDir}/${name}`, bytes);
        throwIfZipCancelled(cancelToken);
      } catch (e) {
        if (e instanceof ZipCancelledError) throw e;
        failed++;
      }
      onProgress?.(i + 1, all.length);
    }

    throwIfZipCancelled(cancelToken);
    const zipPath = `${DOWNLOAD_DIR}/${gid}.zip`;
    if (FileManager.existsSync(zipPath)) FileManager.removeSync(zipPath);
    await FileManager.zip(tmpDir, zipPath, false);
    if (cancelToken.cancelled) {
      try {
        if (FileManager.existsSync(zipPath)) FileManager.removeSync(zipPath);
      } catch {}
      throw new ZipCancelledError();
    }

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
const spriteCropCache = new Map<string, Promise<UIImage | null>>();
const SPRITE_IMAGE_CACHE_LIMIT = 6;
const SPRITE_CROP_CACHE_LIMIT = 100;
const SPRITE_CROP_CONCURRENCY = 2;
let activeSpriteCrops = 0;
const spriteCropQueue: Array<() => void> = [];
const spriteCropDemand = new Map<string, number>();

function trimOldestCacheEntries<K, V>(cache: Map<K, V>, limit: number): void {
  while (cache.size > limit) {
    const oldest = cache.keys().next().value as K | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function runSpriteCropTask<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      activeSpriteCrops++;
      task().then(resolve, reject).finally(() => {
        activeSpriteCrops--;
        // Prefer newly visible rows instead of draining stale offscreen work first.
        const next = spriteCropQueue.pop();
        if (next) next();
      });
    };
    if (activeSpriteCrops < SPRITE_CROP_CONCURRENCY) start();
    else spriteCropQueue.push(start);
  });
}

function getSpriteImage(url: string): Promise<UIImage | null> {
  const cached = spriteImageCache.get(url);
  if (cached) {
    spriteImageCache.delete(url);
    spriteImageCache.set(url, cached);
    return cached;
  }
  const task = UIImage.fromURL(url).then((img) => {
    if (!img) spriteImageCache.delete(url);
    return img;
  }).catch(() => {
    spriteImageCache.delete(url);
    return null;
  });
  spriteImageCache.set(url, task);
  trimOldestCacheEntries(spriteImageCache, SPRITE_IMAGE_CACHE_LIMIT);
  return task;
}


function spriteCropKey(
  spriteUrl: string,
  spriteX: number,
  cellWidth: number,
  cellHeight: number,
  displayWidth: number,
  displayHeight: number,
): string {
  return `${spriteUrl}|${spriteX}|${cellWidth}|${cellHeight}|${displayWidth}|${displayHeight}`;
}

function retainSpriteCrop(key: string): void {
  spriteCropDemand.set(key, (spriteCropDemand.get(key) || 0) + 1);
}

function releaseSpriteCrop(key: string): void {
  const count = spriteCropDemand.get(key) || 0;
  if (count <= 1) spriteCropDemand.delete(key);
  else spriteCropDemand.set(key, count - 1);
}

function getSpriteCrop(
  spriteUrl: string,
  spriteX: number,
  cellWidth: number,
  cellHeight: number,
  displayWidth: number,
  displayHeight: number,
): Promise<UIImage | null> {
  const key = spriteCropKey(spriteUrl, spriteX, cellWidth, cellHeight, displayWidth, displayHeight);
  const existing = spriteCropCache.get(key);
  if (existing) {
    spriteCropCache.delete(key);
    spriteCropCache.set(key, existing);
    return existing;
  }
  const task = runSpriteCropTask(async () => {
    if (!spriteCropDemand.has(key)) return null;
    const img = await getSpriteImage(spriteUrl);
    if (!img || !spriteCropDemand.has(key)) return null;
    return img.renderedIn(
      { width: displayWidth, height: displayHeight },
      { position: { x: Math.abs(spriteX), y: 0 }, size: { width: cellWidth, height: cellHeight } },
    );
  }).then((crop) => {
    if (!crop) spriteCropCache.delete(key);
    return crop;
  }).catch(() => {
    spriteCropCache.delete(key);
    return null;
  });
  spriteCropCache.set(key, task);
  trimOldestCacheEntries(spriteCropCache, SPRITE_CROP_CACHE_LIMIT);
  return task;
}

function SpriteThumb({
  spriteUrl,
  spriteX,
  cellWidth = 200,
  cellHeight = 300,
  displayWidth = 100,
  displayHeight = 150,
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
  const alive = useRef(true);
  const loadStarted = useRef(false);
  const demandHeld = useRef(false);
  const demandKey = spriteCropKey(spriteUrl, spriteX, cellWidth, cellHeight, displayWidth, displayHeight);

  useEffect(() => {
    alive.current = true;
    loadStarted.current = false;
    thumb.setValue(null);
    failed.setValue(false);
    return () => {
      alive.current = false;
      if (demandHeld.current) {
        releaseSpriteCrop(demandKey);
        demandHeld.current = false;
      }
    };
  }, [spriteUrl, spriteX, cellWidth, cellHeight, displayWidth, displayHeight]);

  const loadWhenVisible = () => {
    if (loadStarted.current || !alive.current) return;
    loadStarted.current = true;
    retainSpriteCrop(demandKey);
    demandHeld.current = true;
    getSpriteCrop(spriteUrl, spriteX, cellWidth, cellHeight, displayWidth, displayHeight)
      .then((cropped) => {
        if (!alive.current) return;
        if (cropped) thumb.setValue(cropped);
        else failed.setValue(true);
      })
      .catch(() => {
        if (alive.current) failed.setValue(true);
      })
      .finally(() => {
        if (demandHeld.current) {
          releaseSpriteCrop(demandKey);
          demandHeld.current = false;
        }
      });
  };

  if (thumb.value) {
    return (
      <ZStack
        frame={{ width: displayWidth, height: displayHeight }}
        onAppear={loadWhenVisible}
        background={{ style: detailThumbnailFill(), shape: { type: "rect", cornerRadius: 10, style: "continuous" } }}
        clipShape={roundedClip(10)}
      >
        <Image
          image={thumb.value}
          resizable
          aspectRatio={{ value: null, contentMode: "fit" }}
          frame={{ width: displayWidth, height: displayHeight }}
        />
      </ZStack>
    );
  }

  
  return (
    <VStack
      frame={{ width: displayWidth, height: displayHeight }}
      background="thinMaterial"
      clipShape={roundedClip(8)}
      alignment="center"
      onAppear={loadWhenVisible}
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
  const safeStartPage = Math.max(0, Math.min(startPage, Math.max(0, initialImages.length - 1)));
  const currentIdx = useObservable(safeStartPage);
  const allImages = useObservable<EHImageItem[]>(initialImages);
  const moreLoading = useObservable(false);
  const displayPath = useObservable("");
  const pageInfo = useObservable("");
  const loading = useObservable(false);
  const requestSeq = useRef(0);
  const isActive = useRef(true);
  
  const savingCurrent = useObservable(false);
  
  const longPressSaved = useRef(false);

  
  const readerConfig = loadConfig();
  
  const pageDirection = readerConfig.pageDirection === "left_to_right" ? "right_to_left" : readerConfig.pageDirection;
  const readerMode = readerConfig.readerMode;
  const autoCacheWhenReading = readerConfig.autoCacheWhenReading;
  const leftEdgeAction = readerConfig.leftEdgeAction;
  const rightEdgeAction = readerConfig.rightEdgeAction;

   
  const isAnimated = useObservable(false);
  const checkAnimated = (url: string) => {
    if (/\.gif(\?|$)/i.test(url)) isAnimated.setValue(true);
  };

   
  const ensureMore = async () => {
    if (!isActive.current || moreLoading.value) return;
    if (allImages.value.length >= fileCount) return;
    moreLoading.setValue(true);
    try {
      const nextPage = Math.floor(allImages.value.length / PER_PAGE);
      const detail = await api.getGalleryInfo(gid, token, nextPage);
      if (!isActive.current) return;
      const existing = new Set(allImages.value.map((i) => i.page));
      const added = detail.images.filter((i: EHImageItem) => !existing.has(i.page));
      if (added.length > 0) {
        allImages.setValue([...allImages.value, ...added]);
      }
    } catch {
      
    } finally {
      if (isActive.current) moreLoading.setValue(false);
    }
  };

  const maybeLoadMore = (idx: number) => {
    if (idx >= allImages.value.length - 3) ensureMore();
  };

  useEffect(() => {
    isActive.current = true;
    currentIdx.setValue(safeStartPage);
    const timer = setTimeout(() => {
      if (!isActive.current || initialImages.length === 0) return;
      if (!stitched) loadPage(safeStartPage);
      maybeLoadMore(safeStartPage);
    }, 0);
    return () => {
      clearTimeout(timer);
      isActive.current = false;
      requestSeq.current += 1;
    };
  }, []);

  const preload = async (idx: number) => {
    if (idx < 0 || idx >= allImages.value.length) return;
    const img = allImages.value[idx];
    if (!img) return;
    const cacheKey = `${gid}-${img.page}`;
    if (pageImageUrlCache.has(cacheKey)) return;
    try {
      const info = await api.getPageInfo(gid, img.imgkey, img.page);
      if (!info.imageUrl) return;
      cachePageUrl(cacheKey, info.imageUrl);

      if (autoCacheWhenReading && !getCachedImagePath(info.imageUrl)) {
        cacheImage(info.imageUrl);
      }
    } catch {}
  };

  const loadPage = async (idx: number) => {
    if (idx < 0 || idx >= allImages.value.length) return;
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    loading.setValue(true);
    const img = allImages.value[idx];
    if (!img) {
      loading.setValue(false);
      return;
    }

    pageInfo.setValue(`第 ${idx + 1} / ${allImages.value.length} 页 · 加载中...`);
    try {
      const info = await api.getPageInfo(gid, img.imgkey, img.page);
      if (!isActive.current || requestSeq.current !== seq) return; 
      const url = info.imageUrl;
      if (!url) {
        pageInfo.setValue(`第 ${idx + 1} 页加载失败`);
        return;
      }
      cachePageUrl(`${gid}-${img.page}`, url);

      const cached = getCachedImagePath(url);
      if (cached) {
        displayPath.setValue(cached);
        pageInfo.setValue(`第 ${idx + 1} / ${allImages.value.length} 页`);
      } else {
        
        displayPath.setValue(url);
        pageInfo.setValue(`第 ${idx + 1} / ${allImages.value.length} 页`);
        if (autoCacheWhenReading) {
          cacheImage(url).then((p) => {
            if (isActive.current && requestSeq.current === seq && p) displayPath.setValue(p);
          });
        }
      }
      
      // Keep the first transition focused on the visible page; the next page is the useful warm path.
      preload(idx + 1);
    } catch (e: any) {
      if (!isActive.current || requestSeq.current !== seq) return;
      pageInfo.setValue(`第 ${idx + 1} 页加载失败: ${e.message}`);
    } finally {
      if (isActive.current && requestSeq.current === seq) loading.setValue(false);
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
        <HStack spacing={8} padding={{ top: 12, bottom: 8, horizontal: 18 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
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
                  targetPage={initialImages[safeStartPage]?.page ?? 0}
                >
                <ScrollView
                  axes={stitchedAxis}
                  frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
                >
            {stitchedAxis === "vertical" ? (
              <LazyVStack spacing={10}>
                {allImages.value.map((img, idx) => (
                  <StitchedPage key={img.page} tag={`stitch-${img.page}`} gid={gid} img={img} idx={idx} onUrl={checkAnimated} />
                ))}
                {allImages.value.length < fileCount ? (
                  <Button
                    buttonStyle="plain"
                    frame={{ minHeight: 44 }}
                    background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
                    
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
              </LazyVStack>
            ) : (
              <LazyHStack
                spacing={10}
                scaleEffect={stitchedMirror ? { x: -1, y: 1 } : undefined}
              >
                { }
                {stitchedMirror ? (
                  <>
                    {allImages.value.length < fileCount ? (
                      <Button
                        buttonStyle="plain"
                        frame={{ width: Device.screen.width - 24, minHeight: imageAreaHeight }}
                        background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
                        
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
                        background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
                        
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
              </LazyHStack>
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
          background={{ style: controlFill("rgba(255,255,255,0.72)", "rgba(120,120,128,0.30)"), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" } }}
          shadow={{ color: glassShadowColor("navigation"), radius: 12, y: 5 }}
        >
          <Button
            buttonStyle="plain"
            background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
            shadow={elevatedControlShadow()}
            action={dismiss}
          >
            <HStack spacing={5} padding={{ horizontal: 14, vertical: 5 }} frame={{ minWidth: 82, height: 32 }}>
              <Image systemName="chevron.left" font="subheadline" foregroundStyle={labelColor()} />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>返回</Text>
            </HStack>
          </Button>
          <Spacer />
          {stitched ? (
            <Text font="body" foregroundStyle={labelColor()}>
              已加载 {allImages.value.length} / {fileCount} 张 · 滚动浏览
            </Text>
          ) : (
            <>
              <Button
                buttonStyle="plain"
                disabled={currentIdx.value === 0}
                background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
                shadow={elevatedControlShadow()}
                action={prevPage}
              >
                <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()} padding={{ horizontal: 16, vertical: 5 }} frame={{ minWidth: 80, height: 32 }}>上一张</Text>
              </Button>
              <Text font="body" foregroundStyle={labelColor()}>
                {currentIdx.value + 1} / {allImages.value.length}
              </Text>
              <Button
                buttonStyle="plain"
                disabled={currentIdx.value >= allImages.value.length - 1}
                background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
                shadow={elevatedControlShadow()}
                action={nextPage}
              >
                <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()} padding={{ horizontal: 16, vertical: 5 }} frame={{ minWidth: 80, height: 32 }}>下一张</Text>
              </Button>
            </>
          )}
          <Spacer />
          <Button
            buttonStyle="plain"
            disabled={savingCurrent.value}
            background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
            shadow={elevatedControlShadow()}
            action={saveCurrentPage}
          >
            <HStack spacing={4} padding={{ horizontal: 10, vertical: 5 }} frame={{ width: 96, height: 32 }}>
              <Image systemName={savingCurrent.value ? "arrow.down.circle" : "square.and.arrow.down"} font="subheadline" foregroundStyle={labelColor()} frame={{ width: 18 }} />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()} lineLimit={1} frame={{ width: 48 }}>
                {savingCurrent.value ? "保存中" : "保存"}
              </Text>
            </HStack>
          </Button>
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
  const autoCacheWhenReading = loadConfig().autoCacheWhenReading;

  const alive = useRef(true);
  const loadStarted = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Lazy stacks still create every functional child immediately. Starting the
  // original-image request in useEffect therefore launched a whole page batch
  // at once and could make iOS terminate the script during image decoding.
  // Only request a stitched page once its native row actually becomes visible.
  const loadWhenVisible = () => {
    if (loadStarted.current || !alive.current) return;
    loadStarted.current = true;
    (async () => {
      const cacheKey = `${gid}-${img.page}`;
      const cachedUrl = pageImageUrlCache.get(cacheKey);
      try {
        let url: string | null = cachedUrl ?? null;
        if (!url) {
          const info = await api.getPageInfo(gid, img.imgkey, img.page);
          if (!alive.current) return;
          url = info.imageUrl ?? null;
          if (url) cachePageUrl(cacheKey, url);
        }
        if (!alive.current) return;
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
        if (autoCacheWhenReading) {
          cacheImage(url).then((p) => {
            if (alive.current && p) path.setValue(p);
          });
        }
      } catch {
        if (alive.current) state.setValue("error");
      }
    })();
  };

  if (state.value === "loading") {
    return (
      <VStack
        frame={horizontal ? { width: Device.screen.width - 24, height: imageAreaHeight } : { height: 220, maxWidth: "infinity" as const }}
        alignment="center"
        scaleEffect={mirrored ? { x: -1, y: 1 } : undefined}
        tag={tag}
        onAppear={loadWhenVisible}
      >
        <Text font="caption" foregroundStyle={secondaryLabelColor()}>第 {idx + 1} 张加载中...</Text>
      </VStack>
    );
  }
  if (state.value === "error") {
    return (
      <VStack frame={horizontal ? { width: Device.screen.width - 24, height: imageAreaHeight } : { height: 120, maxWidth: "infinity" as const }} alignment="center" scaleEffect={mirrored ? { x: -1, y: 1 } : undefined} tag={tag} onAppear={loadWhenVisible}>
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
      onAppear={loadWhenVisible}
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



const galleryPageCache = new Map<string, EHGalleryListItem[]>();
const galleryNextCursorCache = new Map<string, number | undefined>();

function sameGallerySnapshot(current: EHGalleryListItem[], incoming: EHGalleryListItem[]): boolean {
  return current.length === incoming.length && current.every((item, index) => {
    const next = incoming[index];
    return !!next && item.gid === next.gid && item.token === next.token;
  });
}

function mergeUniqueGalleries(current: EHGalleryListItem[], incoming: EHGalleryListItem[]): EHGalleryListItem[] {
  const seen = new Set(current.map((item) => `${item.gid}:${item.token}`));
  const uniqueIncoming = incoming.filter((item) => {
    const key = `${item.gid}:${item.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return uniqueIncoming.length > 0 ? [...current, ...uniqueIncoming] : current;
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
  const categoryPickerShown = useObservable(false);
  const hasMore = useObservable(true);
  const browseRequestSeq = useRef(0);
  const browseInFlight = useRef(new Set<string>());
  const lastPopularBottomRefresh = useRef(0);

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

  const loadGalleries = async (
    page: number,
    type: string,
    category = selectedCategory.value,
    options: { forceRefresh?: boolean } = {},
  ) => {
    // 推荐／订阅／热门不应携带上一次分类，否则同一数据源会被拆成多个错误缓存。
    const effectiveCategory = type === "category" ? category : null;
    const sourcePrefix = `${api.exhentai ? "ex" : "eh"}|${type}|${effectiveCategory || "all"}|`;
    const cacheKey = `${sourcePrefix}${page}`;
    // Lazy List 的末行可能在一次重渲染前重复 onAppear；请求锁必须同步建立。
    if (browseInFlight.current.has(cacheKey)) return;
    browseInFlight.current.add(cacheKey);
    const requestSeq = ++browseRequestSeq.current;
    if (options.forceRefresh) {
      // 刷新当前数据源时清除所有分页与游标，避免首屏新数据继续拼接旧的后续页。
      for (const key of galleryPageCache.keys()) {
        if (key.startsWith(sourcePrefix)) galleryPageCache.delete(key);
      }
      for (const key of galleryNextCursorCache.keys()) {
        if (key.startsWith(sourcePrefix)) galleryNextCursorCache.delete(key);
      }
    }
    // 订阅仍是测试入口，暂不发起 Watched 请求，统一显示非错误提示。
    if (type === "watched") {
      errorMsg.setValue("");
      hasMore.setValue(false);
      loading.setValue(false);
      galleries.setValue([]);
      browseInFlight.current.delete(cacheKey);
      return;
    }
    // E-Hentai 表站首页允许访客浏览；只有里站推荐与收藏需要登录。
    if (!api.isLoggedIn && ((type === "home" && api.exhentai) || type === "favorites")) {
      errorMsg.setValue(type === "home" ? "需要登录才能访问里站「推荐」" : "需要登录才能访问「收藏」");
      hasMore.setValue(false);
      loading.setValue(false);
      galleries.setValue([]);
      browseInFlight.current.delete(cacheKey);
      return;
    }
    loading.setValue(true);
    errorMsg.setValue("");
    const cachedItems = options.forceRefresh ? undefined : galleryPageCache.get(cacheKey);
    if (cachedItems) {
      if (requestSeq !== browseRequestSeq.current) {
        browseInFlight.current.delete(cacheKey);
        return;
      }
      galleries.setValue(page === 0 ? cachedItems : mergeUniqueGalleries(galleries.value, cachedItems));
      hasMore.setValue(
        type === "popular"
          ? false
          : type === "home" || type === "category"
            ? galleryNextCursorCache.get(cacheKey) !== undefined
            : cachedItems.length > 0,
      );
      currentPage.setValue(page);
      loading.setValue(false);
      browseInFlight.current.delete(cacheKey);
      return;
    }
    // 普通切换在没有对应缓存时立即显示正确的加载页；主动刷新则保留当前列表。
    if (page === 0 && !options.forceRefresh) galleries.setValue([]);
    try {
      let items: EHGalleryListItem[];
      let nextCursor: number | undefined;
      switch (type) {
        case "home": {
          const cursor = page > 0 ? galleryNextCursorCache.get(`${sourcePrefix}${page - 1}`) : undefined;
          if (page > 0 && cursor === undefined) {
            items = [];
            break;
          }
          const result = await api.getBrowsePage({ type: "home", cursor }, !!options.forceRefresh);
          items = result.items;
          nextCursor = result.nextCursor;
          break;
        }
        case "watched":
          items = await api.getWatched(page, !!options.forceRefresh);
          break;
        case "popular":
          items = await api.getPopular(page, !!options.forceRefresh);
          break;
        case "favorites":
          items = await api.getFavorites(page);
          break;
        case "category": {
          const cursor = page > 0 ? galleryNextCursorCache.get(`${sourcePrefix}${page - 1}`) : undefined;
          if (page > 0 && cursor === undefined) {
            items = [];
            break;
          }
          const result = await api.getBrowsePage({
            type: "category",
            category: effectiveCategory ? effectiveCategory as any : undefined,
            cursor,
          }, !!options.forceRefresh);
          items = result.items;
          nextCursor = result.nextCursor;
          break;
        }
        default:
          items = await api.getFrontPage(page);
      }
      if (requestSeq !== browseRequestSeq.current) return;
      galleryPageCache.set(cacheKey, items);
      galleryNextCursorCache.set(cacheKey, nextCursor);
      if (page === 0) {
        // Popular is a changing snapshot, not a paged feed. Preserve row identity when
        // a bottom refresh returns the same ordered gids so the List does no extra work.
        if (type !== "popular" || !sameGallerySnapshot(galleries.value, items)) {
          galleries.setValue(items);
        }
      } else {
        galleries.setValue(mergeUniqueGalleries(galleries.value, items));
      }
      hasMore.setValue(type === "popular" ? false : (type === "home" || type === "category")
        ? nextCursor !== undefined
        : items.length > 0);
      currentPage.setValue(page);
    } catch (e: any) {
      if (requestSeq === browseRequestSeq.current) errorMsg.setValue(e.message || "加载失败");
    } finally {
      browseInFlight.current.delete(cacheKey);
      if (requestSeq === browseRequestSeq.current) loading.setValue(false);
    }
  };

  const refreshPopularAtBottom = () => {
    if (listType.value !== "popular" || loading.value) return;
    const now = Date.now();
    // Loading changes may make the last native row appear again. Cool down that lifecycle
    // callback so one bottom reach cannot become a request loop.
    if (now - lastPopularBottomRefresh.current < 8000) return;
    lastPopularBottomRefresh.current = now;
    loadGalleries(0, "popular", null, { forceRefresh: true });
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
          background={{ style: controlFill("rgba(255,255,255,0.72)", "rgba(120,120,128,0.30)"), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" } }}
          shadow={{ color: glassShadowColor("navigation"), radius: 12, y: 5 }}
          confirmationDialog={{
            title: "选择分类",
            titleVisibility: "visible",
            isPresented: categoryPickerShown,
            actions: (
              <>
                <Button
                  title={selectedCategory.value ? "全部" : "✓ 全部"}
                  action={() => {
                    selectedCategory.setValue(null);
                    if (listType.value !== "home" || galleries.value.length === 0) {
                      listType.setValue("home");
                      loadGalleries(0, "home", null);
                    }
                  }}
                />
                {GALLERY_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    title={selectedCategory.value === cat.value ? `✓ ${cat.label}` : cat.label}
                    action={() => {
                      if (listType.value !== "category" || selectedCategory.value !== cat.value || galleries.value.length === 0) {
                        selectedCategory.setValue(cat.value);
                        listType.setValue("category");
                        loadGalleries(0, "category", cat.value);
                      }
                    }}
                  />
                ))}
              </>
            ),
          }}
        >
          {[
            ["home", "推荐"],
            ["popular", "热门"],
            ["watched", "订阅"],
          ].map(([type, label]) => {
            const active = listType.value === type;
            return (
              <Button
                key={type}
                buttonStyle="plain"
                frame={{ minHeight: 40 }}
                background={active ? {
                  style: GLASS_TOKENS.accent,
                  shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" },
                } : undefined}
                shadow={active ? { color: "rgba(124,108,240,0.34)" as Color, radius: 7, y: 2 } : undefined}
                glassEffectTransition="materialize"
                action={() => {
                  // 重复点击当前页不应递增请求序号，否则会取消正在进行的主动刷新。
                  if (listType.value === type && galleries.value.length > 0) return;
                  selectedCategory.setValue(null);
                  listType.setValue(type);
                  loadGalleries(0, type, null);
                }}
              >
                <Text
                  font="subheadline"
                  fontWeight={active ? "semibold" : "regular"}
                  foregroundStyle={active ? "white" : "label"}
                  padding={{ horizontal: 14, vertical: 8 }}
                >
                  {label}
                </Text>
              </Button>
            );
          })}
          <Button
            title={selectedCategory.value ? categoryTranslations[selectedCategory.value as any] || selectedCategory.value : "分类"}
            systemImage="square.grid.2x2"
            buttonStyle="plain"
            frame={{ minHeight: 40 }}
            padding={{ horizontal: 14, vertical: 8 }}
            action={() => categoryPickerShown.setValue(true)}
          />
          <Spacer />
          <GlassIconButton
            title="刷新"
            systemName={loading.value ? "arrow.clockwise.circle.fill" : "arrow.clockwise"}
            action={() => loadGalleries(
               0,
               listType.value,
               listType.value === "category" ? selectedCategory.value : null,
               { forceRefresh: true },
             )}
          />
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
          <Section>
            <Text
              font="caption"
              foregroundStyle={secondaryLabelColor()}
              frame={{ maxWidth: "infinity", alignment: "center" }}
              padding={{ vertical: 4 }}
              listRowBackground={<></>}
              listRowSeparator="hidden"
            >
              {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"}
            </Text>
            {galleries.value.map((item, index) => (
              <GalleryRow
                key={`${item.gid}-${item.token}`}
                item={item}
                onLanguageDetected={handleLanguageDetected}
                onTagSearch={onTagSearch}
                onAppear={index === galleries.value.length - 1 && galleries.value.length > 0 && !loading.value
                  ? listType.value === "popular"
                    ? refreshPopularAtBottom
                    : hasMore.value
                      ? () => loadGalleries(
                           currentPage.value + 1,
                           listType.value,
                           listType.value === "category" ? selectedCategory.value : null,
                         )
                      : undefined
                  : undefined}
              />
            ))}
          </Section>
          { }
          {errorMsg.value ? (
            <Section>
              <GlassSurface>
                <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Text font="caption" foregroundStyle="red" multilineTextAlignment="leading">{errorMsg.value}</Text>
                  <GlassActionButton title="重试" systemImage="arrow.clockwise" action={() => loadGalleries(
               0,
               listType.value,
               listType.value === "category" ? selectedCategory.value : null,
               { forceRefresh: true },
             )} />
                </VStack>
              </GlassSurface>
            </Section>
          ) : null}

          {!loading.value && galleries.value.length === 0 && !errorMsg.value ? (
            <Section>
              <GlassListRow>
                <Text font="subheadline" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">
                  {listType.value === "watched"
                    ? "测试功能，暂时无法使用"
                    : "暂无内容"}
                </Text>
              </GlassListRow>
            </Section>
          ) : null}
        </List>
      </VStack>
      {loading.value && galleries.value.length === 0 ? <LoadingRow /> : null}
    </ZStack>
  );
}


function SearchPaginationRow({
  page,
  totalCount,
  totalIsApproximate,
  canGoNext,
  loading,
  onPrevious,
  onNext,
}: {
  page: number;
  totalCount: number;
  totalIsApproximate: boolean;
  canGoNext: boolean;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));
  return (
    <HStack
      spacing={12}
      padding={{ horizontal: 8, vertical: 8 }}
      frame={{ maxWidth: "infinity" }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      <Button
        buttonStyle="plain"
        disabled={loading || page <= 0}
        action={onPrevious}
      >
        <HStack spacing={5} padding={{ horizontal: 14, vertical: 10 }}>
          <Image systemName="chevron.left" font="caption" foregroundStyle={page <= 0 ? tertiaryLabelColor() : labelColor()} />
          <Text font="subheadline" fontWeight="semibold" foregroundStyle={page <= 0 ? tertiaryLabelColor() : labelColor()}>上一页</Text>
        </HStack>
      </Button>
      <Text
        font="caption"
        foregroundStyle={secondaryLabelColor()}
        frame={{ maxWidth: "infinity", alignment: "center" }}
      >
        第 {page + 1} 页 / {totalIsApproximate ? "约 " : ""}{totalPages} 页
      </Text>
      <Button
        buttonStyle="plain"
        disabled={loading || !canGoNext}
        action={onNext}
      >
        <HStack spacing={5} padding={{ horizontal: 14, vertical: 10 }}>
          <Text font="subheadline" fontWeight="semibold" foregroundStyle={!canGoNext ? tertiaryLabelColor() : labelColor()}>下一页</Text>
          <Image systemName="chevron.right" font="caption" foregroundStyle={!canGoNext ? tertiaryLabelColor() : labelColor()} />
        </HStack>
      </Button>
    </HStack>
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
  const totalCount = useObservable(0);
  const totalIsApproximate = useObservable(false);
  const pageCache = useRef(new Map<number, EHGallerySearchPage>());
  const searchRequestSeq = useRef(0);
  // Scripting 当前实机上 scrollPosition 对 List 分页替换不可靠；切页时重建 List，天然回到顶部。
  const resultsListIdentity = useObservable(0);
  
  const history = useObservable<string[]>(loadSearchHistory());

  
  const resetSearch = () => {
    Keyboard.hide();
    keyword.setValue("");
    results.setValue([]);
    errorMsg.setValue("");
    currentPage.setValue(0);
    totalCount.setValue(0);
    totalIsApproximate.setValue(false);
    pageCache.current.clear();
    resultsListIdentity.setValue(resultsListIdentity.value + 1);
    searchRequestSeq.current += 1;
  };

  const doSearch = async (page: number = 0, kw?: string, shouldScrollToTop: boolean = false) => {
    const q = (kw ?? keyword.value).trim();
    if (!q) return;
    Keyboard.hide();
    const requestSeq = ++searchRequestSeq.current;
    const cached = pageCache.current.get(page);
    if (cached) {
      results.setValue(cached.items);
      if (totalCount.value !== cached.totalCount) totalCount.setValue(cached.totalCount);
      if (totalIsApproximate.value !== cached.totalIsApproximate) totalIsApproximate.setValue(cached.totalIsApproximate);
      currentPage.setValue(page);
      errorMsg.setValue("");
      if (shouldScrollToTop) resultsListIdentity.setValue(resultsListIdentity.value + 1);
      return;
    }
    const previousPage = page > 0 ? pageCache.current.get(page - 1) : undefined;
    if (page > 0 && !previousPage?.nextCursor) return;
    loading.setValue(true);
    errorMsg.setValue("");
    try {
      const response = await api.searchPage({ keyword: q, cursor: previousPage?.nextCursor });
      if (requestSeq !== searchRequestSeq.current) return;
      pageCache.current.set(page, response);
      results.setValue(response.items);
      if (totalCount.value !== response.totalCount) totalCount.setValue(response.totalCount);
      if (totalIsApproximate.value !== response.totalIsApproximate) totalIsApproximate.setValue(response.totalIsApproximate);
      currentPage.setValue(page);
      if (page === 0) history.setValue(addSearchHistory(q));
      if (shouldScrollToTop) resultsListIdentity.setValue(resultsListIdentity.value + 1);
    } catch (e: any) {
      if (requestSeq === searchRequestSeq.current) errorMsg.setValue(e.message || "搜索失败");
    } finally {
      if (requestSeq === searchRequestSeq.current) loading.setValue(false);
    }
  };

  const startSearch = (kw?: string) => {
    pageCache.current.clear();
    doSearch(0, kw, true);
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
          background={{ style: controlFill("rgba(255,255,255,0.72)", "rgba(120,120,128,0.30)"), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" } }}
          shadow={{ color: glassShadowColor("navigation"), radius: 12, y: 5 }}
        >
          <Button
            buttonStyle="plain"
            frame={{ minHeight: 46 }}
            background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
            
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
            background={{ style: controlFill("rgba(255,255,255,0.72)", "rgba(120,120,128,0.18)"), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={{ color: glassShadowColor("content"), radius: 8, y: 3 }}
          >
            <Image systemName="magnifyingglass" font="caption" foregroundStyle={secondaryLabelColor()} />
            <TextField
              title="关键词"
              value={keyword.value}
              onChanged={(v) => keyword.setValue(v)}
              prompt="输入标题、作者或标签"
              onSubmit={() => startSearch()}
              textFieldStyle="plain"
              frame={{ maxWidth: "infinity" }}
            />
          </HStack>
          <Button
            action={() => startSearch()}
            disabled={loading.value || !keyword.value.trim()}
            buttonStyle="plain"
            frame={{ minHeight: 46 }}
            background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
            
          >
            <HStack spacing={6} padding={{ horizontal: 14, vertical: 10 }} frame={{ minHeight: 46 }}>
              <Image systemName="arrow.right" font="caption" foregroundStyle={labelColor()} />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>搜索</Text>
            </HStack>
          </Button>
        </HStack>

        {!loading.value && results.value.length === 0 ? (
          <HStack spacing={0} padding={{ horizontal: 16, vertical: 6 }} frame={{ maxWidth: "infinity" }} alignment="center">
            <ZStack frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <Text font="caption" foregroundStyle={tertiaryLabelColor()}>
                输入关键词搜索
              </Text>
            </ZStack>
            <ZStack frame={{ maxWidth: "infinity", alignment: "center" }}>
              <Text font="caption" foregroundStyle={secondaryLabelColor()}>
                {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"}
              </Text>
            </ZStack>
            <ZStack frame={{ maxWidth: "infinity", alignment: "trailing" }}>
              {history.value.length > 0 ? (
                <Button
                  buttonStyle="plain"
                  background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
                  shadow={elevatedControlShadow()}
                  action={() => history.setValue(clearSearchHistory())}
                >
                  <HStack spacing={4} padding={{ horizontal: 12, vertical: 8 }}>
                    <Image systemName="trash" font="caption" foregroundStyle={labelColor()} />
                    <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>全部删除</Text>
                  </HStack>
                </Button>
              ) : null}
            </ZStack>
          </HStack>
        ) : null}

        <List
          key={`search-results-list-${resultsListIdentity.value}`}
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
                          startSearch(h);
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
                  <GlassActionButton title="重试" systemImage="arrow.clockwise" action={() => doSearch(currentPage.value)} />
                </VStack>
              </GlassSurface>
            </Section>
          ) : null}

          { }
          {results.value.length > 0 ? (
            <Section>
              <ZStack
                frame={{ maxWidth: "infinity", alignment: "center" }}
                listRowBackground={<></>}
                listRowSeparator="hidden"
              >
                <Text
                  font="caption"
                  foregroundStyle={secondaryLabelColor()}
                  frame={{ maxWidth: "infinity", alignment: "center" }}
                  padding={{ vertical: 4 }}
                >
                  {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"}
                  {` · 已找到 ${totalIsApproximate.value ? "约 " : ""}${totalCount.value.toLocaleString()} 条结果`}
                </Text>
              </ZStack>
              {results.value.map((item) => (
                <GalleryRow
                  key={`${item.gid}-${item.token}`}
                  item={item}
                  onLanguageDetected={handleLanguageDetected}
                  onTagSearch={onTagSearch}
                />
              ))}
              <SearchPaginationRow
                page={currentPage.value}
                totalCount={totalCount.value}
                totalIsApproximate={totalIsApproximate.value}
                canGoNext={!!pageCache.current.get(currentPage.value)?.nextCursor}
                loading={loading.value}
                onPrevious={() => doSearch(currentPage.value - 1, undefined, true)}
                onNext={() => doSearch(currentPage.value + 1, undefined, true)}
              />
            </Section>
          ) : null}

        </List>
      </VStack>
      {loading.value && results.value.length === 0 ? <LoadingRow /> : null}
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
  const totalCount = useObservable(0);
  const totalIsApproximate = useObservable(false);
  const pageCache = useRef(new Map<number, EHGallerySearchPage>());
  const searchRequestSeq = useRef(0);
  // 与普通搜索一致：分页提交后更换 List 身份，避开无效的声明式滚动绑定。
  const resultsListIdentity = useObservable(0);

  
  const doSearch = async (page: number = 0, kw?: string, shouldScrollToTop: boolean = false) => {
    const q = (kw ?? keyword.value).trim();
    if (!q) return;
    const requestSeq = ++searchRequestSeq.current;
    const cached = pageCache.current.get(page);
    if (cached) {
      results.setValue(cached.items);
      if (totalCount.value !== cached.totalCount) totalCount.setValue(cached.totalCount);
      if (totalIsApproximate.value !== cached.totalIsApproximate) totalIsApproximate.setValue(cached.totalIsApproximate);
      currentPage.setValue(page);
      errorMsg.setValue("");
      if (shouldScrollToTop) resultsListIdentity.setValue(resultsListIdentity.value + 1);
      return;
    }
    const previousPage = page > 0 ? pageCache.current.get(page - 1) : undefined;
    if (page > 0 && !previousPage?.nextCursor) return;
    loading.setValue(true);
    errorMsg.setValue("");
    try {
      const response = await api.searchPage({ keyword: q, cursor: previousPage?.nextCursor });
      if (requestSeq !== searchRequestSeq.current) return;
      pageCache.current.set(page, response);
      results.setValue(response.items);
      if (totalCount.value !== response.totalCount) totalCount.setValue(response.totalCount);
      if (totalIsApproximate.value !== response.totalIsApproximate) totalIsApproximate.setValue(response.totalIsApproximate);
      currentPage.setValue(page);
      if (shouldScrollToTop) resultsListIdentity.setValue(resultsListIdentity.value + 1);
    } catch (e: any) {
      if (requestSeq === searchRequestSeq.current) errorMsg.setValue(e.message || "搜索失败");
    } finally {
      if (requestSeq === searchRequestSeq.current) loading.setValue(false);
    }
  };

  
  useEffect(() => {
    pageCache.current.clear();
    resultsListIdentity.setValue(resultsListIdentity.value + 1);
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
          background={{ style: controlFill("rgba(255,255,255,0.72)", "rgba(120,120,128,0.30)"), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.content, style: "continuous" } }}
          shadow={{ color: glassShadowColor("navigation"), radius: 12, y: 5 }}
        >
          <Button
            buttonStyle="plain"
            frame={{ minHeight: 46 }}
            background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
            
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
            background={{ style: controlFill("rgba(255,255,255,0.72)", "rgba(120,120,128,0.18)"), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={{ color: glassShadowColor("content"), radius: 8, y: 3 }}
          >
            <Image systemName="magnifyingglass" font="caption" foregroundStyle={secondaryLabelColor()} />
            <Text font="subheadline" fontWeight="medium" foregroundStyle={labelColor()} lineLimit={1} multilineTextAlignment="leading">{keyword.value}</Text>
          </HStack>
        </HStack>

        <List
          key={`tag-search-results-list-${resultsListIdentity.value}`}
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
          {errorMsg.value ? (
            <Section>
              <GlassSurface>
                <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Text font="caption" foregroundStyle="red" multilineTextAlignment="leading">{errorMsg.value}</Text>
                  <GlassActionButton title="重试" systemImage="arrow.clockwise" action={() => doSearch(currentPage.value)} />
                </VStack>
              </GlassSurface>
            </Section>
          ) : null}

          { }
          {results.value.length > 0 ? (
            <Section>
              <Text
                font="caption"
                foregroundStyle={secondaryLabelColor()}
                frame={{ maxWidth: "infinity", alignment: "center" }}
                padding={{ vertical: 4 }}
                listRowBackground={<></>}
                listRowSeparator="hidden"
              >
                {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"} · 标签搜索 · 已找到 {totalIsApproximate.value ? "约 " : ""}{totalCount.value.toLocaleString()} 条结果
              </Text>
              {results.value.map((item) => (
                <GalleryRow
                  key={`${item.gid}-${item.token}`}
                  item={item}
                  onLanguageDetected={handleLanguageDetected}
                  onTagSearch={handleTagSearch}
                />
              ))}
              <SearchPaginationRow
                page={currentPage.value}
                totalCount={totalCount.value}
                totalIsApproximate={totalIsApproximate.value}
                canGoNext={!!pageCache.current.get(currentPage.value)?.nextCursor}
                loading={loading.value}
                onPrevious={() => doSearch(currentPage.value - 1, undefined, true)}
                onNext={() => doSearch(currentPage.value + 1, undefined, true)}
              />
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
      {loading.value && results.value.length === 0 ? <LoadingRow /> : null}
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
                        background={active ? { style: GLASS_TOKENS.accent, shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } } : undefined}
                        shadow={active ? { color: "rgba(124,108,240,0.28)" as Color, radius: 6, y: 2 } : undefined}
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
                          foregroundStyle={active ? "white" : labelColor()}
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
                      tint={browserImportLabelColor()}
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
                      tint={reloginLabelColor()}
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
