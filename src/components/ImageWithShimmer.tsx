import { useState } from "react";

interface ImageWithShimmerProps {
  src: string;
  alt: string;
  className?: string;
  /** Extra classes for the wrapper div, e.g. to make it fill its parent */
  wrapperClassName?: string;
  onError?: () => void;
}

export default function ImageWithShimmer({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  onError,
}: ImageWithShimmerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return null;
  }

  return (
    <div className={`relative ${wrapperClassName}`}>
      {isLoading && (
        <div
          className={`absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-shimmer ${className}`}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
