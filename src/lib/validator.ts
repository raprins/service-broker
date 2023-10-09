
import { NextFunction, Request, Response } from "express"
import { Validator } from "jsonschema"
import { z } from "zod"
import { parseError } from "./error.js"


export type HeaderValidationOptions = {
    apiVersion: string
    withAuthentication?: string
}
export const createRequestHeaderValidator = ({ withAuthentication, apiVersion }: HeaderValidationOptions) => {

    const schema = z.object({
        "x-broker-api-version": z.string({ required_error: 'API Version must be filled' }).refine(version => version === apiVersion, `API Version Must be ${apiVersion}`),
        "x-broker-api-originating-identity": z.string().optional(),
        "x-broker-api-request-identity": z.string().optional(),
        "authorization": z.string().optional().refine(auth => {
            if (!withAuthentication) return true
            return auth === withAuthentication
        }, 'Wrong Credential')
    })



    return (request: Request, response: Response, next: NextFunction) => {
        try {
            schema.parse(request.headers)
            next()
        } catch (error) {
            response.status(400).json(parseError(error))
        }


    }
}


/**
 * Instance of simple Json Schema Validator
 */
export class ParameterValidator  {

    private _validator = new Validator()

    constructor(private jsonSchema: any) {}

    validate(parameter: any) {
        const result = this._validator.validate(parameter, this.jsonSchema)
        if(result.valid) return

        throw result.errors
    }
}

