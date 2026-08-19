export const RETURN_REASON_OPTIONS = [
  { value: 'wrong_size', label: 'Wrong Size', tone: 'blue' },
  { value: 'damaged_product', label: 'Damaged Product', tone: 'red' },
  { value: 'defective_item', label: 'Defective Item', tone: 'red' },
  { value: 'not_as_expected', label: 'Not as Expected', tone: 'yellow' },
  { value: 'received_wrong_product', label: 'Received Wrong Product', tone: 'yellow' },
  { value: 'other', label: 'Other', tone: 'neutral' },
] as const;

export type ReturnReasonValue = (typeof RETURN_REASON_OPTIONS)[number]['value'];

export const getReturnReasonLabel = (reason?: string | null) => {
  if (!reason) return 'Not Provided';
  const found = RETURN_REASON_OPTIONS.find((option) => option.value === reason);
  if (found) return found.label;
  return reason.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getReturnReasonBadgeClass = (reason?: string | null) => {
  const found = RETURN_REASON_OPTIONS.find((option) => option.value === reason);
  switch (found?.tone) {
    case 'red':
      return 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30';
    case 'yellow':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30';
    case 'blue':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30';
    default:
      return 'bg-muted text-foreground border border-border';
  }
};
