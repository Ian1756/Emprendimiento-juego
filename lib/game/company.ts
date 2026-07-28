/**
 * Resultado de la partida: tamaño y rubro de la empresa (§2.4 y §2.5).
 * Lo calculan cliente y servidor con esta misma función.
 */
import {
  COMPANY_SIZE_LABEL,
  companySizeForScore,
  dominantColorIndex,
  TILE_COLORS,
  type ColorCounts,
  type CompanySize,
} from './rules';

export interface CompanyResult {
  size: CompanySize;
  sizeLabel: string;
  colorIndex: number;
  colorLabel: string;
  type: string;
  description: string;
  icon: string;
}

export function companyFor(score: number, colorCounts: ColorCounts): CompanyResult {
  const size = companySizeForScore(score);
  const colorIndex = dominantColorIndex(colorCounts);
  const color = TILE_COLORS[colorIndex] ?? TILE_COLORS[0];

  return {
    size,
    sizeLabel: COMPANY_SIZE_LABEL[size],
    colorIndex,
    colorLabel: color.label,
    type: color.company,
    description: color.description,
    icon: color.icon,
  };
}
