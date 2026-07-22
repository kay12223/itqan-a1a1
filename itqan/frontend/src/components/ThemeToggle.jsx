import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { isVoid, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      data-testid="theme-toggle-button"
      aria-label="تبديل الوضع"
      className={`relative flex h-10 w-10 items-center justify-center rounded-full glass card-hover ${className}`}
    >
      {isVoid ? (
        <Moon className="h-5 w-5 text-cyan-300" />
      ) : (
        <Sun className="h-5 w-5 text-amber-500" />
      )}
    </button>
  );
}
