/**
 * Chart Component Types
 *
 * Type definitions for Recharts component props (tooltips, legends, etc.)
 */

/**
 * Recharts payload item structure
 */
export interface ChartPayloadItem {
  value: number | string;
  name?: string;
  dataKey?: string;
  color?: string;
  fill?: string;
  stroke?: string;
  payload?: Record<string, unknown>;
}

/**
 * Custom tooltip props for Recharts
 */
export interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string;
}

/**
 * Custom legend props for Recharts
 */
export interface CustomLegendProps {
  payload?: readonly {
    value?: string;
    type?: string;
    color?: string;
  }[];
}
