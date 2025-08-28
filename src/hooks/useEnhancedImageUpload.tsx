import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'enhancing' | 'complete' | 'error'
  url?: string
  error?: string
}

interface UseEnhancedImageUploadProps {
  bucket: string
  maxFiles?: number
  enhance?: boolean
}

export const useEnhancedImageUpload = ({ 
  bucket, 
  maxFiles = 10, 
  enhance = true 
}: UseEnhancedImageUploadProps) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const uploadFromFiles = async (files: File[]): Promise<string[]> => {
    if (files.length > maxFiles) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`
      })
      return []
    }

    setIsUploading(true)
    const uploadPromises = files.map(file => uploadSingleFile(file))
    
    try {
      const results = await Promise.allSettled(uploadPromises)
      const successfulUploads = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value)
      
      return successfulUploads
    } finally {
      setIsUploading(false)
      setUploads([])
    }
  }

  const uploadFromUrls = async (urls: string[]): Promise<string[]> => {
    if (urls.length > maxFiles) {
      toast({
        variant: "destructive",
        title: "Too many URLs",
        description: `Maximum ${maxFiles} URLs allowed`
      })
      return []
    }

    setIsUploading(true)
    const uploadPromises = urls.map(url => uploadFromUrl(url))
    
    try {
      const results = await Promise.allSettled(uploadPromises)
      const successfulUploads = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value)
      
      return successfulUploads
    } finally {
      setIsUploading(false)
      setUploads([])
    }
  }

  const uploadSingleFile = async (file: File): Promise<string> => {
    const filename = file.name
    
    // Add to upload progress
    setUploads(prev => [...prev, {
      filename,
      progress: 0,
      status: 'uploading'
    }])

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file)
      
      // Update progress
      setUploads(prev => prev.map(upload => 
        upload.filename === filename 
          ? { ...upload, progress: 50, status: enhance ? 'enhancing' : 'uploading' }
          : upload
      ))

      const user = await getCurrentUser()
      
      const { data, error } = await supabase.functions.invoke('enhanced-image-upload', {
        body: {
          imageBase64: base64,
          filename,
          bucket,
          userId: user.id,
          enhance
        }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      // Update progress to complete
      setUploads(prev => prev.map(upload => 
        upload.filename === filename 
          ? { ...upload, progress: 100, status: 'complete', url: data.url }
          : upload
      ))

      return data.url
    } catch (error) {
      console.error('Upload error:', error)
      
      // Update progress to error
      setUploads(prev => prev.map(upload => 
        upload.filename === filename 
          ? { ...upload, status: 'error', error: error.message }
          : upload
      ))

      throw error
    }
  }

  const uploadFromUrl = async (imageUrl: string): Promise<string> => {
    const filename = imageUrl.split('/').pop() || `image-${Date.now()}.jpg`
    
    // Add to upload progress
    setUploads(prev => [...prev, {
      filename,
      progress: 0,
      status: 'uploading'
    }])

    try {
      // Update progress
      setUploads(prev => prev.map(upload => 
        upload.filename === filename 
          ? { ...upload, progress: 50, status: enhance ? 'enhancing' : 'uploading' }
          : upload
      ))

      const user = await getCurrentUser()
      
      const { data, error } = await supabase.functions.invoke('enhanced-image-upload', {
        body: {
          imageUrl,
          filename,
          bucket,
          userId: user.id,
          enhance
        }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      // Update progress to complete
      setUploads(prev => prev.map(upload => 
        upload.filename === filename 
          ? { ...upload, progress: 100, status: 'complete', url: data.url }
          : upload
      ))

      return data.url
    } catch (error) {
      console.error('URL upload error:', error)
      
      // Update progress to error
      setUploads(prev => prev.map(upload => 
        upload.filename === filename 
          ? { ...upload, status: 'error', error: error.message }
          : upload
      ))

      throw error
    }
  }

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('User not authenticated')
    return user
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return {
    uploadFromFiles,
    uploadFromUrls,
    uploads,
    isUploading
  }
}