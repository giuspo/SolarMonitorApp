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

export function useChartFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  const updateOrientation = useCallback(() => {
    const orientType = typeof screen !== 'undefined' ? screen.orientation?.type : undefined;
    const isLand =
      (orientType ? orientType.startsWith('landscape') : false) ||
      window.innerWidth > window.innerHeight;
    setIsLandscape(isLand);
    setViewportHeight(window.innerHeight);
  }, []);

  useEffect(() => {
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    const screenOrient = typeof screen !== 'undefined' ? screen.orientation : null;
    if (screenOrient && screenOrient.addEventListener) {
      screenOrient.addEventListener('change', updateOrientation);
    }
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
      if (screenOrient && screenOrient.removeEventListener) {
        screenOrient.removeEventListener('change', updateOrientation);
      }
    };
  }, [updateOrientation]);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        try {
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
        } catch {
          // Ignora se non supportato
        }
      }
      updateOrientation();
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [updateOrientation]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        }
        const orientation = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> };
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape').catch(() => {});
        }
      } catch {
        // Fallback automatico al fullscreen CSS
      }
      updateOrientation();
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch {
        // Ignora errori di uscita
      }
      updateOrientation();
    }
  };

  return { isFullscreen, isLandscape, viewportHeight, toggleFullscreen };
}
