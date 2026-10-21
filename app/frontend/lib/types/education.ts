export interface EducationCard {
  id: string;
  title: string;
  summary: string;
  contentMarkdown: string;
  category: string;
  phase: "INTENSIF" | "LANJUTAN";
}
