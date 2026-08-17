import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useEnhancedImageUpload } from '@/hooks/useEnhancedImageUpload'
import { Upload, Link as LinkIcon, X, Eye, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'

interface EnhancedImageUploadProps {
  bucket: string
  maxImages?: number
  onImagesUploaded: (urls: string[]) => void
  initialImages?: string[]
  enhance?: boolean
  title?: string
  description?: string
}

export const EnhancedImageUpload: React.FC<EnhancedImageUploadProps> = ({
  bucket,
  maxImages = 10,
  onImagesUploaded,
  initialImages = [],
  enhance = true,
  title = "Upload Images",
  description = "Upload images directly or provide URLs. Images will be automatically enhanced for better quality."
}) => {
  const [images, setImages] = useState<string[]>(initialImages)
  const [urlInput, setUrlInput] = useState('')
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFromFiles, uploadFromUrls, uploads, isUploading } = useEnhancedImageUpload({ bucket, enhance })
  const { toast } = useToast()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (images.length + files.length > maxImages) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: `Maximum ${maxImages} images allowed`
      })
      return
    }

    try {
      const uploadedUrls = await uploadFromFiles(files)
      const newImages = [...images, ...uploadedUrls]
      setImages(newImages)
      onImagesUploaded(newImages)
      
      toast({
        title: "Upload successful",
        description: `${uploadedUrls.length} image(s) uploaded and enhanced`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload images. Please try again."
      })
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return

    if (images.length >= maxImages) {
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
      const newImages = [...images, ...uploadedUrls]
      setImages(newImages)
      onImagesUploaded(newImages)
      setUrlInput('')
      
      toast({
        title: "URL upload successful",
        description: "Image fetched, enhanced, and stored successfully"
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

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    onImagesUploaded(newImages)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
    if (files.length === 0) return

    if (images.length + files.length > maxImages) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: `Maximum ${maxImages} images allowed`
      })
      return
    }

    try {
      const uploadedUrls = await uploadFromFiles(files)
      const newImages = [...images, ...uploadedUrls]
      setImages(newImages)
      onImagesUploaded(newImages)
      
      toast({
        title: "Upload successful",
        description: `${uploadedUrls.length} image(s) uploaded and enhanced`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload images. Please try again."
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'enhancing':
        return <Sparkles className="w-4 h-4 text-primary animate-pulse" />
      default:
        return <Upload className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            {title}
            {enhance && <Sparkles className="w-4 h-4 text-primary" />}
          </Label>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-primary hover:text-primary/80 font-medium">
              Click to upload images or drag and drop
            </p>
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
            <Label className="text-sm font-medium">Upload Progress</Label>
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
        {images.length > 0 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Uploaded Images ({images.length}/{maxImages})
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((url, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden border">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />
                  {index === 0 && (
                    <Badge className="absolute bottom-1 left-1 text-xs bg-primary">
                      Main
                    </Badge>
                  )}
                  <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-primary-foreground hover:text-primary-foreground hover:bg-card/20"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-primary-foreground hover:text-primary-foreground hover:bg-red-500/80"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}