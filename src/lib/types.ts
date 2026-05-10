/**
 * Shared TypeScript types (client-safe, no Node.js imports)
 */

export interface ImageItem {
  filename: string;
  metadata?: {
    positive_prompt?: string;
    negative_prompt?: string;
    sampling_steps?: string;
    sampling_method?: string;
    cfg_scale?: string;
    seed?: string;
    width?: string;
    height?: string;
    model?: string;
  };
}

export interface LoraItem {
  name: string;
  link?: string;
}

export interface CheckpointItem {
  name: string;
  link?: string;
}

export interface PromptItem {
  id: string;
  title: string;
  tags: string[];
  hidden_tags?: string[];
  positive_prompt?: string;
  negative_prompt?: string;
  cfg_scale?: string;
  sampling_steps?: string;
  sampling_method?: string;
  width?: number;
  height?: number;
  seed?: string;
  is_nsfw?: boolean;
  is_slideshow?: boolean;
  checkpoints?: CheckpointItem[];
  loras?: LoraItem[];
  images?: ImageItem[];
  image_filenames?: string[];
  image_filename?: string;
  /** Custom cover set at upload time */
  series_cover_image?: string;
  char_cover_image?: string;
  created_at: number;
}

export interface SeriesAlbum {
  series: string;
  slug: string;
  characters: CharacterAlbum[];
  coverImage: string;
  totalImages: number;
}

export interface CharacterAlbum {
  character: string;
  slug: string;
  series: string;
  seriesSlug: string;
  coverImage: string;
  items: PromptItem[];
  totalImages: number;
}
