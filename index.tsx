import {
  Script,
  Navigation,
  NavigationStack,
  TabView,
  List,
  ForEach,
  Group,
  VStack,
  HStack,
  LazyVStack,
  LazyHStack,
  FlowLayout,
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
  AppEvents,
  EnvironmentValuesReader,
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
  clearLocalFavorites,
  clearLocalHistory,
  clearLocalTagFavorites,
  isLocalFavorite,
  isPrivateBrowsingEnabled,
  listLocalFavorites,
  listLocalHistory,
  listLocalTagFavorites,
  localRecordToGalleryItem,
  localTagFavoriteKey,
  recordGalleryVisit,
  removeLocalFavorite,
  removeLocalHistory,
  removeLocalTagFavorite,
  setLocalFavorite,
  setLocalTagFavorite,
  setPrivateBrowsingEnabled,
  subscribeLocalLibrary,
  isApplyingRemoteLibraryMerge,
  type LocalGalleryRecord,
  type LocalTagFavoriteRecord,
} from "./local-library";
import {
  getGitHubToken,
  destroyGitHubToken,
  connectGitHub,
  uploadGitHubData,
  downloadAndMergeGitHubData,
  deleteRemoteGitHubData,
  getGitHubSyncStatus,
  subscribeGitHubSync,
  githubSyncFilePath,
  getGitHubSyncDebugInfo,
  scheduleGitHubUpload,
} from "./github-sync";
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
let systemAppearance: "light" | "dark" = "light";
let resolvedAppearance: "light" | "dark" = systemAppearance;

 
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
  if (resolvedAppearance === "dark") {
    return { light: "#161618", dark: "#161618" };
  }
  if (resolvedAppearance === "light") {
    return { light: lightGradient, dark: lightGradient };
  }
  return { light: lightGradient, dark: "#161618" };
}

 
function labelColor(): Color {
  if (resolvedAppearance === "light") return "#1a1a1c" as Color;
  if (resolvedAppearance === "dark") return "#ffffff" as Color;
  return "label" as Color;
}

function secondaryLabelColor(): DynamicShapeStyle {
  const light = "#211B28" as Color;
  const dark = "#D6D2DC" as Color;
  if (resolvedAppearance === "light") return controlFill(light, light);
  if (resolvedAppearance === "dark") return controlFill(dark, dark);
  return controlFill(light, dark);
}

function settingsPrimaryTextColor(): Color {
  return labelColor();
}

function settingsSecondaryTextColor(): Color {
  return labelColor();
}

function settingsTertiaryTextColor(): Color {
  if (resolvedAppearance === "light") return "#1A1520" as Color;
  if (resolvedAppearance === "dark") return "#D7D0DE" as Color;
  return "secondaryLabel" as Color;
}

function inputGuidanceTextColor(): Color {
  if (resolvedAppearance === "light") return "#62586C" as Color;
  if (resolvedAppearance === "dark") return "#C7BFCE" as Color;
  return "secondaryLabel" as Color;
}

function tertiaryLabelColor(): DynamicShapeStyle {
  const light = "#1C1722" as Color;
  const dark = "#B8B1C1" as Color;
  if (resolvedAppearance === "light") return controlFill(light, light);
  if (resolvedAppearance === "dark") return controlFill(dark, dark);
  return controlFill(light, dark);
}

function controlFill(lightColor: Color, darkColor: Color): DynamicShapeStyle {
  return { light: lightColor, dark: darkColor };
}

function glassShadowColor(material: GlassMaterial): Color {
  if (resolvedAppearance === "light") {
    const opacity = material === "navigation" ? "0.40" : "0.36";
    return `rgba(72,88,120,${opacity})` as Color;
  }
  return GLASS_TOKENS.material[material].shadow;
}

