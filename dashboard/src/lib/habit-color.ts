const PALETTE = [
  "#3DDC97",
  "#5B8CFF",
  "#E8A838",
  "#E889B3",
  "#8B7CFF",
  "#4EC4E0",
  "#F07167",
  "#C084FC",
] as const;

const BY_KEY: Record<string, string> = {
  gym: "#3DDC97",
  cardio_sport: "#5B8CFF",
  diet: "#6BCB77",
  protein: "#E8A838",
  morning_skincare: "#E889B3",
  night_clean: "#8B7CFF",
  brush: "#4EC4E0",
  m: "#C084FC",
  doc_rehab: "#F07167",
  multivitamin: "#A3D977",
};

export function habitColor(key: string) {
  if (BY_KEY[key]) return BY_KEY[key];
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}
