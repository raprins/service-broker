import {z} from "zod"

export type BrokerErrorType =
    /** Resource Not Found */
    "NotFound" |
    "InvalidParameter" |
    /** Request requires client support for asynchronous service operations. */
    "AsyncRequired" |
    /** The Service Broker does not support concurrent requests that mutate the same resource. */
    "ConcurrencyError" |
    /** The request body is missing the app_guid field. */
    "RequiresApp" |
    /** The maintenance_info.version field provided in the request does not match the maintenance_info.version field provided in the Service Broker's Catalog. */
    "MaintenanceInfoConflict" |
    "UnsupportedRequest" |
    "ConfigurationError"


export type BrokerErrorJson = {
    error: string
    description?: string
    instance_usable?: boolean
    update_repeatable?: boolean
}

export class BrokerError extends Error {

    constructor(public code: BrokerErrorType, message?: string) {
        super(message)
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

    if(error instanceof z.ZodError) return parseZodError(error)

    return {
        error: 'StandardError',
        description: String(error)
    }

}


function parseZodError(error: z.ZodError):BrokerErrorJson {


    const byPath = error.issues.reduce<Map<string, string[]>>((result, issue) => {

        issue.path.forEach(path => {
            let storedMsg = result.get(path.toString()) ?? []
            storedMsg.push(issue.message)
            result.set(path.toString(), storedMsg)
        })

        return result
    }, new Map())

    const outError:BrokerErrorType = "InvalidParameter"

    return {
        error: outError,
        description : Array.from(byPath).map(([path, messages])=> `[${path}]: ${messages[0]}`).join(' - ')
    }
}