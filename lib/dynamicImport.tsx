"use client";

import React, { lazy, Suspense } from "react";
import { isLowEndDevice } from "./utils";

interface DynamicImportOptions {
  ssr?: boolean;
  loading?: React.ReactNode;
}

/**
 * Dynamically imports components based on device capabilities
 * Low-end devices get simplified versions, high-end devices get full versions
 */
export function createDynamicComponent<Props>(
  standardPath: string,
  lightPath: string,
  options: DynamicImportOptions = {}
) {
  const { loading = null } = options;
  
  // Create the dynamic component
  return function DynamicComponent(props: Props) {
    // Determine which component to load based on device capabilities
    const [Component, setComponent] = React.useState<React.ComponentType<Props> | null>(null);
    
    React.useEffect(() => {
      const isLowEnd = isLowEndDevice();
      const importPath = isLowEnd ? lightPath : standardPath;
      
      import(importPath)
        .then((module) => {
          setComponent(() => module.default);
        })
        .catch((err) => {
          console.error(`Failed to load component: ${err.message}`);
          // Fall back to standard version if light version fails
          if (isLowEnd) {
            import(standardPath)
              .then((module) => {
                setComponent(() => module.default);
              })
              .catch(console.error);
          }
        });
    }, []);
    
    if (!Component) {
      return <>{loading}</>;
    }
    
    return <Component {...props} />;
  };
}

/**
 * Creates a simplified loading component to show while dynamic components load
 */
export function createLoadingSkeleton(height: string | number, width: string | number) {
  return () => (
    <div 
      className="animate-pulse bg-gray-200 rounded" 
      style={{ height, width }}
    />
  );
} 