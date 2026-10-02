export const CATEGORICAL_CHART_COLORS = [
  "#3987e5", // azul
  "#199e70", // aguamarina
  "#c98500", // amarillo
  "#008300", // verde
  "#9085e9", // violeta
  "#e66767", // rojo
  "#d55181", // magenta
  "#d95926", // naranja
];

export const CHART_SINGLE_SERIES_COLOR = "#3987e5";
export const CHART_INCOME_COLOR = "#008300";
export const CHART_EXPENSE_COLOR = "#e66767";
export const CHART_OTHER_COLOR = "#64748b";
export const CHART_GRID_COLOR = "#334155";
export const CHART_AXIS_COLOR = "#94a3b8";

export function hashStringToIndex(id: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % modulo;
  }
  return Math.abs(hash) % modulo;
}

export function getCategoricalColor(id: string): string {
  return CATEGORICAL_CHART_COLORS[hashStringToIndex(id, CATEGORICAL_CHART_COLORS.length)];
}
