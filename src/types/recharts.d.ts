declare module 'recharts' {
  import * as React from 'react';

  export interface XAxisProps {
    dataKey?: string | number | ((obj: any) => any);
    tick?: any;
    className?: string;
    [key: string]: any;
  }

  export interface YAxisProps {
    className?: string;
    [key: string]: any;
  }

  export interface CartesianGridProps {
    strokeDasharray?: string | number;
    className?: string;
    [key: string]: any;
  }

  export interface TooltipProps {
    contentStyle?: React.CSSProperties;
    [key: string]: any;
  }

  export interface LegendProps {
    [key: string]: any;
  }

  export interface LineProps {
    type?: string;
    dataKey?: string | number | ((obj: any) => any);
    stroke?: string;
    name?: string;
    strokeWidth?: number;
    dot?: any;
    activeDot?: any;
    [key: string]: any;
  }

  export interface BarProps {
    dataKey?: string | number | ((obj: any) => any);
    fill?: string;
    name?: string;
    radius?: number | number[];
    [key: string]: any;
  }

  export interface AreaProps {
    type?: string;
    dataKey?: string | number | ((obj: any) => any);
    stroke?: string;
    fill?: string;
    name?: string;
    strokeWidth?: number;
    [key: string]: any;
  }

  export interface PieProps {
    data?: any[];
    dataKey?: string | number | ((obj: any) => any);
    nameKey?: string;
    cx?: string | number;
    cy?: string | number;
    innerRadius?: string | number;
    outerRadius?: string | number;
    fill?: string;
    label?: any;
    [key: string]: any;
  }

  export interface CellProps {
    fill?: string;
    [key: string]: any;
  }

  export interface ResponsiveContainerProps {
    width?: string | number;
    height?: string | number;
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface LineChartProps {
    data?: any[];
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface BarChartProps {
    data?: any[];
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface AreaChartProps {
    data?: any[];
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface PieChartProps {
    children?: React.ReactNode;
    [key: string]: any;
  }

  export const XAxis: React.FC<XAxisProps>;
  export const YAxis: React.FC<YAxisProps>;
  export const CartesianGrid: React.FC<CartesianGridProps>;
  export const Tooltip: React.FC<TooltipProps>;
  export const Legend: React.FC<LegendProps>;
  export const Line: React.FC<LineProps>;
  export const Bar: React.FC<BarProps>;
  export const Area: React.FC<AreaProps>;
  export const Pie: React.FC<PieProps>;
  export const Cell: React.FC<CellProps>;
  export const ResponsiveContainer: React.FC<ResponsiveContainerProps>;
  export const LineChart: React.FC<LineChartProps>;
  export const BarChart: React.FC<BarChartProps>;
  export const AreaChart: React.FC<AreaChartProps>;
  export const PieChart: React.FC<PieChartProps>;
}
