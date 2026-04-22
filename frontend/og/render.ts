import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(__dirname, "../og-fonts");

type FontSpec = { name: string; file: string; weight: 400 | 500 | 600 | 700; style: "normal" };

const FONT_SPECS: FontSpec[] = [
  { name: "Rajdhani", file: "rajdhani-500.ttf", weight: 500, style: "normal" },
  { name: "Rajdhani", file: "rajdhani-600.ttf", weight: 600, style: "normal" },
  { name: "Rajdhani", file: "rajdhani-700.ttf", weight: 700, style: "normal" },
  { name: "Space Mono", file: "space-mono-400.ttf", weight: 400, style: "normal" },
  { name: "Space Mono", file: "space-mono-700.ttf", weight: 700, style: "normal" },
];

type LoadedFont = { name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: "normal" };
let cachedFonts: LoadedFont[] | null = null;

function loadFonts(): LoadedFont[] {
  if (cachedFonts) return cachedFonts;
  cachedFonts = FONT_SPECS.map<LoadedFont>((spec) => ({
    name: spec.name,
    data: fs.readFileSync(path.join(fontsDir, spec.file)),
    weight: spec.weight,
    style: spec.style,
  }));
  return cachedFonts;
}

const COLORS = {
  bg: "#101417",
  panel: "#1a2024",
  panel2: "#252e34",
  line: "#3a4650",
  lineSoft: "#283038",
  text: "#d4e0e8",
  muted: "#8ea0ad",
  blue: "#75a8ff",
  green: "#54f4ac",
  amber: "#ffb44a",
  red: "#ff7d7d",
};

const MONOGRAM_SO = `<svg width="48" height="48" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#151e25"/><rect x="0.5" y="0.5" width="31" height="31" stroke="#3a4650"/><rect x="0" y="0" width="32" height="2" fill="#75a8ff"/><text x="16" y="22" text-anchor="middle" font-family="monospace" font-size="12" font-weight="700" fill="#75a8ff" letter-spacing="1">SO</text></svg>`;

function h(type: string, props: Record<string, unknown> | null, ...children: unknown[]): unknown {
  const normalized = children.length === 0
    ? undefined
    : children.length === 1
      ? children[0]
      : children.flat();
  return { type, props: { ...(props ?? {}), ...(normalized !== undefined ? { children: normalized } : {}) } };
}

export type OgTemplateInput = {
  kind: "home" | "projects" | "project";
  title: string;
  subtitle?: string;
  metaChips?: Array<{ label: string; value: string; accent?: "blue" | "green" | "amber" | "red" | "muted" }>;
  footer?: string;
  statusBadge?: string;
};

function chipAccentColor(accent?: "blue" | "green" | "amber" | "red" | "muted"): string {
  switch (accent) {
    case "green": return COLORS.green;
    case "amber": return COLORS.amber;
    case "red": return COLORS.red;
    case "muted": return COLORS.muted;
    case "blue":
    default:
      return COLORS.blue;
  }
}

function buildTree(input: OgTemplateInput) {
  const { title, subtitle, metaChips = [], footer = "sametozkan.com.tr", statusBadge } = input;

  const header = h(
    "div",
    { style: { display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" } },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: "16px" } },
      h("img", { src: `data:image/svg+xml;utf8,${encodeURIComponent(MONOGRAM_SO)}`, width: 48, height: 48, style: { width: "48px", height: "48px" } }),
      h("div", { style: { fontFamily: "Space Mono", fontSize: "22px", color: COLORS.muted, letterSpacing: "0.06em", textTransform: "uppercase" } }, footer),
    ),
    h("div", { style: { fontFamily: "Space Mono", fontSize: "20px", color: COLORS.blue, letterSpacing: "0.08em", textTransform: "uppercase" } }, "Backend Engineer"),
  );

  const titleBlock = h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1080px" } },
    statusBadge
      ? h(
          "div",
          { style: { display: "flex" } },
          h(
            "div",
            {
              style: {
                fontFamily: "Space Mono",
                fontSize: "18px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COLORS.blue,
                border: `1px solid ${COLORS.line}`,
                padding: "6px 14px",
                background: "rgba(117, 168, 255, 0.08)",
              },
            },
            statusBadge,
          ),
        )
      : null,
    h(
      "div",
      {
        style: {
          fontFamily: "Rajdhani",
          fontWeight: 700,
          fontSize: "88px",
          lineHeight: 1.05,
          color: COLORS.text,
          letterSpacing: "-0.01em",
          display: "flex",
        },
      },
      title,
    ),
    subtitle
      ? h(
          "div",
          {
            style: {
              fontFamily: "Rajdhani",
              fontWeight: 500,
              fontSize: "34px",
              lineHeight: 1.35,
              color: COLORS.muted,
              display: "flex",
            },
          },
          subtitle,
        )
      : null,
  );

  const metaRow = metaChips.length > 0
    ? h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" } },
        ...metaChips.map((chip) =>
          h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "Space Mono",
                fontSize: "20px",
                color: COLORS.text,
                border: `1px solid ${COLORS.lineSoft}`,
                background: COLORS.panel,
                padding: "8px 14px",
              },
            },
            h("span", { style: { color: chipAccentColor(chip.accent), textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "14px" } }, chip.label),
            h("span", { style: {} }, chip.value),
          ),
        ),
      )
    : null;

  const card = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "56px 64px",
        background: COLORS.bg,
        backgroundImage: `radial-gradient(circle at 20% 0%, rgba(117, 168, 255, 0.14), transparent 35%), radial-gradient(circle at 100% 100%, rgba(84, 244, 172, 0.1), transparent 45%)`,
        border: `1px solid ${COLORS.line}`,
        boxSizing: "border-box",
      },
    },
    header,
    h("div", { style: { display: "flex", flexDirection: "column", gap: "26px" } }, titleBlock, metaRow),
  );

  return h(
    "div",
    {
      style: {
        display: "flex",
        width: "1200px",
        height: "630px",
        background: COLORS.bg,
        fontFamily: "Rajdhani",
      },
    },
    card,
  );
}

export async function renderOg(input: OgTemplateInput): Promise<Buffer> {
  const fonts = loadFonts();
  const tree = buildTree(input);
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return Buffer.from(png);
}
