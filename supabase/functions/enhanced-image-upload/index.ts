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
      // Fetch image from URL
      console.log('Fetching image from URL:', imageUrl)
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      }
      imageBlob = await response.blob()
      console.log('Image fetched successfully, size:', imageBlob.size)
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

    // Enhance image quality if requested
    if (enhance) {
      try {
        console.log('Enhancing image quality...')
        imageBlob = await enhanceImageQuality(imageBlob)
        console.log('Image enhanced successfully, new size:', imageBlob.size)
      } catch (error) {
        console.error('Image enhancement failed, using original:', error)
        // Continue with original image if enhancement fails
      }
    }

    // Generate unique filename
    const fileExt = filename.split('.').pop() || 'jpg'
    const uniqueFilename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    console.log('Uploading to Supabase storage:', { bucket, filename: uniqueFilename })

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(uniqueFilename, imageBlob, {
        contentType: imageBlob.type || 'image/jpeg',
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
        enhanced: enhance
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

async function enhanceImageQuality(imageBlob: Blob): Promise<Blob> {
  try {
    // Convert blob to canvas for processing
    const canvas = document.createElement ? document.createElement('canvas') : new OffscreenCanvas(1, 1)
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }

    // Create image from blob
    const imageUrl = URL.createObjectURL(imageBlob)
    const img = new Image()
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          // Calculate enhanced dimensions (up to 2x, max 2048px)
          const maxDimension = 2048
          const scaleFactor = Math.min(2, maxDimension / Math.max(img.width, img.height))
          const newWidth = Math.floor(img.width * scaleFactor)
          const newHeight = Math.floor(img.height * scaleFactor)
          
          canvas.width = newWidth
          canvas.height = newHeight
          
          // Apply high-quality scaling and filters
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          
          // Draw with better quality
          ctx.drawImage(img, 0, 0, newWidth, newHeight)
          
          // Apply subtle sharpening filter
          const imageData = ctx.getImageData(0, 0, newWidth, newHeight)
          const data = imageData.data
          
          // Simple unsharp mask
          const sharpened = new Uint8ClampedArray(data)
          const width = newWidth
          const height = newHeight
          
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              for (let c = 0; c < 3; c++) {
                const idx = (y * width + x) * 4 + c
                const center = data[idx]
                const top = data[((y - 1) * width + x) * 4 + c]
                const bottom = data[((y + 1) * width + x) * 4 + c]
                const left = data[(y * width + (x - 1)) * 4 + c]
                const right = data[(y * width + (x + 1)) * 4 + c]
                
                const laplacian = center * 5 - top - bottom - left - right
                sharpened[idx] = Math.max(0, Math.min(255, center + laplacian * 0.1))
              }
            }
          }
          
          // Put enhanced data back
          const enhancedImageData = new ImageData(sharpened, width, height)
          ctx.putImageData(enhancedImageData, 0, 0)
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(imageUrl)
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create enhanced blob'))
            }
          }, 'image/jpeg', 0.95)
          
        } catch (error) {
          URL.revokeObjectURL(imageUrl)
          reject(error)
        }
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl)
        reject(new Error('Failed to load image for enhancement'))
      }
      
      img.src = imageUrl
    })
    
  } catch (error) {
    console.error('Enhancement error:', error)
    throw error
  }
}