import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import {
  Rocket, Shield, BrainCircuit, Wallet, Clock, Users, BarChart3,
  Bell, Building2, CheckCircle2, Sparkles, ArrowLeft, Lock,
  Cpu, MessageSquare, Globe, Phone, Mail, Instagram, Twitter,
  Linkedin, Facebook, ChevronRight, Star, Zap, HeadphonesIcon,
  CloudUpload, Smartphone, TrendingUp, Package, CreditCard, FileBarChart,
  Calendar, Briefcase, FolderOpen, Award, Target, GitBranch,
  ChevronDown, Check, Layers, Settings, Crown,
  UserCheck, DollarSign, ClipboardList, PieChart, AlertCircle,
  FileText, Boxes, Activity, Fingerprint, Globe2, UserCog,
  Landmark, BookOpen, Key, ClipboardCheck, ListTodo, Bot,
  CalendarClock, Megaphone, NotebookPen, MessagesSquare,
  Camera, Film, Video, Clapperboard, Image,
} from "lucide-react";
import VoidParticles from "@/components/VoidParticles";
import ThemeToggle from "@/components/ThemeToggle";
import EditableText from "@/components/EditableText";
import { useEditMode } from "@/context/EditModeContext";

const LOGO_IMG = "/logo-itqan-new.png";
const LOGO_FALLBACK = "/logo-itqan.png";

const DEFAULT_TEXTS = {
  hero_title_1: "أدر شركتك...",
  hero_title_2: "بكل احتراف وذكاء",
  hero_desc: "نظام إتقان يساعدك على إدارة فريق التصوير والمونتاج، تنظيم جلسات التصوير والمشاريع الإعلانية، ومتابعة الحضور والرواتب — كل شيء في مكان واحد.",
  features_title: "مميزات النظام",
  features_sub: "كل ما تحتاجه لإدارة شركة تصوير وإنتاج إعلاني باحترافية في مكان واحد",
  how_title: "كيف يعمل النظام؟",
  why_title: "لماذا إتقان؟",
  pricing_title: "خطط تناسب شركات الإنتاج",
  pricing_sub: "اختر الخطة المناسبة لحجم فريق الإنتاج",
  cta_title: "جاهز لتطوير شركتك الإنتاجية؟",
  cta_sub: "ابدأ الآن وأدر شركة التصوير والإنتاج الإعلاني بكل احتراف مع إتقان",
  footer_text: "جميع الحقوق محفوظة © إتقان لإدارة شركات الإنتاج 2025",
  footer_contact: "للتواصل: 01012930571",
};

function T({ eid, as, className, multiline }) {
  return <EditableText eid={eid} defaultText={DEFAULT_TEXTS[eid]} as={as} className={className} multiline={multiline} />;
}

const navLinks = [
  { href: "#features",  label: "المميزات" },
  { href: "#system",    label: "النظام" },
  { href: "#roles",     label: "المدير والموظف" },
  { href: "#pricing",   label: "الأسعار" },
  { href: "#faq",       label: "الأسئلة" },
  { href: "#contact",   label: "تواصل معنا" },
];

/* ── 12 features — vivid gradient icons ── */
const features = [
  { icon: Camera,       grad: "from-blue-500 to-cyan-400",     shadow: "shadow-blue-500/25",   title: "إدارة الموظفين",         desc: "إضافة وتعديل وإدارة مصورين ومونتيرين وكامل فريق الإنتاج." },
  { icon: Fingerprint,  grad: "from-violet-500 to-purple-400", shadow: "shadow-violet-500/25", title: "الحضور والانصراف",     desc: "تتبع حضور الموظفين لحظة بلحظة بتقنية QR." },
  { icon: DollarSign,   grad: "from-emerald-500 to-teal-400",  shadow: "shadow-emerald-500/25",title: "إدارة الرواتب",         desc: "احتساب الرواتب والخصومات والمكافآت تلقائياً." },
  { icon: Calendar,     grad: "from-rose-500 to-pink-400",     shadow: "shadow-rose-500/25",   title: "جدولة الجلسات",        desc: "تخطيط جلسات التصوير ومواعيد العملاء بدقة." },
  { icon: Film,         grad: "from-amber-500 to-yellow-400",  shadow: "shadow-amber-500/25",  title: "مشاريع الإنتاج",       desc: "إدارة مشاريع الإعلانات من الفكرة حتى التسليم." },
  { icon: Video,        grad: "from-orange-500 to-amber-400",  shadow: "shadow-orange-500/25", title: "المونتاج والتسليم",    desc: "متابعة مراحل المونتاج وتسليم الأعمال في الموعد." },
  { icon: BarChart3,    grad: "from-sky-500 to-blue-400",      shadow: "shadow-sky-500/25",    title: "التقارير",              desc: "تقارير تفصيلية قابلة للتصدير PDF وExcel." },
  { icon: Target,       grad: "from-slate-500 to-slate-400",   shadow: "shadow-slate-500/25",  title: "المهام",                desc: "إسناد المهام لكل فرد وتتبع التنفيذ وتقييم الأداء." },
  { icon: BrainCircuit, grad: "from-indigo-500 to-violet-400", shadow: "shadow-indigo-500/25", title: "الذكاء الاصطناعي",     desc: "مساعد ذكي يحلل بيانات مشاريعك ويقترح تحسينات." },
  { icon: Bell,         grad: "from-pink-500 to-rose-400",     shadow: "shadow-pink-500/25",   title: "الإشعارات",             desc: "تنبيهات فورية للمواعيد والمهام والأحداث المهمة." },
  { icon: FolderOpen,   grad: "from-cyan-500 to-teal-400",     shadow: "shadow-cyan-500/25",   title: "ملفات الإنتاج",        desc: "رفع وإدارة عقود العملاء وأصول ومواد الإنتاج." },
  { icon: Briefcase,    grad: "from-lime-500 to-green-400",    shadow: "shadow-lime-500/25",   title: "العملاء والميزانية",   desc: "إدارة ملفات العملاء وميزانيات المشاريع الإعلانية." },
];

