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
  CreateEvent: "Oluşturma",
  DeleteEvent: "Silme",
  ReleaseEvent: "Sürüm",
  ForkEvent: "Fork",
  WatchEvent: "Yıldız",
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
    loading: "Pano yükleniyor...",
    portfolio: "Portfolyo",
    nav: { projects: "Projeler", cases: "Vaka Dosyaları", timeline: "Zaman Çizelgesi", contact: "İletişim", navLabel: "Ana Menü" },
    switchLang: { href: "/", label: "EN", aria: "English version", hrefLang: "en" },
    heroTagline: "Sistemleri bir kontrol odası gibi kurarım.",
    heroText:
      ".NET Core, temiz servis mimarisi ve istikrarlı teslimat temposuna odaklanan backend yazılım mühendisi. Bu konsol aktif projeleri, katkıları ve geliştirme geçmişini gösterir.",
    openProjectLogs: "Proje Kayıtlarını Aç",
    openGithub: "GitHub profilini aç",
    openLinkedin: "LinkedIn profilini aç",
    kpi: { owned: "kendi repoları", mergedPrs: "birleşen pr", followers: "github takipçisi", lastPush: "son push" },
    activity: { title: "Aktivite Sinyalleri", sub: "GitHub verisinden hesaplanır", unavailable: "Aktivite verisi şu an alınamıyor." },
    gauge: {
      active: "Bu çeyrekte aktif",
      owned: "Sahiplik oranı",
      core: "Çekirdek odak",
      topLang: "En çok kullanılan dil",
      outOf: (a, b) => `${b} içinden ${a}`,
    },
    contrib: {
      title: "Katkı aktivitesi",
      none: (date) => `Katkı yok · ${date}`,
      some: (count, date) => `${count} katkı · ${date}`,
    },
    feed: {
      titleAfterGithub: "Canlı Akış",
      sub: "Herkese açık API ile senkron",
      unavailable: "Canlı akış şu an alınamıyor — backend'e ulaşılamıyor.",
      latestRepos: "Son repolar",
      viewAll: "tümünü gör",
      viewAllAria: "tümünü gör: son repolar",
      recentEvents: "Son aktiviteler",
      profile: "profil",
      profileAria: "profil: GitHub'da gör",
      repoCountAria: (lang) => `${lang} repo sayısı`,
      repoCount: (count) => `${count} repo`,
      viewDetails: (repo) => `${repo} detaylarını gör`,
      viewOnGithub: (repo) => `${repo} reposunu GitHub'da gör`,
    },
    noDescriptionProvided: "Açıklama eklenmemiş.",
    noDescription: "Açıklama yok",
    forkContribution: "FORK / KATKI",
    ownedProject: "KENDİ PROJESİ",
    stars: "yıldız",
    unknown: "Bilinmiyor",
    projectsHeader: { project: "Proje", purpose: "Amaç", stack: "Teknoloji", status: "Durum" },
    projectsUnavailable: "Proje verisi şu an alınamıyor — backend'e ulaşılamıyor.",
    purposeFork: "Katkı ve PR süreci",
    purposeOwned: "Güvenilir ürün akışları tasarlamak ve sürdürmek",
    viewAllRepos: (count) => `${count} reponun tamamını gör`,
    cases: {
      title: "Vaka Dosyaları",
      sub: "Teknoloji / Bağlam / Sonuç",
      stack: "Teknoloji",
      context: "Bağlam",
      approach: "Yaklaşım",
      status: "Durum",
      unavailableTitle: "Alınamıyor",
      unavailableBody: "Backend'e ulaşılamıyor — vaka verisi yüklenmedi.",
      emptyTitle: "Henüz çekirdek proje yok",
      emptyBody: "Bu bölüm ilk kendi reponla dolacak.",
      contextFallback: "Güvenilir ve bakımı kolay bir yazılım çözümü sunmak.",
      multiLanguage: "Çok dilli",
    },
    approach: {
      csharp: "Sorumlulukları net ayrılmış, katmanlı servis mimarisiyle ASP.NET Core.",
      rust: "Sistem seviyesinde kontrol ve düşük ek yük sunan bir Rust işleme hattı.",
      go: "SQLite önbellekli, az bağımlılıklı ve düşük kaynak tüketen bir Go API'si.",
      swift: "Akıcı bir masaüstü/mobil deneyim için platform API'leriyle native Swift.",
      typescript: "Bileşen izolasyonu ve tipli API sözleşmeleriyle TypeScript ön yüz.",
      other: (language) => `Bakım kolaylığına ve net veri akışına odaklanan ${language} yığını.`,
    },
    timeline: { title: "Geliştirme Zaman Çizelgesi", sub: "Son kilometre taşları", unavailable: "Zaman çizelgesi şu an alınamıyor.", fallback: "Aktif geliştirmede." },
    stack: {
      title: "Teknoloji Matrisi",
      sub: "Role göre gruplu",
      primary: "Ana",
      backendOps: "Backend Operasyon",
      systems: "Sistem",
      fullStack: "Full-stack",
      frontend: "Ön yüz",
      deployOps: "Yayın ve Operasyon",
    },
    notes: {
      title: "Operatör Notları",
      sub: "Nasıl çalışırım",
      items: [
        {
          title: "01 / C# üretimdeki dilim",
          body: "Güvenilir backend'leri .NET Core ile kurarım: katmanlı servis mimarisi, temiz API sözleşmeleri, EF Core veri akışları ve öngörülebilir sürüm döngüleri. Destek tekerleği olmadan çalıştığım alan burası.",
        },
        {
          title: "02 / Yapay zekâ üretimi katlar, muhakemenin yerini almaz",
          body: "React, Go, Rust ve masaüstü işlerinde yapay zekâ hızlandırmasıyla teslim ederim. Kararlar ve ödünleşimler bana ait; hız değil. Bu ayrımı her projede açıkça belirtirim.",
        },
        {
          title: "03 / Kodla, yayına al, sahiplen",
          body: "Buradaki her proje, kendi yönettiğim self-hosted altyapıda commit'ten production'a gider. Docker, Coolify, Linux — benimle production'da çalışan şey arasında sihir yok.",
        },
      ],
    },
    contact: {
      title: "Yeni göreve hazırım.",
      body: ".NET backend ve MVC full-stack rollerine açığım. Pratik mühendisliğe ve yapay zekâ destekli teslimata değer veren ürün ekipleriyle çalışmak istiyorum.",
    },
    ago: (hours, days) => (days < 1 ? `${Math.max(1, hours)} saat önce` : `${days} gün önce`),
    event: (type) => TR_EVENTS[type] ?? EN_EVENT(type),
  },
};
