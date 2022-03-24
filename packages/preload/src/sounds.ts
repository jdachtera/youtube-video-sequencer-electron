type SoundsDotComResponse = {
  result: {
    sounds: Sound[];
    sounds_releases: SoundsRelease[];
    total_results: string;
    next_page: string;
  };
};
type Category = {
  id: string;
  name: string;
  type: string;
  chain: [];
};

type Sound = {
  id: string;
  name: string;
  tier: string;
  traditional_key: string;
  duration: string;
  bpm: string;
  type: string;
  file_name: string;
  spectrum: string;
  waveform: string;
  signature: string;
  preview: string;
  preview_mp3: string;
  is_exclusive: boolean;
  categories: Category[];
  release_id: string;
  publisher_id: string;
  bit_depth: string;
  sample_rate: string;
};

type ReleaseDemo = {
  id: string;
  release_id: string;
  name: string;
  mp3: string;
};

type Genre = {
  id: string;
  name: string;
};

type GenreGroup = {
  id: string;
  name: string;
};

type SoundsRelease = {
  id: string;
  name: string;
  description: string;
  publisher_id: string;
  tier: string;
  type: string;
  label: string;
  release_date: string;
  is_exclusive: boolean;
  is_templateable: boolean;
  parent_publisher_id: string;
  total_sounds: string;
  cover_small: string;
  cover_large: string;
  publisher_name: string;
  demos: ReleaseDemo[];
  genres: Genre[];
  genre_groups: GenreGroup;
};

const soundsDotCom = (() => {
  const API_URL = 'https://cdn-api-prd.sounds.com/api';

  const searchSounds = async ({
    instrument = '',
    character = '',
    type = 'one-shot',
    page = 0,
    limit = 20,
    ids = [],
    keyword = '',
  }) => {
    const params = new URLSearchParams({
      instrument,
      character,
      type,
      page: page.toString(),
      sound_id: ids.join(','),
      limit: limit.toString(),
      keyword,
    });

    [...params.keys()].forEach((name) => {
      if (!params.get(name) || params.get(name) === '') {
        params.delete(name);
      }
    });

    const response = await fetch(`${API_URL}/search?${params.toString()}`);
    const data = (await response.json()) as SoundsDotComResponse;

    return data;
  };

  const randomPage = () => Math.round(Math.random() * 100);

  const fetchRandomizedSound = async (
    instrument?: string,
    character?: string,
  ) => {
    const {
      result: { sounds },
    } = await searchSounds({
      instrument,
      character,
      page: randomPage(),
      limit: 10,
    });

    return sounds[Math.round(Math.random() * sounds.length)];
  };

  return {
    fetchRandomizedSound,
    searchSounds,
  };
})();

export default soundsDotCom;
