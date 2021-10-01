import type { CollectionConfig, RequiredCollectionConfig } from '@fuerte/core'
export interface AutoSaveConfig {
  enabled?: boolean
  debounce?: number
}
export type AutosaveCollectionConfig = CollectionConfig & {
  autoSave?: AutoSaveConfig
}

export type RequiredAutosaveCollectionConfig = RequiredCollectionConfig & {
  autoSave: Required<AutoSaveConfig>
}
