export type IsoDateString = string;

export interface User {
  role: string;
  goals: string[];
  startDate: IsoDateString;
}
