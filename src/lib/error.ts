export enum BrokerErrorType {
    NotFound = "NotFound",
    AsyncRequired = "AsyncRequired",
    ConcurrencyError = "ConcurrencyError",
    RequiresApp = "RequiresApp",
    MaintenanceInfoConflict = "MaintenanceInfoConflict",
    UnsupportedOperation = "UnsupportedRequest"
}

export type BrokerErrorJson = {
    error: string
    description?: string
    instance_usable?: boolean
    update_repeatable?: boolean
}

export default class BrokerError extends Error {

    constructor(protected code: BrokerErrorType, message?: string) {
        super(message)
    }

    static NotFound(message: string = 'Resource not Found'): BrokerError {
        return new BrokerError(BrokerErrorType.NotFound, message)
    }

     /** This request requires client support for asynchronous service operations. */
    static AsyncRequired(message?: string): BrokerError {
        return new BrokerError(BrokerErrorType.AsyncRequired, message)
    }

    /** The Service Broker does not support concurrent requests that mutate the same resource. */
    static ConcurrencyError(message?: string): BrokerError {
        return new BrokerError(BrokerErrorType.ConcurrencyError, message)
    }

    /** The request body is missing the app_guid field. */
    static RequiresApp(message?: string): BrokerError {
        return new BrokerError(BrokerErrorType.RequiresApp, message)
    }

    /** The maintenance_info.version field provided in the request does not match the maintenance_info.version field provided in the Service Broker's Catalog. */
    static MaintenanceInfoConflict(message?: string): BrokerError {
        return new BrokerError(BrokerErrorType.MaintenanceInfoConflict, message)
    }

    static UnsupportedOperation(message?: string): BrokerError {
        return new BrokerError(BrokerErrorType.UnsupportedOperation, message)
    }

    get json(): BrokerErrorJson {
        return {
            error: this.code,
            description: this.message
        }
    }
}


export function parseError(error: any): BrokerErrorJson {

    if (error instanceof BrokerError) return error.json

    return {
        error: 'Dummy',
        description: String(error)
    }

}