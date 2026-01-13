export interface BulkError {
  id: string;
  name?: string;
  reason: string;
}

export interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  children?: React.ReactNode;
}

export interface BulkDeleteProps {
  selectedIds: string[];
  resource: string;
  onSuccess?: () => void;
  onError?: (errors: BulkError[]) => void;
  confirmMessage?: string;
  disabled?: boolean;
}

export interface BulkStatusChangeProps {
  selectedIds: string[];
  resource: string;
  options: { label: string; value: string }[];
  onSuccess?: () => void;
  onError?: (errors: BulkError[]) => void;
  disabled?: boolean;
}
