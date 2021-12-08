import { Collection } from '../collection/Collection';
import { DuplicateModelStrategy, ModelCompareResult } from '../collection/collection-config';
import { Model } from '../model/Model';
import { Transport } from '../transport/transport';
export declare type FactoryFn<T, K = any> = (args: K) => T | Promise<T>;
export declare type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
export declare type ModelTransportErrors<TSave = any | null, TDelete = any | null> = {
    save: TSave;
    delete: TDelete;
};
export declare type TransportSaveResponse<T extends Transport<any>> = UnwrapPromise<ReturnType<T['save']>>;
export declare type TransportSaveConfig<T extends Transport<any>> = Parameters<T['save']>[1];
export declare type SaveResult<TModel extends Model<any>, TTransport extends Transport<TModel>> = {
    error: undefined;
    response: TransportSaveResponse<TTransport>;
    model: TModel;
} | {
    error: Omit<NonNullable<any>, 'false'>;
    response: undefined;
    model: undefined;
};
export declare type SaveStartCallback<TModel extends Model<any>, TTransport extends Transport<TModel>> = {
    model: TModel;
    config: SaveConfig;
    transportConfig?: TransportSaveConfig<TTransport>;
};
export declare type ModelSaveStartCallback<TTransport extends Transport<Model> = Transport<Model>> = {
    config: SaveConfig;
    transportConfig?: TransportSaveConfig<TTransport>;
};
export declare type SaveSuccessCallback<TModel extends Model<any>, TTransport extends Transport<TModel>> = {
    response: TransportSaveResponse<TTransport>;
} & SaveStartCallback<TModel, TTransport>;
export declare type ModelSaveSuccessCallback<TTransport extends Transport<Model> = Transport<Model>> = {
    response: TransportSaveResponse<TTransport>;
} & ModelSaveStartCallback<TTransport>;
export declare type SaveErrorCallback<TModel extends Model<any>, TTransport extends Transport<TModel>, TError = any> = SaveStartCallback<TModel, TTransport> & {
    error: TError;
};
export declare type ModelSaveErrorCallback<TDTO = any, TTransport extends Transport<Model> = Transport<Model>, TError = any> = ModelSaveStartCallback<TTransport> & {
    error: TError;
    dataToSave: TDTO;
};
export declare type TransportDeleteResponse<T extends Transport<any>> = UnwrapPromise<ReturnType<T['delete']>>;
export declare type TransportDeleteConfig<T extends Transport<any>> = Parameters<T['delete']>[1];
export declare type DeleteResult<TModel extends Model<any>, TTransport extends Transport<TModel>> = {
    error: undefined;
    response: TransportDeleteResponse<TTransport>;
    model: TModel;
} | {
    error: Omit<NonNullable<any>, 'false'>;
    response: undefined;
    model: undefined;
};
export declare type DeleteStartCallback<TModel extends Model<any>, TTransport extends Transport<TModel>> = {
    model: TModel;
    config: DeleteConfig;
    transportConfig?: TransportDeleteConfig<TTransport>;
};
export declare type ModelDeleteStartCallback<TTransport extends Transport<Model>> = {
    config: DeleteConfig;
    transportConfig?: TransportDeleteConfig<TTransport>;
};
export declare type DeleteSuccessCallback<TModel extends Model<any>, TTransport extends Transport<TModel>> = {
    response: TransportDeleteResponse<TTransport>;
} & DeleteStartCallback<TModel, TTransport>;
export declare type ModelDeleteSuccessCallback<TTransport extends Transport<Model>> = {
    response: TransportDeleteResponse<TTransport>;
} & ModelDeleteStartCallback<TTransport>;
export declare type DeleteErrorCallback<TModel extends Model<any>, TTransport extends Transport<TModel>, TError = any> = DeleteStartCallback<TModel, TTransport> & {
    error: TError;
};
export declare type ModelDeleteErrorCallback<TTransport extends Transport<Model>, TError = any> = ModelDeleteStartCallback<TTransport> & {
    error: TError;
};
export declare type TransportLoadResponse<T extends Transport<any>> = UnwrapPromise<ReturnType<T['load']>>;
export declare type TransportLoadConfig<T extends Transport<any>> = Parameters<T['load']>[0];
export declare type LoadResult<TModel extends Model<any>, TTransport extends Transport<TModel>> = {
    added: TModel[];
    removed: TModel[];
    response: TransportLoadResponse<TTransport>;
    error: undefined;
} | {
    error: Omit<NonNullable<any>, 'false'>;
    response: undefined;
    added: undefined;
    removed: undefined;
};
export declare type LoadStartCallback<TModel extends Model<any>, TTransport extends Transport<TModel>> = {
    config: SaveConfig;
    transportConfig?: TransportLoadConfig<TTransport>;
};
export declare type LoadSuccessCallback<TModel extends Model<any>, TTransport extends Transport<TModel>> = LoadStartCallback<TModel, TTransport> & {
    added: TModel[];
    removed: TModel[];
    response: TransportLoadResponse<TTransport>;
};
export declare type LoadErrorCallback<TModel extends Model<any>, TTransport extends Transport<TModel>, E = any> = LoadStartCallback<TModel, TTransport> & {
    error: E;
};
export declare type LiteCollectionConfig = {
    add?: AddConfig;
    remove?: RemoveConfig;
    reset?: ResetConfig;
};
export declare type RequiredLiteCollectionConfig = {
    add: Required<AddConfig>;
    remove: Required<RemoveConfig>;
    reset: Required<RemoveConfig>;
};
export declare type CollectionConfig = {
    save?: SaveConfig;
    delete?: DeleteConfig;
    load?: LoadConfig;
    remove?: RemoveConfig;
    reset?: ResetConfig;
} & LiteCollectionConfig;
export declare type RequiredCollectionConfig = {
    save: Required<SaveConfig>;
    delete: Required<DeleteConfig>;
    load: Required<LoadConfig>;
    remove: Required<RemoveConfig>;
    reset: Required<ResetConfig>;
} & RequiredLiteCollectionConfig;
export declare type ModelInsertPosition = 'start' | 'end';
export declare type AddConfig = {
    insertPosition?: ModelInsertPosition;
};
export declare type RemoveConfig = {
    destroy?: boolean;
};
export declare type ResetConfig = {
    destroy?: boolean;
};
export interface SaveConfig {
    insertPosition?: ModelInsertPosition;
    addImmediately?: boolean;
    addOnError?: boolean;
}
export interface DeleteConfig {
    remove?: boolean;
    removeImmediately?: boolean;
    removeOnError?: boolean;
    destroyOnRemoval?: boolean;
}
declare type BivariantCompareFn<T extends Model<Collection<any, any, any>>> = {
    bivarianceHack(newModel: T, oldModel: T): keyof typeof ModelCompareResult;
}['bivarianceHack'];
export interface LoadConfig {
    duplicateModelStrategy?: keyof typeof DuplicateModelStrategy;
    destroyOnRemoval?: boolean;
    compareFn?: BivariantCompareFn<Model<Collection<any, any, any>>>;
    insertPosition?: ModelInsertPosition;
    reset?: boolean;
    destroyOnReset?: false;
}
export {};
