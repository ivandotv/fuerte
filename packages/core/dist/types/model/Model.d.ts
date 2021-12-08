import { IReactionDisposer } from 'mobx';
import { LiteCollection } from '../collection/LiteCollection';
import { Transport } from '../transport/transport';
import { DeleteConfig, ModelDeleteErrorCallback, ModelDeleteStartCallback, ModelDeleteSuccessCallback, ModelSaveErrorCallback, ModelSaveStartCallback, ModelSaveSuccessCallback, ModelTransportErrors, SaveConfig } from '../utils/types';
declare type Payload<T extends Model> = ReturnType<T['serialize']>;
export declare abstract class Model<TCollection extends LiteCollection<any, any> = LiteCollection<any, any>> {
    static identityKey: string;
    static setIdentityFromResponse: boolean;
    readonly collection: TCollection | undefined;
    readonly cid: string;
    protected errors: ModelTransportErrors;
    protected _isDeleted: boolean;
    protected _isSaving: boolean;
    protected _isDeleting: boolean;
    protected ignoreChange: boolean;
    protected _isDestroyed: boolean;
    protected payloadActionDisposer: IReactionDisposer;
    protected initialized: boolean;
    protected pendingSaveCall: {
        token: Record<string, never>;
        state: 'pending' | 'resolved' | 'rejected';
    } | undefined;
    lastSavedData: Payload<this> | undefined;
    get identityKey(): string;
    constructor();
    get payload(): Payload<this>;
    protected get computePayload(): Payload<this>;
    protected abstract serialize(): any;
    protected startPayloadCompute(): IReactionDisposer;
    get hasErrors(): boolean;
    get saveError(): any;
    get deleteError(): any;
    protected onAdded(collection: TCollection, isLite: boolean): void;
    protected onRemoved(collection: TCollection, isLite: boolean): void;
    get isDeleted(): boolean;
    get isSyncing(): boolean;
    get isDeleting(): boolean;
    get isSaving(): boolean;
    get isDestroyed(): boolean;
    protected onSaveStart(data: ModelSaveStartCallback): void;
    protected onSaveSuccess(data: ModelSaveSuccessCallback): void;
    _onSaveError({ error, config, transportConfig, token, dataToSave }: {
        error: any;
        config: SaveConfig;
        transportConfig: any;
        token: Record<string, never>;
        dataToSave: any;
    }): void;
    protected onSaveError(data: ModelSaveErrorCallback<Payload<this>>): void;
    protected extractIdentityValue(data: any | undefined, config: any, // collection save config
    transportConfig: any): string | undefined;
    get identity(): string;
    setIdentity(newValue: string): void;
    get isNew(): boolean;
    protected modelIsNew(): boolean;
    protected onDeleteStart(data: ModelDeleteStartCallback<Transport>): void;
    _onDeleteSuccess(data: {
        response: any;
        data?: any;
        config: DeleteConfig;
        transportConfig: any;
    }): void;
    protected onDeleteSuccess(data: ModelDeleteSuccessCallback<Transport>): void;
    _onDeleteError(data: {
        error: any;
        data?: any;
        config: DeleteConfig;
        transportConfig: any;
    }): void;
    protected onDeleteError(data: ModelDeleteErrorCallback<Transport>): void;
    get isDirty(): boolean;
    protected modelIsDirty(): boolean;
    onDestroy(): void;
}
export {};
