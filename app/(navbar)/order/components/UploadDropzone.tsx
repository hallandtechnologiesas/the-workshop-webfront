'use client';

import type { ChangeEvent, DragEvent, RefObject } from 'react';
import clsx from 'clsx';
import { UploadCloud } from 'lucide-react';

type UploadDropzoneProps = {
  isDragging: boolean;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onBrowseClick: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
  accept?: string;
};

const UploadDropzone = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowseClick,
  fileInputRef,
  onFilesSelected,
  accept = '.stl,.obj,.amf,.3mf',
}: UploadDropzoneProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(event.target.files);
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div
      className={clsx(
        'relative flex min-h-[220px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition',
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <UploadCloud className="mb-3 h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Drop STL, OBJ, AMF, or 3MF files</p>
        <p className="text-xs text-muted-foreground">You can add multiple files at once</p>
      </div>
      <button
        type="button"
        onClick={onBrowseClick}
        className="mt-6 rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground shadow-sm transition hover:border-primary hover:bg-primary/10"
      >
        Browse files
      </button>
      <input ref={fileInputRef} type="file" accept={accept} multiple className="hidden" onChange={handleChange} />
    </div>
  );
};

export default UploadDropzone;
