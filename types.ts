export enum ForceLevel {
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
  LEVEL_4 = 4,
  LEVEL_5 = 5
}

export interface IncidentReport {
  timestamp: string;
  location: { lat: number; lng: number } | null;
  officerReady: boolean; // Uniform & CNV check
  forceLevel: ForceLevel;
  rawDescription: string;
  refinedDescription: string;
  legalJustification: string;
}

export const FORCE_LEVEL_DETAILS = {
  [ForceLevel.LEVEL_1]: {
    label: "Presença Física",
    description: "Postura e inibição",
    color: "text-white",
    borderColor: "border-white",
    legal: "Art. 23 Dec. 89.056"
  },
  [ForceLevel.LEVEL_2]: {
    label: "Verbalização",
    description: "Diálogo e ordens legais",
    color: "text-[#FFB300]", // Âmbar
    borderColor: "border-[#FFB300]",
    legal: "Ética e Urbanidade"
  },
  [ForceLevel.LEVEL_3]: {
    label: "Controle de Contato",
    description: "Imobilizações sem armas",
    color: "text-orange-500",
    borderColor: "border-orange-500",
    legal: "Uso Progressivo da Força"
  },
  [ForceLevel.LEVEL_4]: {
    label: "Técnicas Não Letais",
    description: "Elastômeros, gases, bastões",
    color: "text-red-500",
    borderColor: "border-red-500",
    legal: "Meio Proporcional"
  },
  [ForceLevel.LEVEL_5]: {
    label: "Força Letal",
    description: "Uso de arma de fogo",
    color: "text-[#D32F2F]", // Vermelho Operacional
    borderColor: "border-[#D32F2F]",
    legal: "Legítima Defesa (Art. 25 CP)"
  }
};