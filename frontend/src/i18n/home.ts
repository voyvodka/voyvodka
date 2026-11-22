export type Locale = "en" | "tr";

export function localeFromPath(pathname: string): Locale {
  return pathname === "/tr" ? "tr" : "en";
}

type Copy = {
  intlLocale: string;
  skipLink: string;
  loading: string;
  portfolio: string;
  nav: { projects: string; cases: string; timeline: string; contact: string; navLabel: string };
  switchLang: { href: string; label: string; aria: string; hrefLang: Locale };
  heroTagline: string;
  heroText: string;
  openProjectLogs: string;
  openGithub: string;
  openLinkedin: string;
  kpi: { owned: string; mergedPrs: string; followers: string; lastPush: string };
  activity: { title: string; sub: string; unavailable: string };
  gauge: { active: string; owned: string; core: string; topLang: string; outOf: (a: number, b: number) => string };
  contrib: { title: string; none: (date: string) => string; some: (count: number, date: string) => string };
  feed: {
    titleAfterGithub: string;
    sub: string;
    unavailable: string;
    latestRepos: string;
    viewAll: string;
    viewAllAria: string;
    recentEvents: string;
    profile: string;
    profileAria: string;
    repoCountAria: (lang: string) => string;
    repoCount: (count: number) => string;
    viewDetails: (repo: string) => string;
    viewOnGithub: (repo: string) => string;
  };
  noDescriptionProvided: string;
  noDescription: string;
  forkContribution: string;
  ownedProject: string;
  stars: string;
  unknown: string;
  projectsHeader: { project: string; purpose: string; stack: string; status: string };
  projectsUnavailable: string;
  purposeFork: string;
  purposeOwned: string;
  viewAllRepos: (count: number) => string;
  cases: {
    title: string;
    sub: string;
    stack: string;
    context: string;
    approach: string;
    status: string;
    unavailableTitle: string;
    unavailableBody: string;
    emptyTitle: string;
    emptyBody: string;
    contextFallback: string;
    multiLanguage: string;
  };
  approach: {
    csharp: string;
    rust: string;
    go: string;
    swift: string;
    typescript: string;
    other: (language: string) => string;
  };
  timeline: { title: string; sub: string; unavailable: string; fallback: string };
  stack: { title: string; sub: string; primary: string; data: string; web: string; shipped: string; agents: string; deployOps: string };
  notes: { title: string; sub: string; items: { title: string; body: string }[] };
  contact: { title: string; body: string };
  ago: (hours: number, days: number) => string;
  event: (type: string) => string;
};

const EN_EVENT = (type: string) => type.replace("Event", " event");

const TR_EVENTS: Record<string, string> = {
  PushEvent: "Push",
  PullRequestEvent: "Pull request",
  PullRequestReviewEvent: "PR incelemesi",
  PullRequestReviewCommentEvent: "PR yorumu",
  IssuesEvent: "Issue",
  IssueCommentEvent: "Issue yorumu",
  CreateEvent: "Oluşturuldu",
  DeleteEvent: "Silindi",
  ReleaseEvent: "Yeni sürüm",
  ForkEvent: "Fork",
  WatchEvent: "Yıldızlandı",
  PublicEvent: "Herkese açıldı",
};

