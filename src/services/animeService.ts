import { userService, HistoryItem } from './userService';

export type ServerType = 'main' | 'backup' | 'sanka';

export interface AnimeData {
  id: string;
  title: string;
  synopsis?: string;
  image_poster: string;
  image_cover?: string;
  type?: string;
  status?: string;
  year?: string;
  genre?: string;
  views?: string;
  favorites?: string;
  episode_list?: any[];
  [key: string]: any;
}

const normalizeBackupMovie = (movie: any): AnimeData => {
  return {
    id: movie.id,
    title: movie.title,
    synopsis: movie.synopsis,
    image_poster: movie.image_poster || null,
    image_cover: movie.image_cover || null,
    type: movie.type,
    status: movie.status,
    year: movie.year,
    genre: movie.genre,
    views: movie.views,
    favorites: movie.favorites,
  };
};

const normalizeSankaAnime = (anime: any): AnimeData => {
  const randomRating = (Math.random() * (9.5 - 7.0) + 7.0).toFixed(1);
  const possibleGenres = ['Action', 'Adventure', 'Fantasy', 'Romance', 'School', 'Sci-Fi', 'Slice of Life', 'Supernatural'];
  const randomGenre = possibleGenres[Math.floor(Math.random() * possibleGenres.length)] + ', ' + possibleGenres[Math.floor(Math.random() * possibleGenres.length)];

  return {
    id: anime.slug,
    slug: anime.slug,
    title: anime.title,
    image_poster: anime.poster,
    image_cover: anime.poster,
    status: anime.status_or_day,
    episode: anime.episode,
    type: anime.type,
    isSanka: true,
    favorites: randomRating,
    genre: anime.status_or_day?.includes('Setiap') ? `Ongoing, ${randomGenre}` : randomGenre,
    status_or_day: anime.status_or_day
  };
};

const normalizeDevAnime = (anime: any): AnimeData => {
  return {
    id: anime.url,
    slug: anime.url,
    title: anime.judul,
    image_poster: anime.cover,
    image_cover: anime.cover,
    status: anime.status || anime.lastup || 'Unknown',
    episode: anime.lastch ? `Ep ${anime.lastch}` : (anime.status || ''),
    type: anime.type || 'TV',
    isDevEntry: true,
    devTitle: anime.judul,
    favorites: anime.score && anime.score !== 'N/A' ? anime.score : (Math.random() * (9.5 - 7.0) + 7.0).toFixed(1),
    genre: Array.isArray(anime.genre) ? anime.genre.join(', ') : (anime.genre || ''),
    status_or_day: anime.status || anime.lastup
  };
};


// Simple rate-limit friendly cache
const sankaCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_STALE = 60000; // 1 minute

const apiFetch = async <T = any>(url: string, defaultReturn: any = null): Promise<T> => {
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`[API Fetch Warn] ${r.status} ${r.statusText} on ${url}`);
      return defaultReturn;
    }
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error(`[API Fetch Parse Error] on ${url}: invalid JSON`, text.substring(0, 100));
      return defaultReturn;
    }
  } catch (e) {
    console.error(`[API Fetch Error] on ${url}:`, e);
    return defaultReturn;
  }
};

const cachedFetch = async (url: string) => {
  const now = Date.now();
  if (sankaCache[url] && (now - sankaCache[url].timestamp < CACHE_STALE)) {
    return sankaCache[url].data;
  }
  const res = await apiFetch(url, {});
  sankaCache[url] = { data: res, timestamp: now };
  return res;
};

