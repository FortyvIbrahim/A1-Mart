import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

/**
 * A1 MART design tokens — Figma "Concept C · Pearl Orange" (Shade 01).
 * Base & Sidebar #FFFBF8 · Primary #F47721.
 */
export const DESIGN = {
  primary: "#F47721",
  primaryHover: "#DB6516",
  base: "#FFFBF8",
  sidebar: "#FFFBF8",
  tabActive: "#FFF5ED",
  accentText: "#C95C18",
  border: "#F1E3D9",
  borderSubtle: "#F7ECE3",
  tableHeader: "#FFF5ED",
  rowAlt: "#FFF5EC",
  text: "#202938",
  textMuted: "#637188",
  textSubtle: "#9CA3AF",
};

const config = defineConfig({
  globalCss: {
    html: {
      colorPalette: "brand",
    },
    body: {
      bg: "app.base",
      color: "fg",
      fontFamily: "body",
    },
  },
  theme: {
    tokens: {
      fonts: {
        body: {
          value:
            "var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        },
        heading: {
          value:
            "var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        },
      },
      colors: {
        brand: {
          50: { value: "#FFF6EF" },
          100: { value: "#FDE9DA" },
          200: { value: "#FBD2B3" },
          300: { value: "#F8B483" },
          400: { value: "#F69350" },
          500: { value: "#F47721" },
          600: { value: "#DB6516" },
          700: { value: "#B65112" },
          800: { value: "#8F4012" },
          900: { value: "#6F3311" },
          950: { value: "#3E1C09" },
        },
        brandDark: {
          50: { value: "#fff0e4" },
          100: { value: "#f8d6b8" },
          200: { value: "#ecb98c" },
          300: { value: "#df9c62" },
          400: { value: "#cf8144" },
          500: { value: "#b56a36" },
          600: { value: "#99542b" },
          700: { value: "#7e4021" },
          800: { value: "#633017" },
          900: { value: "#4a210f" },
        },
        secondary: {
          50: { value: "#f0f2ff" },
          100: { value: "#e0e7ff" },
          200: { value: "#c7d2fe" },
          300: { value: "#a5b4fc" },
          400: { value: "#818cf8" },
          500: { value: "#5B6CB5" },
          600: { value: "#4E5EA6" },
          700: { value: "#4f5ba8" },
          800: { value: "#42499e" },
          900: { value: "#363d94" },
        },
        secondaryDark: {
          50: { value: "#e9ecf9" },
          100: { value: "#d5daf2" },
          200: { value: "#bcc3e4" },
          300: { value: "#9fa8d0" },
          400: { value: "#858eb9" },
          500: { value: "#6d769f" },
          600: { value: "#596187" },
          700: { value: "#474e71" },
          800: { value: "#363c5c" },
          900: { value: "#272c47" },
        },
      },
    },
    semanticTokens: {
      radii: {
        l1: { value: "6px" },
        l2: { value: "8px" },
        l3: { value: "12px" },
      },
      shadows: {
        card: { value: "0 1px 2px rgba(244, 119, 33, 0.04)" },
        pill: { value: "0 1px 3px rgba(31, 41, 55, 0.06)" },
      },
      colors: {
        app: {
          base: { value: DESIGN.base },
          sidebar: { value: DESIGN.sidebar },
          card: { value: "#FFFFFF" },
          tableHeader: { value: DESIGN.tableHeader },
          rowAlt: { value: DESIGN.rowAlt },
          border: { value: DESIGN.border },
          primary: { value: DESIGN.primary },
        },
        fg: {
          DEFAULT: { value: DESIGN.text },
          muted: { value: DESIGN.textMuted },
          subtle: { value: DESIGN.textSubtle },
        },
        border: {
          DEFAULT: { value: DESIGN.border },
          muted: { value: DESIGN.borderSubtle },
          subtle: { value: DESIGN.borderSubtle },
          emphasized: { value: "#E9CDB8" },
        },
        bg: {
          DEFAULT: { value: DESIGN.base },
          subtle: { value: DESIGN.rowAlt },
          muted: { value: DESIGN.sidebar },
        },

        // Mode-aware shade aliases (use as colors.brand50, colors.secondary50, etc.)
        brand50: {
          value: { base: "{colors.brand.50}", _dark: "{colors.brandDark.900}" },
        },
        brand100: {
          value: { base: "{colors.brand.100}", _dark: "{colors.brandDark.800}" },
        },
        brand200: {
          value: { base: "{colors.brand.200}", _dark: "{colors.brandDark.700}" },
        },
        brand300: {
          value: { base: "{colors.brand.300}", _dark: "{colors.brandDark.600}" },
        },
        brand400: {
          value: { base: "{colors.brand.400}", _dark: "{colors.brandDark.500}" },
        },
        brand500: {
          value: { base: "{colors.brand.500}", _dark: "{colors.brandDark.400}" },
        },
        brand600: {
          value: { base: "{colors.brand.600}", _dark: "{colors.brandDark.300}" },
        },
        brand700: {
          value: { base: "{colors.brand.700}", _dark: "{colors.brandDark.200}" },
        },
        brand800: {
          value: { base: "{colors.brand.800}", _dark: "{colors.brandDark.100}" },
        },
        brand900: {
          value: { base: "{colors.brand.900}", _dark: "{colors.brandDark.50}" },
        },

        secondary50: {
          value: {
            base: "{colors.secondary.50}",
            _dark: "{colors.secondaryDark.900}",
          },
        },
        secondary100: {
          value: {
            base: "{colors.secondary.100}",
            _dark: "{colors.secondaryDark.800}",
          },
        },
        secondary200: {
          value: {
            base: "{colors.secondary.200}",
            _dark: "{colors.secondaryDark.700}",
          },
        },
        secondary300: {
          value: {
            base: "{colors.secondary.300}",
            _dark: "{colors.secondaryDark.600}",
          },
        },
        secondary400: {
          value: {
            base: "{colors.secondary.400}",
            _dark: "{colors.secondaryDark.500}",
          },
        },
        secondary500: {
          value: {
            base: "{colors.secondary.500}",
            _dark: "{colors.secondaryDark.400}",
          },
        },
        secondary600: {
          value: {
            base: "{colors.secondary.600}",
            _dark: "{colors.secondaryDark.300}",
          },
        },
        secondary700: {
          value: {
            base: "{colors.secondary.700}",
            _dark: "{colors.secondaryDark.200}",
          },
        },
        secondary800: {
          value: {
            base: "{colors.secondary.800}",
            _dark: "{colors.secondaryDark.100}",
          },
        },
        secondary900: {
          value: {
            base: "{colors.secondary.900}",
            _dark: "{colors.secondaryDark.50}",
          },
        },
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "#FFFFFF" },
          fg: { value: "{colors.brand.600}" },
          muted: { value: "{colors.brand.100}" },
          subtle: { value: "{colors.brand.50}" },
          emphasized: { value: "{colors.brand.200}" },
          focusRing: { value: "{colors.brand.400}" },
        },
        secondary: {
          solid: { value: "{colors.secondary500}" },
          contrast: { value: "#FFFFFF" },
          fg: { value: "{colors.secondary700}" },
          muted: { value: "{colors.secondary100}" },
          subtle: { value: "{colors.secondary50}" },
          emphasized: { value: "{colors.secondary300}" },
          focusRing: { value: "{colors.secondary500}" },
        },
      },
    },
    recipes: {
      // Figma buttons: radius 8, 500 weight; 36px/11.5px (sm) and 40px/12px (md).
      button: {
        base: {
          fontWeight: "500",
          borderRadius: "l2",
        },
        variants: {
          size: {
            sm: { h: "36px", px: "12px", fontSize: "11.5px", gap: "6px" },
            md: { h: "40px", px: "16px", fontSize: "12px", gap: "8px" },
          },
          variant: {
            // Figma secondary action ("Back", "Cancel", "Reset"): peach fill, orange text.
            subtle: {
              bg: "#FFF5ED",
              color: "#C95C18",
              _hover: { bg: "#FDE9DA" },
            },
            outline: {
              borderColor: "#E4E7F2",
              bg: "white",
              color: "#30384B",
              _hover: { bg: "colorPalette.subtle" },
            },
          },
        },
      },
      // Figma form field: 44px, radius 8, 1px #F1E3D9, 12px side padding,
      // 12px text, #637188 placeholder.
      input: {
        base: {
          bg: "white",
          borderRadius: "l2",
          _placeholder: { color: "fg.muted" },
        },
        variants: {
          variant: {
            outline: {
              borderColor: "border",
              _hover: { borderColor: "border.emphasized" },
            },
          },
          size: {
            md: { h: "44px", px: "12px", textStyle: "xs" },
          },
        },
      },
      textarea: {
        base: {
          bg: "white",
          borderRadius: "l2",
        },
        variants: {
          variant: {
            outline: { borderColor: "border" },
          },
        },
      },
      badge: {
        base: { borderRadius: "l1", fontWeight: "medium" },
      },
    },
    slotRecipes: {
      nativeSelect: {
        base: {
          field: { bg: "white", borderRadius: "l2" },
          indicator: { color: "#C95C18" },
        },
        variants: {
          variant: {
            outline: { field: { borderColor: "border" } },
          },
          size: {
            md: { field: { h: "44px", ps: "12px", textStyle: "xs" } },
          },
        },
      },
      select: {
        base: {
          trigger: { bg: "white", borderRadius: "l2" },
          content: { borderRadius: "l3" },
          indicator: { color: "#C95C18" },
        },
        variants: {
          variant: {
            outline: { trigger: { borderColor: "border" } },
          },
        },
      },
      card: {
        base: {
          root: {
            bg: "white",
            borderRadius: "l3",
            borderColor: "border",
          },
        },
      },
      dialog: {
        base: {
          content: { borderRadius: "l3", bg: "white" },
          title: { fontWeight: "semibold", color: "fg" },
        },
      },
      drawer: {
        base: {
          content: { bg: "white" },
          title: { fontWeight: "semibold", color: "fg" },
        },
      },
      tabs: {
        base: {
          trigger: { fontWeight: "medium" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
