export interface ComicItem {
  title: string;
  link: string;
  image: string;
  chapters?: string;
  rating?: string;
  type?: string;
  status?: string;
  slug: string;
}

export interface ComicDetailData {
  title: string;
  title_indonesian?: string;
  image: string;
  synopsis: string;
  genres: any[];
  status: string;
  author?: string;
  type?: string;
  released?: string;
  chapter_list: {
    chapter: string;
    url: string;
    date?: string;
  }[];
}

export interface ComicChapterData {
  manga_title: string;
  chapter_title: string;
  navigation: {
    previousChapter: string | null;
    nextChapter: string | null;
  };
  images: string[];
}

const fetchProxy = async (endpoint: string) => {
  const url = `/api/comic-proxy/${endpoint}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    return await res.json();
  } catch (error) {
    console.error(`Comic Fetch Error on ${endpoint}:`, error);
    return null;
  }
};

const extractSlug = (link: string | undefined): string => {
  if (!link) return '';
  const match = link.match(/\/manga\/([^/]+)/);
  return match ? match[1] : link.replace(/[^a-zA-Z0-9-]/g, '');
};

export const comicService = {
  async getLatest(page = 1): Promise<ComicItem[]> {
    const data = await fetchProxy(`terbaru?page=${page}`);
    if (!data?.comics) return [];
    return data.comics.map((c: any) => ({
      ...c,
      slug: extractSlug(c.link),
      chapters: c.chapter || c.chapters
    })).filter((item: any) => item.slug && item.slug !== 'plus');
  },
  
  async getPopular(page = 1): Promise<ComicItem[]> {
    const data = await fetchProxy(`populer?page=${page}`);
    if (!data?.comics) return [];
    return data.comics.map((c: any) => ({
      ...c,
      slug: extractSlug(c.link),
      chapters: c.chapter || c.chapters
    })).filter((item: any) => item.slug && item.slug !== 'plus');
  },

  async getTrending(): Promise<ComicItem[]> {
    const data = await fetchProxy(`trending`);
    let items = [];
    if (data?.trending) {
      items = data.trending.map((c: any) => ({
        ...c,
        slug: extractSlug(c.link),
        chapters: c.chapter || c.chapters
      }));
    } else if (data?.comics) {
      items = data.comics.map((c: any) => ({
        ...c,
        slug: extractSlug(c.link),
        chapters: c.chapter || c.chapters
      }));
    }
    return items.filter((item: any) => item.slug && item.slug !== 'plus');
  },

  async search(query: string): Promise<ComicItem[]> {
    const data = await fetchProxy(`search?q=${encodeURIComponent(query)}`);
    if (!data?.comics) return [];
    return data.comics.map((c: any) => ({
      ...c,
      slug: extractSlug(c.link)
    }));
  },

  async getDetail(slug: string): Promise<ComicDetailData | null> {
    const data = await fetchProxy(`comic/${slug}`);
    if (!data) return null;
    return {
      title: data.title,
      title_indonesian: data.title_indonesian,
      image: data.image,
      synopsis: data.synopsis,
      genres: data.genres || [],
      status: data.status,
      author: data.author,
      type: data.type,
      released: data.released,
      chapter_list: data.chapter_list || []
    };
  },

  async getChapter(chapterSlug: string): Promise<ComicChapterData | null> {
    const data = await fetchProxy(`chapter/${chapterSlug}`);
    if (!data) return null;
    return data;
  }
};