export const animeService = {
  async getServer(): Promise<ServerType> {
    try {
      const profile = await userService.getProfile();
      return profile?.settings?.apiServer || 'sanka';
    } catch (e) {
      return 'sanka';
    }
  },

  async getApiBase(): Promise<string> {
    const server = await this.getServer();
    if (server === 'main') return '/api/proxy';
    if (server === 'backup') return '/api/backup-proxy';
    return '/api/sanka-proxy';
  },

  getAnimePath(a: any) {
    if (a.isDevEntry) {
      const titleSlug = (a.title || a.devTitle || 'dev-entry').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `/anime/dev-${titleSlug}?src=dev&url=${encodeURIComponent(a.id)}&title=${encodeURIComponent(a.title || a.devTitle || '')}&img=${encodeURIComponent(a.image_cover || a.image_poster || '')}`;
    }
    const isSanka = a.isSanka || a.is_sanka;
    const sankaParam = isSanka ? '?src=sanka' : '';
    const id = a.id || a.slug;
    if (isSanka) return `/anime/${id}${sankaParam}`;
    const titleSlug = (a.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `/anime/${id}-${titleSlug}${sankaParam}`;
  },

  async getHomeData() {
    const server = await this.getServer();
    if (server === 'main') {
      const [schRes, ongRes, popRes] = await Promise.all([
        apiFetch('/api/proxy/schedule', { data: {} }),
        apiFetch('/api/proxy/ongoing', { data: [] }),
        apiFetch('/api/proxy/popular', { data: [] }),
      ]);
      return {
        schedule: schRes.data || {},
        ongoing: (ongRes.data || []).map((a: any) => ({ ...a, isMain: true })),
        popular: (popRes.data || []).map((a: any) => ({ ...a, isMain: true }))
      };
    } else if (server === 'sanka') {
      const [schRes, ongRes, popRes, latRes, devLatRes, devSchRes] = await Promise.all([
        cachedFetch('/api/sanka-proxy/schedule'),
        this.getOngoing(1),
        this.getPopular(1),
        cachedFetch('/api/sanka-proxy/latest?page=1'),
        apiFetch('/api/dev-proxy/latest?page=1', []),
        apiFetch('/api/dev-proxy/schedule', { data: [] })
      ]);

      const schedule: any = {};
      
      // Load dev schedule first
      if (devSchRes?.data && Array.isArray(devSchRes.data)) {
        devSchRes.data.forEach((dayData: any) => {
          let normalizedDay = dayData.day.toUpperCase();
          if (normalizedDay.includes("JUM")) normalizedDay = "JUMAT";
          if (normalizedDay.includes("SEN")) normalizedDay = "SENIN";
          if (normalizedDay.includes("SEL")) normalizedDay = "SELASA";
          if (normalizedDay.includes("RAB")) normalizedDay = "RABU";
          if (normalizedDay.includes("KAM")) normalizedDay = "KAMIS";
          if (normalizedDay.includes("SAB")) normalizedDay = "SABTU";
          if (normalizedDay.includes("MIN")) normalizedDay = "MINGGU";
          
          if (!schedule[normalizedDay]) schedule[normalizedDay] = [];
          
          dayData.animeList.forEach((a: any) => {
            schedule[normalizedDay].push(normalizeDevAnime({ ...a, judul: a.anime_name, url: a.link }));
          });
        });
      }

      // Load sanka schedule and combine
      if (schRes.schedule) {
        Object.keys(schRes.schedule).forEach(day => {
          let normalizedDay = day.toUpperCase();
          if (normalizedDay.includes("JUM")) normalizedDay = "JUMAT";
          if (normalizedDay.includes("SEN")) normalizedDay = "SENIN";
          if (normalizedDay.includes("SEL")) normalizedDay = "SELASA";
          if (normalizedDay.includes("RAB")) normalizedDay = "RABU";
          if (normalizedDay.includes("KAM")) normalizedDay = "KAMIS";
          if (normalizedDay.includes("SAB")) normalizedDay = "SABTU";
          if (normalizedDay.includes("MIN")) normalizedDay = "MINGGU";
          
          if (!schedule[normalizedDay]) schedule[normalizedDay] = [];
          schedule[normalizedDay] = [...schedule[normalizedDay], ...schRes.schedule[day].map(normalizeSankaAnime)];
        });
      }

      let devLatest = [];
      if (devLatRes && Array.isArray(devLatRes)) {
         devLatest = devLatRes.map(normalizeDevAnime);
      } else if (devLatRes && Array.isArray(devLatRes.data)) {
         devLatest = devLatRes.data.map(normalizeDevAnime);
      }

      const ongoing = ongRes.data || [];
      const popular = popRes.data || [];
      const sankaLatest = (latRes.animes || []).map(normalizeSankaAnime);
      
      const slider = [...devLatest, ...sankaLatest].sort(() => Math.random() - 0.5); // mix them up

      const [homeRes1, homeRes2, movRes, compRes] = await Promise.all([
        cachedFetch('/api/sanka-proxy/home?page=1'),
        cachedFetch('/api/sanka-proxy/home?page=2'),
        cachedFetch('/api/sanka-proxy/movies?page=1'),
        cachedFetch('/api/sanka-proxy/completed?page=1')
      ]);

      const combinedHome = [
        ...devLatest.slice(0, 5),
        ...(homeRes1.ongoing || []).map(normalizeSankaAnime),
        ...(homeRes2.ongoing || []).map(normalizeSankaAnime)
      ];

      return {
        schedule,
        ongoing,
        popular,
        slider: slider,
        homeAnimes: combinedHome,
        homeRecent: (homeRes1.recent || []).map(normalizeSankaAnime),
        movies: (movRes.animes || []).map(normalizeSankaAnime),
        completed: (compRes.animes || []).map(normalizeSankaAnime),
        pagination: ongRes.pagination
      };
    } else {
      const res = await apiFetch('/api/backup-proxy/home/data?limit=50', {});
      const data = res.data || {};
      
      const today = new Date().toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
      const schedule: any = {};
      schedule[today] = (data.today || []).map(normalizeBackupMovie);

      return {
        schedule,
        ongoing: (data.hot || []).map(normalizeBackupMovie),
        popular: (data.popular || []).map(normalizeBackupMovie),
        slider: (data.slider || []).map(normalizeBackupMovie)
      };
    }
  },

  async getSchedule(day?: string) {
    const server = await this.getServer();
    if (server === 'main') {
      const res = await apiFetch('/api/proxy/schedule', {});
      return res.data || {};
    } else if (server === 'sanka') {
      const [res, devSchRes] = await Promise.all([
        cachedFetch('/api/sanka-proxy/schedule'),
        apiFetch('/api/dev-proxy/schedule', { data: [] })
      ]);
      const schedule: any = {};
      
      if (devSchRes?.data && Array.isArray(devSchRes.data)) {
        devSchRes.data.forEach((dayData: any) => {
          let normalizedDay = dayData.day.toUpperCase();
          if (normalizedDay.includes("JUMAT") || normalizedDay.includes("JUM'AT")) normalizedDay = "JUMAT";
          if (!schedule[normalizedDay]) schedule[normalizedDay] = [];
          dayData.animeList.forEach((a: any) => {
            schedule[normalizedDay].push(normalizeDevAnime({ ...a, judul: a.anime_name, url: a.link }));
          });
        });
      }

      const rawSchedule = res.schedule || {};
      Object.keys(rawSchedule).forEach(d => {
        let normalizedDay = d.toUpperCase();
        if (normalizedDay.includes("JUM'AT") || normalizedDay.includes("JUMAT")) normalizedDay = "JUMAT";
        if (!schedule[normalizedDay]) schedule[normalizedDay] = [];
        schedule[normalizedDay] = [...schedule[normalizedDay], ...rawSchedule[d].map(normalizeSankaAnime)];
      });
      return schedule;
    } else {
      const days = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
      const targetDay = day ? day.toLowerCase() : days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
      
      const res = await apiFetch(`/api/backup-proxy/schedule/data?day=${targetDay}&limit=50`, {});
      const schedule: any = {};
      schedule[targetDay.toUpperCase()] = (res.data?.movie || []).map(normalizeBackupMovie);
      return schedule;
    }
  },

  async getOngoing(page: number = 1) {
    const server = await this.getServer();
    if (server === 'main') {
      const res = await apiFetch(`/api/proxy/ongoing?page=${page}`, {});
      return res.data || [];
    } else if (server === 'sanka') {
      let combined: any[] = [];
      let currentPage = page;
      let pagination = null;

      while (combined.length < 12 && currentPage < page + 3) {
        const res = await cachedFetch(`/api/sanka-proxy/ongoing?page=${currentPage}`);
        if (!res.animes || res.animes.length === 0) break;
        combined = [...combined, ...res.animes.map(normalizeSankaAnime)];
        pagination = res.pagination;
        if (!pagination?.has_next_page) break;
        currentPage++;
      }

      return {
        data: combined.slice(0, 50),
        pagination: { ...pagination, current_page: page }
      };
    } else {
      const res = await apiFetch(`/api/backup-proxy/explore/movie?sort=aired_start&limit=50&page=${page}`, {});
      return (res.data?.movie || []).map(normalizeBackupMovie);
    }
  },

  async getPopular(page: number = 1) {
    const server = await this.getServer();
    if (server === 'main') {
      const res = await apiFetch(`/api/proxy/popular?page=${page}`, {});
      return res.data || [];
    } else if (server === 'sanka') {
      const currentPage = page === 0 ? 0 : page;
      const res = await cachedFetch(`/api/sanka-proxy/popular?page=${currentPage}`);
      return {
        data: (res.animes || []).map(normalizeSankaAnime),
        pagination: res.pagination || { hasNext: (res.animes?.length || 0) >= 10 }
      };
    } else {
      const res = await apiFetch(`/api/backup-proxy/explore/movie?sort=views&limit=50&page=${page}`, {});
      return (res.data?.movie || []).map(normalizeBackupMovie);
    }
  },

  async getMovies(page: number = 1) {
    const server = await this.getServer();
    if (server === 'sanka') {
      let combined: any[] = [];
      let currentPage = page;
      let pagination = null;
      for (let i = 0; i < 2; i++) {
        const [res, devRes] = await Promise.all([
           cachedFetch(`/api/sanka-proxy/movies?page=${currentPage + i}`),
           currentPage + i === 1 ? apiFetch(`/api/dev-proxy/movies`, []) : Promise.resolve([])
        ]);

        let devArray = [];
        if (devRes && Array.isArray(devRes)) devArray = devRes.map(normalizeDevAnime);
        else if (devRes && Array.isArray(devRes.data)) devArray = devRes.data.map(normalizeDevAnime);

        const sankaArray = (res.animes || []).map(normalizeSankaAnime);
        const blended = [];
        const maxLen = Math.max(devArray.length, sankaArray.length);
        for(let j=0; j<maxLen; j++) {
           if(devArray[j]) blended.push(devArray[j]);
           if(sankaArray[j]) blended.push(sankaArray[j]);
        }

        if (blended.length === 0) break;
        combined = [...combined, ...blended];
        pagination = res.pagination;
        if (!pagination?.hasNext) break;
      }
      return { data: combined, pagination: { ...pagination, current_page: page } };
    } else {
      return this.getPopular(page);
    }
  },

  async getCompleted(page: number = 1) {
    const server = await this.getServer();
    if (server === 'sanka') {
      let combined: any[] = [];
      let currentPage = page;
      let pagination = null;
      for (let i = 0; i < 2; i++) {
        const res = await cachedFetch(`/api/sanka-proxy/completed?page=${currentPage + i}`);
        if (!res.animes || res.animes.length === 0) break;
        combined = [...combined, ...res.animes.map(normalizeSankaAnime)];
        pagination = res.pagination;
        if (!pagination?.hasNext) break;
      }
      return { data: combined, pagination: { ...pagination, current_page: page } };
    } else {
      return this.getPopular(page);
    }
  },

  async getLatest(page: number = 1) {
    const server = await this.getServer();
    if (server === 'sanka') {
      let combined: any[] = [];
      let currentPage = page;
      let pagination = null;
      for (let i = 0; i < 2; i++) {
        const [res, devRes] = await Promise.all([
           cachedFetch(`/api/sanka-proxy/latest?page=${currentPage + i}`),
           apiFetch(`/api/dev-proxy/latest?page=${currentPage + i}`, [])
        ]);

        let devArray = [];
        if (devRes && Array.isArray(devRes)) devArray = devRes.map(normalizeDevAnime);
        else if (devRes && Array.isArray(devRes.data)) devArray = devRes.data.map(normalizeDevAnime);

        const sankaArray = (res.animes || []).map(normalizeSankaAnime);
        const blended = [];
        
        // simple weaving
        const maxLen = Math.max(devArray.length, sankaArray.length);
        for(let j=0; j<maxLen; j++) {
           if(devArray[j]) blended.push(devArray[j]);
           if(sankaArray[j]) blended.push(sankaArray[j]);
        }

        if (blended.length === 0) break;
        combined = [...combined, ...blended];
        pagination = res.pagination;
        if (!pagination?.hasNext) break;
      }
      return { data: combined, pagination: { ...pagination, current_page: page } };
    } else {
      return this.getOngoing(page);
    }
  },

  async getHomeCategory(page: number = 1) {
    const server = await this.getServer();
    if (server === 'sanka') {
      let combined: any[] = [];
      let currentPage = page;
      let pagination = null;
      for (let i = 0; i < 2; i++) {
        const res = await cachedFetch(`/api/sanka-proxy/home?page=${currentPage + i}`);
        const animes = [...(res.ongoing || []), ...(res.recent || [])];
        if (animes.length === 0) break;
        combined = [...combined, ...animes.map(normalizeSankaAnime)];
        pagination = res.pagination;
        if (!pagination?.hasNext) break;
      }
      return { data: combined, pagination: { ...pagination, current_page: page } };
    }
    return this.getPopular(page);
  },

  async getGenres() {
    const server = await this.getServer();
    if (server === 'sanka') {
      const res = await cachedFetch('/api/sanka-proxy/genres');
      return res.genres || [];
    }
    return [];
  },

  async getGenreAnimes(genre: string, page: number = 1) {
    if (!genre) return { data: [], pagination: null };
    const server = await this.getServer();
    if (server === 'sanka') {
      let combined: any[] = [];
      let currentPage = page;
      let pagination = null;
      for (let i = 0; i < 2; i++) {
        const res = await cachedFetch(`/api/sanka-proxy/genre/${genre}?page=${currentPage + i}`);
        if (!res.animes || res.animes.length === 0) break;
        combined = [...combined, ...res.animes.map(normalizeSankaAnime)];
        pagination = res.pagination;
        if (!pagination?.hasNext) break;
      }
      return { data: combined, pagination: { ...pagination, current_page: page } };
    }
    return { data: [], pagination: null };
  },

  async getAnimeDetail(id: string) {
    const server = await this.getServer();
    try {
      if (server === 'sanka') {
        const res = await apiFetch(`/api/sanka-proxy/detail/${id}`, {});
        if (res.status === 'success' && res.detail) {
          const d = res.detail;
          return {
            id: id,
            slug: id,
            title: d.title,
            synopsis: d.synopsis,
            image_poster: d.poster,
            image_cover: d.poster, // poster as cover
            rating: d.rating === 'N/A' ? (Math.random() * (9.5 - 7.5) + 7.5).toFixed(1) : d.rating,
            status: d.status,
            aired: d.aired,
            type: d.type,
            duration: d.duration,
            author: d.author,
            studio: d.studio,
            season: d.season,
            genre: (d.genres || []).map((g: any) => g.name).join(', '),
            genres_list: (d.genres || []).map((g: any) => ({ name: g.name, slug: g.slug })),
            episodes: (d.episodes || []).map((e: any) => ({
              index: e.name.match(/\d+/) ? e.name.match(/\d+/)[0] : e.name,
              title: e.name,
              id: e.slug
            })),
            episode_list: (d.episodes || []).map((e: any) => ({
              index: e.name.match(/\d+/) ? e.name.match(/\d+/)[0] : e.name,
              title: e.name,
              id: e.slug
            })),
            isSanka: true
          };
        }
      } else if (server === 'main') {
        const res = await apiFetch(`/api/proxy/detail?id=${id}`, {});
        if (res.status && res.data) {
          return {
            ...res.data,
            episodes: res.data.episode_list || []
          };
        }
      } else {
        // Backup API: Use movie/episode to get detail-like info + episodes
        const res = await apiFetch(`/api/backup-proxy/movie/episode/${id}?page=0`, {});
        if (res.status === 200 && res.data) {
          // In backup API, we might need a search to find the full detail if movie/episode is sparse
          // But usually it returns enough.
          return {
            id: id,
            title: res.data.movie?.title || 'Unknown',
            synopsis: res.data.movie?.synopsis || '',
            image_poster: res.data.movie?.image_poster || null,
            image_cover: res.data.movie?.image_cover || null,
            status: res.data.movie?.status || '',
            type: res.data.movie?.type || '',
            genre: res.data.movie?.genre || '',
            year: res.data.movie?.year || '',
            episode_list: res.data.episode || [],
            episodes: res.data.episode || []
          };
        }
      }
      return null;
    } catch (e) {
      console.error('Error fetching anime detail:', e);
      return null;
    }
  },
  
  async getEpisode(epId: string) {
    const server = await this.getServer();
    try {
      if (server === 'sanka') {
        const res = await apiFetch(`/api/sanka-proxy/episode/${epId}`, {});
        if (res.status === 'success' && res.streams) {
          const title = res.title || 'Nonton Anime';
          const normalizedServers = (res.streams || []).map((s: any) => ({
            name: s.name,
            link: s.url,
            type: (s.url.includes('.mp4') || s.url.includes('.m3u8')) && !s.url.includes('blogger.com') && !s.url.includes('filedon.co') ? 'direct' : 'iframe',
            quality: s.name.includes('720p') ? '720p' : (s.name.includes('1080p') ? '1080p' : (s.name.includes('480p') ? '480p' : s.name))
          }));

          // Prioritize Blogger and FileDon as requested by user
          normalizedServers.sort((a: any, b: any) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const aLink = a.link.toLowerCase();
            const bLink = b.link.toLowerCase();
            
            const isAPriority = aName.includes('blogger') || aName.includes('filedon') || aLink.includes('blogger.com') || aLink.includes('filedon.co');
            const isBPriority = bName.includes('blogger') || bName.includes('filedon') || bLink.includes('blogger.com') || bLink.includes('filedon.co');
            
            if (isAPriority && !isBPriority) return -1;
            if (!isAPriority && isBPriority) return 1;
            return 0;
          });

          return {
            title: title,
            server: normalizedServers
          };
        }
      } else if (server === 'main') {
        const res = await apiFetch(`/api/proxy/episode?id=${epId}`, {});
        if (res.status && res.data) {
          return res.data;
        }
      } else {
        const res = await apiFetch(`/api/backup-proxy/episode/streamnew/${epId}`, {});
        if (res.status === 200 && res.data) {
          // Normalize server list
          const servers = (res.data.server || []).map((s: any) => ({
            id: s.id,
            link: s.link,
            quality: s.quality,
            name: s.name,
            type: s.type
          }));
          
          return {
            ...res.data.episode,
            server: servers,
            next_episode: res.data.episode_next?.index || null
          };
        }
      }
      return null;
    } catch (e) {
      console.error('Error fetching episode info:', e);
      return null;
    }
  },

  async searchAnime(keyword: string, page: number = 1) {
    const server = await this.getServer();
    if (server === 'main') {
      const res = await apiFetch(`/api/proxy/search?keyword=${encodeURIComponent(keyword)}&page=${page}`, {});
      return res.data || [];
    } else if (server === 'sanka') {
      const encodedKeyword = encodeURIComponent(keyword);
      let combined: any[] = [];
      let currentPage = page;
      let hasNext = true;

      // Fetch at least 2 pages on initial search to fill the screen
      for (let i = 0; i < 2; i++) {
        const [res, devRes] = await Promise.all([
           cachedFetch(`/api/sanka-proxy/search/${encodedKeyword}?page=${currentPage + i}`),
           currentPage + i === 1 ? apiFetch(`/api/dev-proxy/search?q=${encodedKeyword}`, []) : Promise.resolve([])
        ]);

        let devArray = [];
        if (devRes && devRes.data && devRes.data[0] && devRes.data[0].result) {
            devArray = devRes.data[0].result.map((item: any) => ({
                id: item.url,
                title: item.judul,
                image_poster: item.cover,
                image_cover: item.cover,
                type: 'TV',
                status: item.status || 'Unknown',
                genre: item.genre?.join(', '),
                isDevEntry: true,
                devTitle: item.judul
            }));
        }

        const sankaArray = (res.animes || []).map(normalizeSankaAnime);
        const blended = [];
        const maxLen = Math.max(devArray.length, sankaArray.length);
        for(let j=0; j<maxLen; j++) {
           if(devArray[j]) blended.push(devArray[j]);
           if(sankaArray[j]) blended.push(sankaArray[j]);
        }

        if (blended.length === 0) break;
        combined = [...combined, ...blended];
        hasNext = res.pagination?.hasNext || false;
        if (!hasNext) break;
      }

      return {
        data: combined,
        pagination: { hasNext, currentPage: page + 1 }
      };
    } else {
      const res = await apiFetch(`/api/backup-proxy/explore/movie?keyword=${encodeURIComponent(keyword)}&limit=50&page=${page}`, {});
      return (res.data?.movie || []).map(normalizeBackupMovie);
    }
  },

  async searchDev(keyword: string) {
    try {
      const res = await apiFetch(`/api/dev-proxy/search?q=${encodeURIComponent(keyword)}`, {});
      const results = res.data?.[0]?.result || [];
      return results.map((item: any) => ({
        id: item.url, // Use url as temporary ID
        title: item.judul,
        image_poster: item.cover,
        image_cover: item.cover, // Use poster as banner as requested
        type: 'TV',
        status: item.status || 'Unknown',
        genre: item.genre?.join(', '),
        isDevEntry: true,
        devTitle: item.judul
      }));
    } catch (e) {
      console.error('Dev Search Error:', e);
      return [];
    }
  },

  async getDevDetailByTitle(title: string) {
    try {
      const searchRes = await apiFetch(`/api/dev-proxy/search?q=${encodeURIComponent(title)}`, {});
      const firstResult = searchRes.data?.[0]?.result?.[0];
      if (!firstResult) return null;
      return this.getDevDetail(firstResult.url);
    } catch (e) {
      console.error('Dev Detail By Title Error:', e);
      return null;
    }
  },

  async getDevDetail(url: string) {
    try {
      const res = await apiFetch(`/api/dev-proxy/detail?url=${encodeURIComponent(url)}`, {});
      const data = res.data?.[0];
      if (!data) return null;

      // Extract chapters accurately
      const episodes = (data.chapter || []).map((ch: any) => {
        const indexMatch = ch.ch.match(/\d+/);
        const index = indexMatch ? indexMatch[0] : ch.id.toString();
        return {
          id: ch.url, // e.g. "al-26740-12"
          index: index,
          title: `Episode ${ch.ch}`,
          date: ch.date
        };
      });

      return {
        id: data.series_id,
        title: data.judul,
        image_poster: data.cover,
        image_cover: data.cover,
        rating: data.rating,
        status: data.status,
        type: data.type,
        published: data.published,
        author: data.author,
        genre: data.genre?.join(', '),
        synopsis: data.sinopsis,
        episodes: episodes, // Keep descending (e.g. 12, 11, 10...)
        episode_list: episodes,
        isDevEntry: true
      };
    } catch (e) {
      console.error('Dev Detail Error:', e);
      return null;
    }
  },

  async getDevStream(epId: string) {
    try {
      // url param for stream is the chapter identifier (e.g. al-26740-12)
      // Standard endpoint for episodes in dev API is /episode
      const res = await apiFetch(`/api/dev-proxy/episode?url=${encodeURIComponent(epId)}`, {});
      const data = res.data?.[0];
      if (!data) return null;

      return {
        ...data,
        server: (data.stream || []).map((s: any) => ({
          id: s.id,
          name: `Dev ${s.reso || 'Auto'} (${s.provide || 'N/A'})`,
          link: s.link,
          quality: s.reso || '720p',
          type: s.link.includes('.m3u8') ? 'hls' : 'direct'
        }))
      };
    } catch (e) {
      console.error('Dev Stream Error:', e);
      return null;
    }
  },

  async getFallbackEpisodeStream(title: string, episodeIndex: number) {
    try {
      // 1. Search for the anime
      const searchRes = await apiFetch(`/api/dev-proxy/search?q=${encodeURIComponent(title)}`, {});
      const firstResult = searchRes.data?.[0]?.result?.[0];
      if (!firstResult) return null;

      // 2. Get details to find the episode URL
      const detailRes = await apiFetch(`/api/dev-proxy/detail?url=${encodeURIComponent(firstResult.url)}`, {});
      const episodes = detailRes.data?.[0]?.chapter || [];
      
      const targetEp = episodes.find((e: any) => {
        const chMatch = e.ch.match(/\d+/);
        return chMatch && parseInt(chMatch[0]) === episodeIndex;
      });

      if (!targetEp) return null;

      // 3. Get stream link using standardized getDevStream
      const streamData = await this.getDevStream(targetEp.url);
      if (!streamData) return null;

      return {
        ...detailRes.data?.[0], // include metadata
        ...streamData,
        isFallback: true
      };
    } catch (e) {
      console.error('Fallback Stream Error:', e);
      return null;
    }
  },
};