export const homeCopy: Record<Locale, Copy> = {
  en: {
    intlLocale: "en-US",
    skipLink: "Skip to main content",
    loading: "Loading dashboard...",
    portfolio: "Portfolio",
    nav: { projects: "Projects", cases: "Case Files", timeline: "Timeline", contact: "Contact", navLabel: "Main Navigation" },
    switchLang: { href: "/tr", label: "TR", aria: "Türkçe sürüm", hrefLang: "tr" },
    heroTagline: "Build systems like a control room.",
    heroText:
      "Software developer from Turkey. I build backends with .NET and ship products with AI coding agents. This console reflects active projects, contributions, and build history.",
    openProjectLogs: "Open Project Logs",
    openGithub: "Open GitHub profile",
    openLinkedin: "Open LinkedIn profile",
    kpi: { owned: "owned repositories", mergedPrs: "merged prs", followers: "github followers", lastPush: "last push age" },
    activity: { title: "Activity Signals", sub: "Computed from GitHub data", unavailable: "Activity data unavailable." },
    gauge: {
      active: "Active this quarter",
      owned: "Owned ratio",
      core: "Core focus",
      topLang: "Top lang",
      outOf: (a, b) => `${a} out of ${b}`,
    },
    contrib: {
      title: "Contribution activity",
      none: (date) => `No contributions · ${date}`,
      some: (count, date) => `${count} contribution${count !== 1 ? "s" : ""} · ${date}`,
    },
    feed: {
      titleAfterGithub: "Live Feed",
      sub: "Public API synchronized",
      unavailable: "Live feed unavailable — backend unreachable.",
      latestRepos: "Latest repositories",
      viewAll: "view all",
      viewAllAria: "view all: latest repositories",
      recentEvents: "Recent activity events",
      profile: "profile",
      profileAria: "profile: View on GitHub",
      repoCountAria: (lang) => `${lang} repository count`,
      repoCount: (count) => `${count} repositories`,
      viewDetails: (repo) => `View details for ${repo}`,
      viewOnGithub: (repo) => `View ${repo} on GitHub`,
    },
    noDescriptionProvided: "No description provided.",
    noDescription: "No description",
    forkContribution: "FORK / CONTRIBUTION",
    ownedProject: "OWNED PROJECT",
    stars: "stars",
    unknown: "Unknown",
    projectsHeader: { project: "Project", purpose: "Purpose", stack: "Stack", status: "Status" },
    projectsUnavailable: "Project data unavailable — backend unreachable.",
    purposeFork: "Contribution and PR workflow",
    purposeOwned: "Design and maintain reliable product workflows",
    viewAllRepos: (count) => `View all ${count} repositories`,
    cases: {
      title: "Case Files",
      sub: "Stack / Context / Outcome",
      stack: "Stack",
      context: "Context",
      approach: "Approach",
      status: "Status",
      unavailableTitle: "Unavailable",
      unavailableBody: "Backend unreachable — case data not loaded.",
      emptyTitle: "No core projects yet",
      emptyBody: "Push your first owned repository to populate this section.",
      contextFallback: "Delivering a reliable and maintainable software solution.",
      multiLanguage: "Multi-language",
    },
    approach: {
      csharp: "ASP.NET Core + layered service architecture with clean separation of concerns.",
      rust: "Rust processing pipeline with systems-level control and low overhead.",
      go: "Go API with SQLite cache, minimal dependencies and low resource footprint.",
      swift: "Native Swift with platform APIs for responsive desktop/mobile experience.",
      typescript: "TypeScript frontend with component isolation and typed API contracts.",
      other: (language) => `${language} stack with focus on maintainability and clear data flow.`,
    },
    timeline: { title: "Build Timeline", sub: "Recent milestones", unavailable: "Timeline unavailable.", fallback: "Active development." },
    stack: {
      title: "Stack Matrix",
      sub: "Grouped by role",
      primary: "Primary",
      data: "Data & Messaging",
      web: "Web",
      shipped: "Shipped with Agents",
      agents: "Coding Agents",
      deployOps: "Deploy & Ops",
    },
    notes: {
      title: "Operator Notes",
      sub: "How I work",
      items: [
        {
          title: "01 / .NET is home",
          body: "Four years of .NET backends for logistics, ERP and e-commerce: APIs, marketplace and ERP integrations, background jobs.",
        },
        {
          title: "02 / Agents write, I decide",
          body: "Since August 2025 I build with AI coding agents. I set the task and the project rules; no change ships without tests and review.",
        },
        {
          title: "03 / Risky steps wait for a human",
          body: "Deploys, store releases and secrets sit behind automated guards and an explicit human approval.",
        },
      ],
    },
    contact: {
      title: "Ready for next mission.",
      body: "Open to .NET backend and agentic coding roles. Co-founder at Palmye LLC, building a travel eSIM app.",
    },
    ago: (hours, days) => (days < 1 ? `${Math.max(1, hours)}h ago` : `${days}d ago`),
    event: EN_EVENT,
  },
  tr: {
    intlLocale: "tr-TR",
    skipLink: "Ana içeriğe geç",
    loading: "Yükleniyor...",
    portfolio: "Portfolyo",
    nav: { projects: "Projeler", cases: "Öne Çıkanlar", timeline: "Son Çalışmalar", contact: "İletişim", navLabel: "Ana menü" },
    switchLang: { href: "/", label: "EN", aria: "English version", hrefLang: "en" },
    heroTagline: "Yazılım geliştirici.",
    heroText:
      ".NET ile backend geliştiriyorum, ürünleri yapay zekâ kodlama ajanlarıyla çıkarıyorum. Bu sayfa GitHub'daki projelerimi, katkılarımı ve geliştirme geçmişimi gösteriyor.",
    openProjectLogs: "Projeleri gör",
    openGithub: "GitHub profilini aç",
    openLinkedin: "LinkedIn profilini aç",
    kpi: { owned: "kişisel repo", mergedPrs: "birleştirilmiş PR", followers: "GitHub takipçisi", lastPush: "son push" },
    activity: { title: "Aktivite", sub: "GitHub verisinden hesaplanır", unavailable: "Aktivite verisi şu an alınamıyor." },
    gauge: {
      active: "Bu çeyrekte güncellenen",
      owned: "Kişisel repolar",
      core: "Ana projeler",
      topLang: "En çok kullanılan dil",
      outOf: (a, b) => `${b} içinden ${a}`,
    },
    contrib: {
      title: "Katkı geçmişi",
      none: (date) => `Katkı yok · ${date}`,
      some: (count, date) => `${count} katkı · ${date}`,
    },
    feed: {
      titleAfterGithub: "Akışı",
      sub: "GitHub API'sinden güncellenir",
      unavailable: "Akış şu an yüklenemiyor.",
      latestRepos: "Son güncellenen repolar",
      viewAll: "tümünü gör",
      viewAllAria: "Tüm repoları gör",
      recentEvents: "Son etkinlikler",
      profile: "profil",
      profileAria: "GitHub profilini aç",
      repoCountAria: (lang) => `${lang} repo sayısı`,
      repoCount: (count) => `${count} repo`,
      viewDetails: (repo) => `${repo} detayları`,
      viewOnGithub: (repo) => `${repo} GitHub'da`,
    },
    noDescriptionProvided: "Açıklama yok.",
    noDescription: "Açıklama yok",
    forkContribution: "FORK / KATKI",
    ownedProject: "KİŞİSEL PROJE",
    stars: "yıldız",
    unknown: "Belirtilmemiş",
    projectsHeader: { project: "Proje", purpose: "Rolüm", stack: "Dil", status: "Durum" },
    projectsUnavailable: "Proje verisi şu an yüklenemiyor.",
    purposeFork: "Pull request ile katkı",
    purposeOwned: "Tasarım, geliştirme ve bakım",
    viewAllRepos: (count) => `Tüm repoları gör (${count})`,
    cases: {
      title: "Öne Çıkan Projeler",
      sub: "Dil / Kapsam / Yaklaşım",
      stack: "Dil",
      context: "Kapsam",
      approach: "Yaklaşım",
      status: "Durum",
      unavailableTitle: "Yüklenemedi",
      unavailableBody: "Proje verisi şu an yüklenemiyor.",
      emptyTitle: "Henüz öne çıkan proje yok",
      emptyBody: "Kişisel bir repo eklendiğinde burada görünecek.",
      contextFallback: "Açıklama yok.",
      multiLanguage: "Birden fazla dil",
    },
    approach: {
      csharp: "ASP.NET Core, katmanlı servis mimarisi.",
      rust: "Rust ile düşük seviyede, az kaynak tüketen bir işleme katmanı.",
      go: "Go API, SQLite önbellek, az bağımlılık.",
      swift: "Platform API'leriyle native Swift uygulaması.",
      typescript: "TypeScript, bileşen tabanlı arayüz ve tipli API istemcisi.",
      other: (language) => `${language} ile geliştirildi.`,
    },
    timeline: { title: "Son Çalışmalar", sub: "En son güncellenen projeler", unavailable: "Şu an yüklenemiyor.", fallback: "Geliştirme sürüyor." },
    stack: {
      title: "Teknolojiler",
      sub: "Kullanım alanına göre",
      primary: "Ana",
      data: "Veri ve mesajlaşma",
      web: "Web",
      shipped: "Ajanlarla yayına çıkardıklarım",
      agents: "Kodlama ajanları",
      deployOps: "Deploy ve sunucu",
    },
    notes: {
      title: "Nasıl Çalışıyorum",
      sub: "Kısa notlar",
      items: [
        {
          title: "01 / Asıl işim .NET",
          body: "Dört yıldır lojistik, ERP ve e-ticaret için .NET ile backend geliştiriyorum: API'ler, pazaryeri ve ERP entegrasyonları, arka plan işleri.",
        },
        {
          title: "02 / Ajanlar yazar, karar benim",
          body: "Ağustos 2025'ten beri yapay zekâ kodlama ajanlarıyla geliştiriyorum. İşi ve proje kurallarını ben belirliyorum; test ve review'dan geçmeyen değişiklik yayına çıkmaz.",
        },
        {
          title: "03 / Riskli adımlar insan onayı bekler",
          body: "Yayına alma, mağaza sürümü ve gizli anahtarlar gibi adımlar otomatik korumalara ve açık bir insan onayına bağlı.",
        },
      ],
    },
    contact: {
      title: "Yeni fırsatlara açığım.",
      body: ".NET backend ve ajanlarla yazılım geliştirme (agentic coding) rollerine açığım. Palmye LLC'nin kurucu ortağıyım; bir seyahat eSIM uygulaması geliştiriyoruz.",
    },
    ago: (hours, days) => (days < 1 ? `${Math.max(1, hours)} saat önce` : `${days} gün önce`),
    event: (type) => TR_EVENTS[type] ?? EN_EVENT(type),
  },
};
