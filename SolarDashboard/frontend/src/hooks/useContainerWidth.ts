import { useState, useEffect, useCallback } from 'react';

export function useContainerWidth(defaultWidth = 800) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : defaultWidth
  );

  const ref = useCallback((node: HTMLDivElement | null) => {
    setElement(node);
    if (node) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
      }
    }
  }, []);

  useEffect(() => {
    if (!element) return;

    const updateWidth = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0) {
        setWidth(rect.width);
      }
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref, width };
}

