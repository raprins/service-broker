import { Request, Response, Router, json } from "express"
import { CreateBinding, CreateProvisioning, Operation, OperationRequest, OsbService, OsbServiceAdapter, OsbServiceAdapterConstructor, OsbServiceCatalog, OsbServicePlanKey, Provision } from "./service.js"
import DefaultServiceAdapter from "./default-adapter.js"
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

export type BindingParam = ProvisionParam & {
    binding_id: string
}




export class OsbApiBroker {

    private _managedService: Map<string, OsbServiceAdapter> = new Map()


    private constructor() { }

    static create(services: OsbService | OsbService[]): OsbApiBroker {

        const _broker = new OsbApiBroker()

        const _services = Array.isArray(services) ? services : [services]
        _services.map(service => _broker.registerService(service))
        return _broker
    }

    
    private getDedicatedService(service_id: string): OsbServiceAdapter {
        const service = this._managedService.get(service_id)
        if (!service) throw BrokerError.NotFound(`Service ${service_id} not found`)
        return service
    }

    /**
     * If We want to enhance : Just change this implementation
     * @param service 
     */
    registerService(service: OsbService) {
        this._managedService.set(service.configuration.id, new DefaultServiceAdapter(service))
        return this
    }




    get handler() {
        const _router = Router()
        _router
            .use(json())
            /* ------------- PROVISION ----------------------------------------------------*/
            .get("/v2/catalog", this._catalog)
            .put("/v2/service_instances/:instance_id", this._provision)
            .delete("/v2/service_instances/:instance_id", this._deprovision)
            .get("/v2/service_instances/:instance_id", this._fetchInstance)
            .get("/v2/service_instances/:instance_id/last_operation", this._getInstanceLastOperation)
            /* ------------- BINDING -----------------------------------------------------*/
            .put("/v2/service_instances/:instance_id/service_bindings/:binding_id", this._bindInstance)
            .delete("/v2/service_instances/:instance_id/service_bindings/:binding_id", this._unbindInstance)
            .get("/v2/service_instances/:instance_id/service_bindings/:binding_id/last_operation", this._getBindingLastOperation)

        return _router
    }

    /* -----------------------------------------------------------------------------------------------
                API ROUTES
    ----------------------------------------------------------------------------------------------- */
    private _catalog = (request: Request, response: Response<OsbServiceCatalog>) => {
        response.json({ services: Array.from(this._managedService.values()).map(service => service.configuration) })
    }

    private _provision = async (request: Request<ProvisionParam, any, CreateProvisioning, AsyncRequest>, response: Response<Provision | BrokerErrorJson>) => {
        const { body, params, query } = request
        let status = 200
        let result: Provision | BrokerErrorJson;
        try {

            result = await this.getDedicatedService(body.service_id)
                .provision({ ...params, ...body, ...query })

            status = (result.operation && result.operation.length > 0) ? 202 : 201

        } catch (error) {
            result = parseError(error)
            status = 400
        }

        response.status(status).json(result)
    }

    private _deprovision = async (request: Request<ProvisionParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response<{} | BrokerErrorJson>) => {
        try {
            const { params, query } = request
            const service = this.getDedicatedService(query.service_id)
            await service.deprovision({ ...params, ...query })
            response.json({})
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }

    private _fetchInstance = async (request: Request<ProvisionParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response<Provision | BrokerErrorJson>) => {
        try {
            const { params, query } = request
            const service = this.getDedicatedService(query.service_id)
            response.status(200).json(await service.fetchInstance({ ...params, ...query }))
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }

    private _getInstanceLastOperation = async (request: Request<ProvisionParam, any, any, OperationRequest & OsbServicePlanKey>, response: Response<Operation | BrokerErrorJson>) => {
        try {
            const { params, query } = request
            response.status(200).json(await this.getDedicatedService(query.service_id).getInstanceLastOperation({ ...params, ...query }))
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }

    private _bindInstance = async (request: Request<BindingParam, any, CreateBinding, AsyncRequest>, response: Response) => {
        const { body, params, query } = request
        try {

            const service = this.getDedicatedService(body.service_id)
            const result = await service.bindInstance({
                ...params,
                ...body,
                ...query
            })
            response.status(201).json(result)
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }

    private _unbindInstance = async (request: Request<BindingParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response) => {
        const { params, query } = request
        try {

            const service = this.getDedicatedService(query.service_id)
            const result = await service.unbindInstance({
                ...params,
                ...query
            })
            response.status(201).json(result)
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }

    private _getBindingLastOperation = async (request: Request<BindingParam, any, any, OperationRequest & OsbServicePlanKey>, response: Response<Operation | BrokerErrorJson>) => {
        try {
            const { params, query } = request
            response.status(200).json(await this.getDedicatedService(query.service_id).getBindingLastOperation({ ...params, ...query }))
        } catch (error) {
            response.status(400).json(parseError(error))
        }
    }
}




