export interface ComplaintOption {
  value: string;
  label: string;
}

export interface ComplaintGroup {
  title: string;
  description?: string;
  items: ComplaintOption[];
}

/**
 * Values for the first two groups must stay identical to the shared
 * MajorRedFlags / MinorSideEffects enums: the backend rule engine only
 * classifies exact matches. General complaints are stored as free text and
 * do not affect the safety verdict.
 */
export const COMPLAINT_GROUPS: ComplaintGroup[] = [
  {
    title: "Keluhan ringan",
    description: "Biasanya wajar, tetap laporkan agar Pandu memantau.",
    items: [
      { value: "MUAL_RINGAN", label: "Mual ringan" },
      { value: "URINE_MERAH", label: "Air seni kemerahan" },
      { value: "NYERI_SENDI_RINGAN", label: "Nyeri sendi ringan" },
      { value: "MENGANTUK_LEMAS", label: "Mengantuk / lemas" },
    ],
  },
  {
    title: "Keluhan berat",
    description: "Pilih ini agar tim faskes segera menindaklanjuti.",
    items: [
      { value: "BATUK_DARAH", label: "Batuk berdarah" },
      { value: "SESAK_NAPAS", label: "Sesak napas" },
      { value: "KUNING_IKTERIK", label: "Kulit / mata menguning" },
      { value: "MUNTAH_HEBAT", label: "Muntah hebat" },
      { value: "GANGGUAN_PENGLIHATAN", label: "Gangguan penglihatan" },
      { value: "GANGGUAN_PENDENGARAN", label: "Gangguan pendengaran" },
      { value: "RUAM_KULIT_BERAT", label: "Ruam kulit berat" },
      { value: "DEMAM_TINGGI_MENETAP", label: "Demam tinggi menetap" },
    ],
  },
  {
    title: "Keluhan umum",
    items: [
      { value: "PUSING", label: "Pusing" },
      { value: "DIARE", label: "Diare" },
      { value: "SEMBELIT", label: "Sembelit" },
      { value: "NYERI_PERUT", label: "Nyeri perut" },
      { value: "SAKIT_KEPALA", label: "Sakit kepala" },
      { value: "NAFSU_MAKAN_TURUN", label: "Nafsu makan menurun" },
      { value: "DEMAM", label: "Demam" },
      { value: "BATUK", label: "Batuk" },
      { value: "NYERI_TENGGOROKAN", label: "Nyeri tenggorokan" },
      { value: "SULIT_TIDUR", label: "Sulit tidur" },
      { value: "JANTUNG_BERDEBAR", label: "Jantung berdebar" },
    ],
  },
];

export function complaintLabel(value: string): string {
  for (const group of COMPLAINT_GROUPS) {
    const match = group.items.find((item) => item.value === value);
    if (match) return match.label;
  }
  return value;
}

export const MAX_CUSTOM_COMPLAINT_LENGTH = 60;
