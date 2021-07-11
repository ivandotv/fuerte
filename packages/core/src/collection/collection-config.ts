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

export class CompareError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Compare Error'
  }
}
