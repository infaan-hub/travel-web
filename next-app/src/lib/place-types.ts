export type PlaceSuggestion = {
  id: string;
  name: string;
  category: string;
  area: string;
  region: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
};
