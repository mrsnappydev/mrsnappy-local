'use client';

import { useState } from 'react';
import { ExternalLink, ImageIcon, X, ZoomIn } from 'lucide-react';
import { ImageSearchResult, ImageResult } from '@/lib/tools';

interface ImageResultCardProps {
  result: ImageSearchResult;
}

export default function ImageResultCard({ result }: ImageResultCardProps) {
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (imageUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imageUrl));
  };

  return (
    <>
      <div className="my-4 rounded-xl bg-purple-500/5 border border-purple-500/30 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400">
            <ImageIcon className="w-4 h-4" />
            <span className="font-medium">Images: "{result.query}"</span>
          </div>
        </div>

        {/* Image Grid */}
        {result.images.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-500">
            No images found
          </div>
        ) : (
          <div className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {result.images.map((image, index) => (
                <ImageThumbnail
                  key={index}
                  image={image}
                  failed={failedImages.has(image.thumbnail)}
                  onError={() => handleImageError(image.thumbnail)}
                  onClick={() => setSelectedImage(image)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">
            {result.images.length} image{result.images.length !== 1 ? 's' : ''} found • Click to view full size
          </p>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <ImageLightbox
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}

interface ImageThumbnailProps {
  image: ImageResult;
  failed: boolean;
  onError: () => void;
  onClick: () => void;
}

function ImageThumbnail({ image, failed, onError, onClick }: ImageThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800/50 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all"
      onClick={onClick}
    >
      {/* Loading State */}
      {isLoading && !failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Failed State */}
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
          <ImageIcon className="w-8 h-8 mb-1" />
          <span className="text-xs">Failed to load</span>
        </div>
      ) : (
        <img
          src={image.thumbnail}
          alt={image.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            onError();
          }}
        />
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="text-xs text-white font-medium line-clamp-2">{image.title}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{image.source}</p>
        </div>
        <div className="absolute top-2 right-2">
          <ZoomIn className="w-5 h-5 text-white/80" />
        </div>
      </div>
    </div>
  );
}

interface ImageLightboxProps {
  image: ImageResult;
  onClose: () => void;
}

function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Image Container */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Full Image */}
        <img
          src={image.image}
          alt={image.title}
          className={`max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />

        {/* Image Info */}
        <div className="mt-4 text-center">
          <h3 className="text-white font-medium text-lg">{image.title}</h3>
          <a
            href={image.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span>View on {image.source}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          {image.width && image.height && (
            <p className="text-xs text-zinc-500 mt-1">
              {image.width} × {image.height}
            </p>
          )}
        </div>

        {/* Open Full Size Button */}
        <a
          href={image.image}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
          Open Full Size
        </a>
      </div>
    </div>
  );
}

export { ImageResultCard };
