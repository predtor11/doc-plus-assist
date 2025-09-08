import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File, Image, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  extractedText?: string;
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  maxFiles = 5,
  maxSize = 30 * 1024 * 1024, // 30MB
  acceptedTypes = ['image/*', 'application/pdf', '.docx', '.txt', '.csv'],
  disabled = false
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For now, return a placeholder. In a real implementation, you'd use:
    // - OCR for images (tesseract.js)
    // - PDF parsing libraries (pdf-parse, pdf2pic)
    // - Document parsing for DOCX (mammoth)
    if (file.type.startsWith('image/')) {
      return `[Image: ${file.name}] - Image content would be extracted using OCR`;
    } else if (file.type === 'application/pdf') {
      return `[PDF: ${file.name}] - PDF content would be extracted using PDF parsing`;
    } else if (file.type.includes('text')) {
      return await file.text();
    }
    return `[File: ${file.name}] - File content extraction not implemented for this type`;
  };

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `chat-files/${fileName}`;

    setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    setUploadProgress(prev => ({ ...prev, [file.name]: 75 }));

    // Extract text content
    const extractedText = await extractTextFromFile(file);

    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

    return {
      id: data.path,
      name: file.name,
      size: file.size,
      type: file.type,
      url: publicUrl,
      path: data.path,
      extractedText
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || uploading) return;

    setUploading(true);
    try {
      const uploadPromises = acceptedFiles.map(uploadFile);
      const uploadedFiles = await Promise.all(uploadPromises);

      setUploadedFiles(prev => [...prev, ...uploadedFiles]);
      onFilesUploaded(uploadedFiles);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [disabled, uploading, onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    disabled: disabled || uploading
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <CardContent className="p-6">
          <div {...getRootProps()} className="text-center">
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm text-primary font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-sm font-medium mb-1">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: Images, PDFs, DOCX, TXT, CSV (max {maxFiles} files, {formatFileSize(maxSize)} total)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{fileName}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFiles}
                disabled={uploading}
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;