function glassRowShadow() {
  if (resolvedAppearance === "light") {
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
  if (resolvedAppearance === "light") return light as any;
  if (resolvedAppearance === "dark") return dark as any;
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
  if (resolvedAppearance === "light") return light as any;
  if (resolvedAppearance === "dark") return dark as any;
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
  if (resolvedAppearance === "light") return light as any;
  if (resolvedAppearance === "dark") return dark as any;
  return controlFill(light as any, dark as any);
}

function elevatedControlFill(): DynamicShapeStyle {
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
  if (resolvedAppearance === "light") return light as any;
  if (resolvedAppearance === "dark") return dark as any;
  return controlFill(light as any, dark as any);
}

function elevatedControlShadow() {
  return resolvedAppearance === "dark"
    ? { color: "rgba(0,0,0,0.76)" as Color, radius: 11, y: 7 }
    : { color: "rgba(105,82,158,0.26)" as Color, radius: 11, y: 5 };
}

function detailSurfaceShadow() {
  return resolvedAppearance === "dark"
    ? { color: "rgba(0,0,0,0.76)" as Color, radius: 11, y: 7 }
    : { color: "rgba(111,88,171,0.34)" as Color, radius: 18, y: 6 };
}

function detailImageShadow() {
  return resolvedAppearance === "dark"
    ? { color: "rgba(0,0,0,0.82)" as Color, radius: 12, y: 9 }
    : { color: "rgba(72,55,101,0.22)" as Color, radius: 8, y: 5 };
}

function detailImageRowFill(): DynamicShapeStyle {
  if (resolvedAppearance === "light") return "#F7F4FB" as any;
  if (resolvedAppearance === "dark") return "#27252D" as any;
  return controlFill("#F7F4FB", "#27252D");
}

function detailThumbnailFill(): DynamicShapeStyle {
  if (resolvedAppearance === "light") return "#ECE7F2" as any;
  if (resolvedAppearance === "dark") return "#211F26" as any;
  return controlFill("#ECE7F2", "#211F26");
}

function reloginLabelColor(): Color {
  if (resolvedAppearance === "light") return "#302F36" as Color;
  if (resolvedAppearance === "dark") return "#E2DFE8" as Color;
  return "label" as Color;
}

function browserImportLabelColor(): Color {
  if (resolvedAppearance === "light") return "#24192F" as Color;
  if (resolvedAppearance === "dark") return "#EEE9F6" as Color;
  return "label" as Color;
}

function shelfAccentGradient(): DynamicShapeStyle {
  const lightGradient = {
    colors: ["#A78BFA", "#9B8CFB"] as Color[],
    startPoint: "leading" as const,
    endPoint: "trailing" as const,
  };
  if (resolvedAppearance === "dark") {
    return { light: "#6D5BD0", dark: "#6D5BD0" };
  }
  if (resolvedAppearance === "light") {
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
  if (resolvedAppearance === "light") {
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
  const radius = resolvedAppearance === "light" ? 14 : 12;
  const y = resolvedAppearance === "light" ? 6 : 5;
  return (
    <ZStack
      frame={{ maxWidth: "infinity" as const }}
      background={sculpted ? { style: detailSurfaceFill(), shape: glassShape(material) } : undefined}
      clipShape={sculpted ? glassShape(material) : undefined}
      glassEffect={sculpted && resolvedAppearance === "light" ? undefined : glassEffectFor(material)}
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
  promptLabel = "示例",
}: {
  value: string;
  onChanged: (v: string) => void;
  prompt?: string;
  title?: string;
  systemImage?: string;
  autofocus?: boolean;
  promptLabel?: string;
}) {
  return (
    <VStack alignment="leading" spacing={5} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <GlassInputRow>
        {systemImage ? (
          <Image systemName={systemImage} font="caption" foregroundStyle={secondaryLabelColor()} />
        ) : null}
        <ZStack alignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }}>
          {value.length === 0 ? (
            <Text
              font="body"
              foregroundStyle={inputGuidanceTextColor()}
              lineLimit={1}
              allowsHitTesting={false}
            >
              {title ? `请输入 ${title}` : "请输入内容"}
            </Text>
          ) : null}
          <TextField
            title=""
            value={value}
            onChanged={onChanged}
            textFieldStyle="plain"
            autofocus={autofocus}
            foregroundStyle={settingsPrimaryTextColor()}
            frame={{ maxWidth: "infinity" as const }}
          />
        </ZStack>
      </GlassInputRow>
      {prompt ? (
        <Text
          font="caption"
          foregroundStyle={inputGuidanceTextColor()}
          multilineTextAlignment="leading"
          padding={{ horizontal: 12 }}
        >
          {promptLabel}：{prompt}
        </Text>
      ) : null}
    </VStack>
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
      <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
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
                  登录后可访问账号收藏，并可开启里站。
                </Text>

                <GlassTextField
                  value={cookieInput.value}
                  onChanged={(v) => cookieInput.setValue(v)}
                  title="Cookie"
                  prompt="ipb_member_id=xxx; ipb_pass_hash=xxx"
                  systemImage="key"
                />

                <SettingsToggle
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
                      const imported = readBrowserCookie();
                      if (imported) {
                        cookieInput.setValue(imported.text);
                        errorMsg.setValue("已导入并校验 Cookie（来源：" + imported.source + "）");
                      } else {
                        errorMsg.setValue("未找到有效 Cookie。请先在 Safari 目标站点登录，再点「获取 Cookie」并刷新此页面。");
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

function CachedRemoteImage({
  url,
  width,
  height,
  radius = 10,
  fill,
}: {
  url: string;
  width: number;
  height: number;
  radius?: number;
  fill: DynamicShapeStyle;
}) {
  const path = useObservable<string | null>(getCachedImagePath(url));
  const started = useRef(false);
  useEffect(() => {
    started.current = false;
    path.setValue(getCachedImagePath(url));
    const listener = (cachedPath: string | null) => {
      if (cachedPath) path.setValue(cachedPath);
    };
    let listeners = thumbnailCacheListeners.get(url);
    if (!listeners) {
      listeners = new Set();
      thumbnailCacheListeners.set(url, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) thumbnailCacheListeners.delete(url);
    };
  }, [url]);
  const load = () => {
    if (started.current) return;
    started.current = true;
    requestThumbnailCache(url, true);
  };
  return (
    <ZStack
      frame={{ width, height }}
      background={{ style: fill, shape: { type: "rect", cornerRadius: radius, style: "continuous" } }}
      clipShape={roundedClip(radius)}
      onAppear={load}
    >
      {path.value ? (
        <Image filePath={path.value} resizable aspectRatio={{ value: null, contentMode: "fit" }} frame={{ width, height }} />
      ) : (
        <ProgressView tint={spinnerTint()} />
      )}
    </ZStack>
  );
}

function GalleryRow({
  item,
  onLanguageDetected,
  onTagSearch,
  onAppear,
  localSite,
  localLibraryCaption,
  localLibraryActionTitle,
  onLocalLibraryAction,
}: {
  item: EHGalleryListItem;
  onLanguageDetected?: (gid: number, language: string) => void;
  onTagSearch?: (query: string) => void;
  onAppear?: () => void;
  localSite?: "eh" | "ex";
  localLibraryCaption?: string;
  localLibraryActionTitle?: string;
  onLocalLibraryAction?: () => void;
}) {
  const title = extractTitle(item);
  const sourceRatio = item.thumbnailWidth && item.thumbnailHeight
    ? item.thumbnailWidth / item.thumbnailHeight
    : 0.72;
  const thumbnailRatio = Math.max(0.55, Math.min(1.65, sourceRatio));
  const thumbnailWidth = thumbnailRatio >= 1.15 ? 116 : thumbnailRatio >= 0.88 ? 102 : 92;
  const thumbnailHeight = Math.round(thumbnailWidth / thumbnailRatio);

  const mediaSlotHeight = Math.max(104, thumbnailHeight);
  const rowMinHeight = mediaSlotHeight;
  
  const thumbPath = useObservable<string | null>(null);
  const thumbLoadStarted = useRef(false);
  useEffect(() => {
    const url = item.thumbnailUrl;
    thumbLoadStarted.current = false;
    thumbPath.setValue(url ? getCachedImagePath(url) : null);
    if (!url) return;
    const listener = (path: string | null) => {
      if (path) thumbPath.setValue(path);
    };
    let listeners = thumbnailCacheListeners.get(url);
    if (!listeners) {
      listeners = new Set();
      thumbnailCacheListeners.set(url, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) thumbnailCacheListeners.delete(url);
    };
  }, [item.thumbnailUrl]);

  const rowDidAppear = () => {
    if (item.thumbnailUrl && !thumbLoadStarted.current) {
      thumbLoadStarted.current = true;
      requestThumbnailCache(item.thumbnailUrl, true);
    }
    onAppear?.();
  };

  const openDetail = async () => {
    const previousSite = api.exhentai;
    if (localSite) api.exhentai = localSite === "ex";
    try {
      await Navigation.present(
        <NavigationStack>
          <GalleryDetailView gid={item.gid} token={item.token} initialTitle={title} onLanguageDetected={onLanguageDetected} onTagSearch={onTagSearch} />
        </NavigationStack>
      );
    } finally {
      if (localSite) api.exhentai = previousSite;
    }
  };

  return (
    <GalleryListRow onAppear={rowDidAppear}>
      <VStack spacing={localLibraryActionTitle ? 8 : 0} frame={{ maxWidth: "infinity", alignment: "leading" }}>
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
              <ZStack
                frame={{ width: thumbnailWidth, height: thumbnailHeight }}
                background={{ style: coverBackdropFill(), shape: { type: "rect", cornerRadius: 12, style: "continuous" } }}
                clipShape={roundedClip(12)}
              >
                <ProgressView tint={spinnerTint()} />
              </ZStack>
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
        {localLibraryActionTitle && onLocalLibraryAction ? (
          <HStack spacing={8} frame={{ maxWidth: "infinity", minHeight: 34 }}>
            <Text font="caption2" foregroundStyle={secondaryLabelColor()}>
              {localLibraryCaption || ""}
            </Text>
            <Spacer />
            <HStack
              spacing={5}
              padding={{ horizontal: 4, vertical: 5 }}
              contentShape={{ type: "rect", cornerRadius: 8, style: "continuous" }}
              onTapGesture={onLocalLibraryAction}
            >
              <Image systemName="trash" font="caption" foregroundStyle="#ff3b30" />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle="#ff3b30">
                {localLibraryActionTitle}
              </Text>
            </HStack>
          </HStack>
        ) : null}
      </VStack>
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
      frame={{ maxWidth: "infinity", minHeight: 42 }}
      layoutPriority={1}
      background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
      shadow={elevatedControlShadow()}
      action={active ? onCancel : onStart}
    >
      <HStack spacing={3} padding={{ horizontal: 4 }} frame={{ maxWidth: "infinity", minHeight: 42, alignment: "center" }}>
        <Image systemName={active ? "xmark.circle.fill" : "archivebox.fill"} font="caption" foregroundStyle={active ? "#ff453a" : labelColor()} />
        <Text font="caption" fontWeight="semibold" foregroundStyle={active ? "#ff453a" : labelColor()} lineLimit={1} allowsTightening={true} layoutPriority={1}>
          {active ? "取消下载" : "打包下载"}
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
  onNotice,
}: {
  gid: number;
  img: EHImageItem;
  downloadLock: { current: boolean };
  onOpen: () => void;
  onNotice: (message: string) => void;
}) {
  const saving = useObservable(false);

  const saveImage = async () => {
    if (downloadLock.current) return;
    downloadLock.current = true;
    saving.setValue(true);
    try {
      const ok = await saveSingleImageToPhotos(gid, img);
      if (ok) {
        onNotice(`第 ${img.page + 1} 页已保存到相册`);
      } else {
        onNotice("保存失败，请检查相册权限");
      }
    } catch (e: any) {
      onNotice(`保存失败：${e?.message || "未知错误"}`);
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
              <CachedRemoteImage
                url={img.thumbnailUrl}
                width={100}
                height={150}
                radius={10}
                fill={detailThumbnailFill()}
              />
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
  onNotice,
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
  onNotice: (message: string) => void;
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
          onNotice={onNotice}
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
  const visitRecorded = useRef(false);
  const localSite = useRef<"eh" | "ex">(api.exhentai ? "ex" : "eh");
  const locallyFavorited = useObservable(isLocalFavorite(gid, localSite.current));
  const tagFavoriteKeys = useObservable<Set<string>>(() => new Set(
    listLocalTagFavorites()
      .filter((item: LocalTagFavoriteRecord) => item.site === localSite.current)
      .map((item: LocalTagFavoriteRecord) => item.key),
  ));
  
  const zipDownloading = useObservable(false);
  const zipProgress = useObservable("");
  const zipCancelToken = useRef<ZipCancelToken | null>(null);
  const lastZipProgressAt = useRef(0);
  const copyNotice = useObservable("");
  const copyNoticeTimer = useRef<any>(null);

  useEffect(() => subscribeLocalLibrary(() => {
    locallyFavorited.setValue(isLocalFavorite(gid, localSite.current));
    tagFavoriteKeys.setValue(new Set(
      listLocalTagFavorites()
        .filter((item: LocalTagFavoriteRecord) => item.site === localSite.current)
        .map((item: LocalTagFavoriteRecord) => item.key),
    ));
  }), []);

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
        if (!visitRecorded.current) {
          visitRecorded.current = true;
          recordGalleryVisit(detail, localSite.current);
        }
        locallyFavorited.setValue(isLocalFavorite(gid, localSite.current));
        if (detail.language && onLanguageDetected) {
          onLanguageDetected(gid, detail.language);
        }
      } else {
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
          initialNextDetailPage={currentPage.current + 1}
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
    showCopyNotice("已开始打包下载");
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
      showCopyNotice("打包完成，正在打开保存菜单");
      try {
        await DocumentInteraction.optionsMenu(zipPath);
        if (isActive.current) showCopyNotice("打包完成，ZIP 已生成");
      } catch {
        showCopyNotice("打包完成，可在 Scripting 文档目录找到 ZIP");
      }
    } catch (e: any) {
      if (!isActive.current) return;
      if (e instanceof ZipCancelledError) {
        showCopyNotice("打包下载已取消");
      } else {
        showCopyNotice(`下载失败：${e?.message || "未知错误"}`);
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
    }, 2400);
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

  const toggleTagFavorite = (item: DetailTagItem, favorited: boolean) => {
    if (favorited) {
      removeLocalTagFavorite(item.favoriteKey);
      showCopyNotice(`已取消收藏标签：${item.name}`);
    } else {
      setLocalTagFavorite({
        site: localSite.current,
        namespace: item.namespace,
        name: item.name,
        query: item.query,
      });
      showCopyNotice(`已收藏标签：${item.name}`);
    }
  };

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
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
                            <CachedRemoteImage
                              url={g.coverUrl}
                              width={96}
                              height={140}
                              radius={10}
                              fill={detailSurfaceFill()}
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
                          frame={{ maxWidth: "infinity", minHeight: 42 }}
                          layoutPriority={1}
                          background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
                          shadow={elevatedControlShadow()}
                          action={copyAllInfo}
                        >
                          <HStack spacing={3} padding={{ horizontal: 4 }} frame={{ maxWidth: "infinity", minHeight: 42, alignment: "center" }}>
                            <Image systemName="doc.on.doc" font="caption" foregroundStyle={labelColor()} />
                            <Text font="caption" fontWeight="semibold" foregroundStyle={labelColor()} lineLimit={1} allowsTightening={true} layoutPriority={1}>全部复制</Text>
                          </HStack>
                        </Button>
                        <Button
                          buttonStyle="plain"
                          frame={{ maxWidth: "infinity", minHeight: 42 }}
                          layoutPriority={1}
                          background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
                          shadow={elevatedControlShadow()}
                          action={() => {
                            const next = !locallyFavorited.value;
                            locallyFavorited.setValue(setLocalFavorite(g, localSite.current, next));
                            showCopyNotice(next ? "已收藏" : "已取消收藏");
                          }}
                        >
                          <HStack spacing={3} padding={{ horizontal: 4 }} frame={{ maxWidth: "infinity", minHeight: 42, alignment: "center" }}>
                            <Image systemName={locallyFavorited.value ? "heart.fill" : "heart"} font="caption" foregroundStyle={locallyFavorited.value ? "#ff2d55" : labelColor()} />
                            <Text font="caption" fontWeight="semibold" foregroundStyle={locallyFavorited.value ? "#ff2d55" : labelColor()} lineLimit={1} allowsTightening={true} layoutPriority={1}>收藏</Text>
                          </HStack>
                        </Button>
                        <Button
                          buttonStyle="plain"
                          frame={{ maxWidth: "infinity", minHeight: 42 }}
                          layoutPriority={1}
                          background={{ style: elevatedControlFill(), shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } }}
                          shadow={elevatedControlShadow()}
                          action={() => {
                            const first = images.value[0];
                            if (first) openReader(first);
                          }}
                        >
                          <HStack spacing={3} padding={{ horizontal: 4 }} frame={{ maxWidth: "infinity", minHeight: 42, alignment: "center" }}>
                            <Image systemName="book.fill" font="caption" foregroundStyle={labelColor()} />
                            <Text font="caption" fontWeight="semibold" foregroundStyle={labelColor()} lineLimit={1} allowsTightening={true} layoutPriority={1}>阅读</Text>
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
                  <ShelfHeader title="标签" caption={`${g.tags.length} 个 · 点击搜索，长按更多操作`} />
                  <GlassSurface sculpted={true}>
                    <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      {groupTagsByNamespace(g.tags).map(([ns, names]: [string, string[]]) => (
                        <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }} key={ns}>
                          <Text font="caption2" fontWeight="semibold" foregroundStyle={tertiaryLabelColor()}>
                            {(namespaceTranslations as Record<string, string>)[ns] || ns}
                          </Text>
                          <DetailTagFlow
                            key={`${localSite.current}:${ns}`}
                            namespace={ns}
                            names={names}
                            site={localSite.current}
                            favoriteKeys={tagFavoriteKeys.value}
                            onSearch={(item) => onTagSearch?.(item.query)}
                            onToggleFavorite={toggleTagFavorite}
                            onCopy={(item) => copyTag(item.namespace, item.name)}
                          />
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
                          <Text
                            font="subheadline"
                            foregroundStyle={labelColor()}
                            multilineTextAlignment="leading"
                            onLongPressGesture={{
                              minDuration: 500,
                              perform: () => copyText("评论内容", c.body),
                            }}
                          >
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
              onNotice={showCopyNotice}
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

type DetailTagItem = {
  id: string;
  namespace: string;
  name: string;
  query: string;
  favoriteKey: string;
};

function DetailTagChipVisual({ item, favorited }: { item: DetailTagItem; favorited: boolean }) {
  return (
    <HStack
      spacing={5}
      padding={{ horizontal: 10, vertical: 6 }}
      fixedSize={{ horizontal: true, vertical: true }}
      background={{
        style: elevatedControlFill(),
        shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" },
      }}
    >
      <Image systemName="magnifyingglass" font="caption2" foregroundStyle={secondaryLabelColor()} />
      <Text font="caption" fontWeight="medium" foregroundStyle={labelColor()} lineLimit={1}>
        {item.name}
      </Text>
      {favorited ? <Image systemName="heart.fill" font="caption2" foregroundStyle="#ff2d55" /> : null}
    </HStack>
  );
}

function DetailTagChip({
  item,
  favorited,
  onSearch,
  onToggleFavorite,
  onCopy,
}: {
  item: DetailTagItem;
  favorited: boolean;
  onSearch: (item: DetailTagItem) => void;
  onToggleFavorite: (item: DetailTagItem, favorited: boolean) => void;
  onCopy: (item: DetailTagItem) => void;
}) {
  const shape = { type: "rect" as const, cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" as const };
  return (
    <Menu
      key={item.id}
      label={<DetailTagChipVisual item={item} favorited={favorited} />}
      primaryAction={() => onSearch(item)}
      buttonStyle="plain"
      menuStyle="button"
      menuIndicator="hidden"
      fixedSize={{ horizontal: true, vertical: true }}
      contentShape={{ kind: "interaction", shape }}
    >
      <Button key={`${item.id}:search`} title="搜索此标签" systemImage="magnifyingglass" action={() => onSearch(item)} />
      <Button
        key={`${item.id}:favorite`}
        title={favorited ? "取消收藏标签" : "收藏标签"}
        systemImage={favorited ? "heart.slash" : "heart"}
        action={() => onToggleFavorite(item, favorited)}
      />
      <Button key={`${item.id}:copy`} title="复制标签" systemImage="doc.on.doc" action={() => onCopy(item)} />
    </Menu>
  );
}

function DetailTagFlow({
  namespace,
  names,
  site,
  favoriteKeys,
  onSearch,
  onToggleFavorite,
  onCopy,
}: {
  namespace: string;
  names: string[];
  site: "eh" | "ex";
  favoriteKeys: Set<string>;
  onSearch: (item: DetailTagItem) => void;
  onToggleFavorite: (item: DetailTagItem, favorited: boolean) => void;
  onCopy: (item: DetailTagItem) => void;
}) {
  const items = useObservable<DetailTagItem[]>(() => {
    const seen = new Set<string>();
    const result: DetailTagItem[] = [];
    names.forEach((rawName, index) => {
      const name = rawName.trim().replace(/\s+/g, " ");
      if (!name) return;
      const favoriteKey = localTagFavoriteKey(site, namespace, name);
      if (seen.has(favoriteKey)) return;
      seen.add(favoriteKey);
      result.push({
        id: `${favoriteKey}:${index}`,
        namespace,
        name,
        query: formatTagSearchQuery(namespace, name),
        favoriteKey,
      });
    });
    return result;
  });

  return (
    <FlowLayout horizontalSpacing={7} verticalSpacing={7}>
      <ForEach
        data={items}
        builder={(item) => (
          <DetailTagChip
            key={item.id}
            item={item}
            favorited={favoriteKeys.has(item.favoriteKey)}
            onSearch={onSearch}
            onToggleFavorite={onToggleFavorite}
            onCopy={onCopy}
          />
        )}
      />
    </FlowLayout>
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
const thumbnailCacheQueue: string[] = [];
const thumbnailCacheQueued = new Set<string>();
const thumbnailCacheListeners = new Map<string, Set<(path: string | null) => void>>();
const thumbnailNotifyAttached = new Set<string>();
const THUMBNAIL_CACHE_CONCURRENCY = 3;
const THUMBNAIL_CACHE_QUEUE_LIMIT = 18;
const ORIGINAL_IMAGE_CACHE_CONCURRENCY = 2;
const IMAGE_CACHE_MAX_BYTES = 512 * 1024 * 1024;
const IMAGE_CACHE_TARGET_BYTES = 384 * 1024 * 1024;
const IMAGE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
let activeThumbnailCaches = 0;
let activeOriginalImageCaches = 0;
let imageCacheMaintenanceScheduled = false;
let lastImageCacheMaintenance = 0;
let imageCacheGeneration = 0;

function notifyThumbnailCached(url: string, path: string | null): void {
  const listeners = thumbnailCacheListeners.get(url);
  if (!listeners) return;
  for (const listener of listeners) {
    try { listener(path); } catch {}
  }
}

function drainThumbnailCacheQueue(): void {
  while (activeThumbnailCaches < THUMBNAIL_CACHE_CONCURRENCY && thumbnailCacheQueue.length > 0) {
    const url = thumbnailCacheQueue.shift();
    if (!url) break;
    thumbnailCacheQueued.delete(url);
    activeThumbnailCaches++;
    cacheThumbnailImage(url).then((path) => notifyThumbnailCached(url, path)).finally(() => {
      activeThumbnailCaches--;
      drainThumbnailCacheQueue();
    });
  }
}

function requestThumbnailCache(url: string, priority: boolean = false): void {
  if (!url || getCachedImagePath(url)) return;
  const inFlight = cacheImageInFlight.get(url);
  if (inFlight) {
    if (!thumbnailNotifyAttached.has(url)) {
      thumbnailNotifyAttached.add(url);
      inFlight.then((path) => notifyThumbnailCached(url, path)).finally(() => thumbnailNotifyAttached.delete(url));
    }
    return;
  }
  if (thumbnailCacheQueued.has(url)) return;
  if (!priority && thumbnailCacheQueue.length >= THUMBNAIL_CACHE_QUEUE_LIMIT) return;
  thumbnailCacheQueued.add(url);
  if (priority) thumbnailCacheQueue.unshift(url);
  else thumbnailCacheQueue.push(url);
  drainThumbnailCacheQueue();
}

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
const originalImageCacheQueue: Array<{ url: string; resolve: (path: string | null) => void }> = [];
const originalImageCacheQueued = new Set<string>();

function drainOriginalImageCacheQueue(): void {
  while (activeOriginalImageCaches < ORIGINAL_IMAGE_CACHE_CONCURRENCY && originalImageCacheQueue.length > 0) {
    const task = originalImageCacheQueue.shift();
    if (!task) break;
    originalImageCacheQueued.delete(task.url);
    activeOriginalImageCaches++;
    performCacheImage(task.url).then(task.resolve).finally(() => {
      activeOriginalImageCaches--;
      drainOriginalImageCacheQueue();
    });
  }
}

async function performCacheImage(url: string): Promise<string | null> {
  const generation = imageCacheGeneration;
  try {
    ensureImageCacheDir();
    const path = imageCachePath(url);
    if (FileManager.existsSync(path)) {
      if (generation !== imageCacheGeneration) return null;
      cachedImagePathMemory.set(url, path);
      return path;
    }
    const bytes = await api.downloadImage(url);
    if (!bytes || bytes.length === 0 || generation !== imageCacheGeneration) return null;
    const tempPath = `${FileManager.temporaryDirectory}/sehviewer_image_cache_write_${generation}_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`;
    try {
      await FileManager.writeAsBytes(tempPath, bytes);
      if (generation !== imageCacheGeneration) return null;
      if (FileManager.existsSync(path)) FileManager.removeSync(path);
      FileManager.renameSync(tempPath, path);
      cachedImagePathMemory.set(url, path);
      scheduleImageCacheMaintenance();
      return path;
    } finally {
      try { if (FileManager.existsSync(tempPath)) FileManager.removeSync(tempPath); } catch {}
    }
  } catch { return null; }
}

function cacheThumbnailImage(url: string): Promise<string | null> {
  const existing = cacheImageInFlight.get(url);
  if (existing) return existing;
  const promise = performCacheImage(url);
  cacheImageInFlight.set(url, promise);
  promise.finally(() => {
    if (cacheImageInFlight.get(url) === promise) cacheImageInFlight.delete(url);
  }).catch(() => {});
  return promise;
}

function cacheImage(url: string, priority = false): Promise<string | null> {
  const existing = cacheImageInFlight.get(url);
  if (existing) return existing;
  if (!url) return Promise.resolve(null);
  const promise = new Promise<string | null>((resolve) => {
    const task = { url, resolve };
    if (priority) originalImageCacheQueue.unshift(task); else originalImageCacheQueue.push(task);
    originalImageCacheQueued.add(url);
    drainOriginalImageCacheQueue();
  });
  cacheImageInFlight.set(url, promise);
  promise.finally(() => {
    if (cacheImageInFlight.get(url) === promise) cacheImageInFlight.delete(url);
  }).catch(() => {});
  return promise;
}

const imageCacheSubscribers = new Set<() => void>();
function notifyImageCacheInvalidated(): void {
  for (const fn of imageCacheSubscribers) {
    try { fn(); } catch {}
  }
}

function scheduleImageCacheMaintenance(): void {
  const now = Date.now();
  if (imageCacheMaintenanceScheduled || now - lastImageCacheMaintenance < 10 * 60 * 1000) return;
  imageCacheMaintenanceScheduled = true;
  setTimeout(() => {
    imageCacheMaintenanceScheduled = false;
    lastImageCacheMaintenance = Date.now();
    pruneImageCache();
  }, 30000);
}

function pruneImageCache(): CacheClearResult {
  const entries: { path: string; size: number; modified: number }[] = [];
  let removed = 0;
  let freed = 0;
  try {
    if (!FileManager.existsSync(IMAGE_CACHE_DIR)) return { removed: 0, freed: 0 };
    for (const item of FileManager.readDirectorySync(IMAGE_CACHE_DIR, true)) {
      const path = resolvedDirectoryItem(IMAGE_CACHE_DIR, item);
      try {
        const stat = FileManager.statSync(path);
        if (stat.type === "file") entries.push({ path, size: stat.size, modified: stat.modificationDate });
      } catch {}
    }
    const cutoff = Date.now() - IMAGE_CACHE_MAX_AGE_MS;
    const keep: typeof entries = [];
    for (const entry of entries) {
      if (entry.modified > 0 && entry.modified < cutoff) {
        try { FileManager.removeSync(entry.path); removed++; freed += entry.size; } catch {}
      } else keep.push(entry);
    }
    let total = keep.reduce((sum, entry) => sum + entry.size, 0);
    if (total > IMAGE_CACHE_MAX_BYTES) {
      keep.sort((a, b) => a.modified - b.modified);
      for (const entry of keep) {
        if (total <= IMAGE_CACHE_TARGET_BYTES) break;
        try { FileManager.removeSync(entry.path); total -= entry.size; removed++; freed += entry.size; } catch {}
      }
    }
    if (removed > 0) { cachedImagePathMemory.clear(); notifyImageCacheInvalidated(); }
  } catch {}
  return { removed, freed };
}

function getImageCacheSize(): number {
  try {
    if (!FileManager.existsSync(IMAGE_CACHE_DIR)) return 0;
    const files = FileManager.readDirectorySync(IMAGE_CACHE_DIR, true);
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

 
function clearImageCache(): { removed: number; freed: number; runtimeRemoved: number } {
  let removed = 0;
  let freed = 0;
  imageCacheGeneration++;
  const runtimeRemoved = clearImageMemoryCache(false, false);
  try {
    if (!FileManager.existsSync(IMAGE_CACHE_DIR)) {
      ensureImageCacheDir();
      notifyImageCacheInvalidated();
      return { removed, freed, runtimeRemoved };
    }
    const files = FileManager.readDirectorySync(IMAGE_CACHE_DIR, true);
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
  return { removed, freed, runtimeRemoved };
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

type CacheClearResult = { removed: number; freed: number };

function resolvedDirectoryItem(root: string, item: string): string {
  return item.startsWith(root) ? item : `${root}/${item}`;
}

function getDirectoryStats(root: string): CacheClearResult {
  let removed = 0;
  let freed = 0;
  try {
    if (!FileManager.existsSync(root)) return { removed, freed };
    for (const item of FileManager.readDirectorySync(root, true)) {
      const path = resolvedDirectoryItem(root, item);
      try {
        if (!FileManager.isFileSync(path)) continue;
        removed++;
        freed += FileManager.statSync(path).size;
      } catch {}
    }
  } catch {}
  return { removed, freed };
}

function getDirectorySize(root: string): number {
  return getDirectoryStats(root).freed;
}

function clearDirectoryContents(root: string, recreate = true): CacheClearResult {
  const before = getDirectoryStats(root);
  try {
    if (FileManager.existsSync(root)) FileManager.removeSync(root);
  } catch {}
  try {
    if (recreate && !FileManager.existsSync(root)) FileManager.createDirectorySync(root, true);
  } catch {}
  const after = getDirectoryStats(root);
  return {
    removed: Math.max(0, before.removed - after.removed),
    freed: Math.max(0, before.freed - after.freed),
  };
}

function getDownloadCacheSize(): number {
  return getDirectorySize(DOWNLOAD_DIR);
}

function clearDownloadCache(): CacheClearResult {
  return clearDirectoryContents(DOWNLOAD_DIR, true);
}

function temporaryItemStats(path: string): CacheClearResult {
  try {
    if (FileManager.isFileSync(path)) {
      return { removed: 1, freed: FileManager.statSync(path).size };
    }
    if (FileManager.isDirectorySync(path)) return getDirectoryStats(path);
  } catch {}
  return { removed: 0, freed: 0 };
}

function getTemporaryCacheSize(): number {
  let total = 0;
  try {
    for (const item of FileManager.readDirectorySync(FileManager.temporaryDirectory)) {
      const path = resolvedDirectoryItem(FileManager.temporaryDirectory, item);
      const name = path.split("/").pop() || "";
      if (name.startsWith("sehviewer_") || name.startsWith("ehviewer_cache_write_")) total += temporaryItemStats(path).freed;
    }
  } catch {}
  return total;
}

function clearTemporaryCache(): CacheClearResult {
  let removed = 0;
  let freed = 0;
  try {
    const items = FileManager.readDirectorySync(FileManager.temporaryDirectory);
    for (const item of items) {
      const path = resolvedDirectoryItem(FileManager.temporaryDirectory, item);
      const name = path.split("/").pop() || "";
      if (!name.startsWith("sehviewer_") && !name.startsWith("ehviewer_cache_write_")) continue;
      const before = temporaryItemStats(path);
      try { FileManager.removeSync(path); } catch {}
      const after = FileManager.existsSync(path) ? temporaryItemStats(path) : { removed: 0, freed: 0 };
      removed += Math.max(0, before.removed - after.removed);
      freed += Math.max(0, before.freed - after.freed);
    }
  } catch {}
  return { removed, freed };
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
  let page = all.length > 0 ? Math.floor(Math.max(...all.map((item) => item.page)) / PER_PAGE) + 1 : 0;
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

    const ZIP_DOWNLOAD_CONCURRENCY = 2;
    let nextIndex = 0;
    let completed = 0;
    const worker = async () => {
      while (true) {
        throwIfZipCancelled(cancelToken);
        const i = nextIndex++;
        if (i >= all.length) return;
        const img = all[i];
        try {
          const url = await getPageImageUrl(gid, img.imgkey, img.page);
          if (!url) throw new Error("图片地址获取失败");
          throwIfZipCancelled(cancelToken);
          const ext = imageExtFromUrl(url);
          const name = `${String(img.page + 1).padStart(3, "0")}.${ext}`;
          const outputPath = `${tmpDir}/${name}`;
          const cached = getCachedImagePath(url);
          if (cached && FileManager.existsSync(cached)) {
            await FileManager.copyFile(cached, outputPath);
          } else {
            const bytes = await api.downloadImage(url);
            throwIfZipCancelled(cancelToken);
            if (!bytes || bytes.length === 0) throw new Error("下载内容为空");
            await FileManager.writeAsBytes(outputPath, bytes);
          }
          throwIfZipCancelled(cancelToken);
        } catch (e) {
          if (e instanceof ZipCancelledError) throw e;
          failed++;
        } finally {
          completed++;
          onProgress?.(completed, all.length);
        }
      }
    };
    const tasks = Array.from({ length: Math.min(ZIP_DOWNLOAD_CONCURRENCY, all.length) }, () => worker());
    await Promise.all(tasks.map((task) => task.catch((error) => {
      if (!(error instanceof ZipCancelledError)) throw error;
    })));
    throwIfZipCancelled(cancelToken);

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

 
async function saveSingleImageToPhotos(gid: number, img: EHImageItem, knownPath = ""): Promise<boolean> {
  if (knownPath.startsWith("/") && FileManager.existsSync(knownPath)) {
    const ext = imageExtFromUrl(knownPath);
    return !!(await Photos.savePhoto(knownPath, { fileName: `${gid}_p${img.page + 1}.${ext}` }));
  }
  const cacheKey = `${gid}-${img.page}`;
  let imageUrl = knownPath && !knownPath.startsWith("/") ? knownPath : pageImageUrlCache.get(cacheKey) || "";
  if (!imageUrl) {
    const url = await getPageImageUrl(gid, img.imgkey, img.page);
        if (!url) throw new Error("图片地址获取失败");
    imageUrl = url;
  }
  if (!imageUrl) throw new Error("无图片地址");
  const cached = getCachedImagePath(imageUrl);
  if (cached) {
    const ext = imageExtFromUrl(imageUrl);
    return !!(await Photos.savePhoto(cached, { fileName: `${gid}_p${img.page + 1}.${ext}` }));
  }
  const bytes = await api.downloadImage(imageUrl);
  if (!bytes || bytes.length === 0) throw new Error("下载内容为空");
  const ext = imageExtFromUrl(imageUrl);
  const tmpPath = `${FileManager.temporaryDirectory}/sehviewer_${gid}_${img.page + 1}_${Date.now()}.${ext}`;
  try {
    await FileManager.writeAsBytes(tmpPath, bytes);
    return !!(await Photos.savePhoto(tmpPath, { fileName: `${gid}_p${img.page + 1}.${ext}` }));
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
type SpriteCropQueuedTask = { start: () => void; cancel: () => void };
const spriteCropQueue: SpriteCropQueuedTask[] = [];
const spriteCropDemand = new Map<string, number>();

function clearImageMemoryCache(advanceGeneration = true, notify = true): number {
  const removed =
    cachedImagePathMemory.size +
    thumbnailCacheQueue.length +
    thumbnailCacheQueued.size +
    originalImageCacheQueue.length +
    cacheImageInFlight.size +
    spriteImageCache.size +
    spriteCropCache.size +
    spriteCropQueue.length +
    spriteCropDemand.size +
    pageImageUrlCache.size +
    pageImageInfoInFlight.size;
  if (advanceGeneration) imageCacheGeneration++;
  cachedImagePathMemory.clear();
  thumbnailCacheQueue.splice(0, thumbnailCacheQueue.length);
  thumbnailCacheQueued.clear();
  const queuedImages = originalImageCacheQueue.splice(0, originalImageCacheQueue.length);
  for (const task of queuedImages) task.resolve(null);
  originalImageCacheQueued.clear();
  cacheImageInFlight.clear();
  spriteImageCache.clear();
  spriteCropCache.clear();
  const queuedSpriteCrops = spriteCropQueue.splice(0, spriteCropQueue.length);
  for (const queued of queuedSpriteCrops) queued.cancel();
  spriteCropDemand.clear();
  pageImageUrlCache.clear();
  pageImageInfoInFlight.clear();
  if (notify) notifyImageCacheInvalidated();
  return removed;
}

function trimOldestCacheEntries<K, V>(cache: Map<K, V>, limit: number): void {
  while (cache.size > limit) {
    const oldest = cache.keys().next().value as K | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function runSpriteCropTask(task: () => Promise<UIImage | null>): Promise<UIImage | null> {
  return new Promise<UIImage | null>((resolve, reject) => {
    let settled = false;
    const start = () => {
      if (settled) return;
      activeSpriteCrops++;
      task().then(resolve, reject).finally(() => {
        settled = true;
        activeSpriteCrops--;
        const next = spriteCropQueue.pop();
        if (next) next.start();
      });
    };
    const queued: SpriteCropQueuedTask = {
      start,
      cancel: () => {
        if (settled) return;
        settled = true;
        resolve(null);
      },
    };
    if (activeSpriteCrops < SPRITE_CROP_CONCURRENCY) start();
    else spriteCropQueue.push(queued);
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

function cookieTextIsValid(text: string): boolean {
  const source = (text || "").trim();
  const value = (name: string) => {
    const match = source.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  };
  return !!value("ipb_member_id") && !!value("ipb_pass_hash");
}

function cookieImportCandidates(): string[] {
  const candidates: string[] = [];
  const add = (path: string | undefined) => {
    if (path && candidates.indexOf(path) < 0) candidates.push(path);
  };
  try { add(FileManager.documentsDirectory + "/ehviewer_cookie.txt"); } catch {}
  try { add(FileManager.appGroupDocumentsDirectory + "/ehviewer_cookie.txt"); } catch {}
  try { add(FileManager.iCloudDocumentsDirectory + "/ehviewer_cookie.txt"); } catch {}
  try { add(FileManager.safariBrowserDirectory + "/ehviewer_cookie.txt"); } catch {}
  return candidates;
}

function cookieImportPath(): string { return cookieImportCandidates()[0] || ""; }

function readBrowserCookie(): { text: string; source: string } | null {
  for (const p of cookieImportCandidates()) {
    try {
      if (!FileManager.existsSync(p)) continue;
      const text = FileManager.readAsStringSync(p).trim();
      if (cookieTextIsValid(text)) return { text, source: p };
    } catch (e) {}
  }
  try {
    const storageDir = FileManager.safariBrowserStorageDirectory;
    for (const f of FileManager.readDirectorySync(storageDir, false)) {
      if (!f.endsWith(".json")) continue;
      try {
        const obj = JSON.parse(FileManager.readAsStringSync(storageDir + "/" + f));
        const text = obj && typeof obj.ehviewer_cookie === "string" ? obj.ehviewer_cookie.trim() : "";
        if (cookieTextIsValid(text)) return { text, source: "Safari GM 存储" };
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
const pageImageInfoInFlight = new Map<string, Promise<string | null>>();

async function getPageImageUrl(gid: number, imgkey: string, page: number): Promise<string | null> {
  const key = `${gid}-${page}`;
  const cached = pageImageUrlCache.get(key);
  if (cached) return cached;
  const existing = pageImageInfoInFlight.get(key);
  if (existing) return existing;
  const request = api.getPageInfo(gid, imgkey, page).then((info: any) => {
    const url = info.imageUrl ?? null;
    if (url) cachePageUrl(key, url);
    return url;
  }).finally(() => pageImageInfoInFlight.delete(key));
  pageImageInfoInFlight.set(key, request);
  return request;
}

const imageAreaHeight = Math.max(320, Device.screen.height - 250);

function ReaderView({
  gid,
  token,
  images: initialImages,
  startPage,
  fileCount,
  initialNextDetailPage,
}: {
  gid: number;
  token: string;
  images: EHImageItem[];
  startPage: number;
  fileCount: number;
  initialNextDetailPage: number;
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
  const moreError = useObservable("");
  const moreInFlight = useRef(false);
  const nextDetailPage = useRef(Math.max(0, initialNextDetailPage));
  const displayPath = useObservable("");
  const pageInfo = useObservable("");
  const loading = useObservable(false);
  const requestSeq = useRef(0);
  const isActive = useRef(true);
  
  const savingCurrent = useObservable(false);
  const saveNotice = useObservable("");
  const saveNoticeTimer = useRef<any>(null);
  const stitchedVisibleIdx = useRef(safeStartPage);
  
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
    if (!isActive.current || moreInFlight.current) return;
    if (allImages.value.length >= fileCount) return;
    moreInFlight.current = true;
    moreLoading.setValue(true);
    moreError.setValue("");
    const requestedPage = nextDetailPage.current;
    try {
      const detail = await api.getGalleryInfo(gid, token, requestedPage);
      if (!isActive.current) return;
      if (detail.images.length === 0) {
        throw new Error("后续图片为空，请点击“加载更多”重试");
      }
      const existing = new Set(allImages.value.map((i) => i.page));
      const added = detail.images.filter((i: EHImageItem) => !existing.has(i.page));
      if (added.length === 0) {
        throw new Error("后续图片未能追加，请点击“加载更多”重试");
      }
      allImages.setValue([...allImages.value, ...added]);
      nextDetailPage.current = requestedPage + 1;
    } catch (e: any) {
      if (isActive.current) moreError.setValue(e?.message || "自动加载后续图片失败，请重试");
    } finally {
      moreInFlight.current = false;
      if (isActive.current) moreLoading.setValue(false);
    }
  };
  const maybeLoadMore = (idx: number) => {
    if (idx >= allImages.value.length - 3) void ensureMore();
  };

  const handleStitchedVisible = (idx: number) => {
    if (stitchedVisibleIdx.current !== idx) stitchedVisibleIdx.current = idx;
    maybeLoadMore(idx);
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
      moreInFlight.current = false;
      requestSeq.current += 1;
      if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    };
  }, []);
  const preload = async (idx: number) => {
    if (idx < 0 || idx >= allImages.value.length) return;
    const img = allImages.value[idx];
    if (!img) return;
    const cacheKey = `${gid}-${img.page}`;
    if (pageImageUrlCache.has(cacheKey)) return;
    try {
      const url = await getPageImageUrl(gid, img.imgkey, img.page);
      if (!url) return;
      if (!getCachedImagePath(url)) cacheImage(url);
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
      const url = await getPageImageUrl(gid, img.imgkey, img.page);
      if (!url) throw new Error("图片地址获取失败");
      if (!isActive.current || requestSeq.current !== seq) return; 
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
        const local = await cacheImage(url, true);
        if (!isActive.current || requestSeq.current !== seq) return;
        displayPath.setValue(local || url);
        pageInfo.setValue(`第 ${idx + 1} / ${allImages.value.length} 页`);
      }
      preload(idx + 1);
      preload(idx + 2);
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

   
  const showSaveNotice = (message: string) => {
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    saveNotice.setValue(message);
    saveNoticeTimer.current = setTimeout(() => {
      if (isActive.current) saveNotice.setValue("");
    }, 1800);
  };

  const saveCurrentPage = async () => {
    if (savingCurrent.value) return;
    const idx = stitched ? stitchedVisibleIdx.current : currentIdx.value;
    const img = allImages.value[idx];
    if (!img) return;
    savingCurrent.setValue(true);
    try {
      const knownPath = stitched ? pageImageUrlCache.get(`${gid}-${img.page}`) || "" : displayPath.value;
      const ok = await saveSingleImageToPhotos(gid, img, knownPath);
      if (ok) {
        showSaveNotice(`第 ${idx + 1} 页已保存到相册`);
      } else {
        showSaveNotice("保存失败，请检查相册权限");
      }
    } catch (e: any) {
      showSaveNotice(`保存失败：${e?.message || "未知错误"}`);
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
          {moreError.value ? (
            <Text font="caption" foregroundStyle="#ff3b30">{moreError.value}</Text>
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
                  <StitchedPage key={img.page} tag={`stitch-${img.page}`} gid={gid} img={img} idx={idx} onUrl={checkAnimated} onVisible={handleStitchedVisible} onNotice={showSaveNotice} />
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
                    {allImages.value.map((img, reverseIdx) => {
                      const idx = allImages.value.length - 1 - reverseIdx;
                      return <StitchedPage key={img.page} tag={`stitch-${img.page}`} gid={gid} img={img} idx={idx} onUrl={checkAnimated} onVisible={handleStitchedVisible} onNotice={showSaveNotice} orientation="horizontal" mirrored={stitchedMirror} />;
                    })}
                  </>
                ) : (
                  <>
                    {allImages.value.map((img, idx) => (
                      <StitchedPage key={img.page} tag={`stitch-${img.page}`} gid={gid} img={img} idx={idx} onUrl={checkAnimated} onVisible={handleStitchedVisible} onNotice={showSaveNotice} orientation="horizontal" mirrored={false} />
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
            <HStack spacing={4} padding={{ horizontal: 10, vertical: 5 }} frame={{ minWidth: 92, height: 34 }}>
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
                <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()} lineLimit={1} padding={{ horizontal: 10, vertical: 5 }} frame={{ minWidth: 92, height: 34 }}>上一张</Text>
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
                <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()} lineLimit={1} padding={{ horizontal: 10, vertical: 5 }} frame={{ minWidth: 92, height: 34 }}>下一张</Text>
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
            <HStack spacing={3} padding={{ horizontal: 9, vertical: 5 }} frame={{ minWidth: 78, height: 34 }}>
              <Image systemName={savingCurrent.value ? "arrow.down.circle" : "square.and.arrow.down"} font="subheadline" foregroundStyle={labelColor()} frame={{ width: 18 }} />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()} lineLimit={1}>
                {savingCurrent.value ? "保存中" : "保存"}
              </Text>
            </HStack>
          </Button>
        </HStack>
      </VStack>
      {saveNotice.value ? (
        <ZStack
          frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "bottom" }}
          padding={{ bottom: 62 }}
          allowsHitTesting={false}
        >
          <HStack
            spacing={7}
            padding={{ horizontal: 14, vertical: 9 }}
            background={{ style: controlFill("rgba(255,255,255,0.94)", "rgba(44,44,46,0.94)"), shape: "capsule" }}
            shadow={{ color: glassShadowColor("elevated"), radius: 10, y: 4 }}
          >
            <Image systemName={saveNotice.value.startsWith("保存失败") ? "exclamationmark.circle.fill" : "checkmark.circle.fill"} font="subheadline" foregroundStyle={saveNotice.value.startsWith("保存失败") ? "#ff453a" : "#7C6CF0"} />
            <Text font="subheadline" fontWeight="semibold" foregroundStyle={controlFill("#211A2F", "#FFFFFF")}>
              {saveNotice.value}
            </Text>
          </HStack>
        </ZStack>
      ) : null}
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
  onVisible,
  onNotice,
  orientation = "vertical",
  mirrored = false,
  tag,
  autoCacheWhenReading = false,
}: {
  gid: number;
  img: EHImageItem;
  idx: number;
  onUrl: (url: string) => void;
  onVisible: (idx: number) => void;
  onNotice: (message: string) => void;
  orientation?: "vertical" | "horizontal";
  mirrored?: boolean;
  tag?: string;
  autoCacheWhenReading?: boolean;
}) {
  const path = useObservable("");
  const state = useObservable<"loading" | "ready" | "error">("loading");
  
  const saving = useRef(false);
  const handleSave = async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      const ok = await saveSingleImageToPhotos(gid, img, path.value);
      onNotice(ok ? `第 ${idx + 1} 页已保存到相册` : "保存失败，请检查相册权限");
    } catch (e: any) {
      onNotice(`保存失败：${e?.message || "未知错误"}`);
    } finally {
      saving.current = false;
    }
  };
  const horizontal = orientation === "horizontal";
  const shouldAutoCache = autoCacheWhenReading === true;

  const alive = useRef(true);
  const loadStarted = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadWhenVisible = () => {
    onVisible(idx);
    if (loadStarted.current || !alive.current) return;
    loadStarted.current = true;
    (async () => {
      const cacheKey = `${gid}-${img.page}`;
      const cachedUrl = pageImageUrlCache.get(cacheKey);
      try {
        let url: string | null = cachedUrl ?? null;
        if (!url) {
          url = await getPageImageUrl(gid, img.imgkey, img.page);
          if (!url) throw new Error("图片地址获取失败");
          if (!alive.current) return;
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
        const local = await cacheImage(url, true);
        if (!alive.current) return;
        path.setValue(local || url);
        state.setValue("ready");
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
const GALLERY_PAGE_CACHE_LIMIT = 48;

function clearGallerySessionCache(): number {
  const removed = galleryPageCache.size + galleryNextCursorCache.size;
  galleryPageCache.clear();
  galleryNextCursorCache.clear();
  return removed;
}

function clearAllRuntimeCaches(): number {
  return clearImageMemoryCache() + clearGallerySessionCache();
}

function touchGalleryPageCache(key: string): EHGalleryListItem[] | undefined {
  const value = galleryPageCache.get(key);
  if (!value) return undefined;
  galleryPageCache.delete(key);
  galleryPageCache.set(key, value);
  const cursor = galleryNextCursorCache.get(key);
  galleryNextCursorCache.delete(key);
  galleryNextCursorCache.set(key, cursor);
  return value;
}

function storeGalleryPageCache(key: string, items: EHGalleryListItem[], nextCursor?: number): void {
  galleryPageCache.delete(key);
  galleryNextCursorCache.delete(key);
  galleryPageCache.set(key, items);
  galleryNextCursorCache.set(key, nextCursor);
  while (galleryPageCache.size > GALLERY_PAGE_CACHE_LIMIT) {
    const oldest = galleryPageCache.keys().next().value as string | undefined;
    if (!oldest) break;
    galleryPageCache.delete(oldest);
    galleryNextCursorCache.delete(oldest);
  }
}

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

function BrowseView({ refreshSignal = 0, onTagSearch, hideAIContent = false }: { refreshSignal?: boolean | number; onTagSearch?: (query: string) => void; hideAIContent?: boolean }) {
  
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
  const visibleGalleries = hideAIContent ? galleries.value.filter((item) => !item.isAI) : galleries.value;

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
    const effectiveCategory = type === "category" ? category : null;
    const sourcePrefix = `${api.exhentai ? "ex" : "eh"}|${type}|${effectiveCategory || "all"}|`;
    const cacheKey = `${sourcePrefix}${page}`;
    if (browseInFlight.current.has(cacheKey)) return;
    browseInFlight.current.add(cacheKey);
    const requestSeq = ++browseRequestSeq.current;
    if (options.forceRefresh) {
      for (const key of galleryPageCache.keys()) {
        if (key.startsWith(sourcePrefix)) galleryPageCache.delete(key);
      }
      for (const key of galleryNextCursorCache.keys()) {
        if (key.startsWith(sourcePrefix)) galleryNextCursorCache.delete(key);
      }
    }
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
    const cachedItems = options.forceRefresh ? undefined : touchGalleryPageCache(cacheKey);
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
      storeGalleryPageCache(cacheKey, items, nextCursor);
      if (page === 0) {
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
    if (now - lastPopularBottomRefresh.current < 8000) return;
    lastPopularBottomRefresh.current = now;
    loadGalleries(0, "popular", null, { forceRefresh: true });
  };

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
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
            {visibleGalleries.map((item, index) => (
              <GalleryRow
                key={`${item.gid}-${item.token}`}
                item={item}
                onLanguageDetected={handleLanguageDetected}
                onTagSearch={onTagSearch}
                onAppear={() => {
                  for (let offset = 1; offset <= 3; offset++) {
                    const nextUrl = visibleGalleries[index + offset]?.thumbnailUrl;
                    if (nextUrl) requestThumbnailCache(nextUrl);
                  }
                  const remaining = visibleGalleries.length - index - 1;
                  if (loading.value || visibleGalleries.length === 0) return;
                  if (listType.value === "popular") {
                    if (remaining === 0) refreshPopularAtBottom();
                  } else if (hasMore.value && remaining <= 4) {
                    loadGalleries(
                      currentPage.value + 1,
                      listType.value,
                      listType.value === "category" ? selectedCategory.value : null,
                    );
                  }
                }}
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
                <Text font="subheadline" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">暂无内容</Text>
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
  hideAIContent = false,
}: {
  onTagSearch?: (query: string) => void;
  hideAIContent?: boolean;
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
  const resultsListIdentity = useObservable(0);
  
  const history = useObservable<string[]>(() => loadSearchHistory());
  const visibleResults = hideAIContent ? results.value.filter((item) => !item.isAI) : results.value;

  
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
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
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
              {visibleResults.map((item) => (
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
  const hideAIContent = loadConfig().hideAIContent;
  
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
  const resultsListIdentity = useObservable(0);
  const visibleResults = hideAIContent ? results.value.filter((item) => !item.isAI) : results.value;

  
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
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
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
              {visibleResults.map((item) => (
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


type LocalLibraryMode = "history" | "favorites" | "tags";
type LocalLibraryRow = LocalGalleryRecord & { id: string };
type LocalTagFavoriteRow = LocalTagFavoriteRecord & { id: string };

function localLibraryRows(mode: "history" | "favorites"): LocalLibraryRow[] {
  const source = mode === "history" ? listLocalHistory() : listLocalFavorites();
  const visible = loadConfig().hideAIContent ? source.filter((record: LocalGalleryRecord) => !record.isAI) : source;
  return visible.map((record: LocalGalleryRecord) => ({ ...record, id: record.key }));
}

function localTagFavoriteRows(): LocalTagFavoriteRow[] {
  return listLocalTagFavorites().map((record: LocalTagFavoriteRecord) => ({ ...record, id: record.key }));
}

function parseManualTagInput(input: string): { namespace: string; name: string; query: string } | null {
  const value = input.trim();
  if (!value) return null;
  const separator = value.indexOf(":");
  if (separator > 0) {
    const namespace = value.slice(0, separator).trim().toLowerCase();
    const name = value.slice(separator + 1).trim().replace(/^"|"$/g, "");
    if (!name) return null;
    return { namespace, name, query: formatTagSearchQuery(namespace, name) };
  }
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return { namespace: "", name: value, query: /\s/.test(escaped) ? `"${escaped}"` : escaped };
}

function LocalLibraryView() {
  const dismiss = Navigation.useDismiss();
  const mode = useObservable<LocalLibraryMode>("history");
  const records = useObservable<LocalLibraryRow[]>(localLibraryRows("history"));
  const tagRecords = useObservable<LocalTagFavoriteRow[]>(localTagFavoriteRows());
  const manualTagInput = useObservable("");
  const manualTagSite = useObservable<"eh" | "ex">(api.exhentai ? "ex" : "eh");
  const manualTagError = useObservable("");
  const confirmPresented = useObservable(false);
  const pendingKind = useObservable<"clear" | "remove">("clear");
  const pendingRecordKey = useObservable("");
  const pendingRecordTitle = useObservable("");

  const reloadRecords = (nextMode = mode.value) => {
    if (nextMode === "tags") tagRecords.setValue(localTagFavoriteRows());
    else records.setValue(localLibraryRows(nextMode));
  };

  useEffect(() => subscribeLocalLibrary(() => reloadRecords()), []);

  const switchMode = (nextMode: LocalLibraryMode) => {
    mode.setValue(nextMode);
    reloadRecords(nextMode);
  };

  const activeRecordCount = mode.value === "tags" ? tagRecords.value.length : records.value.length;

  const addManualTag = () => {
    const parsed = parseManualTagInput(manualTagInput.value);
    if (!parsed) {
      manualTagError.setValue("请输入标签，例如 female:glasses");
      return;
    }
    setLocalTagFavorite({ site: manualTagSite.value, ...parsed });
    manualTagInput.setValue("");
    manualTagError.setValue("");
    reloadRecords("tags");
  };

  const openTagSearch = async (record: LocalTagFavoriteRecord) => {
    const previousSite = api.exhentai;
    api.exhentai = record.site === "ex";
    try {
      await Navigation.present(<NavigationStack><TagSearchPage query={record.query} /></NavigationStack>);
    } finally {
      api.exhentai = previousSite;
    }
  };

  const requestClear = () => {
    if (activeRecordCount === 0) return;
    pendingKind.setValue("clear");
    pendingRecordKey.setValue("");
    pendingRecordTitle.setValue("");
    confirmPresented.setValue(true);
  };

  const requestRemove = (record: LocalLibraryRow) => {
    pendingKind.setValue("remove");
    pendingRecordKey.setValue(record.key);
    pendingRecordTitle.setValue(record.title);
    confirmPresented.setValue(true);
  };

  const requestRemoveTag = (record: LocalTagFavoriteRow) => {
    pendingKind.setValue("remove");
    pendingRecordKey.setValue(record.key);
    pendingRecordTitle.setValue(record.namespace ? `${record.namespace}:${record.name}` : record.name);
    confirmPresented.setValue(true);
  };

  const performPendingAction = () => {
    if (pendingKind.value === "clear") {
      if (mode.value === "history") clearLocalHistory();
      else if (mode.value === "favorites") clearLocalFavorites();
      else clearLocalTagFavorites();
    } else if (pendingRecordKey.value) {
      if (mode.value === "history") removeLocalHistory(pendingRecordKey.value);
      else if (mode.value === "favorites") removeLocalFavorite(pendingRecordKey.value);
      else removeLocalTagFavorite(pendingRecordKey.value);
    }
    confirmPresented.setValue(false);
    reloadRecords();
  };

  const dialogTitle = pendingKind.value === "clear"
    ? (mode.value === "history" ? "清空浏览历史" : mode.value === "favorites" ? "清空作品收藏" : "清空标签收藏")
    : (mode.value === "history" ? "删除浏览记录" : mode.value === "favorites" ? "取消作品收藏" : "取消标签收藏");
  const dialogMessage = pendingKind.value === "clear"
    ? (mode.value === "history"
      ? "只会清除浏览历史，已经收藏的作品不会被取消收藏。"
      : mode.value === "favorites"
        ? "只会清空 App 内置作品收藏，不会影响浏览历史或 E-Hentai。"
        : "只会清空 App 内置标签收藏，不会影响作品收藏或 E-Hentai。")
    : (mode.value === "history"
      ? `确定删除《${pendingRecordTitle.value}》的浏览记录吗？`
      : `确定取消收藏“${pendingRecordTitle.value}”吗？`);

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      <PageBackground />
      <List
        listStyle="inset"
        listRowSpacing={4}
        listSectionSpacing={6}
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
        navigationTitle="本地资料库"
        navigationBarTitleDisplayMode="inline"
        navigationBarBackButtonHidden={true}
        toolbar={<Toolbar><ToolbarItem placement="topBarLeading"><Button title="返回" systemImage="chevron.left" action={dismiss} /></ToolbarItem></Toolbar>}
        alert={{
          title: dialogTitle,
          isPresented: confirmPresented,
          message: <Text>{dialogMessage}</Text>,
          actions: (
            <>
              <Button title={pendingKind.value === "clear" ? "全部清除" : (mode.value === "history" ? "删除记录" : "取消收藏")} role="destructive" action={performPendingAction} />
              <Button title="取消" role="cancel" action={() => confirmPresented.setValue(false)} />
            </>
          ),
        }}
      >
        <Section>
          <GlassSurface>
            <HStack spacing={8} padding={10} frame={{ maxWidth: "infinity" }}>
              {(["history", "favorites", "tags"] as const).map((item) => {
                const active = mode.value === item;
                const title = item === "history"
                  ? `浏览历史 ${localLibraryRows("history").length}`
                  : item === "favorites"
                    ? `作品收藏 ${localLibraryRows("favorites").length}`
                    : `标签收藏 ${localTagFavoriteRows().length}`;
                return (
                  <Button key={item} buttonStyle="plain" frame={{ maxWidth: "infinity", minHeight: 40 }} background={active ? { style: GLASS_TOKENS.accent, shape: { type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" } } : undefined} action={() => switchMode(item)}>
                    <Text font="caption" fontWeight="semibold" foregroundStyle={active ? "white" : labelColor()} lineLimit={1}>{title}</Text>
                  </Button>
                );
              })}
            </HStack>
          </GlassSurface>
          {activeRecordCount > 0 ? (
            <HStack
              spacing={6}
              padding={{ horizontal: 10, vertical: 2 }}
              frame={{ maxWidth: "infinity", minHeight: 38, alignment: "center" }}
              contentShape={{ type: "rect", cornerRadius: GLASS_TOKENS.radius.control, style: "continuous" }}
              listRowInsets={{ top: 0, leading: 0, bottom: 0, trailing: 0 }}
              listRowBackground={<></>}
              listRowSeparator="hidden"
              onTapGesture={requestClear}
            >
              <Image systemName="trash" font="subheadline" foregroundStyle="#ff3b30" />
              <Text font="subheadline" fontWeight="semibold" foregroundStyle="#ff3b30">
                {mode.value === "history" ? "清空浏览历史" : mode.value === "favorites" ? "清空作品收藏" : "清空标签收藏"}
              </Text>
            </HStack>
          ) : null}
        </Section>
        {mode.value !== "tags" && records.value.length > 0 ? (
          <Section>
            <ForEach
              data={records}
              builder={(record: LocalLibraryRow) => (
                <GalleryRow
                  key={record.id}
                  item={localRecordToGalleryItem(record)}
                  localSite={record.site}
                  localLibraryCaption={mode.value === "history" ? `浏览 ${record.visitCount} 次` : "App 本地收藏"}
                  localLibraryActionTitle={mode.value === "history" ? "删除记录" : "取消收藏"}
                  onLocalLibraryAction={() => requestRemove(record)}
                />
              )}
            />
          </Section>
        ) : null}
        {mode.value === "tags" ? (
          <Section>
            <GlassSurface>
              <VStack alignment="leading" spacing={10} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>手动收藏标签</Text>
                <HStack spacing={8}>
                  <Button title={manualTagSite.value === "eh" ? "E-Hentai" : "ExHentai"} systemImage="globe" action={() => manualTagSite.setValue(manualTagSite.value === "eh" ? "ex" : "eh")} />
                  <TextField title="标签" value={manualTagInput.value} onChanged={(value) => manualTagInput.setValue(value)} prompt="female:glasses 或任意关键词" onSubmit={addManualTag} textFieldStyle="plain" frame={{ maxWidth: "infinity" }} />
                  <Button title="收藏" systemImage="heart" disabled={!manualTagInput.value.trim()} action={addManualTag} />
                </HStack>
                <Text font="caption2" foregroundStyle={manualTagError.value ? "red" : tertiaryLabelColor()} multilineTextAlignment="leading">
                  {manualTagError.value || "支持 namespace:tag；不写 namespace 时按普通关键词搜索。点站点按钮可切换收藏来源。"}
                </Text>
              </VStack>
            </GlassSurface>
          </Section>
        ) : null}
        {mode.value === "tags" && tagRecords.value.length > 0 ? (
          <Section>
            <ForEach data={tagRecords} builder={(record: LocalTagFavoriteRow) => (
              <GlassListRow key={record.id}>
                <HStack spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Button buttonStyle="plain" frame={{ maxWidth: "infinity", alignment: "leading" }} action={() => openTagSearch(record)}>
                    <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                      <HStack spacing={6}>
                        <Image systemName="tag.fill" font="caption" foregroundStyle="#7C6CF0" />
                        <Text font="subheadline" fontWeight="semibold" foregroundStyle={labelColor()}>{record.namespace ? `${record.namespace}:${record.name}` : record.name}</Text>
                      </HStack>
                      <Text font="caption2" foregroundStyle={secondaryLabelColor()}>{record.site === "ex" ? "ExHentai 里站" : "E-Hentai 表站"} · 点击搜索</Text>
                    </VStack>
                  </Button>
                  <HStack spacing={5} padding={{ horizontal: 4, vertical: 5 }} contentShape={{ type: "rect", cornerRadius: 8, style: "continuous" }} onTapGesture={() => requestRemoveTag(record)}>
                    <Image systemName="heart.slash" font="caption" foregroundStyle="#ff3b30" />
                    <Text font="subheadline" fontWeight="semibold" foregroundStyle="#ff3b30">取消收藏</Text>
                  </HStack>
                </HStack>
              </GlassListRow>
            )} />
          </Section>
        ) : null}
        {activeRecordCount === 0 ? (
          <Section><GlassListRow><Text font="subheadline" foregroundStyle={secondaryLabelColor()}>{mode.value === "history" ? "暂无浏览历史" : mode.value === "favorites" ? "暂无作品收藏" : "暂无标签收藏，可在上方手动添加"}</Text></GlassListRow></Section>
        ) : null}
      </List>
    </ZStack>
  );
}

function SettingsSurface({ children }: { children?: any }) {
  return (
    <ZStack
      frame={{ maxWidth: "infinity" as const }}
      background={{ style: detailSurfaceFill(), shape: glassShape("content") }}
      clipShape={glassShape("content")}
      shadow={detailSurfaceShadow()}
      listRowBackground={<></>}
      listRowSeparator="hidden"
    >
      {children}
    </ZStack>
  );
}

function settingsIconColor(): Color {
  if (resolvedAppearance === "light") return "#7144A5" as Color;
  if (resolvedAppearance === "dark") return "#CBB5F2" as Color;
  return "purple" as Color;
}

function SettingsToggle({
  title,
  systemImage,
  value,
  onChanged,
}: {
  title: string;
  systemImage?: string;
  value: boolean;
  onChanged: (value: boolean) => void;
}) {
  return (
    <HStack alignment="center" spacing={9} frame={{ maxWidth: "infinity" }}>
      {systemImage ? (
        <Image
          systemName={systemImage}
          font="body"
          renderingMode="template"
          foregroundStyle={settingsIconColor()}
        />
      ) : null}
      <Toggle
        title={title}
        value={value}
        onChanged={onChanged}
        foregroundStyle={settingsPrimaryTextColor()}
        frame={{ maxWidth: "infinity" }}
      />
    </HStack>
  );
}

function SettingsMenu({ title, systemImage, children }: { title: string; systemImage: string; children?: any }) {
  return (
    <Menu
      label={
        <HStack alignment="center" spacing={8} frame={{ minWidth: 138, minHeight: 44, alignment: "trailing" }}>
          <Image systemName={systemImage} font="body" renderingMode="template" foregroundStyle={settingsIconColor()} />
          <Text font="body" fontWeight="semibold" foregroundStyle={settingsSecondaryTextColor()} lineLimit={1}>
            {title}
          </Text>
        </HStack>
      }
      buttonStyle="plain"
      menuIndicator="hidden"
    >
      {children}
    </Menu>
  );
}

function GitHubSyncSection({
  requestTokenDestruction,
  requestRemoteDataDeletion,
  remoteDeletionFeedback,
}: {
  requestTokenDestruction: () => void;
  requestRemoteDataDeletion: () => void;
  remoteDeletionFeedback: string;
}) {
  const tokenDraft = useObservable("");
  const statusTick = useObservable(0);
  const busy = useObservable(false);
  const feedback = useObservable("");
  const syncStatus = getGitHubSyncStatus();
  const connected = !!getGitHubToken() && !!syncStatus.meta;
  useEffect(() => subscribeGitHubSync(() => statusTick.setValue(Date.now())), []);
  void statusTick.value;
  const runAction = async (action: () => Promise<void>, success: string) => {
    busy.setValue(true); feedback.setValue("");
    try { await action(); feedback.setValue(success); }
    catch (e: any) { feedback.setValue(e.message || "同步失败"); }
    finally { busy.setValue(false); }
  };
  return (
    <Section>
      <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
        <ShelfHeader title="GitHub 数据同步" caption="私有仓库保存加密后的浏览历史、作品收藏和标签收藏" />
        <SettingsSurface>
          <VStack alignment="leading" spacing={10} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
            <Text font="caption" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">Token 仅保存在本机 Keychain，不会写入配置、日志或同步文件。前台运行时数据变更将在约 10 分钟内尝试上传；系统挂起时会在下次打开补传。</Text>
            {!connected ? <>
              <GlassTextField value={tokenDraft.value} onChanged={(v) => tokenDraft.setValue(v)} title="Fine-grained PAT" prompt="粘贴 GitHub Token" promptLabel="提示" systemImage="key.fill" />
              <GlassActionButton title="验证并创建私有仓库" systemImage="lock.shield" tint="accentColor" loading={busy.value} action={() => runAction(async () => { await connectGitHub(tokenDraft.value); tokenDraft.setValue(""); }, "GitHub 已连接，私有仓库已准备好") } />
              <Text font="caption2" foregroundStyle={tertiaryLabelColor()} multilineTextAlignment="leading">Fine-grained personal access token 所需权限：{"\n"}• Repository access：All repositories（用于创建后立即访问专用仓库）{"\n"}• Repository permissions → Administration：Read and write（创建私有仓库）{"\n"}• Repository permissions → Contents：Read and write（读取、上传和删除加密同步文件）</Text>
            </> : <>
              <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}><Text font="body" foregroundStyle={labelColor()}>连接状态</Text><Spacer /><Text font="subheadline" foregroundStyle={secondaryLabelColor()}>已连接</Text></HStack>
              <Text font="caption2" foregroundStyle={tertiaryLabelColor()} multilineTextAlignment="leading">仓库：{syncStatus.meta?.owner}/{syncStatus.meta?.repository}{"\n"}文件：{githubSyncFilePath()}{"\n"}{syncStatus.message}</Text>
              <GlassActionButton title="立刻上传" systemImage="arrow.up.circle" tint="accentColor" loading={busy.value} action={() => runAction(uploadGitHubData, "加密数据已上传")} />
              <GlassActionButton title="从 GitHub 读取并合并" systemImage="arrow.down.circle" tint={browserImportLabelColor()} loading={busy.value} action={() => runAction(downloadAndMergeGitHubData, "远程资料已合并到本机")} />
              <GlassActionButton title="同步调试信息" systemImage="ladybug" tint={browserImportLabelColor()} action={() => feedback.setValue(getGitHubSyncDebugInfo())} />
              <GlassActionButton title="删除 GitHub 数据" systemImage="trash" destructive loading={syncStatus.busy} action={requestRemoteDataDeletion} />
              <Text font="caption2" foregroundStyle={tertiaryLabelColor()} multilineTextAlignment="leading">只删除仓库中的远端加密数据文件，不删除私有仓库、Token、本地资料或本机加密密钥。继续使用同步并修改本地资料后，数据可能再次自动上传。</Text>
              <GlassActionButton title="焚毁本机 Token" systemImage="flame" destructive action={requestTokenDestruction} />
            </>}
            {remoteDeletionFeedback ? <Text font="caption" foregroundStyle={remoteDeletionFeedback.includes("失败") || remoteDeletionFeedback.includes("无法") ? "red" : secondaryLabelColor()} multilineTextAlignment="leading">{remoteDeletionFeedback}</Text> : null}
            {feedback.value ? <Text font="caption" foregroundStyle={feedback.value.includes("失败") || feedback.value.includes("无法") ? "red" : secondaryLabelColor()} multilineTextAlignment="leading">{feedback.value}</Text> : null}
          </VStack>
        </SettingsSurface>
      </VStack>
    </Section>
  );
}

function SettingsView({
  isLoggedIn,
  onLogin,
  onExhentaiChange,
  onAppearanceChange,
  onContentPreferenceChange,
}: {
  isLoggedIn: Observable<boolean>;
  onLogin: () => void;
  onExhentaiChange: () => void;
  onAppearanceChange: () => void;
  onContentPreferenceChange: (hideAIContent: boolean) => void;
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
  const privateBrowsing = useObservable(isPrivateBrowsingEnabled());
  const hideAIContent = useObservable(config.value.hideAIContent);
  const cookieDraft = useObservable("");
  const cookieLoading = useObservable(false);
  const cookieError = useObservable("");
  const cacheSize = useObservable(0);
  const downloadCacheSize = useObservable(0);
  const temporaryCacheSize = useObservable(0);
  const cacheFeedbackTitle = useObservable("");
  const cacheFeedbackMessage = useObservable("");
  const cacheConfirmationPresented = useObservable(false);
  const pendingCacheClear = useObservable<"downloads" | "all" | null>(null);
  const tokenDestructionStage = useObservable<0 | 1 | 2>(0);
  const remoteDataDeletionStage = useObservable<0 | 1 | 2>(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      cacheSize.setValue(getImageCacheSize());
      downloadCacheSize.setValue(getDownloadCacheSize());
      temporaryCacheSize.setValue(getTemporaryCacheSize());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const remoteDeletionFeedback = useObservable("");
  const requestTokenDestruction = () => {
    pendingCacheClear.setValue(null);
    remoteDataDeletionStage.setValue(0);
    tokenDestructionStage.setValue(1);
    cacheConfirmationPresented.setValue(true);
  };
  const requestRemoteDataDeletion = () => {
    pendingCacheClear.setValue(null);
    tokenDestructionStage.setValue(0);
    remoteDataDeletionStage.setValue(1);
    remoteDeletionFeedback.setValue("");
    cacheConfirmationPresented.setValue(true);
  };
  const cancelCurrentConfirmation = () => {
    pendingCacheClear.setValue(null);
    tokenDestructionStage.setValue(0);
    remoteDataDeletionStage.setValue(0);
  };
  const advanceTokenDestruction = () => {
    cacheConfirmationPresented.setValue(false);
    tokenDestructionStage.setValue(2);
    setTimeout(() => cacheConfirmationPresented.setValue(true), 120);
  };
  const advanceRemoteDataDeletion = () => {
    cacheConfirmationPresented.setValue(false);
    remoteDataDeletionStage.setValue(2);
    setTimeout(() => cacheConfirmationPresented.setValue(true), 120);
  };
  const confirmRemoteDataDeletion = async () => {
    remoteDataDeletionStage.setValue(0);
    try {
      await deleteRemoteGitHubData();
      remoteDeletionFeedback.setValue("GitHub 远端加密数据已删除；本地资料、私有仓库和 Token 均已保留。");
    } catch (e: any) {
      remoteDeletionFeedback.setValue(`删除 GitHub 数据失败：${e.message || "未知错误"}`);
    }
  };
  const confirmTokenDestruction = () => {
    destroyGitHubToken();
    tokenDestructionStage.setValue(0);
  };
  const refreshCacheSizes = () => {
    cacheSize.setValue(getImageCacheSize());
    downloadCacheSize.setValue(getDownloadCacheSize());
    temporaryCacheSize.setValue(getTemporaryCacheSize());
  };
  const showCacheFeedback = (title: string, message: string) => {
    cacheFeedbackTitle.setValue(title);
    cacheFeedbackMessage.setValue(message);
  };
  const requestCacheClear = (kind: "downloads" | "all") => {
    tokenDestructionStage.setValue(0);
    remoteDataDeletionStage.setValue(0);
    pendingCacheClear.setValue(kind);
    cacheConfirmationPresented.setValue(true);
  };
  const performConfirmedCacheClear = () => {
    const kind = pendingCacheClear.value;
    pendingCacheClear.setValue(null);
    if (kind === "downloads") {
      const res = clearDownloadCache();
      refreshCacheSizes();
      showCacheFeedback(
        res.removed > 0 ? "打包下载已清理" : "打包下载无需清理",
        res.removed > 0
          ? `已删除 ${res.removed} 个文件，释放 ${formatFileSize(res.freed)}。`
          : "没有打包下载或残留文件。",
      );
      return;
    }
    if (kind === "all") {
      const image = clearImageCache();
      const downloads = clearDownloadCache();
      const temporary = clearTemporaryCache();
      const runtime = clearAllRuntimeCaches();
      refreshCacheSizes();
      showCacheFeedback(
        "全部缓存已清理",
        `共删除 ${image.removed + downloads.removed + temporary.removed} 个文件，释放 ${formatFileSize(image.freed + downloads.freed + temporary.freed)}，并重置 ${runtime} 项会话缓存。登录状态、本地资料库和搜索历史均未改变。`,
      );
    }
  };

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
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      <PageBackground />
      <List
        listStyle="inset"
        listRowSpacing={10}
        listSectionSpacing={24}
        scrollContentBackground="hidden"
        listRowBackground={<></>}
        listRowSeparator="hidden"
        navigationTitle="更多"
        navigationBarTitleDisplayMode="inline"
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        alert={{
          isPresented: cacheConfirmationPresented,
          title: remoteDataDeletionStage.value === 2
            ? "最后确认删除 GitHub 数据"
            : remoteDataDeletionStage.value === 1
              ? "删除 GitHub 数据？"
              : tokenDestructionStage.value === 2
                ? "最后确认焚毁 Token"
                : tokenDestructionStage.value === 1
                  ? "焚毁 GitHub Token？"
                  : pendingCacheClear.value === "all" ? "彻底清理全部缓存" : "清理打包下载",
          message: (
            <Text>
              {remoteDataDeletionStage.value === 2
                ? "确定删除 GitHub 仓库中的远端加密数据文件吗？该远端文件需要重新上传才能恢复。私有仓库、Token、本地资料和本机加密密钥不会被删除。"
                : remoteDataDeletionStage.value === 1
                  ? "这是远端删除操作，只删除 sehviewer/data-v1.enc，不删除仓库或本地资料。操作需要再次确认；之后若继续修改本地资料，自动同步可能重新上传该文件。"
                  : tokenDestructionStage.value === 2
                    ? "确定永久删除本机保存的 GitHub Token？远端私有仓库和加密数据不会被删除。"
                    : tokenDestructionStage.value === 1
                      ? "这只会删除本机 Token，不会删除 GitHub 仓库或加密数据。操作需要再次确认。"
                      : pendingCacheClear.value === "all"
                        ? "将清除图片、打包下载、临时文件和当前会话缓存。不会删除 Cookie、登录状态、搜索历史、本地收藏或浏览历史。确定继续？"
                        : "将删除 App 生成并保留的全部 ZIP 和打包残留。已保存到其他位置的文件不受影响。"}
            </Text>
          ),
          actions: (
            <Group>
              <Button title={remoteDataDeletionStage.value > 0 || tokenDestructionStage.value > 0 ? "保留" : "取消"} role="cancel" action={cancelCurrentConfirmation} />
              <Button
                title={remoteDataDeletionStage.value === 2
                  ? "删除远端数据"
                  : remoteDataDeletionStage.value === 1
                    ? "继续"
                    : tokenDestructionStage.value === 2 ? "焚毁" : tokenDestructionStage.value === 1 ? "继续" : pendingCacheClear.value === "all" ? "彻底清理" : "清理"}
                role={remoteDataDeletionStage.value === 1 || tokenDestructionStage.value === 1 ? undefined : "destructive"}
                action={remoteDataDeletionStage.value === 2
                  ? confirmRemoteDataDeletion
                  : remoteDataDeletionStage.value === 1
                    ? advanceRemoteDataDeletion
                    : tokenDestructionStage.value === 2 ? confirmTokenDestruction : tokenDestructionStage.value === 1 ? advanceTokenDestruction : performConfirmedCacheClear}
              />
            </Group>
          ),
        }}
      >
        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="内容与隐私" caption="管理本地资料、浏览记录与内容显示偏好" />
            <SettingsSurface>
              <VStack alignment="leading" spacing={10} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <GlassActionButton title="本地资料库" systemImage="books.vertical.fill" tint={browserImportLabelColor()} action={async () => { await Navigation.present(<NavigationStack><LocalLibraryView /></NavigationStack>); }} />
                <SettingsToggle
                  title="屏蔽 AI 内容"
                  systemImage="wand.and.stars.inverse"
                  value={hideAIContent.value}
                  onChanged={(enabled) => {
                    hideAIContent.setValue(enabled);
                    config.setValue({ ...config.value, hideAIContent: enabled });
                    saveConfig({ hideAIContent: enabled });
                    onContentPreferenceChange(enabled);
                  }}
                />
                <SettingsToggle
                  title="无痕浏览"
                  systemImage="eye.slash.fill"
                  value={privateBrowsing.value}
                  onChanged={(enabled) => {
                    privateBrowsing.setValue(enabled);
                    setPrivateBrowsingEnabled(enabled);
                  }}
                />
                <Text font="caption2" foregroundStyle={tertiaryLabelColor()} multilineTextAlignment="leading">
                  屏蔽 AI 内容会隐藏已识别为 AI 的作品；无痕浏览不会保存新的浏览记录。两项设置都不会删除已有历史、App 本地收藏，也不会影响 E-Hentai 账号收藏。
                </Text>
              </VStack>
            </SettingsSurface>
          </VStack>
        </Section>

        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="外观" caption="界面深浅模式" />
            <SettingsSurface>
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
                          const previousResolvedAppearance = resolvedAppearance;
                          currentAppearance = next;
                          resolvedAppearance = next === "system" ? systemAppearance : next;
                          if (previousResolvedAppearance !== resolvedAppearance) notifyAppearanceChanged();
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
            </SettingsSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="站点" caption={api.exhentai ? "当前：ExHentai 里站" : "当前：E-Hentai 表站"} />
            <SettingsSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>当前站点</Text>
                  <Spacer />
                  <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>
                    {api.exhentai ? "🧿 ExHentai 里站" : "🌐 E-Hentai 表站"}
                  </Text>
                </HStack>
                <SettingsToggle
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
            </SettingsSurface>
          </VStack>
        </Section>

        <GitHubSyncSection
          requestTokenDestruction={requestTokenDestruction}
          requestRemoteDataDeletion={requestRemoteDataDeletion}
          remoteDeletionFeedback={remoteDeletionFeedback.value}
        />

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="账号" caption={isLoggedIn.value ? "已登录 ✓" : "未登录"} />
            <SettingsSurface>
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
                        const imported = readBrowserCookie();
                        if (imported) {
                          cookieDraft.setValue(imported.text);
                          cookieError.setValue("已导入并校验 Cookie（来源：" + imported.source + "）");
                        } else {
                          cookieError.setValue("未找到有效 Cookie。请先在 Safari 目标站点登录，再点「获取 Cookie」并刷新此页面。");
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
                      1. Safari 打开 e-hentai.org、exhentai.org 或其登录子域名，点扩展图标确认「SEhViewer Cookie 助手」已启用{"\n"}
                      2. 登录后点页面左下角获取 Cookie，也可使用扩展菜单里的同名命令{"\n"}
                      3. 回到这里点「从浏览器导入」→「保存并验证」；若页面没出现按钮，请检查该网站的扩展权限是否为“允许”
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
            </SettingsSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="阅读" caption="翻页方式、方向与缓存" />
            <SettingsSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                { }
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={settingsPrimaryTextColor()}>翻页方式</Text>
                  <Spacer />
                  <SettingsMenu title={config.value.readerMode === "swipe" ? "滑动翻页" : "点击边缘翻页"} systemImage="hand.draw">
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
                  </SettingsMenu>
                </HStack>

                { }
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={settingsPrimaryTextColor()}>翻页方向</Text>
                  <Spacer />
                  <SettingsMenu title={config.value.pageDirection === "vertical" ? "上下滑动" : "从左往右滑动"} systemImage="arrow.left.and.right">
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
                  </SettingsMenu>
                </HStack>

                { }
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={settingsPrimaryTextColor()}>左缘点击</Text>
                  <Spacer />
                  <SettingsMenu title={config.value.leftEdgeAction === "prev" ? "上一页" : config.value.leftEdgeAction === "next" ? "下一页" : "无"} systemImage="hand.tap">
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
                  </SettingsMenu>
                </HStack>

                { }
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={settingsPrimaryTextColor()}>右缘点击</Text>
                  <Spacer />
                  <SettingsMenu title={config.value.rightEdgeAction === "prev" ? "上一页" : config.value.rightEdgeAction === "next" ? "下一页" : "无"} systemImage="hand.tap">
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
                  </SettingsMenu>
                </HStack>
              </VStack>
            </SettingsSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="存储与缓存" caption="分项清理，或一次清除全部可重建数据" />
            <SettingsSurface>
              <VStack alignment="leading" spacing={12} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>图片缓存</Text>
                  <Spacer />
                  <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>{formatFileSize(cacheSize.value)}</Text>
                </HStack>
                <Text font="caption2" foregroundStyle={tertiaryLabelColor()} multilineTextAlignment="leading">
                  列表缩略图、详情图片和阅读图片缓存。磁盘缓存超过 512 MB 或 30 天会自动清理。
                </Text>
                <GlassActionButton
                  title="清理图片缓存"
                  systemImage="photo.badge.minus"
                  destructive
                  action={() => {
                    const res = clearImageCache();
                    refreshCacheSizes();
                    showCacheFeedback(
                      res.removed > 0 || res.runtimeRemoved > 0 ? "图片缓存已清理" : "图片缓存无需清理",
                      res.removed > 0 || res.runtimeRemoved > 0
                        ? `已删除 ${res.removed} 个图片文件，释放 ${formatFileSize(res.freed)}，并重置 ${res.runtimeRemoved} 项图片运行缓存。`
                        : "图片磁盘缓存和运行缓存均为空。",
                    );
                  }}
                />

                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>打包下载与残留</Text>
                  <Spacer />
                  <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>{formatFileSize(downloadCacheSize.value)}</Text>
                </HStack>
                <Text font="caption2" foregroundStyle={tertiaryLabelColor()} multilineTextAlignment="leading">
                  已生成的 ZIP，以及异常退出后可能残留的打包临时目录。
                </Text>
                <GlassActionButton
                  title="清理打包下载"
                  systemImage="archivebox"
                  destructive
                  action={() => requestCacheClear("downloads")}
                />

                <HStack alignment="center" spacing={8} frame={{ maxWidth: "infinity" }}>
                  <Text font="body" foregroundStyle={labelColor()}>临时文件</Text>
                  <Spacer />
                  <Text font="subheadline" foregroundStyle={secondaryLabelColor()}>{formatFileSize(temporaryCacheSize.value)}</Text>
                </HStack>
                <GlassActionButton
                  title="清理临时文件"
                  systemImage="clock.arrow.circlepath"
                  destructive
                  action={() => {
                    const res = clearTemporaryCache();
                    refreshCacheSizes();
                    showCacheFeedback(
                      res.removed > 0 ? "临时文件已清理" : "临时文件无需清理",
                      res.removed > 0
                        ? `已删除 ${res.removed} 个异常残留临时项目，释放 ${formatFileSize(res.freed)}。`
                        : "没有发现 SEhViewer 临时残留。",
                    );
                  }}
                />

                <GlassActionButton
                  title="重置页面与内存缓存"
                  systemImage="memorychip"
                  destructive
                  action={() => {
                    const removed = clearAllRuntimeCaches();
                    refreshCacheSizes();
                    showCacheFeedback(
                      removed > 0 ? "页面与内存缓存已重置" : "页面与内存缓存无需重置",
                      removed > 0
                        ? `已清除 ${removed} 项缩略图、Sprite、阅读地址、主页列表和分页游标缓存。`
                        : "当前没有可清理的页面与内存缓存。",
                    );
                  }}
                />

                <GlassActionButton
                  title="彻底清理全部缓存"
                  systemImage="trash.slash"
                  destructive
                  action={() => requestCacheClear("all")}
                />

                {cacheFeedbackMessage.value ? (
                  <VStack
                    alignment="leading"
                    spacing={4}
                    padding={{ horizontal: 12, vertical: 10 }}
                    frame={{ maxWidth: "infinity", alignment: "leading" }}
                    fixedSize={{ horizontal: false, vertical: true }}
                    background={{ style: "#34C759", shape: { type: "rect", cornerRadius: 10, style: "continuous" } }}
                  >
                    <Text font="subheadline" fontWeight="semibold" foregroundStyle="#FFFFFF" frame={{ maxWidth: "infinity", alignment: "leading" }} fixedSize={{ horizontal: false, vertical: true }}>{cacheFeedbackTitle.value}</Text>
                    <Text font="caption2" foregroundStyle="#FFFFFF" multilineTextAlignment="leading" frame={{ maxWidth: "infinity", alignment: "leading" }} fixedSize={{ horizontal: false, vertical: true }}>{cacheFeedbackMessage.value}</Text>
                  </VStack>
                ) : null}

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
            </SettingsSurface>
          </VStack>
        </Section>

        { }
        <Section>
          <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
            <ShelfHeader title="关于" caption="SEhViewer v1.3.2" />
            <SettingsSurface>
              <VStack alignment="leading" spacing={4} padding={14} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Text font="body" foregroundStyle={labelColor()}>SEhViewer</Text>
                <Text font="caption" foregroundStyle={secondaryLabelColor()} multilineTextAlignment="leading">
                  基于JSEhViewer修改
                </Text>
              </VStack>
            </SettingsSurface>
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
  const updated: any = { ...current, ...partial };
  delete updated.githubToken;
  try {
    Storage.set("ehviewer_config", JSON.stringify(updated));
  } catch {}
}



function MainApp() {
  const tabIndex = useObservable(0);
  const isLoggedIn = useObservable(api.isLoggedIn);
  const exhentaiEnabled = useObservable(api.exhentai);
  const hideAIContent = useObservable(loadConfig().hideAIContent);
  const appearanceMode = useObservable<AppearanceMode>(currentAppearance);
  const appearanceScheme = useObservable<"light" | "dark">(resolvedAppearance);
  
  
  
  const handleTagSearch = (query: string) => {
    Navigation.present(
      <NavigationStack>
        <TagSearchPage query={query} />
      </NavigationStack>
    );
  };

  
  useEffect(() => {
    const config = loadConfig();
    currentAppearance = config.appearance || "system";
    resolvedAppearance = currentAppearance === "system" ? systemAppearance : currentAppearance;
    appearanceMode.setValue(currentAppearance);
    appearanceScheme.setValue(resolvedAppearance);
    const handleSystemAppearance = (value: "light" | "dark") => {
      if (currentAppearance !== "system" || resolvedAppearance === value) return;
      resolvedAppearance = value;
      appearanceScheme.setValue(value);
      notifyAppearanceChanged();
    };
    AppEvents.colorScheme.addListener(handleSystemAppearance);
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
    const unsubscribeSync = subscribeLocalLibrary(() => { if (!isApplyingRemoteLibraryMerge()) scheduleGitHubUpload(); });
    const syncStatus = getGitHubSyncStatus();
    if (syncStatus.connected && syncStatus.meta?.lastLocalChangeAt) uploadGitHubData().catch(() => {});
    return () => {
      AppEvents.colorScheme.removeListener(handleSystemAppearance);
      unsubscribeSync();
    };
  }, []);

  return (
    <TabView
      tabIndex={tabIndex.value}
      onTabIndexChanged={(v) => tabIndex.setValue(v)}
      preferredColorScheme={appearanceScheme.value}
    >
      { }
      <NavigationStack tag={0} tabItem={<Label title="浏览" systemImage="photo.on.rectangle" />}>
        <BrowseView refreshSignal={exhentaiEnabled.value} onTagSearch={handleTagSearch} hideAIContent={hideAIContent.value} />
      </NavigationStack>

      { }
      <NavigationStack tag={1} tabItem={<Label title="搜索" systemImage="magnifyingglass" />}>
        <SearchView onTagSearch={handleTagSearch} hideAIContent={hideAIContent.value} />
      </NavigationStack>

      { }
      <NavigationStack tag={2} tabItem={<Label title="更多" systemImage="ellipsis.circle.fill" />}>
        <SettingsView
          isLoggedIn={isLoggedIn}
          onLogin={() => { isLoggedIn.setValue(api.isLoggedIn); }}
          onExhentaiChange={() => { exhentaiEnabled.setValue(api.exhentai); }}
          onContentPreferenceChange={(enabled) => { hideAIContent.setValue(enabled); }}
          onAppearanceChange={() => {
            appearanceMode.setValue(currentAppearance);
            appearanceScheme.setValue(resolvedAppearance);
          }}
        />
      </NavigationStack>
    </TabView>
  );
}



function AppRoot() {
  return (
    <EnvironmentValuesReader keys={["colorScheme"]}>
      {(environment) => {
        systemAppearance = environment.colorScheme;
        if (currentAppearance === "system") resolvedAppearance = systemAppearance;
        return <MainApp />;
      }}
    </EnvironmentValuesReader>
  );
}

async function run() {
  
  currentAppearance = loadConfig().appearance || "system";
  resolvedAppearance = currentAppearance === "system" ? systemAppearance : currentAppearance;
  await Navigation.present(
    <NavigationStack>
      <AppRoot />
    </NavigationStack>,
  );
  Script.exit();
}

run();
