export interface Skill {
  id: string;
  name: string;
  category: string;
  level: number;
  maxLevel: number;
  deps: string[];
  costPerLevel?: number;
}