/* ── system concepts floating around logo ── */
const concepts = [
  { icon: Camera,      label: "التصوير",    color: "text-blue-300",    bg: "bg-blue-500/25 border-blue-400/40" },
  { icon: Film,        label: "المونتاج",   color: "text-violet-300",  bg: "bg-violet-500/25 border-violet-400/40" },
  { icon: DollarSign,  label: "الرواتب",    color: "text-emerald-300", bg: "bg-emerald-500/25 border-emerald-400/40" },
  { icon: BarChart3,   label: "التقارير",   color: "text-amber-300",   bg: "bg-amber-500/25 border-amber-400/40" },
  { icon: BrainCircuit,label: "الذكاء",     color: "text-indigo-300",  bg: "bg-indigo-500/25 border-indigo-400/40" },
  { icon: Calendar,    label: "الجلسات",    color: "text-cyan-300",    bg: "bg-cyan-500/25 border-cyan-400/40" },
  { icon: Target,      label: "المهام",     color: "text-orange-300",  bg: "bg-orange-500/25 border-orange-400/40" },
  { icon: Shield,      label: "الأمان",     color: "text-rose-300",    bg: "bg-rose-500/25 border-rose-400/40" },
];

/* ── manager capabilities ── */
const managerCaps = [
  { icon: Camera,      grad: "from-blue-500 to-cyan-500",      title: "إدارة الموظفين",           items: ["إضافة مصور/مونتير", "تعديل البيانات", "تحديد القسم", "إيقاف/تفعيل الحساب"] },
  { icon: Fingerprint, grad: "from-violet-500 to-purple-500",  title: "الحضور والانصراف",       items: ["متابعة لحظة بلحظة", "المتأخرين والغائبين", "تصدير التقارير", "QR ذكي"] },
  { icon: DollarSign,  grad: "from-emerald-500 to-teal-500",   title: "الرواتب والمالية",        items: ["احتساب الرواتب", "الخصومات والمكافآت", "كشف الرواتب", "السلف والقروض"] },
  { icon: Calendar,    grad: "from-rose-500 to-pink-500",      title: "جدولة الجلسات",          items: ["إنشاء موعد تصوير", "تحديد الموظفين المطلوب", "تنبيه الفريق", "جدول الأسبوع"] },
  { icon: Film,        grad: "from-amber-500 to-yellow-500",   title: "مشاريع الإنتاج",         items: ["إنشاء مشروع إعلاني", "تحديد الميزانية", "توزيع المهام", "متابعة التسليم"] },
  { icon: BrainCircuit,grad: "from-indigo-500 to-violet-500",  title: "الذكاء الاصطناعي",       items: ["تحليل أداء الفريق", "اقتراح تحسينات", "تلخيص التقارير", "مساعد ذكي"] },
  { icon: Target,      grad: "from-orange-500 to-amber-500",   title: "إدارة المهام",            items: ["إنشاء مهمة", "تحديد الأولوية", "متابعة التنفيذ", "تقييم الإنجاز"] },
  { icon: Building2,   grad: "from-sky-500 to-blue-500",       title: "الأقسام والفروع",  items: ["إنشاء قسم", "إدارة الفروع", "نقل الموظفين", "تقارير القسم"] },
];

