'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';

export function FileUpload() {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setUploading(true);
    // Simulate upload
    setTimeout(() => {
      setUploading(false);
      alert('File uploaded successfully!');
    }, 2000);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
  });

  return (
    <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer">
      <input {...getInputProps()} />
      {uploading ? (
        <div>Uploading...</div>
      ) : isDragActive ? (
        <p>Drop the files here...</p>
      ) : (
        <div>
          <div className="text-4xl mb-4">📁</div>
          <p>Drag & drop files here, or click to select</p>
          <Button variant="outline" className="mt-4">Browse Files</Button>
        </div>
      )}
    </div>
  );
}
