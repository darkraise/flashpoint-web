export interface ChartPayloadItem {
  value: number | string;
  name?: string;
  dataKey?: string;
  color?: string;
  fill?: string;
  stroke?: string;
  payload?: Record<string, unknown>;
}

export interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string;
}

export interface CustomLegendProps {
  payload?: readonly {
    value?: string;
    type?: string;
    color?: string;
  }[];
}