/* ── employee capabilities ── */
const employeeCaps = [
  { icon: UserCheck,   grad: "from-blue-500 to-cyan-500",      title: "ملفي الشخصي",          items: ["تعديل البيانات", "رفع المستندات", "صورة شخصية", "معلومات العقد"] },
  { icon: Fingerprint, grad: "from-violet-500 to-purple-500",  title: "الحضور",               items: ["مسح QR", "سجل الحضور", "ساعات العمل", "تقرير الشهر"] },
  { icon: DollarSign,  grad: "from-emerald-500 to-teal-500",   title: "الراتب",               items: ["عرض الراتب", "الخصومات", "المكافآت", "كشف الرواتب"] },
  { icon: Calendar,    grad: "from-rose-500 to-pink-500",      title: "جلساتي",               items: ["جلسات التصوير القادمة", "المواعيد المحددة", "تأكيد الحضور", "تقويم الفريق"] },
  { icon: Target,      grad: "from-orange-500 to-amber-500",   title: "مهامي",                items: ["عرض مهامي", "تنفيذ المهمة", "رفع ملفات", "تقرير الإنجاز"] },
  { icon: Bot,         grad: "from-indigo-500 to-violet-500",  title: "المساعد الذكي",        items: ["طرح أسئلة", "بحث في النظام", "مساعدة فورية", "تحليل بياناتي"] },
  { icon: Bell,        grad: "from-pink-500 to-rose-500",      title: "الإشعارات",            items: ["تنبيهات فورية", "رسائل الإدارة", "تحديثات المهام", "مواعيد الجلسات"] },
  { icon: MessageSquare,grad:"from-cyan-500 to-teal-500",      title: "التواصل",              items: ["شات الفريق", "التواصل مع المدير", "مشاركة الملفات", "مجموعات الإنتاج"] },
];

/* ── how it works ── */
const steps = [
  { n: "01", icon: Building2,   title: "أنشئ شركة الإنتاج",           desc: "سجّل بيانات شركتك وأنشئ حساب إدارتك في أقل من دقيقة." },
  { n: "02", icon: GitBranch,   title: "أضف الأقسام والفروع",   desc: "هيكّل شركتك بإنشاء الأقسام والفروع المناسبة لنشاطك." },
  { n: "03", icon: Users,       title: "أضف الموظفين",                   desc: "أضف مصوريك ومونتيريك وكامل فريق الإنتاج وحدد صلاحياتهم." },
  { n: "04", icon: Calendar,    title: "جدوِل الجلسات",                desc: "خطط لجلسات التصوير والمشاريع الإعلانية وأرسل تنبيهات للفريق." },
  { n: "05", icon: Activity,    title: "تابع الإنتاج",                 desc: "راقب تقدم المشاريع والمهام والتسليمات في الوقت الفعلي." },
  { n: "06", icon: DollarSign,  title: "أدر الرواتب والتكاليف",       desc: "احسب الرواتب وتكاليف المشاريع والميزانيات تلقائياً." },
];

/* ── why itqan ── */
const whyItems = [
  { icon: Shield,         grad: "from-blue-500 to-cyan-400",     label: "آمن وموثوق",      desc: "تشفير بأعلى المعايير." },
  { icon: HeadphonesIcon, grad: "from-emerald-500 to-teal-400",  label: "دعم متكامل",      desc: "فريق دعم دائماً جاهز." },
  { icon: Zap,            grad: "from-amber-500 to-yellow-400",  label: "سهولة الاستخدام", desc: "واجهة يفهمها الجميع." },
  { icon: PieChart,       grad: "from-violet-500 to-purple-400", label: "تقارير دقيقة",    desc: "بيانات حقيقية لقرارات صحيحة." },
  { icon: CloudUpload,    grad: "from-rose-500 to-pink-400",     label: "تحديثات مستمرة",  desc: "تطوير مستمر بلا رسوم." },
];

/* ── plans — real prices from backend ── */
const plans = [
  {
    id: "sub_weekly", name: "أسبوعي", badge: null, highlight: false,
    price: "150", per: "ج.م / 7 أيام", label: "للبداية والتجربة",
    accent: "from-sky-500 to-cyan-500", shadow: "shadow-sky-500/20",
    features: [
      "+10 حسابات موظفين",
      "+1 جيجابايت مساحة",
      "إدارة الحضور بـ QR",
      "التقارير الأساسية",
      "المساعد الذكي",
      "دعم فني",
    ],
  },
  {
    id: "sub_monthly", name: "شهري", badge: "⭐ الأكثر طلباً", highlight: true,
    price: "500", per: "ج.م / 30 يوم", label: "للشركات المتنامية",
    accent: "from-violet-600 to-blue-600", shadow: "shadow-violet-500/40",
    features: [
      "+30 حساب موظف",
      "+5 جيجابايت مساحة",
      "جميع ميزات الانطلاق",
      "تحليلات أداء متقدمة",
      "مساعد ذكي GPT-4o",
      "نسخ احتياطي تلقائي",
      "أولوية في الدعم",
    ],
  },
  {
    id: "sub_quarterly", name: "ربع سنوي", badge: "وفّر 20%", highlight: false,
    price: "1,200", per: "ج.م / 90 يوم", label: "للشركات الراسخة",
    accent: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20",
    features: [
      "+60 حساب موظف",
      "+10 جيجابايت مساحة",
      "جميع ميزات الاحتراف",
      "تقارير ربع سنوية تلقائية",
      "نسخ احتياطي يومي",
      "دعم مباشر مخصص",
    ],
  },
  {
    id: "sub_yearly", name: "سنوي", badge: "الأفضل قيمة", highlight: false,
    price: "3,000", per: "ج.م / سنة كاملة", label: "للمؤسسات الكبرى",
    accent: "from-rose-500 to-pink-500", shadow: "shadow-rose-500/20",
    features: [
      "+200 حساب موظف",
      "+50 جيجابايت مساحة",
      "جميع الميزات بلا قيود",
      "يعادل 6 أشهر مجاناً",
      "تقارير شهرية تلقائية",
      "شارة PREMIUM ذهبية",
      "دعم VIP حصري",
    ],
  },
  {
    id: "sub_eternal", name: "مدى الحياة", badge: "مرة واحدة للأبد ✦", highlight: false,
    price: "9,999", per: "ج.م · دفعة واحدة", label: "حساب مدى الحياة",
    accent: "from-fuchsia-500 via-violet-500 to-indigo-500", shadow: "shadow-fuchsia-500/30",
    features: [
      "+999 حساب موظف",
      "+200 جيجابايت مساحة",
      "جميع الميزات إلى الأبد",
      "تحديثات مجانية دائماً",
      "مدير حساب شخصي مخصص",
      "أولوية قصوى في الدعم",
      "شارة مدى الحياة حصرية",
    ],
  },
];

