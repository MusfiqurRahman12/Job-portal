'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ImageUploaderProps {
  label: string;
  aspectRatio: number; // e.g. 16/9 or 1
  maxWidth: number;
  maxHeight: number;
  onImageCropped: (base64: string) => void;
  initialImageUrl?: string;
}

export default function ImageUploaderWithResizer({
  label,
  aspectRatio,
  maxWidth,
  maxHeight,
  onImageCropped,
  initialImageUrl = '',
}: ImageUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [croppedImage, setCroppedImage] = useState<string>(initialImageUrl);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Crop Tool Interaction States
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Read file and set as image source
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
        setIsModalOpen(true);
        // Reset states for new image
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  };

  const drawOverlay = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const cropWidth = canvas.width;
    const cropHeight = canvas.height;

    // Outer shade
    ctx.fillStyle = 'rgba(6, 6, 10, 0.65)';
    
    // If it's a 1:1, let's draw a circular crop frame to visual aid logo design, else rectangular
    if (aspectRatio === 1) {
      ctx.beginPath();
      ctx.rect(0, 0, cropWidth, cropHeight);
      ctx.arc(cropWidth / 2, cropHeight / 2, cropWidth / 2 - 4, 0, Math.PI * 2, true);
      ctx.fill();

      // Circular border outline
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cropWidth / 2, cropHeight / 2, cropWidth / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 16:9 Rectangular crop outline
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(2, 2, cropWidth - 4, cropHeight - 4);
    }
  }, [aspectRatio]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    
    // Move to canvas center, apply translation + scale
    ctx.translate(canvas.width / 2 + position.x, canvas.height / 2 + position.y);
    ctx.scale(scale, scale);
    
    // Calculate size to fit canvas height/width while preserving aspect ratio
    const imgRatio = img.width / img.height;
    let drawWidth = canvas.width;
    let drawHeight = canvas.width / imgRatio;
    
    if (drawHeight < canvas.height) {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgRatio;
    }
    
    // Draw centered image
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    
    ctx.restore();

    // Draw crop guidelines / overlay
    drawOverlay(ctx, canvas);
  }, [scale, position, drawOverlay]);

  // Canvas drawing loop
  useEffect(() => {
    if (!isModalOpen || !imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [isModalOpen, imageSrc, drawCanvas]);

  // Drag interaction math
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Process the final crop
  const handleCropApply = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    // Create a temporary canvas at maximum output dimensions
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = maxWidth;
    outputCanvas.height = maxHeight;
    
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    // Draw background color if png has transparency (converts cleanly to jpeg)
    outputCtx.fillStyle = '#ffffff';
    outputCtx.fillRect(0, 0, maxWidth, maxHeight);

    // Calculate crop parameters
    // We map the crop viewport boundaries back to the source image space
    const viewWidth = canvas.width;
    const viewHeight = canvas.height;
    
    const imgRatio = img.width / img.height;
    let fitWidth = viewWidth;
    let fitHeight = viewWidth / imgRatio;
    
    if (fitHeight < viewHeight) {
      fitHeight = viewHeight;
      fitWidth = viewHeight * imgRatio;
    }

    // Scale mapping factor
    const renderScale = scale;
    const scaleFactor = img.width / (fitWidth * renderScale);

    // Center offsets of the image relative to viewport center
    const sourceX = (img.width / 2) - (position.x * scaleFactor) - (viewWidth / 2 * scaleFactor);
    const sourceY = (img.height / 2) - (position.y * scaleFactor) - (viewHeight / 2 * scaleFactor);
    
    const sourceWidth = viewWidth * scaleFactor;
    const sourceHeight = viewHeight * scaleFactor;

    outputCtx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      maxWidth,
      maxHeight
    );

    // Convert to compressed jpeg base64
    const base64 = outputCanvas.toDataURL('image/jpeg', 0.85);
    setCroppedImage(base64);
    onImageCropped(base64);
    setIsModalOpen(false);
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setCroppedImage('');
    setImageSrc('');
    onImageCropped('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Determine container styling sizes for crop preview canvas
  const canvasDisplayWidth = aspectRatio === 1 ? 260 : 400;
  const canvasDisplayHeight = canvasDisplayWidth / aspectRatio;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      
      {!croppedImage ? (
        // Dropzone Area
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerSelectFile}
          className="border-2 border-dashed border-gray-800 hover:border-gray-700 bg-[#12121a]/50 hover:bg-[#151522]/50 transition-all rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center min-h-[140px] group relative overflow-hidden"
        >
          <svg className="w-8 h-8 text-gray-500 mb-2 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-semibold text-gray-300">Drag & drop your image here</p>
          <p className="text-xs text-gray-500 mt-1">Or click to browse from system files</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      ) : (
        // Preview Area with Resets
        <div className="relative inline-block group">
          <div className="rounded-xl overflow-hidden border border-gray-800 bg-[#13131c]">
            {aspectRatio === 1 ? (
              // Circular company logo preview
              <img
                src={croppedImage}
                alt="Logo preview"
                className="w-24 h-24 object-cover rounded-full border border-blue-500/30 p-1 bg-white/5"
              />
            ) : (
              // Widescreen article banner preview
              <img
                src={croppedImage}
                alt="Banner preview"
                className="w-[280px] sm:w-[350px] aspect-[16/9] object-cover"
              />
            )}
          </div>
          
          {/* Clear Button */}
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
            title="Remove image"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Cropper Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020204]/90 backdrop-blur-md">
          <div className="bg-[#0f0f16] border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Adjust and Resize Image</h3>
            <p className="text-xs text-gray-400 mb-4">Drag the image to position, and use the slider to scale.</p>

            {/* Canvas Container */}
            <div className="flex justify-center mb-6">
              <div 
                className="border border-gray-800 bg-black/60 rounded-lg overflow-hidden cursor-move select-none"
                style={{ width: `${canvasDisplayWidth}px`, height: `${canvasDisplayHeight}px` }}
              >
                <canvas
                  ref={canvasRef}
                  width={canvasDisplayWidth}
                  height={canvasDisplayHeight}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Scale Slider Control */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-semibold text-gray-400">
                <span>Zoom / Scale</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-800 hover:bg-white/5 text-gray-300 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropApply}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-blue-500/10 transition-colors cursor-pointer"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
