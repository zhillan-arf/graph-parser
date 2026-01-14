import { useCallback, useEffect, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';

// Zoom level when clicking on a topic in Learning Path (fitView with padding 0.5 on single node)
// This is approximately a 2x zoom level based on the node size and padding
const MAX_ZOOM_IN = 2;

interface ZoomSliderProps {
  className?: string;
}

export default function ZoomSlider({ className }: ZoomSliderProps) {
  const { zoomTo, fitView, getZoom } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);

  // Track the min zoom (fit view zoom level)
  const [minZoom, setMinZoom] = useState(0.1);

  // Calculate the fit view zoom level on mount and when viewport changes
  useEffect(() => {
    // Get the current zoom after fitView would be applied
    // We need to detect what zoom level "Fit View" would result in
    const currentZoom = getZoom();

    // Store the minimum zoom as the fit view zoom level
    // This will be updated when fitView is called
    if (currentZoom < minZoom || minZoom === 0.1) {
      setMinZoom(Math.max(0.1, currentZoom));
    }
  }, [getZoom, minZoom]);

  // Update minZoom when fit view is triggered externally
  const updateMinZoomFromFitView = useCallback(() => {
    // Delay to allow fitView animation to complete
    setTimeout(() => {
      const newZoom = getZoom();
      setMinZoom(newZoom);
    }, 150);
  }, [getZoom]);

  // Listen for fit view events (when user clicks "Fit View" button)
  useEffect(() => {
    const handleFitView = () => {
      updateMinZoomFromFitView();
    };

    // Check initial zoom after first render
    const timer = setTimeout(() => {
      const initialZoom = getZoom();
      if (initialZoom > 0) {
        setMinZoom(initialZoom);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [getZoom, updateMinZoomFromFitView]);

  // Convert zoom level to slider percentage (0-100)
  const zoomToPercent = useCallback((z: number) => {
    // Clamp zoom to valid range
    const clampedZoom = Math.max(minZoom, Math.min(MAX_ZOOM_IN, z));
    // Linear interpolation from minZoom-MAX_ZOOM_IN to 0-100
    return ((clampedZoom - minZoom) / (MAX_ZOOM_IN - minZoom)) * 100;
  }, [minZoom]);

  // Convert slider percentage to zoom level
  const percentToZoom = useCallback((percent: number) => {
    // Linear interpolation from 0-100 to minZoom-MAX_ZOOM_IN
    return minZoom + (percent / 100) * (MAX_ZOOM_IN - minZoom);
  }, [minZoom]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const newZoom = percentToZoom(percent);
    zoomTo(newZoom, { duration: 100 });
  }, [percentToZoom, zoomTo]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM_IN, zoom * 1.2);
    zoomTo(newZoom, { duration: 200 });
  }, [zoom, zoomTo]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(minZoom, zoom / 1.2);
    zoomTo(newZoom, { duration: 200 });
  }, [zoom, minZoom, zoomTo]);

  const handleFitViewClick = useCallback(() => {
    fitView({ padding: 0.1, duration: 300 });
    updateMinZoomFromFitView();
  }, [fitView, updateMinZoomFromFitView]);

  const sliderValue = zoomToPercent(zoom);
  const zoomPercent = Math.round((zoom / minZoom) * 100);

  return (
    <div className={`zoom-slider ${className || ''}`}>
      <button
        className="zoom-btn zoom-out"
        onClick={handleZoomOut}
        disabled={zoom <= minZoom}
        title="Zoom out"
      >
        −
      </button>
      <div className="zoom-slider-track">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={sliderValue}
          onChange={handleSliderChange}
          className="zoom-slider-input"
          title={`Zoom: ${zoomPercent}%`}
        />
      </div>
      <button
        className="zoom-btn zoom-in"
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM_IN}
        title="Zoom in"
      >
        +
      </button>
      <button
        className="zoom-btn fit-view"
        onClick={handleFitViewClick}
        title="Fit to view"
      >
        ⊡
      </button>
    </div>
  );
}
