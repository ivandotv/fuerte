export const DuplicateModelStrategy = {
  KEEP_NEW: 'KEEP_NEW',
  KEEP_OLD: 'KEEP_OLD',
  COMPARE: 'COMPARE'
} as const

export const ModelCompareResult = {
  KEEP_NEW: 'KEEP_NEW',
  KEEP_OLD: 'KEEP_OLD',
  KEEP_BOTH: 'KEEP_BOTH'
} as const