/* ── faqs ── */
const faqs = [
  { q: "ما هو نظام إتقان لشركات الإنتاج؟",
    a: "إتقان منصة متكاملة لإدارة شركات التصوير والإنتاج الإعلاني — تشمل إدارة الموظفين، الحضور بـ QR، الرواتب، جدولة الجلسات، مشاريع الإعلانات، التقارير، والمساعد الذكي. كل شيء في مكان واحد." },
  { q: "هل يمكن جدولة جلسات التصوير ومشاريع الإعلانات؟",
    a: "نعم، يمكنك إنشاء جلسات تصوير وتحديد الموظفين المطلوب وإرسال تنبيهات تلقائية لكل أعضاء الفريق قبل الموعد." },
  { q: "كيف يسجّل الموظفين حضوره في موقع التصوير؟",
    a: "يمسح أي عضو في الفريق رمز QR الخاص بالفرع أو موقع العمل من هاتفه لتسجيل حضوره وانصرافه فوراً مع التوقيت والموقع." },
  { q: "هل يمكن إدارة مشاريع إعلانية متعددة في نفس الوقت؟",
    a: "نعم، يمكنك إنشاء مشاريع منفصلة لكل إعلان أو عميل مع توزيع المهام وتحديد الميزانية وتتبع مراحل الإنتاج حتى التسليم." },
  { q: "هل التقارير يمكن تصديرها؟",
    a: "نعم، يمكن تصدير جميع التقارير (حضور، رواتب، إنتاج، أداء) بصيغة PDF أو Excel بضغطة زر واحدة." },
  { q: "كيف يعمل المساعد الذكي لشركة الإنتاج؟",
    a: "مساعد ذكي مدمج يفهم العربية ويساعدك في تحليل أداء فريق الإنتاج، متابعة المشاريع، واقتراح تحسينات تناسب طبيعة عمل شركتك الإعلانية." },
  { q: "هل بياناتي وبيانات عملائي آمنة؟",
    a: "نعم، نستخدم أعلى معايير التشفير والحماية. بياناتك وبيانات عملائك ملكك تماماً ولا يصل إليها أحد." },
  { q: "هل يمكن تجربة النظام قبل الاشتراك؟",
    a: "تواصل معنا للحصول على عرض تجريبي مجاني مع شرح كامل للنظام وإجابة عن كل أسئلتك." },
];

