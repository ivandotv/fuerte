import type { CollectionConfig, RequiredCollectionConfig } from '@fuerte/core';
export interface AutoSaveConfig {
    enabled?: boolean;
    debounce?: number;
}
export declare type AutosaveCollectionConfig = CollectionConfig & {
    autoSave?: AutoSaveConfig;
};
export declare type RequiredAutosaveCollectionConfig = RequiredCollectionConfig & {
    autoSave: Required<AutoSaveConfig>;
};
