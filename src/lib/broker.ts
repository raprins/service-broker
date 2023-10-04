import { Request, Response, Router, json } from "express"
import { CreateProvisioning, OsbService, OsbServiceCatalog, OsbServicePlanKey, Provision } from "./service.js"
import SimpleServiceProxy from "./simple-service-proxy.js"
import BrokerError, { BrokerErrorJson, parseError } from "./error.js";

// Provisioning
export type AsyncRequest = {
    /**
     * A value of true indicates that the Platform and its clients support asynchronous Service Broker operations.
     * If this parameter is not included in the request, and the Service Broker can only provision a Service Instance of the requested Service Plan asynchronously 
     * */
    accepts_incomplete?: boolean
}

export type ProvisionParam = {
    /**
     * MUST be a globally unique non-empty string. This ID will be used for future requests (bind and deprovision), so the Service Broker will use it to correlate the resource it creates.
     */
    instance_id: string
}




export default class OsbApiBroker {

    private _managedService: Map<string, OsbService> = new Map()

    private constructor() { }

    static create(...services: [OsbService, ...OsbService[]]): OsbApiBroker {
        const _broker = new OsbApiBroker()
        services.map(service => _broker.registerService(service))
        return _broker
    }

    private getService(service_id: string): OsbService {
        const service = this._managedService.get(service_id)
        if (!service) throw BrokerError.NotFound(`Service ${service_id} not found`)
        return service
    }

    /**
     * If We want to enhance : Just change this implementation
     * @param service 
     */
    registerService(service: OsbService) {
        this._managedService.set(service.configuration.id, new SimpleServiceProxy(service))
    }

    private _catalog = (request: Request, response: Response<OsbServiceCatalog>) => {
        response.json({ services: Array.from(this._managedService.values()).map(service => service.configuration) })
    }

    private _provision = async (request: Request<ProvisionParam, any, CreateProvisioning, AsyncRequest>, response: Response<Provision | BrokerErrorJson>) => {
        const { body, params, query } = request
        try {

            const service = this.getService(body.service_id)
            const result = await service.provision({
                ...params,
                ...body,
                ...query
            })
            response.status(200).json(result)
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }

    private _deprovision = async (request: Request<ProvisionParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response<{} | BrokerErrorJson>) => {
        try {
            const { params, query } = request
            const service = this.getService(query.service_id)
            await service.deprovision({ ...params, ...query })
            response.json({})
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }

    private _fetchInstance = async (request: Request<ProvisionParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response<Provision | BrokerErrorJson>) => {
        try {
            const { params, query } = request
            const service = this.getService(query.service_id)
            response.status(200).json(await service.fetchInstance({ ...params, ...query }))
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }

    get handler() {
        const _router = Router()
        _router
            .use(json())
            .get("/v2/catalog", this._catalog)
            .put("/v2/service_instances/:instance_id", this._provision)
            .delete("/v2/service_instances/:instance_id", this._deprovision)
            .get("/v2/service_instances/:instance_id", this._fetchInstance)

        return _router
    }
}





