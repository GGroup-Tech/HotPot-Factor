import type { Config } from "tailwindcss";

// Design tokens sourced 1:1 from the HotPot Factor Figma DS frame
// (file TJEBX0jKJSvPPHjgAT8D3S, node "DS — Sistema de diseño").
const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F0C0C", // base background
        surface: "#17120F", // card/section background
        raised: "#231C17", // elevated surfaces (modals, popovers)
        line: "#33291F", // borders/dividers
        gold: {
          DEFAULT: "#C9A15C",
          foreground: "#0F0C0C",
        },
        cream: "#E2D5BD", // primary text on dark
        muted: "#9A8E7A", // secondary text
        disabled: "#3A322A",
        success: "#7FB069",
        warning: "#D9A441",
        danger: "#C0654F",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
      borderRadius: {
        badge: "4px",
        control: "8px", // btn / input
        card: "12px", // 10-14px range, 12px as the DS default
        "card-sm": "10px",
        "card-lg": "14px",
        pill: "100px",
      },
      // Type scale from the DS frame ("DS — Sistema de diseño", node 124:2).
      // Fraunces for display-*, DM Sans for everything else.
      fontSize: {
        "display-xl": ["62px", { lineHeight: "70px", fontWeight: "600" }],
        "display-l": ["44px", { lineHeight: "52px", fontWeight: "600" }],
        "display-m": ["34px", { lineHeight: "42px", fontWeight: "600" }],
        "body-l": ["19px", { lineHeight: "32px" }],
        "body-m": ["16px", { lineHeight: "26px" }],
        label: ["13px", { lineHeight: "20px", fontWeight: "500" }],
        eyebrow: ["11px", { lineHeight: "16px", fontWeight: "500", letterSpacing: "1.1px" }],
      },
    },
  },
  plugins: [],
};

export default config;
