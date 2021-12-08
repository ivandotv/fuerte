import { IReactionDisposer } from 'mobx';
import { FactoryFn, Model } from '@fuerte/core';
import { Transport } from '@fuerte/core';
import { AutosaveCollectionConfig, RequiredAutosaveCollectionConfig } from './types';
import { Collection } from '@fuerte/core';
export declare class AutosaveCollection<TModel extends Model<Collection<any, any, any>>, TFactory extends FactoryFn<TModel>, TTransport extends Transport<TModel>> extends Collection<TModel, TFactory, TTransport> {
    protected identityReactionByCid: Map<string, IReactionDisposer>;
    protected saveReactionByCid: Map<string, IReactionDisposer>;
    protected config: RequiredAutosaveCollectionConfig;
    constructor(factory: TFactory, transport: TTransport, config?: AutosaveCollectionConfig);
    getConfig(): RequiredAutosaveCollectionConfig;
    protected startTracking(model: TModel): void;
    protected stopTracking(model: TModel): void;
    protected autoSave(payload: {
        data: unknown;
        model: TModel;
    }): void;
    startAutoSave(): TModel[];
    startAutoSave(model: TModel): TModel | undefined;
    startAutoSave(models: TModel[]): TModel[];
    stopAutoSave(): TModel[];
    stopAutoSave(model: TModel): TModel | undefined;
    stopAutoSave(models: TModel[]): TModel[];
    protected onStopAutoSave(models: TModel[]): void;
    protected onStartAutoSave(models: TModel[]): void;
    destroy(): void;
    autoSaveEnabled(cid: string): boolean;
}
