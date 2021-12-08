import { Collection } from '../collection/Collection';
export declare function wrapInArray<T = any>(item: T | T[]): T[];
export declare function assertCollectionExists(collection: unknown, msg?: string): asserts collection is Collection<any, any, any>;
export declare const ASYNC_STATUS: {
    readonly PENDING: "PENDING";
    readonly RESOLVED: "RESOLVED";
    readonly REJECTED: "REJECTED";
    readonly IDLE: "IDLE";
};
export declare function isPromise<T>(value: Promise<T> | T): value is Promise<T>;
export declare function unwrapResult<T extends {
    error: any;
}>(result: T): Omit<Extract<T, {
    error: 0 | '' | false | undefined | null;
}>, 'error'>;
