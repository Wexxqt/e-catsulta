"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useDeviceOptimization } from "./ThemeProvider";
import { getOptimizedImageQuality } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  sizes = "100vw",
  quality,
  ...props
}: OptimizedImageProps) {
  const { isLowEndDevice, prefersReducedData } = useDeviceOptimization();
  const [loaded, setLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  // Determine if we should show a placeholder or blurred image initially
  const shouldOptimize = isLowEndDevice || prefersReducedData;

  // For SVGs, use them directly as they're already small
  const isSVG = src.endsWith('.svg');

  // Set image quality based on device capabilities
  const imageQuality = quality || (shouldOptimize ? getOptimizedImageQuality() : 75);

  useEffect(() => {
    // For low-end devices, we might want to load images only when needed
    if (!priority && shouldOptimize && typeof IntersectionObserver !== 'undefined') {
      // Create a placeholder div to observe
      const placeholderElement = document.createElement('div');
      placeholderElement.setAttribute('data-src', src);
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Set the image source when it's about to come into view
            setImgSrc(src);
            observer.disconnect();
          }
        });
      }, { rootMargin: '200px' }); // Load images 200px before they come into view
      
      if (placeholderElement) {
        observer.observe(placeholderElement);
      }
      
      return () => {
        if (placeholderElement) {
          observer.unobserve(placeholderElement);
        }
      };
    } else {
      // For higher-end devices or priority images, load immediately
      setImgSrc(src);
    }
  }, [src, priority, shouldOptimize]);

  // For SVGs, use regular next/image with no optimizations as they're already small
  if (isSVG) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        sizes={sizes}
        {...props}
      />
    );
  }

  // Show loading state if necessary
  if (!imgSrc && !priority) {
    return (
      <div 
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width: width || '100%', height: height || '100%' }}
        role="img"
        aria-label={alt}
        {...props}
      />
    );
  }

  return (
    <div className={`relative ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
      {imgSrc && (
        <Image
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          className={`${className} ${loaded ? '' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          priority={priority}
          sizes={sizes}
          quality={imageQuality}
          {...props}
        />
      )}
    </div>
  );
} 