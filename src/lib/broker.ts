import { NextFunction, Request, Response, Router, json } from "express"
import { CreateBinding, CreateProvisioning, Operation, OperationRequest, OsbService, OsbServiceCatalog, OsbServiceConfiguration, OsbServicePlanKey, PlanId, Provision, ServiceId, InstanceId } from "./service.js"
import { BrokerErrorJson, BrokerErrorType, parseError, BrokerError } from "./error.js";
import { createRequestHeaderValidator } from "./validator.js";

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

type ResponseEntity<T = Record<string, any>> = {
    status: number,
    data: T
}


// const apiHeaderSchema = createHeaderSchema({ apiVersion: '2.17' })

export type BrokerOptions = {
    withAuthentication?: string
}

const API_VERSION = "2.15"

export class OsbApiBroker {

    private _managedService: Map<ServiceId, OsbService> = new Map()

    private constructor(private options: BrokerOptions) { }

    static create({ withAuthentication, services }: BrokerOptions & { services:OsbService | OsbService[]}): OsbApiBroker {

        const _broker = new OsbApiBroker({
            withAuthentication
        })

        const _services = Array.isArray(services) ? services : [services]
        _services.map(service =>  _broker.registerService(service))
        return _broker
    }

    private getDedicatedService(service_id: ServiceId): OsbService {
        const service = this._managedService.get(service_id)
        if (!service) throw new BrokerError("NotFound", `Service ${service_id} not found`)
        return service
    }

    /**
     * If We want to enhance : Just change this implementation
     * @param service 
     */
    registerService(service: OsbService) {
        this._managedService.set(service.configuration.id, service)
        return this
    }

    /**
     * Available Services
     */
    get services(): OsbService[] {
        return Array.from(this._managedService.values()).map(service => service)
    }

    get handler() {
        const _router = Router({ mergeParams: true })
        const { withAuthentication } = this.options
        const requestValidator = createRequestHeaderValidator({ apiVersion: API_VERSION, withAuthentication })

        _router
            .use(json())
            .get("/v2/catalog", this.catalog)
            .use("/v2/service_instances", requestValidator, this.instanceRoute) 
            .use("/v2/service_instances/:instance_id/service_bindings", requestValidator, this.bindingRoute) 

        return _router
    }

    /* -----------------------------------------------------------------------------------------------
                API ROUTES
    ----------------------------------------------------------------------------------------------- */
    /**
    * The first endpoint that a Platform will interact with on the Service Broker is the service catalog (/v2/catalog). 
    * This endpoint returns a list of all services available on the Service Broker. Platforms query this endpoint from all Service Brokers in order to present an aggregated user-facing catalog.
    * @link https://github.com/openservicebrokerapi/servicebroker/blob/v2.17/spec.md#catalog-management
    */
    private get catalog() {
        return (request: Request, response: Response<OsbServiceCatalog>) => {
                const result: ResponseEntity<OsbServiceCatalog> = {
                    status: 200,
                    data: { services: Array.from(this._managedService.values()).map(service => service.configuration) }
                }
                response.status(result.status).json(result.data)
        }
    }

    private get instanceRoute() {
        return Router()
            .put("/:instance_id", this.provision)
            .get("/:instance_id", this.fetchServiceInstance)
            .delete("/:instance_id", this.deprovision)
            .get("/:instance_id/last_operation", this.instanceLastOperation)
    }

    private get bindingRoute() {
        return Router()
            .put("/:binding_id", this.bindInstance)
            .get("/:binding_id", this.fetchBoundedInstance)
            .delete("/:binding_id", this.unbindInstance)
            .get("/:binding_id/last_operation", this.bindingLastOperation)
    }


    /* -----------------------------------------------------------------------------------------------
              API MIDDLEWARES / HANDLERS
  ----------------------------------------------------------------------------------------------- */
    /**
     * When the Service Broker receives a provision request from the Platform, it MUST take whatever action is necessary to create a new resource. 
     * What provisioning represents varies by Service Offering and Service Plan, although there are several common use cases. 
     * @returns 
     */
    private get provision() {
        return async (request: Request<ProvisionParam, any, CreateProvisioning, AsyncRequest>, response: Response<Provision | BrokerErrorJson>) => {
            let result: ResponseEntity<Provision | BrokerErrorJson> = {
                status: 200,
                data: {}
            }
            try {
                result.data = await this.getDedicatedService(request.body.service_id)
                    .provision({ ...request.params, ...request.body, ...request.query })

                result.status = (result.data.operation && result.data.operation.length > 0) ? 202 : 201

            } catch (error) {

                result = {
                    data: parseError(error),
                    status: 400
                }

            }

            response.status(result.status).json(result.data)
        }
    }

