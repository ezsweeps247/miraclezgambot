import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadZoneProps {
  currentImage?: string;
  onImageSelect: (file: File) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export function ImageUploadZone({
  currentImage,
  onImageSelect,
  onRemove,
  maxSizeMB = 5,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, JPEG, PNG, or WebP image',
        variant: 'destructive'
      });
      return false;
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `File size must be less than ${maxSizeMB}MB`,
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      onImageSelect(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setSelectedFile(null);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Banner Preview */}
      {currentImage && !preview && (
        <div className="space-y-2">
          <label className="text-[8px] font-medium text-muted-foreground">Current Banner</label>
          <Card className="border-2 border-muted">
            <CardContent className="p-4">
              <div className="relative aspect-[21/9] bg-gradient-to-br from-purple-900/20 to-black/20 rounded-lg overflow-hidden">
                <img
                  src={currentImage}
                  alt="Current banner"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className="bg-black/50 text-white text-[8px] px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle style={{width: '2.5px', height: '2.5px'}} />
                    Active
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Upload Preview */}
      {preview && (
        <div className="space-y-2">
          <label className="text-[8px] font-medium text-muted-foreground">New Banner Preview</label>
          <Card className="border-2 border-purple-500">
            <CardContent className="p-4">
              <div className="relative aspect-[21/9] bg-gradient-to-br from-purple-900/20 to-black/20 rounded-lg overflow-hidden">
                <img
                  src={preview}
                  alt="New banner preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemove}
                  data-testid="button-remove-preview"
                >
                  <X style={{width: '3px', height: '3px'}} />
                </Button>
                <div className="absolute bottom-2 left-2">
                  <span className="bg-purple-600/80 text-white text-[8px] px-2 py-1 rounded-full">
                    {selectedFile?.name}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Zone */}
      <div className="space-y-2">
        <label className="text-[8px] font-medium text-muted-foreground">Upload New Banner</label>
        <div
          className={`border-2 border-dashed rounded-lg transition-colors ${
            isDragging 
              ? 'border-purple-500 bg-purple-500/10' 
              : 'border-muted hover:border-purple-400'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <label htmlFor="banner-upload" className="cursor-pointer">
            <div className="p-8 text-center">
              <div className="mx-auto w-12 h-12 mb-4 text-muted-foreground">
                {isDragging ? (
                  <ImageIcon className="w-full h-full animate-pulse" />
                ) : (
                  <Upload className="w-full h-full" />
                )}
              </div>
              
              <p className="text-[8px] font-medium mb-2">
                {isDragging ? 'Drop your image here' : 'Click to upload or drag and drop'}
              </p>
              
              <p className="text-[8px] text-muted-foreground">
                JPG, JPEG, PNG, WebP (Max {maxSizeMB}MB)
              </p>
              
              <p className="text-[8px] text-muted-foreground mt-2">
                Recommended size: 1920x820 pixels (21:9 aspect ratio)
              </p>
              
              <input
                id="banner-upload"
                type="file"
                className="hidden"
                accept={acceptedFormats.join(',')}
                onChange={handleFileInput}
                data-testid="input-file-upload"
              />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}