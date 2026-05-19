export type Lang = "zh" | "en";
export type Category = "people" | "diary" | "films" | "gigs" | "expositions" | "traveling";

export const CATEGORIES: Category[] = ["people", "diary", "films", "gigs", "expositions", "traveling"];

export type ExtraFieldType = "text" | "url" | "number" | "list" | "select" | "textarea";

export interface ExtraFieldOption {
  value: string;
  label: { zh: string; en: string };
}

export interface ExtraField {
  key: string;
  type: ExtraFieldType;
  label: { zh: string; en: string };
  placeholder?: { zh: string; en: string };
  options?: ExtraFieldOption[];
  showInCard?: boolean;
}

export interface CategoryConfig {
  key: Category;
  emoji: string;
  label: { zh: string; en: string };

  titleLabel: { zh: string; en: string };
  titlePlaceholder?: { zh: string; en: string };
  titleOptional?: boolean;

  subtitleLabel?: { zh: string; en: string };
  subtitlePlaceholder?: { zh: string; en: string };

  hasRating: boolean;
  hasCompanions: boolean;
  hasLocation: boolean;
  hasTags: boolean;
  hasEndDate: boolean;

  notesLabel?: { zh: string; en: string };
  notesPlaceholder?: { zh: string; en: string };

  extraFields?: ExtraField[];

  cardSecondary?: (e: { subtitle?: string; city?: string; country?: string; extras?: Record<string, unknown>; date?: string; end_date?: string }) => string;

  topRanking?: { key: "subtitle" | "city" | "country" | "title"; labelZh: string; labelEn: string };
}

export const CATEGORY_CONFIGS: Record<Category, CategoryConfig> = {
  people: {
    key: "people",
    emoji: "🩻",
    label: { zh: "人物", en: "People" },
    titleLabel: { zh: "姓名", en: "Name" },
    titlePlaceholder: { zh: "TA 的名字", en: "Their name" },
    subtitleLabel: { zh: "关系", en: "Relationship" },
    subtitlePlaceholder: { zh: "朋友 / 家人 / 同事...", en: "Friend / family / colleague..." },
    hasRating: false,
    hasCompanions: false,
    hasLocation: true,
    hasTags: true,
    hasEndDate: false,
    notesLabel: { zh: "笔记", en: "Notes" },
    notesPlaceholder: { zh: "认识 TA 的故事、印象、记忆...", en: "How you met, impressions, memories..." },
    extraFields: [
      { key: "photo", type: "url", label: { zh: "头像链接", en: "Photo URL" }, placeholder: { zh: "https://...", en: "https://..." } },
      { key: "met_at", type: "text", label: { zh: "认识的契机", en: "Met via" }, placeholder: { zh: "比如：在 xx 演出 / xx 介绍", en: "e.g. at a gig / via a friend" } },
    ],
    cardSecondary: e => [e.subtitle, e.city].filter(Boolean).join(" · "),
    topRanking: { key: "subtitle", labelZh: "关系分布", labelEn: "Relationship breakdown" },
  },

  diary: {
    key: "diary",
    emoji: "📒",
    label: { zh: "日记", en: "Diary" },
    titleLabel: { zh: "标题（可选）", en: "Title (optional)" },
    titlePlaceholder: { zh: "今天最值得记的一件事", en: "One line about today" },
    titleOptional: true,
    subtitleLabel: { zh: "心情", en: "Mood" },
    subtitlePlaceholder: { zh: "😄 / 😔 / 😴 ...", en: "😄 / 😔 / 😴 ..." },
    hasRating: false,
    hasCompanions: false,
    hasLocation: false,
    hasTags: true,
    hasEndDate: false,
    notesLabel: { zh: "正文", en: "Entry" },
    notesPlaceholder: { zh: "今天发生了什么？想到了什么？", en: "What happened today? What did you think?" },
    cardSecondary: e => e.subtitle ?? "",
    topRanking: { key: "subtitle", labelZh: "心情分布", labelEn: "Mood breakdown" },
  },

  films: {
    key: "films",
    emoji: "🍿",
    label: { zh: "电影", en: "Films" },
    titleLabel: { zh: "片名", en: "Title" },
    titlePlaceholder: { zh: "电影名", en: "Film title" },
    subtitleLabel: { zh: "导演", en: "Director" },
    subtitlePlaceholder: { zh: "导演名", en: "Director name" },
    hasRating: true,
    hasCompanions: true,
    hasLocation: false,
    hasTags: true,
    hasEndDate: false,
    notesLabel: { zh: "感受", en: "Thoughts" },
    notesPlaceholder: { zh: "看完之后想说什么", en: "What did you think?" },
    extraFields: [
      { key: "year", type: "number", label: { zh: "上映年份", en: "Release year" }, placeholder: { zh: "2026", en: "2026" }, showInCard: true },
      { key: "where", type: "select", label: { zh: "在哪看的", en: "Where" }, options: [
        { value: "cinema", label: { zh: "电影院", en: "Cinema" } },
        { value: "streaming", label: { zh: "流媒体", en: "Streaming" } },
        { value: "home", label: { zh: "家里", en: "Home" } },
        { value: "festival", label: { zh: "电影节", en: "Festival" } },
        { value: "plane", label: { zh: "飞机上", en: "On a plane" } },
      ] },
      { key: "poster", type: "url", label: { zh: "海报链接（可选）", en: "Poster URL (optional)" } },
    ],
    cardSecondary: e => {
      const parts: string[] = [];
      if (e.subtitle) parts.push(e.subtitle);
      const year = e.extras?.year;
      if (year) parts.push(String(year));
      return parts.join(" · ");
    },
    topRanking: { key: "subtitle", labelZh: "最常看的导演", labelEn: "Most-watched directors" },
  },

  gigs: {
    key: "gigs",
    emoji: "🎸",
    label: { zh: "演出", en: "Gigs" },
    titleLabel: { zh: "艺人", en: "Artist" },
    hasRating: true,
    hasCompanions: true,
    hasLocation: true,
    hasTags: true,
    hasEndDate: false,
  },

  expositions: {
    key: "expositions",
    emoji: "🖼️",
    label: { zh: "展览", en: "Expos" },
    titleLabel: { zh: "展览名", en: "Exhibition" },
    titlePlaceholder: { zh: "展览名称", en: "Exhibition title" },
    subtitleLabel: { zh: "美术馆 / 画廊", en: "Museum / Gallery" },
    subtitlePlaceholder: { zh: "场馆名", en: "Venue name" },
    hasRating: true,
    hasCompanions: true,
    hasLocation: true,
    hasTags: true,
    hasEndDate: false,
    notesLabel: { zh: "笔记", en: "Notes" },
    notesPlaceholder: { zh: "印象深的作品、看完的感受...", en: "Standout works, feelings..." },
    extraFields: [
      { key: "artists", type: "list", label: { zh: "参展艺术家", en: "Featured artists" }, placeholder: { zh: "艺术家名（回车添加）", en: "Artist name (press enter)" } },
    ],
    cardSecondary: e => [e.subtitle, e.city].filter(Boolean).join(" · "),
    topRanking: { key: "subtitle", labelZh: "最常去的场馆", labelEn: "Most-visited venues" },
  },

  traveling: {
    key: "traveling",
    emoji: "🏯",
    label: { zh: "旅行", en: "Traveling" },
    titleLabel: { zh: "行程名", en: "Trip" },
    titlePlaceholder: { zh: "比如：日本春季", en: "e.g. Japan spring" },
    subtitleLabel: { zh: "国家", en: "Country" },
    subtitlePlaceholder: { zh: "日本 / Japan...", en: "Japan / Italy..." },
    hasRating: true,
    hasCompanions: true,
    hasLocation: true,
    hasTags: true,
    hasEndDate: true,
    notesLabel: { zh: "亮点 / 笔记", en: "Highlights / Notes" },
    notesPlaceholder: { zh: "去了哪、吃了什么、印象最深的...", en: "Where you went, what you ate, what stood out..." },
    extraFields: [
      { key: "cities", type: "list", label: { zh: "去过的城市", en: "Cities visited" }, placeholder: { zh: "城市名（回车添加）", en: "City name (press enter)" } },
    ],
    cardSecondary: e => {
      const parts: string[] = [];
      if (e.subtitle) parts.push(e.subtitle);
      const cities = e.extras?.cities;
      if (Array.isArray(cities) && cities.length) parts.push(cities.slice(0, 3).join(", "));
      return parts.join(" · ");
    },
    topRanking: { key: "country", labelZh: "去得最多的国家", labelEn: "Most-visited countries" },
  },
};

export function categoryT(cfg: CategoryConfig, lang: Lang): {
  label: string;
  titleLabel: string;
  titlePlaceholder?: string;
  subtitleLabel?: string;
  subtitlePlaceholder?: string;
  notesLabel?: string;
  notesPlaceholder?: string;
} {
  return {
    label: cfg.label[lang],
    titleLabel: cfg.titleLabel[lang],
    titlePlaceholder: cfg.titlePlaceholder?.[lang],
    subtitleLabel: cfg.subtitleLabel?.[lang],
    subtitlePlaceholder: cfg.subtitlePlaceholder?.[lang],
    notesLabel: cfg.notesLabel?.[lang],
    notesPlaceholder: cfg.notesPlaceholder?.[lang],
  };
}
