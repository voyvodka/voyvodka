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
  stack: { title: string; sub: string; primary: string; backendOps: string; systems: string; fullStack: string; frontend: string; deployOps: string };
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
      "Backend engineer focused on .NET Core, clean service architecture, and reliable shipping cadence. This console reflects active projects, contributions, and build history.",
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
      backendOps: "Backend Ops",
      systems: "Systems",
      fullStack: "Full-stack",
      frontend: "Frontend",
      deployOps: "Deploy & Ops",
    },
    notes: {
      title: "Operator Notes",
      sub: "How I work",
      items: [
        {
          title: "01 / C# is my production language",
          body: "I build reliable backends with .NET Core — layered service architecture, clean API contracts, EF Core data flows, and predictable release cycles. This is where I operate without guardrails.",
        },
        {
          title: "02 / AI multiplies output, not replaces judgment",
          body: "For React, Go, Rust, and desktop work I ship with AI acceleration. The decisions and trade-offs are mine — the speed is not. I mark the distinction clearly in every project.",
        },
        {
          title: "03 / Code, deploy, own it",
          body: "Every project here goes from commit to production on self-hosted infrastructure I manage myself. Docker, Coolify, Linux — no magic between me and what runs in production.",
        },
      ],
    },
    contact: {
      title: "Ready for next mission.",
      body: "Open to .NET backend and MVC full-stack roles. Interested in product teams that value practical engineering and AI-accelerated delivery.",
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
    heroTagline: "Backend yazılım mühendisi.",
    heroText:
      ".NET Core ile servis mimarisi, REST API'ler ve düzenli yayın süreçleri üzerine çalışıyorum. Bu sayfa GitHub'daki projelerimi, katkılarımı ve geliştirme geçmişimi gösteriyor.",
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
      backendOps: "Veri ve önbellek",
      systems: "Sistem",
      fullStack: "Full-stack",
      frontend: "Frontend",
      deployOps: "Deploy ve sunucu",
    },
    notes: {
      title: "Nasıl Çalışıyorum",
      sub: "Kısa notlar",
      items: [
        {
          title: "01 / Asıl işim C# ve .NET",
          body: "Production'daki backend'leri .NET Core ile geliştiriyorum: katmanlı servis mimarisi, net API sözleşmeleri, EF Core ile veri erişimi ve düzenli sürümler. En çok deneyimim olan alan bu.",
        },
        {
          title: "02 / Yapay zekâyı hız için kullanıyorum",
          body: "React, Go, Rust ve masaüstü projelerinde yapay zekâ araçlarıyla daha hızlı ilerliyorum. Mimari kararlar ve ödünleşimler bana ait; hangi projede bu araçları kullandığımı açıkça yazıyorum.",
        },
        {
          title: "03 / Yayına alma ve bakım da bende",
          body: "Buradaki projeleri commit'ten production'a kendi yönettiğim sunucularda çıkarıyorum. Docker, Coolify ve Linux ile kurulumu, yayına almayı ve bakımı kendim yapıyorum.",
        },
      ],
    },
    contact: {
      title: "Yeni fırsatlara açığım.",
      body: ".NET backend ve MVC full-stack pozisyonlarıyla ilgileniyorum. Pratik mühendisliğe ve yapay zekâ destekli geliştirmeye önem veren ekiplerle çalışmak istiyorum.",
    },
    ago: (hours, days) => (days < 1 ? `${Math.max(1, hours)} saat önce` : `${days} gün önce`),
    event: (type) => TR_EVENTS[type] ?? EN_EVENT(type),
  },
};
