import React from 'react'
import { type CardDesign } from '@/lib/supabase'

interface CardPreviewProps {
  design: CardDesign
  className?: string
  maxWidth?: number
  maxHeight?: number
}

export default function CardPreview({ 
  design, 
  className = "",
  maxWidth = 200,
  maxHeight = 150
}: CardPreviewProps) {
  // Calculate scale to fit within max dimensions
  const scaleX = maxWidth / design.width
  const scaleY = maxHeight / design.height
  const scale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond 100%
  
  const previewWidth = design.width * scale
  const previewHeight = design.height * scale

  return (
    <div 
      className={`relative border rounded-lg overflow-hidden ${className}`}
      style={{
        width: previewWidth,
        height: previewHeight,
        backgroundColor: design.background_color || '#ffffff'
      }}
    >
      {/* Text Elements */}
      {design.texts?.map((text) => (
        <div
          key={text.id}
          className="absolute whitespace-pre-wrap pointer-events-none"
          style={{
            left: `${(text.x || 0) * scale}px`,
            top: `${(text.y || 0) * scale}px`,
            color: text.color || '#000000',
            fontSize: `${(text.font_size || 16) * scale}px`,
            fontWeight: text.font_weight || 'normal',
            fontFamily: text.font_family || 'Arial',
            fontStyle: text.font_style || 'normal',
            transform: `scale(${Math.max(scale, 0.3)})`, // Minimum readable scale
            transformOrigin: 'top left'
          }}
        >
          {text.content}
        </div>
      ))}

      {/* Image Elements */}
      {design.images?.map((image) => (
        <div
          key={image.id}
          className="absolute pointer-events-none"
          style={{
            left: `${(image.x || 0) * scale}px`,
            top: `${(image.y || 0) * scale}px`,
            width: `${(image.width || 100) * scale}px`,
            height: `${(image.height || 100) * scale}px`,
            opacity: image.opacity || 1
          }}
        >
          <img
            src={image.src}
            alt="Card element"
            className="w-full h-full object-cover rounded"
          />
        </div>
      ))}
      
      {/* If no content, show placeholder */}
      {(!design.texts || design.texts.length === 0) && 
       (!design.images || design.images.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
          การ์ดว่าง
        </div>
      )}
    </div>
  )
}