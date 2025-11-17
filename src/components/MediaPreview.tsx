import { useState } from "react"
import { X, FileText, Image as ImageIcon, Video, File } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaPreviewProps {
  file: File
  onRemove: () => void
}

const MediaPreview = ({ file, onRemove }: MediaPreviewProps) => {
  const [preview, setPreview] = useState<string>('')

  // Generate preview for image files
  if (file.type.startsWith('image/') && !preview) {
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = () => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-6 w-6" />
    if (file.type.startsWith('video/')) return <Video className="h-6 w-6" />
    if (file.type === 'application/pdf') return <FileText className="h-6 w-6" />
    return <File className="h-6 w-6" />
  }

  return (
    <div className="relative border rounded-lg p-4 bg-card">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="flex items-start gap-3">
        {file.type.startsWith('image/') && preview ? (
          <img
            src={preview}
            alt="Preview"
            className="w-16 h-16 object-cover rounded"
          />
        ) : file.type.startsWith('video/') ? (
          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
            {getFileIcon()}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {file.type || 'Unknown type'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default MediaPreview