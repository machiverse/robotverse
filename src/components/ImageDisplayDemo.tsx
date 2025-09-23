import React from 'react';
import { ResponsiveImage, ImageGrid, MasonryImageGallery } from '@/components/ui/responsive-image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ImageDisplayDemo: React.FC = () => {
  // Sample images with different orientations
  const sampleImages = [
    {
      id: '1',
      src: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=600&fit=crop',
      alt: 'Vertical robot image',
    },
    {
      id: '2', 
      src: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop',
      alt: 'Horizontal robot image',
    },
    {
      id: '3',
      src: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop',
      alt: 'Square robot image',
    },
    {
      id: '4',
      src: 'https://images.unsplash.com/photo-1527430253228-e93688616381?w=400&h=700&fit=crop',
      alt: 'Tall vertical robot',
    },
    {
      id: '5',
      src: 'https://images.unsplash.com/photo-1561346648-7a26ad4b2905?w=800&h=400&fit=crop',
      alt: 'Wide horizontal robot',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Responsive Image Display Solutions</h1>
        <p className="text-muted-foreground">
          Demonstrating how to handle different image orientations without distortion or cropping
        </p>
      </div>

      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="individual">Individual Images</TabsTrigger>
          <TabsTrigger value="grid">Grid Layout</TabsTrigger>
          <TabsTrigger value="masonry">Masonry Layout</TabsTrigger>
          <TabsTrigger value="comparison">Object Fit Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auto Aspect Ratio</CardTitle>
                <CardDescription>
                  Adapts container to image dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveImage
                  src={sampleImages[0].src}
                  alt={sampleImages[0].alt}
                  aspectRatio="auto"
                  objectFit="contain"
                  hoverEffect
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fixed Square</CardTitle>
                <CardDescription>
                  Maintains square aspect ratio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveImage
                  src={sampleImages[1].src}
                  alt={sampleImages[1].alt}
                  aspectRatio="square"
                  objectFit="contain"
                  hoverEffect
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Aspect (16:9)</CardTitle>
                <CardDescription>
                  Widescreen format container
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveImage
                  src={sampleImages[2].src}
                  alt={sampleImages[2].alt}
                  aspectRatio="video"
                  objectFit="contain"
                  hoverEffect
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Portrait (3:4)</CardTitle>
                <CardDescription>
                  Tall format container
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveImage
                  src={sampleImages[3].src}
                  alt={sampleImages[3].alt}
                  aspectRatio="portrait"
                  objectFit="contain"
                  hoverEffect
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Ratio</CardTitle>
                <CardDescription>
                  Custom 2:1 aspect ratio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveImage
                  src={sampleImages[4].src}
                  alt={sampleImages[4].alt}
                  aspectRatio="custom"
                  customRatio={2/1}
                  objectFit="contain"
                  hoverEffect
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="grid" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Uniform Grid Layout</CardTitle>
              <CardDescription>
                All images in consistent square containers with object-contain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageGrid
                images={sampleImages}
                columns={3}
                aspectRatio="square"
                objectFit="contain"
                onImageClick={(image, index) => {
                  console.log('Clicked image:', image, 'at index:', index);
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Video Aspect Grid</CardTitle>
              <CardDescription>
                16:9 containers with cover fit for thumbnail-style display
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageGrid
                images={sampleImages}
                columns={2}
                aspectRatio="video"
                objectFit="cover"
                onImageClick={(image, index) => {
                  console.log('Clicked image:', image, 'at index:', index);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="masonry" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Masonry Layout</CardTitle>
              <CardDescription>
                Natural image dimensions preserved in a Pinterest-style layout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MasonryImageGallery
                images={sampleImages}
                columns={3}
                onImageClick={(image, index) => {
                  console.log('Clicked image:', image, 'at index:', index);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Object-Fit Comparison</CardTitle>
              <CardDescription>
                Same image with different object-fit values in square containers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-center">Contain</h4>
                  <ResponsiveImage
                    src={sampleImages[1].src}
                    alt="Object-fit contain"
                    aspectRatio="square"
                    objectFit="contain"
                    backgroundColor="hsl(var(--muted))"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Entire image visible, may have letterboxing
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-center">Cover</h4>
                  <ResponsiveImage
                    src={sampleImages[1].src}
                    alt="Object-fit cover"
                    aspectRatio="square"
                    objectFit="cover"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Fills container, may crop image
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-center">Fill</h4>
                  <ResponsiveImage
                    src={sampleImages[1].src}
                    alt="Object-fit fill"
                    aspectRatio="square"
                    objectFit="fill"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Stretches to fill, may distort
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-center">Scale-down</h4>
                  <ResponsiveImage
                    src={sampleImages[1].src}
                    alt="Object-fit scale-down"
                    aspectRatio="square"
                    objectFit="scale-down"
                    backgroundColor="hsl(var(--muted))"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Acts like contain or none, whichever is smaller
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CSS Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle>CSS Best Practices Summary</CardTitle>
          <CardDescription>
            Key techniques for responsive image handling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">For Product Catalogs:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use <code>object-fit: contain</code> to show full product</li>
                <li>• Set consistent aspect ratios (square or video)</li>
                <li>• Add background color for transparency</li>
                <li>• Include hover effects for interactivity</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">For Galleries:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use <code>object-fit: cover</code> for thumbnails</li>
                <li>• Consider masonry layout for mixed orientations</li>
                <li>• Implement lazy loading for performance</li>
                <li>• Add loading placeholders and error states</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageDisplayDemo;