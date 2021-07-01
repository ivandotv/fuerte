import { RequiredCollectionConfig } from '../utils/types'

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

export const defaultConfig: RequiredCollectionConfig = {
  autoSave: {
    enabled: false,
    debounceMs: 0
  },
  load: {
    duplicateModelStrategy: DuplicateModelStrategy.KEEP_NEW,
    compareFn: () => ModelCompareResult.KEEP_NEW,
    insertPosition: 'end',
    reset: false
  },
  add: {
    insertPosition: 'end'
  },
  save: {
    insertPosition: 'end',
    addImmediately: true,
    addOnError: true
  },
  delete: {
    remove: true,
    removeImmediately: true,
    removeOnError: false
  }
}

export class CompareError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Compare Error'
  }
}