    /**
     * When a Service Broker receives a deprovision request from a Platform, it MUST delete any resources it created during the provision. 
     * Usually this means that all resources are immediately reclaimed for future provisions.
     * Platforms MUST delete all Service Bindings for a Service Instance prior to attempting to deprovision the Service Instance. 
     * This specification does not specify what a Service Broker is to do if it receives a deprovision request while there are still Service Bindings associated with it.
     */
    private get deprovision() {
        return async (request: Request<ProvisionParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response<{} | BrokerErrorJson>) => {
            try {
                const { params, query } = request
                const service = this.getDedicatedService(query.service_id)
                await service.deprovision({ ...params, ...query })
                response.json({})
            } catch (error) {
                response.status(400).json(parseError(error))
            }
        }
    }

    /**
     * If "instances_retrievable" :true is declared for a Service Offering in the Catalog endpoint, 
     * Service Brokers MUST support this endpoint for all Service Plans of the Service Offering and this endpoint MUST be available immediately after the Polling Last Operation for Service Instances endpoint returns "state": "succeeded" for a Provisioning operation. 
     * Otherwise, Platforms SHOULD NOT attempt to call this endpoint under any circumstances.
     */
    private get fetchServiceInstance() {
        return async (request: Request<ProvisionParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response<Provision | BrokerErrorJson>) => {
            try {
                const { params, query } = request
                const service = this.getDedicatedService(query.service_id)

                if (!service.configuration.instances_retrievable) throw new BrokerError("UnsupportedRequest", `Instance is not retrievable`)
                response.status(200).json(await service.fetchInstance({ ...params, ...query }))

            } catch (error) {
                response.status(400).json(parseError(error))
            }
        }
    }

    /**
     * When a Service Broker returns status code 202 Accepted for Provision, Update, or Deprovision, 
     * the Platform will begin polling the /v2/service_instances/:instance_id/last_operation endpoint to obtain the state of the last requested operation.
     */
    private get instanceLastOperation() {
        return async (request: Request<ProvisionParam, any, any, OperationRequest & OsbServicePlanKey>, response: Response<Operation | BrokerErrorJson>) => {
            try {
                const { params, query } = request
                response.status(200).json(await this.getDedicatedService(query.service_id).getInstanceLastOperation({ ...params, ...query }))
            } catch (error) {
                response.status(400).json(parseError(error))
            }
        }
    }

    private get bindInstance() {
        return async (request: Request<BindingParam, any, CreateBinding, AsyncRequest>, response: Response) => {
            const { body, params, query } = request
            try {
                const service = this.getDedicatedService(body.service_id)
                const { bindable } = service.configuration

                if(!bindable) throw new BrokerError("UnsupportedRequest", "Service could not be bound")

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
    }

    private get unbindInstance() {
        return async (request: Request<BindingParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response) => {
            const { params, query } = request
            try {

                const service = this.getDedicatedService(query.service_id)
                await service.unbindInstance({
                    ...params,
                    ...query
                })
                response.status(200).json({})
            } catch (error) {
                response.status(400).json(parseError(error))
            }
        }
    }

    private get fetchBoundedInstance() {
        return async (request: Request<BindingParam, any, any, AsyncRequest & OsbServicePlanKey>, response: Response) => {
            const { params, query } = request
            try {

                const service = this.getDedicatedService(query.service_id)
                if (!service.configuration.bindings_retrievable) throw new BrokerError("UnsupportedRequest", `Binding is not retrievable`)


                response.status(200).json(await service.fetchBinding({
                    ...params,
                    ...query
                }))
            } catch (error) {
                response.status(400).json(parseError(error))
            }
        }
    }

    private get bindingLastOperation() {
        return async (request: Request<BindingParam, any, any, OperationRequest & OsbServicePlanKey>, response: Response<Operation | BrokerErrorJson>) => {
            try {
                const { params, query } = request
                response.status(200).json(await this.getDedicatedService(query.service_id).getBindingLastOperation({ ...params, ...query }))
            } catch (error) {
                response.status(400).json(parseError(error))
            }
        }
    }

}







