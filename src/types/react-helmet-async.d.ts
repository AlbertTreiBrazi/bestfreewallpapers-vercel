declare module 'react-helmet-async' {
  import * as React from 'react';

  export interface HelmetProps {
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface HelmetProviderProps {
    children?: React.ReactNode;
    context?: any;
  }

  export const Helmet: React.FC<HelmetProps>;
  export const HelmetProvider: React.FC<HelmetProviderProps>;
}
