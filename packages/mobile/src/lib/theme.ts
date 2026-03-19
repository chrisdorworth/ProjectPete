export const colors = {
  navy: {
    50: "#E8EBF0",
    100: "#C5CCD8",
    200: "#8B99B1",
    300: "#51668A",
    400: "#1E3A5F",
    500: "#0F1B2D",
    600: "#0C1624",
    700: "#09111B",
    800: "#060B12",
    900: "#030609",
  },
  amber: {
    50: "#FFF8E1",
    100: "#FFECB3",
    200: "#FFE082",
    300: "#FFD54F",
    400: "#FFCA28",
    500: "#FFC107",
    600: "#FFB300",
    700: "#FFA000",
    800: "#FF8F00",
    900: "#FF6F00",
  },
  green: {
    50: "#E8F5E9",
    400: "#66BB6A",
    500: "#4CAF50",
    600: "#43A047",
  },
  red: {
    50: "#FFEBEE",
    400: "#EF5350",
    500: "#F44336",
    600: "#E53935",
  },
  blue: {
    50: "#E3F2FD",
    400: "#42A5F5",
    500: "#2196F3",
    600: "#1E88E5",
  },
  gray: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#9E9E9E",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  heading1: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 34,
  },
  heading2: {
    fontSize: 22,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  heading3: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 16,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;
