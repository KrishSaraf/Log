const PALETTE = [
  "#7B8CFF",
  "#FF8A3D",
  "#F472B6",
  "#22D3EE",
  "#C084FC",
  "#F4B942",
  "#4ADE80",
  "#FB7185",
] as const;

const BY_KEY: Record<string, string> = {
  gym: "#7B8CFF",
  cardio_sport: "#FF8A3D",
  diet: "#4ADE80",
  protein: "#F4B942",
  morning_skincare: "#F472B6",
  night_clean: "#FB7185",
  brush: "#22D3EE",
  m: "#C084FC",
  doc_rehab: "#F07167",
  multivitamin: "#A3E635",
};

const BLURB: Record<string, string> = {
  gym: "Lift, run, or train",
  cardio_sport: "A run, a match, a session",
  diet: "Eat the way you meant to",
  protein: "Hit the day’s protein",
  morning_skincare: "Face, SPF, the morning set",
  night_clean: "Wash up before bed",
  brush: "Brush your teeth",
  m: "Keep it going",
  doc_rehab: "Rehab work",
  multivitamin: "Take it",
};

export function habitColor(key: string) {
  if (BY_KEY[key]) return BY_KEY[key];
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}

export function habitBlurb(key: string) {
  return BLURB[key] ?? "Mark the day you do it";
}