function FaqItem({ f, i }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: i * 0.04 }}
      className={`rounded-3xl border transition-all duration-300 ${open ? "border-blue-500/30 bg-blue-500/5" : "border-white/8 bg-white/3 hover:border-white/15"}`}
    >
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-right gap-4">
        <span className="font-bold text-white text-sm sm:text-base">{f.q}</span>
        <ChevronDown className={`h-5 w-5 text-blue-400 transition-transform duration-300 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-white/60 leading-loose border-t border-white/6 pt-4">
          {f.a}
        </div>
      )}
    </motion.div>
  );
}

/* ── Gradient icon box ── */
function GradIcon({ icon: Icon, grad, size = "md", shadow = "" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-2xl" : size === "sm" ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl";
  const ico = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4.5 w-4.5" : "h-6 w-6";
  return (
    <span className={`flex ${box} items-center justify-center bg-gradient-to-br ${grad} ${shadow} shadow-lg shrink-0`}>
      <Icon className={`${ico} text-white`} />
    </span>
  );
}

/* ── Logo concept showcase (hero left side) ── */
function LogoShowcase() {
  const [logoError, setLogoError] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="relative flex items-center justify-center"
    >
      {/* Very subtle ambient — no bright white */}
      <div className="absolute -inset-16 rounded-full bg-violet-700/8 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Main card — dark, no bright borders */}
        <div className="relative rounded-3xl border border-violet-500/18 bg-[#070b1c] p-8 text-center overflow-hidden">
          {/* Thin violet top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          {/* Logo with float */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex justify-center mb-5"
          >
            <div className="relative">
              {/* Soft glow under logo only */}
              <div className="absolute inset-0 rounded-full bg-violet-600/18 blur-2xl scale-150" />
              <img
                src={logoError ? LOGO_FALLBACK : LOGO_IMG}
                alt="إتقان"
                onError={() => setLogoError(true)}
                className="relative h-28 w-28 object-contain"
              />
            </div>
          </motion.div>

          {/* Name + tagline */}
          <h3 className="font-display text-2xl font-black text-white tracking-tight mb-1">إتقان</h3>
          <p className="text-xs text-violet-400/70 font-medium mb-7">نظام إدارة الإنتاج الإعلاني الذكي</p>

          {/* Concept chips — single flex-wrap row */}
          <div className="flex flex-wrap justify-center gap-2">
            {concepts.map((c, i) => (
              <motion.span
                key={c.label}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className={`flex items-center gap-1.5 rounded-xl border ${c.bg} px-3 py-1.5 text-xs font-semibold ${c.color}`}
              >
                <c.icon className="h-3 w-3 shrink-0" /> {c.label}
              </motion.span>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-7 grid grid-cols-3 gap-3 border-t border-white/5 pt-6">
            {[
              { n: "٣٠+",  l: "ميزة",  c: "text-blue-400"    },
              { n: "٢٤/٧", l: "دعم",   c: "text-violet-400"  },
              { n: "١٠٠%", l: "أمان",  c: "text-emerald-400" },
            ].map(({ n, l, c }) => (
              <div key={l}>
                <p className={`font-display text-xl font-black ${c}`}>{n}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          {/* Thin bottom accent */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const { isEditMode, openPrompt } = useEditMode();
  const clicksRef = useRef(0);
  const clickTimerRef = useRef(null);
  const [activeRole, setActiveRole] = useState("manager");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const bgEl = document.getElementById("itqan-bg-overlay");
    if (bgEl) bgEl.style.backgroundImage = "";
  }, []);

  const handleLogoClick = () => {
    clicksRef.current += 1;
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => { clicksRef.current = 0; }, 2000);
    if (clicksRef.current >= 5) { clicksRef.current = 0; openPrompt(); }
  };

  const roleCaps = activeRole === "manager" ? managerCaps : employeeCaps;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070b17] text-white" dir="rtl">
      <VoidParticles />

      {/* ══ NAV ══ */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#070b17]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-10">
          <div className="flex cursor-pointer items-center gap-2.5 select-none" onClick={handleLogoClick}>
            <img
              src={logoError ? LOGO_FALLBACK : LOGO_IMG}
              alt="إتقان"
              onError={() => setLogoError(true)}
              className="h-9 w-9 rounded-xl object-contain border border-white/10 bg-[#0d1235] p-0.5"
            />
            <div>
              <span className="font-display text-xl font-black tracking-tight text-white">إتقان</span>
              <p className="text-[9px] text-violet-400/80 leading-none">نظام إنتاج وإعلانات</p>
            </div>
          </div>

          <nav className="hidden items-center gap-5 lg:flex">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href}
                className="text-sm text-white/55 hover:text-white transition-colors font-medium hover:text-violet-300">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login"
              className="hidden sm:flex items-center gap-1.5 rounded-2xl border border-white/12 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/6 transition">
              <Users className="h-4 w-4" /> تسجيل الدخول
            </Link>
            <Link to="/login"
              className="rounded-2xl gradient-primary px-5 py-2 text-sm font-bold text-white void-glow hover:opacity-90 transition">
              ابدأ الآن ←
            </Link>
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-10 lg:grid-cols-2 lg:py-20">
        {/* Text */}
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300 mb-5">
            <Sparkles className="h-3 w-3 text-violet-400" />
            نظام متكامل لشركات التصوير والإنتاج الإعلاني
          </span>

          <h1 className="font-display leading-[1.25] tracking-tight">
            <span className="block text-4xl font-black text-white sm:text-5xl lg:text-6xl">
              <T eid="hero_title_1" as="span" />
            </span>
            <span className="block text-4xl font-black sm:text-5xl lg:text-6xl mt-4">
              <span className="bg-gradient-to-l from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                <T eid="hero_title_2" as="span" />
              </span>
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg">
            <T eid="hero_desc" as="span" multiline />
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-blue-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-500/30 hover:opacity-90 transition">
              <Rocket className="h-5 w-5" /> إبدأ الآن
            </Link>
            <a href="#system"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/4 px-7 py-3.5 text-base font-bold text-white/80 hover:bg-white/8 transition">
              تعرف على النظام <ArrowLeft className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            {[
              { icon: Shield, label: "آمن وموثوق" },
              { icon: HeadphonesIcon, label: "دعم 24/7" },
              { icon: Zap, label: "تحديثات مستمرة" },
            ].map((b) => (
              <span key={b.label} className="flex items-center gap-2 text-sm text-white/45">
                <b.icon className="h-4 w-4 text-violet-400" /> {b.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Logo showcase */}
        <LogoShowcase />
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/8 px-4 py-1.5 text-xs font-semibold text-violet-300 mb-4">
            <Star className="h-3 w-3 fill-violet-400 text-violet-400" /> كل ما تحتاجه
          </span>
          <h2 className="font-display text-3xl font-black text-white sm:text-5xl">
            <T eid="features_title" as="span" />
          </h2>
          <p className="mt-3 text-white/45 text-sm sm:text-base max-w-xl mx-auto">
            <T eid="features_sub" as="span" />
          </p>
          <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-l from-violet-500 to-blue-500" />
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group rounded-3xl border border-white/8 bg-white/3 p-5 hover:border-white/15 hover:bg-white/5 transition-all hover:shadow-xl hover:shadow-black/20"
            >
              <GradIcon icon={f.icon} grad={f.grad} shadow={f.shadow} />
              <h3 className="mt-4 font-display text-base font-bold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ SYSTEM OVERVIEW ══ */}
      <section id="system" className="mx-auto max-w-7xl px-5 py-16 sm:px-10">
        <div className="rounded-[2rem] border border-white/8 bg-gradient-to-br from-[#0d1235]/80 to-[#080f24]/80 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="p-8 sm:p-12 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/8 px-4 py-1.5 text-xs font-semibold text-violet-300 mb-5 w-fit">
                <Layers className="h-3 w-3" /> لوحة التحكم
              </span>
              <h2 className="font-display text-3xl font-black text-white sm:text-4xl leading-tight">
                كل بيانات الإنتاج<br />
                <span className="bg-gradient-to-l from-violet-400 to-blue-400 bg-clip-text text-transparent">في مكان واحد</span>
              </h2>
              <p className="mt-4 text-white/55 leading-relaxed text-sm sm:text-base">
                لوحة تحكم ذكية تعرض لك أهم مؤشرات شركة التصوير والإنتاج — من حضور الموظفين وجلسات التصوير القادمة إلى تقدم المشاريع الإعلانية.
              </p>
              <ul className="mt-6 space-y-3">
                {["مؤشرات الموظفين والجلسات في لمحة واحدة", "رسوم بيانية لحضور الفريق وتقدم المشاريع", "تنبيهات فورية بمواعيد التصوير والتسليم", "وصول سريع لأكثر الصفحات استخداماً"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/65">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/login"
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:opacity-90 transition w-fit">
                ابدأ مجاناً <ArrowLeft className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="p-6 sm:p-8 flex items-center justify-center bg-black/20">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-full max-w-sm">
                <div className="relative rounded-2xl border border-white/10 bg-[#0a0f22] shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-white/6 bg-black/40 px-3 py-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                      <div className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                      <div className="h-2 w-2 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex-1 text-center text-[9px] text-white/30">لوحة التحكم</div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { n: "28", l: "عضو كادر",    c: "from-blue-500 to-cyan-500" },
                        { n: "96%", l: "الحضور",     c: "from-violet-500 to-purple-500" },
                        { n: "5",  l: "مشروع نشط",  c: "from-amber-500 to-yellow-500" },
                      ].map(({ n, l, c }) => (
                        <div key={l} className="rounded-xl border border-white/6 bg-white/3 p-2 text-center">
                          <p className={`font-black text-sm bg-gradient-to-br ${c} bg-clip-text text-transparent`}>{n}</p>
                          <p className="text-[7px] text-white/30 mt-0.5 leading-tight">{l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/3 p-2.5">
                      <p className="text-[8px] text-white/40 mb-2 text-right font-bold">نشاط الأسبوع</p>
                      <div className="flex items-end gap-1 h-12">
                        {[40,65,50,80,60,90,75].map((h, i) => (
                          <motion.div key={i}
                            initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                            style={{ height: `${h}%`, originY: 1 }}
                            className={`flex-1 rounded-sm ${i === 5 ? "bg-gradient-to-t from-violet-500 to-blue-400" : "bg-violet-500/20"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {[
                        { n: "أحمد محمد", s: "حاضر",  sc: "from-emerald-500 to-teal-500" },
                        { n: "سارة أحمد", s: "متأخر", sc: "from-amber-500 to-yellow-500" },
                      ].map(({ n, s, sc }) => (
                        <div key={n} className="flex items-center justify-between rounded-xl bg-white/3 px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${sc} flex items-center justify-center`}>
                              <span className="text-[7px] font-black text-white">{n[0]}</span>
                            </div>
                            <p className="text-[7px] font-bold text-white/65">{n}</p>
                          </div>
                          <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-br ${sc} text-white`}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ MANAGER & EMPLOYEE ROLES ══ */}
      <section id="roles" className="mx-auto max-w-7xl px-5 py-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-10 text-center">
          <h2 className="font-display text-3xl font-black text-white sm:text-5xl">صلاحيات المدير والموظف</h2>
          <p className="mt-3 text-white/45 text-sm sm:text-base">كل دور له مكانه وصلاحياته داخل النظام</p>
          <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-l from-violet-500 to-blue-500" />
        </motion.div>

        {/* Role tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex rounded-2xl border border-white/10 bg-white/4 p-1 gap-1">
            <button
              onClick={() => setActiveRole("manager")}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                activeRole === "manager"
                  ? "bg-gradient-to-l from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <UserCog className="h-4 w-4" /> المدير
            </button>
            <button
              onClick={() => setActiveRole("employee")}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                activeRole === "employee"
                  ? "bg-gradient-to-l from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/25"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" /> الموظف
            </button>
          </div>
        </div>

        {/* Role description */}
        <div className="mb-8 rounded-3xl border border-white/8 bg-white/3 p-6 text-center">
          {activeRole === "manager" ? (
            <p className="text-white/65 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              <span className="font-bold text-white">المدير</span> يملك صلاحيات كاملة لإدارة شركته — من إضافة الموظفين وتنظيم الأقسام والفروع، إلى جدولة الجلسات وإدارة المشاريع والرواتب واستخراج التقارير.
            </p>
          ) : (
            <p className="text-white/65 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              <span className="font-bold text-white">عضو الموظفين</span> يملك لوحة خاصة به يستطيع من خلالها تسجيل حضوره بـ QR، متابعة جلسات التصوير القادمة، تنفيذ مهامه، ومتابعة راتبه والتواصل مع فريق الإنتاج.
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {roleCaps.map((cap, i) => (
              <motion.div key={cap.title}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-white/8 bg-white/3 p-5 hover:border-white/15 transition-all group"
              >
                <GradIcon icon={cap.icon} grad={cap.grad} />
                <h3 className="mt-4 font-display text-sm font-bold text-white">{cap.title}</h3>
                <ul className="mt-3 space-y-1.5">
                  {cap.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-white/55">
                      <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${cap.grad} shrink-0`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-12 text-center">
          <h2 className="font-display text-3xl font-black text-white sm:text-5xl">
            <T eid="how_title" as="span" />
          </h2>
          <p className="mt-3 text-white/45 text-sm sm:text-base">ابدأ في دقائق وأدر شركة الإنتاج باحتراف</p>
          <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-l from-violet-500 to-blue-500" />
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative rounded-3xl border border-white/8 bg-white/3 p-6 hover:border-violet-500/25 hover:bg-violet-500/4 transition-all"
            >
              <div className="flex items-start gap-4">
                <span className="font-display text-3xl font-black text-violet-500/30 group-hover:text-violet-400/50 transition shrink-0">
                  {s.n}
                </span>
                <div className="flex-1">
                  <GradIcon icon={s.icon} grad="from-violet-500 to-blue-500" />
                  <h3 className="mt-3 font-display text-base font-bold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ WHY ITQAN ══ */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-10 text-center">
          <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
            <T eid="why_title" as="span" />
          </h2>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {whyItems.map((w, i) => (
            <motion.div key={w.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="flex flex-col items-center gap-3 rounded-3xl border border-white/8 bg-white/3 p-5 text-center hover:border-white/15 transition-all group"
            >
              <GradIcon icon={w.icon} grad={w.grad} size="lg" />
              <p className="font-bold text-white text-sm">{w.label}</p>
              <p className="text-xs text-white/45 leading-relaxed">{w.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/8 px-4 py-1.5 text-xs font-semibold text-violet-300 mb-4">
            <Crown className="h-3 w-3" /> باقات حقيقية تُفعَّل داخل النظام
          </span>
          <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
            <T eid="pricing_title" as="span" />
          </h2>
          <p className="mt-3 text-white/45 text-sm sm:text-base"><T eid="pricing_sub" as="span" /></p>
          <p className="mt-2 text-xs text-white/30">
            تُفعَّل بمفتاح سري من داخل المنصة · للتواصل والشراء: <span className="text-violet-400 font-bold">01012930571</span>
          </p>
        </motion.div>

        {/* Top 3 plans grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-5">
          {plans.slice(0, 3).map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`relative rounded-3xl border p-7 transition-all overflow-hidden ${
                p.highlight
                  ? `bg-gradient-to-br ${p.accent} border-transparent shadow-2xl ${p.shadow} scale-[1.03]`
                  : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
              }`}
            >
              {/* accent top bar */}
              {!p.highlight && (
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.accent} rounded-t-3xl opacity-70`} />
              )}
              {p.badge && (
                <span className={`absolute -top-3 right-5 rounded-full px-3 py-1 text-xs font-black shadow-lg ${
                  p.highlight ? "bg-white text-violet-700" : `bg-gradient-to-r ${p.accent} text-white`
                }`}>
                  {p.badge}
                </span>
              )}
              <p className="text-lg font-black text-white mb-0.5">{p.name}</p>
              <p className="text-xs text-white/40 mb-5">{p.label}</p>
              <div className="flex items-baseline gap-1.5 mb-6">
                <p className="font-display text-5xl font-black text-white leading-none">{p.price}</p>
                <p className="text-sm text-white/50 self-end pb-1">{p.per}</p>
              </div>
              <ul className="space-y-2.5 mb-7">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 bg-gradient-to-br ${p.accent} shadow-sm`}>
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/login"
                className={`block rounded-2xl py-3 text-center text-sm font-bold transition ${
                  p.highlight
                    ? "bg-white/20 text-white hover:bg-white/30 border border-white/20"
                    : `bg-gradient-to-r ${p.accent} text-white hover:opacity-90 shadow-lg ${p.shadow}`
                }`}>
                ابدأ الآن
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom 2 plans — wider cards */}
        <div className="grid gap-5 sm:grid-cols-2">
          {plans.slice(3).map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.25 + i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="relative rounded-3xl border border-white/8 bg-white/3 hover:border-white/15 p-7 transition-all overflow-hidden group"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.accent} rounded-t-3xl`} />
              {p.badge && (
                <span className={`absolute top-5 left-6 rounded-full bg-gradient-to-r ${p.accent} px-3 py-1 text-xs font-black text-white shadow-md`}>
                  {p.badge}
                </span>
              )}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xl font-black text-white">{p.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{p.label}</p>
                  <div className="flex items-baseline gap-1.5 mt-3">
                    <p className="font-display text-4xl font-black text-white">{p.price}</p>
                    <p className="text-sm text-white/40 self-end pb-0.5">{p.per}</p>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1 min-w-[200px]">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white/65">
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full shrink-0 bg-gradient-to-br ${p.accent}`}>
                        <Check className="h-2 w-2 text-white" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/login"
                className={`mt-6 block rounded-2xl py-3 text-center text-sm font-bold bg-gradient-to-r ${p.accent} text-white hover:opacity-90 transition shadow-lg ${p.shadow}`}>
                اختر {p.name}
              </Link>
            </motion.div>
          ))}
        </div>

      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-10 text-center">
          <h2 className="font-display text-3xl font-black text-white sm:text-4xl">الأسئلة الشائعة</h2>
          <p className="mt-3 text-white/45 text-sm">كل ما تريد معرفته عن نظام إتقان</p>
        </motion.div>
        <div className="space-y-3">
          {faqs.map((f, i) => <FaqItem key={i} f={f} i={i} />)}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section id="contact" className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-violet-900/35 to-blue-900/35 p-10 text-center">
          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-violet-600/10 to-blue-600/10 blur-xl" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300 mb-5">
              <Sparkles className="h-3 w-3" /> ابدأ مجاناً
            </span>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl"><T eid="cta_title" as="span" /></h2>
            <p className="mx-auto mt-3 max-w-xl text-white/55 text-sm sm:text-base"><T eid="cta_sub" as="span" /></p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-violet-500/30 hover:opacity-90 transition">
                <Rocket className="h-5 w-5" /> ابدأ الآن
              </Link>
              <a href="tel:01012930571"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/4 px-6 py-4 text-sm font-bold text-white/65 hover:bg-white/8 transition">
                <Phone className="h-5 w-5" /> تواصل معنا
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-white/8 bg-[#070b17]/95">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={logoError ? LOGO_FALLBACK : LOGO_IMG} alt="إتقان" onError={() => setLogoError(true)}
                className="h-10 w-10 rounded-xl object-contain border border-white/10 bg-[#0d1235] p-0.5 cursor-pointer" onClick={handleLogoClick} />
              <div>
                <span className="font-display text-lg font-black text-white">إتقان</span>
                <p className="text-xs text-white/35">نظام إدارة الإنتاج الإعلاني الذكي</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[{ Icon: Instagram }, { Icon: Twitter }, { Icon: Linkedin }, { Icon: Facebook }].map(({ Icon }, idx) => (
                <a key={idx} href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/3 text-white/45 hover:text-white hover:border-white/20 transition">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div className="mt-8 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/25">
            <T eid="footer_text" as="p" />
            <T eid="footer_contact" as="p" />
          </div>
          {!isEditMode && (
            <button onClick={openPrompt} className="mt-3 block mx-auto text-[10px] text-white/8 hover:text-white/25 transition">⚙</button>
          )}
        </div>
      </footer>
    </div>
  );
}
