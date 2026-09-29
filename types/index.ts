export type CategoryKey = "love" | "career" | "wealth" | "health" | "growth";

export interface Insight {
  title: string;
  text: string;
}

export interface ReadingSection {
  /** One evocative sentence. */
  headline: string;
  /** 1-2 sentence interpretation grounded in the palm features. */
  summary?: string;
  /** Short name of the palm feature this reading is drawn from, e.g. "Curved Heart Line". */
  feature?: string;
  /** Older readings stored plain strings; newer ones store titled insights. */
  insights: (Insight | string)[];
}

export type ReadingJSON = Record<CategoryKey, ReadingSection> & {
  extra?: ReadingSection | null;
};

export interface Usage {
  free_predictions_used: number;
  free_chat_questions_used: number;
  paid_credits: number;
}

export interface Reading {
  id: string;
  user_id: string;
  palm_image_path: string;
  prediction: ReadingJSON;
  is_paid: boolean;
  created_at: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export const CATEGORIES: { key: CategoryKey; label: string; aspect: string }[] = [
  { key: "love", label: "Love & Relationships", aspect: "Aspect I · Venus Axis" },
  { key: "career", label: "Career & Purpose", aspect: "Aspect II · Saturn Apex" },
  { key: "wealth", label: "Wealth & Finances", aspect: "Aspect III · Jupiter Mount" },
  { key: "health", label: "Health & Vitality", aspect: "Aspect IV · Life Line" },
  { key: "growth", label: "Personal Growth", aspect: "Aspect V · Apollo Rise" },
];

export const PRICE_PAISE = 9900;
export const BUCKET = "palm-images";
