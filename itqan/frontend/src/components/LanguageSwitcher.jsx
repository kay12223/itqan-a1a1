import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";

export default function LanguageSwitcher({ compact = false }) {
  const { lang, toggleLang } = useLanguage();
  const isAr = lang === "ar";

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleLang}
      title={isAr ? "Switch to English" : "التبديل للعربية"}
      className={`
        relative flex items-center gap-1.5 rounded-xl border font-bold transition
        ${compact
          ? "h-9 w-9 justify-center border-white/10 bg-white/5 text-sm text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
          : "h-9 px-3 border-white/10 bg-white/5 text-sm text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
        }
      `}
    >
      <span className="leading-none">{isAr ? "EN" : "ع"}</span>
    </motion.button>
  );
}
