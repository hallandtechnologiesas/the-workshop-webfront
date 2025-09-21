'use client';

import clsx from 'clsx';
import { File as FileIcon } from 'lucide-react';

import { toTitleCase, formatFileSize } from '../utils';
import type { PrintFileEntry, UploadState } from '../types';

type UploadFileListProps = {
  files: PrintFileEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  uploadStates: Record<string, UploadState>;
};

const UploadFileList = ({ files, selectedId, onSelect, uploadStates }: UploadFileListProps) => (
  <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
    {files.map((entry) => {
      const uploadState = uploadStates[entry.id];
      const hasProgress = uploadState && uploadState.status !== 'idle';

      return (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onSelect(entry.id)}
            className={clsx(
              'flex w-full items-center gap-4 rounded-md border px-4 py-3 text-left transition',
              selectedId === entry.id
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border bg-card hover:border-primary/60 hover:bg-muted',
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileIcon className="h-5 w-5" />
            </span>
            <div className="flex flex-1 flex-col">
              <span className="truncate text-sm font-medium">{entry.file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(entry.file.size)} • Preset {toTitleCase(entry.config.preset)}
              </span>
              {hasProgress ? (
                <div className="mt-2 space-y-1">
                  <div
                    className={clsx(
                      'h-1 w-full overflow-hidden rounded-full',
                      uploadState.status === 'error' ? 'bg-destructive/20' : 'bg-muted',
                    )}
                  >
                    <div
                      className={clsx(
                        'h-full transition-all',
                        uploadState.status === 'error' ? 'bg-destructive' : 'bg-primary',
                      )}
                      style={{ width: `${Math.round((uploadState.progress ?? 0) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="uppercase tracking-wide">
                      {uploadState.status === 'uploading'
                        ? 'Uploading'
                        : uploadState.status === 'success'
                          ? 'Uploaded'
                          : 'Failed'}
                    </span>
                    <span>
                      {uploadState.status === 'success'
                        ? '100%'
                        : `${Math.round((uploadState.progress ?? 0) * 100)}%`}
                    </span>
                  </div>
                  {uploadState.status === 'error' && uploadState.error ? (
                    <p className="text-[11px] text-destructive">{uploadState.error}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </button>
        </li>
      );
    })}
  </ul>
);

export default UploadFileList;
