import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Download, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export const ImageMigrationTool: React.FC = () => {
  const [robotId, setRobotId] = useState('00000000-0000-0000-0000-000000000041')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const { user } = useAuth()
  const { toast } = useToast()

  const migrateRobotImages = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to migrate images"
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setStatus('Fetching robot data...')

    try {
      // Get robot data
      const { data: robot, error: fetchError } = await supabase
        .from('robots')
        .select('*')
        .eq('id', robotId)
        .single()

      if (fetchError) throw fetchError
      if (!robot) throw new Error('Robot not found')

      setProgress(20)
      setStatus('Found robot: ' + robot.name)

      if (!robot.images || robot.images.length === 0) {
        toast({
          title: "No images to migrate",
          description: "This robot has no images to process"
        })
        return
      }

      const migratedUrls: string[] = []
      const totalImages = robot.images.length

      for (let i = 0; i < robot.images.length; i++) {
        const imageUrl = robot.images[i]
        setStatus(`Processing image ${i + 1} of ${totalImages}...`)
        setProgress(20 + (i / totalImages) * 60)

        try {
          // Check if URL is already a Supabase URL
          if (imageUrl.includes('supabase.co')) {
            migratedUrls.push(imageUrl)
            continue
          }

          // Use enhanced image upload to migrate
          const { data, error } = await supabase.functions.invoke('enhanced-image-upload', {
            body: {
              imageUrl: imageUrl,
              filename: `robot-image-${i + 1}.jpg`,
              bucket: 'robot-images',
              userId: robot.seller_id,
              enhance: true
            }
          })

          if (error) throw error
          if (!data.success) throw new Error(data.error)

          migratedUrls.push(data.url)
          console.log(`Migrated image ${i + 1}:`, data.url)

        } catch (error) {
          console.error(`Failed to migrate image ${i + 1}:`, error)
          // Keep original URL if migration fails
          migratedUrls.push(imageUrl)
        }
      }

      setProgress(80)
      setStatus('Updating robot record...')

      // Update robot with new image URLs
      const { error: updateError } = await supabase
        .from('robots')
        .update({ images: migratedUrls })
        .eq('id', robotId)

      if (updateError) throw updateError

      setProgress(100)
      setStatus('Migration completed successfully!')

      toast({
        title: "Migration successful",
        description: `Successfully migrated ${migratedUrls.length} images for ${robot.name}`
      })

    } catch (error) {
      console.error('Migration error:', error)
      setStatus('Migration failed: ' + error.message)
      toast({
        variant: "destructive",
        title: "Migration failed",
        description: error.message
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Image Migration Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="robot-id">Robot ID</Label>
          <Input
            id="robot-id"
            value={robotId}
            onChange={(e) => setRobotId(e.target.value)}
            placeholder="Enter robot ID"
            disabled={isProcessing}
          />
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{status}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <Button 
          onClick={migrateRobotImages}
          disabled={!robotId || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Migrate Images
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          This tool will fetch external image URLs (like Zoho WorkDrive), enhance them, and store them in Supabase storage for better reliability.
        </div>
      </CardContent>
    </Card>
  )
}
