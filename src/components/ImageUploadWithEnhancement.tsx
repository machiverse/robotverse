import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useEnhancedImageUpload } from '@/hooks/useEnhancedImageUpload'
import { Upload, Link as LinkIcon, X, Eye, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ImageUploadWithEnhancementProps {
  bucket: string
  maxImages?: number
  onImagesChange: (images: File[], urls: string[]) => void
  existingImages?: File[]
  existingUrls?: string[]
  enhance?: boolean
  className?: string
}

export const ImageUploadWithEnhancement: React.FC<ImageUploadWithEnhancementProps> = ({
  bucket,
  maxImages = 10,
  onImagesChange,
  existingImages = [],
  existingUrls = [],
  enhance = true,
  className = ""
}) => {
  const [images, setImages] = useState<File[]>(existingImages)
  const [urls, setUrls] = useState<string[]>(existingUrls)
  const [urlInput, setUrlInput] = useState('')
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFromUrls, uploads, isUploading } = useEnhancedImageUpload({ bucket, enhance })
  const { toast } = useToast()

  const totalImages = images.length + urls.length

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (totalImages + files.length > maxImages) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: `Maximum ${maxImages} images allowed`
      })
      return
    }

    const newImages = [...images, ...files]
    setImages(newImages)
    onImagesChange(newImages, urls)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return

    if (totalImages >= maxImages) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: `Maximum ${maxImages} images allowed`
      })
      return
    }

    setIsProcessingUrl(true)
    try {
      const uploadedUrls = await uploadFromUrls([urlInput.trim()])
      const newUrls = [...urls, ...uploadedUrls]
      setUrls(newUrls)
      onImagesChange(images, newUrls)
      setUrlInput('')
      
      toast({
        title: "URL processed",
        description: "Image fetched, enhanced, and ready for upload"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "URL upload failed",
        description: "Failed to fetch image from URL. Please check the URL and try again."
      })
    } finally {
      setIsProcessingUrl(false)
    }
  }

  const removeImage = (index: number, type: 'file' | 'url') => {
    if (type === 'file') {
      const newImages = images.filter((_, i) => i !== index)
      setImages(newImages)
      onImagesChange(newImages, urls)
    } else {
      const newUrls = urls.filter((_, i) => i !== index)
      setUrls(newUrls)
      onImagesChange(images, newUrls)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
    if (files.length > 0) {
      if (totalImages + files.length > maxImages) {
        toast({
          variant: "destructive",
          title: "Too many images",
          description: `Maximum ${maxImages} images allowed`
        })
        return
      }
      const newImages = [...images, ...files]
      setImages(newImages)
      onImagesChange(newImages, urls)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'enhancing':
        return <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
      default:
        return <Upload className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Upload Area */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <p className="text-primary hover:text-primary/80 font-medium">
              Click to upload images or drag and drop
            </p>
            {enhance && <Sparkles className="w-4 h-4 text-blue-600" />}
          </div>
          <p className="text-sm text-muted-foreground">
            PNG, JPG, WEBP up to 10MB each (Max {maxImages} images)
            {enhance && " • Images will be enhanced automatically"}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </div>

      {/* URL Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Or paste image URL (e.g., https://example.com/image.jpg)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isUploading || isProcessingUrl}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
          />
        </div>
        <Button 
          type="button" 
          onClick={handleUrlUpload} 
          disabled={!urlInput.trim() || isUploading || isProcessingUrl}
        >
          {isProcessingUrl ? (
            <Sparkles className="w-4 h-4 animate-spin" />
          ) : (
            <LinkIcon className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Processing Images</Label>
          {uploads.map((upload, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(upload.status)}
                  <span className="truncate">{upload.filename}</span>
                </div>
                <Badge variant={upload.status === 'error' ? 'destructive' : 'secondary'}>
                  {upload.status === 'enhancing' ? 'Enhancing' : upload.status}
                </Badge>
              </div>
              {upload.status !== 'error' && (
                <Progress value={upload.progress} className="h-2" />
              )}
              {upload.error && (
                <p className="text-xs text-red-600">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Previews */}
      {totalImages > 0 && (
        <div className="space-y-4">
          <Label className="text-sm font-medium">
            Images ({totalImages}/{maxImages})
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* File previews */}
            {images.map((file, index) => {
              const objectUrl = URL.createObjectURL(file)
              return (
                <div key={`file-${index}`} className="relative group rounded-lg overflow-hidden border">
                  <img
                    src={objectUrl}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover"
                    onLoad={() => URL.revokeObjectURL(objectUrl)}
                  />
                  {index === 0 && totalImages > 1 && (
                    <Badge className="absolute bottom-1 left-1 text-xs bg-primary">
                      Main
                    </Badge>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white hover:text-white hover:bg-red-500/80"
                      onClick={() => removeImage(index, 'file')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
            
            {/* URL previews */}
            {urls.map((url, index) => (
              <div key={`url-${index}`} className="relative group rounded-lg overflow-hidden border">
                <img
                  src={url}
                  alt={`URL ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                {(images.length + index) === 0 && totalImages > 1 && (
                  <Badge className="absolute bottom-1 left-1 text-xs bg-primary">
                    Main
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/20"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:text-white hover:bg-red-500/80"
                    onClick={() => removeImage(index, 'url')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}