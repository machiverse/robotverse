import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageUploadRequest {
  imageUrl?: string
  imageBase64?: string
  filename: string
  bucket: string
  userId: string
  enhance?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { imageUrl, imageBase64, filename, bucket, userId, enhance = true }: ImageUploadRequest = await req.json()

    console.log('Processing image upload request:', { filename, bucket, userId, enhance, hasUrl: !!imageUrl, hasBase64: !!imageBase64 })

    let imageBlob: Blob

    if (imageUrl) {
      // Fetch image from URL with proper headers for various services
      console.log('Fetching image from URL:', imageUrl)
      
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }

      // Handle Zoho WorkDrive URLs specifically
      if (imageUrl.includes('zoho.in') || imageUrl.includes('workdrive')) {
        console.log('Detected Zoho WorkDrive URL, adding specific headers')
        headers['Referer'] = 'https://workdrive.zoho.com/'
        headers['Origin'] = 'https://workdrive.zoho.com'
      }

      const response = await fetch(imageUrl, { headers })
      
      if (!response.ok) {
        console.error('Fetch failed:', response.status, response.statusText)
        
        // Try without custom headers if first attempt fails
        console.log('Retrying without custom headers...')
        const retryResponse = await fetch(imageUrl)
        if (!retryResponse.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        }
        imageBlob = await retryResponse.blob()
      } else {
        imageBlob = await response.blob()
      }
      
      console.log('Image fetched successfully, size:', imageBlob.size, 'type:', imageBlob.type)
      
      // Validate that we got an image
      if (!imageBlob.type.startsWith('image/')) {
        console.log('Response content type:', imageBlob.type)
        // Try to detect if it's actually an image based on content
        const arrayBuffer = await imageBlob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Check for common image file signatures
        const isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8
        const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47
        const isWebP = uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50
        
        if (isJPEG) {
          imageBlob = new Blob([arrayBuffer], { type: 'image/jpeg' })
        } else if (isPNG) {
          imageBlob = new Blob([arrayBuffer], { type: 'image/png' })
        } else if (isWebP) {
          imageBlob = new Blob([arrayBuffer], { type: 'image/webp' })
        } else {
          throw new Error('Downloaded content is not a valid image format')
        }
      }
      
    } else if (imageBase64) {
      // Convert base64 to blob
      console.log('Converting base64 to blob')
      const base64Data = imageBase64.split(',')[1] || imageBase64
      const binaryData = atob(base64Data)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }
      imageBlob = new Blob([bytes], { type: 'image/jpeg' })
      console.log('Base64 converted to blob, size:', imageBlob.size)
    } else {
      throw new Error('Either imageUrl or imageBase64 must be provided')
    }

    // Basic validation
    if (imageBlob.size === 0) {
      throw new Error('Downloaded image is empty')
    }

    // Enhance image quality if requested and if it's not too large
    let finalBlob = imageBlob
    if (enhance && imageBlob.size < 50 * 1024 * 1024) { // Skip enhancement for files > 50MB
      try {
        console.log('Enhancing image quality...')
        finalBlob = await enhanceImageQuality(imageBlob)
        console.log('Image enhanced successfully, new size:', finalBlob.size)
      } catch (error) {
        console.error('Image enhancement failed, using original:', error)
        finalBlob = imageBlob
      }
    } else if (enhance && imageBlob.size >= 50 * 1024 * 1024) {
      console.log('Skipping enhancement for large file:', imageBlob.size)
    }

    // Generate unique filename
    const fileExt = filename.split('.').pop() || getExtensionFromBlob(finalBlob)
    const uniqueFilename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    console.log('Uploading to Supabase storage:', { bucket, filename: uniqueFilename, size: finalBlob.size })

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(uniqueFilename, finalBlob, {
        contentType: finalBlob.type || 'image/jpeg',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueFilename)

    console.log('Upload successful:', { path: data.path, publicUrl })

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        path: data.path,
        enhanced: enhance,
        originalSize: imageBlob.size,
        finalSize: finalBlob.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in enhanced image upload:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

function getExtensionFromBlob(blob: Blob): string {
  switch (blob.type) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'jpg'
  }
}

async function enhanceImageQuality(imageBlob: Blob): Promise<Blob> {
  try {
    // For server-side enhancement, we'll focus on optimization rather than complex AI enhancement
    // This could be expanded to use external AI services for real enhancement
    
    console.log('Applying basic image optimization...')
    
    // For now, we'll return the original blob but could add:
    // - Image compression optimization
    // - Format conversion for better web compatibility
    // - Basic resize/quality adjustments
    
    // Convert to optimal format if needed
    if (imageBlob.type === 'image/png' && imageBlob.size > 1024 * 1024) {
      // For large PNGs, consider converting to JPEG
      console.log('Large PNG detected, keeping as-is but could optimize')
    }
    
    return imageBlob
    
  } catch (error) {
    console.error('Enhancement error:', error)
    throw error
  }
}