export type Theme = "light" | "dark";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("nick-theme", theme);
  } catch {
    // localStorage unavailable (private mode) — theme still applies for the session
  }
}
