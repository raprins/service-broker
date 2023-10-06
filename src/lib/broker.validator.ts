import { z } from "zod"



export const createHeaderSchema = (options: { apiVersion: string }) => z.object({
    /**
     * Requests from the Platform to the Service Broker MUST contain a header that declares the version number of the Open Service Broker API that the Platform is using
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/v2.17/spec.md#api-version-header
     */
    'x-broker-api-version': z.string()
        .refine(version => /^(\d+\.)?(\d+\.)?(\*|\d+)$/.test(version), 'The version numbers are in the format MAJOR.MINOR using semantic versioning.')
        .refine(version => version === options.apiVersion, `Wrong API version, expected ${options.apiVersion}`),
    'x-broker-api-originating-identity': z.string().optional().refine(identity => {
        if (!identity) return true
        return identity.split(" ").length === 2
    }, "The format of the header MUST be: Platform value"),
    'x-broker-api-request-identity': z.string().optional()
})