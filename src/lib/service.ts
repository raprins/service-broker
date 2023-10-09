import {BrokerError} from "./error.js"
import { Validator } from "jsonschema"
import { ParameterValidator } from "./validator.js"

export type OsbServiceCatalog = {
    services: OsbServiceConfiguration[]
}


/**
 * Service Configuration
 */
export type OsbServiceConfiguration = {
    name: string
    id: ServiceId
    description: string
    tags?: string[]
    requires?: string[]
    bindable: boolean
    /** Specifies whether the Fetching a Service Instance endpoint is supported for all Service Plans. */
    instances_retrievable?: boolean
    /** Specifies whether the Fetching a Service Binding endpoint is supported for all Service Plans. */
    bindings_retrievable?: boolean
    /** Specifies whether a Service Instance supports Update requests when contextual data for the Service Instance in the Platform changes. */
    allow_context_updates?: boolean
    metadata?: OsbServiceMetadata
    dashboard_client?: OsbDashboardClient
    plan_updateable?: boolean
    plans: [OsbPlan, ...OsbPlan[]]
}

export type OsbServiceMetadata = {
    displayName?: string
    imageUrl?: string
    longDescription?: string
    providerDisplayName?: string
    documentationUrl?: string
}

export type OsbDashboardClient = {
    id: string
    secret: string
    redirect_uri: string
}

export type OsbPlan = {
    name: string
    id: string
    description: string
    free: boolean
    metadata?: OsbPlanMetadata
    schemas?: OsbSchema
    maintenance_info?: OsbMaintenanceInfo
}


export type OsbPlanMetadata = {
    costs?: OsbPlanCost[]
    bullets?: string[]
    displayName?: string
}

export type OsbPlanCost = {
    amount: Record<string, any>
    unit: string
}


export type OsbSchema = {
    service_instance?: {
        create?: SchemaParameters,
        update?: SchemaParameters
    }
    service_binding?: {
        create?: SchemaParameters
    }
}

export type SchemaParameters = {
    parameters?: JSONSchema
}

export type JSONSchema = {
    "$schema": string
} & Record<string, any>


/**
 * If a Service Broker provides maintenance information for a Service Plan in its Catalog, a Platform MAY provide the same maintenance information when updating a Service Instance. 
 * Any field except for maintenance_info.version will be ignored. 
 * This field can be used to perform maintenance on a Service Instance (for example, to upgrade the underlying operating system the Service Instance is running on). 
 * If a Service Broker's catalog has changed and new maintenance information version is available for the Service Plan that the Service Instance being updated is using, then the Service Broker MUST reject the request.
 */
export type OsbMaintenanceInfo = {
    version: string
    description?: string
}

/* -------------------------------------------------------------------------------------------- 
    Define Operations Types
 -------------------------------------------------------------------------------------------- */

export type OsbServicePlanKey = {
    /** MUST be the ID of a Service Offering from the catalog for this Service Broker. */
    service_id: ServiceId
    /** MUST be the ID of a Service Plan from the Service Offering that has been requested. */
    plan_id: PlanId
}


/* -------------------------------------------------------------------------------------------- 
    Operations : SERVICE PROVISION
 -------------------------------------------------------------------------------------------- */
export type ProvisionRequest<Data = Record<string, any>> = OsbServicePlanKey & Data & {
    /** 
     * MUST be a globally unique non-empty string. 
     * This ID will be used for future requests (bind and deprovision), 
     * so the Service Broker will use it to correlate the resource it creates. 
     * */
    instance_id: InstanceId
    /** A value of true indicates that the Platform and its clients support asynchronous Service Broker operations. 
     * If this parameter is not included in the request, and the Service Broker 
     * can only provision a Service Instance of the requested Service Plan asynchronously, 
     * the Service Broker MUST reject the request with a 422 Unprocessable Entity as described below. 
     * */
    accepts_incomplete?: boolean
}




export type CreateProvisioning<Meta = Record<string, any>> = OsbServicePlanKey & {
    /** Contextual data for the Service Instance. */
    context?: Record<string, any>
    organization_guid?: string
    space_guid?: string
    /** 
     * Configuration parameters for the Service Instance.
     * Service Brokers SHOULD ensure that the client has provided valid configuration parameters and values for the operation. 
     * */
    parameters?: Meta
    maintenance_info?: OsbMaintenanceInfo
}

export type UpdateProvisioning = CreateProvisioning & {
    previous_values?: CreateProvisioning
}

export type OperationType = "succeeded" | "failed" | "in progress"
export type Operation = {
    state: OperationType
    description?: string
    instance_usable?: boolean
    update_repeatable?: boolean
}

export type OperationRequest = {
    /**
     * A Service Broker-provided identifier for the operation.
     * When a value for operation is included with asynchronous responses for Provision, Update, and Deprovision requests, the Platform MUST provide the same value using this query parameter as a percent-encoded string.
     * If present, MUST be a non-empty string.
     */
    operation: string
}

/**
 * Define a Service Instance Provision
 */
export type Provision = {
    dashboard_url?: string
    /**
     * For asynchronous responses, Service Brokers MAY return an identifier representing the operation.
     * The value of this field MUST be provided by the Platform with requests to the Polling Last Operation 
     * for Service Instances endpoint in a percent-encoded query parameter.
     * If present, MAY be null, and MUST NOT contain more than 10,000 characters.
     */
    operation?: string
    /** @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#service-instance-metadata */
    metadata?: {
        /** 
         * Labels are broker specified key-value pairs specifying attributes of Service Instances that are meaningful and relevant to Platform users, but do not directly imply behaviour changes by the Platform.
         * Platforms that support metadata labels MAY chose to update those, and if they do, they SHOULD replace all existing metadata labels with the labels received during provision or update. 
         * The Platform SHOULD ignore labels that do not adhere to the Platforms syntax. 
         * */
        labels?: Record<string, any>
        /**
         * Attributes are Broker specific key-value pairs generated by the Broker that MAY imply behavior changes by the Platform.
         * Platforms that support attributes MAY chose to update attributes and the new value will be updated in the response body of the FETCH Service Instances. 
         * The Platform SHOULD ignore attributes that do not adhere to the Platform supported attribute list.
         */
        attributes?: Record<string, any>
    }
}


/* -------------------------------------------------------------------------------------------- 
    Operations : SERVICE BINDING
 -------------------------------------------------------------------------------------------- */
export type Binding<Credential = Record<string, any>> = {
    metadata?: BindingMetadata
    credentials?: Credential
    syslog_drain_url?: string
    /**
     * Route services are a class of Service Offerings that intermediate requests to applications, performing functions such as rate limiting or authorization.
     * To indicate support for route services, the catalog entry for the Service MUST include the "requires":["route_forwarding"] property.
     */
    route_service_url?: string
    parameters?: Record<string, any>
    /** MUST be returned if the binding is in progress. The operation string MUST match that returned for the original request. */
    operation?: string
}

export type BindingMetadata = {
    expires_at?: string
    renew_before?: string
}

export type BindingRequest<Data = Record<string, any>> = ProvisionRequest<Data> & {
    /**
     * MUST be a globally unique non-empty string.
     * This ID will be used for future unbind requests, so the Service Broker will use it to correlate the resource it creates.
     */
    binding_id: string
}

export type CreateBinding<Param = Record<string, any>> = OsbServicePlanKey & {
    context?: Record<string, any>
    bind_resource?: {
        /** GUID of an application associated with the Service Binding. For credentials bindings. MUST be unique within the scope of the Platform. */
        app_guid?: string
        /** URL of the application to be intermediated. For route services Service Bindings. */
        route?: string
    }
    parameters?: Param
}

/** Utils type */
export type PromiseOrNot<T> = T | Promise<T>

export type EventHandler<T extends any[]> = (...args: T) => void
export type DefaultServiceEventMap = {
    provisioned: [key: OsbServicePlanKey & { instance_id: InstanceId }],
    deprovisioned: [key: OsbServicePlanKey & { instance_id: InstanceId }],
    bounded: [key: OsbServicePlanKey & { instance_id: InstanceId, binding_id: BindingId }],
    unbounded: [key: OsbServicePlanKey & { instance_id: InstanceId, binding_id: BindingId }],
}


/* -------------------------------------------------------------------------------------------- 
    Operations : TYPE UTILITIES
 -------------------------------------------------------------------------------------------- */
/**
 * An identifier used to correlate this Service Offering in future requests to the Service Broker. 
 * This MUST be globally unique such that Platforms (and their users) MUST be able to assume that seeing the same value (no matter what Service Broker uses it) will always refer to this Service Offering
 */
export type ServiceId = string
/**
 * An identifier used to correlate this Service Plan in future requests to the Service Broker. 
 * This MUST be globally unique such that Platforms (and their users) MUST be able to assume that seeing the same value (no matter what Service Broker uses it) will always refer to this Service Plan and for the same Service Offering
 */
export type PlanId = string
export type InstanceId = string
export type BindingId = string



/**
 * Define a Backbone of Service in Cloud
 */
abstract class OsbAbstractService<EventMap extends Record<string, any[]> = DefaultServiceEventMap> {

    private _eventHandlers: { [K in keyof EventMap]?: Set<EventHandler<EventMap[K]>> } = {}

    private _configuration?: OsbServiceConfiguration

    /**
     * 
     * @param configuration : Osb Api Service Configuration
     */
    constructor(configuration: OsbServiceConfiguration) {
        this.configuration = configuration
    };

    set configuration(configuration: OsbServiceConfiguration) {
        this.checkConfiguration(configuration)
        this._configuration = configuration
    }

    get configuration() {
        return this._configuration!
    }

    /**
     * Check Configuration
     * @param configuration 
     */
    checkConfiguration(configuration: OsbServiceConfiguration): void {
        /** Add Checks if needed... */
    }

    /**
     * 
     */
    getPlan(id: PlanId) {
        const plan = this.configuration.plans.find(plan => plan.id === id)
        if (!plan) throw new BrokerError("NotFound", `Plan ${id} is not found`)
        return plan
    }

    /**
     * When the Service Broker receives a provision request from the Platform, it MUST take whatever action is necessary to create a new resource.
     * What provisioning represents varies by Service Offering and Service Plan, although there are several common use cases.
     * For asynchronous responses, Service Brokers MUST return an identifier representing the operation.
     * @param request Provisioning Request
     * @returns Provision Data
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#provisioning
     */
    abstract provision(request: ProvisionRequest<CreateProvisioning>): PromiseOrNot<Provision>;

    /**
     * When a Service Broker receives a deprovision request from a Platform, it MUST delete any resources it created during the provision. 
     * Usually this means that all resources are immediately reclaimed for future provisions.
     * @param request Provisioning Request
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#deprovisioning
     */
    abstract deprovision(request: ProvisionRequest): PromiseOrNot<void>;

    /**
     * If "instances_retrievable" :true is declared for a Service Offering in the Catalog endpoint,
     * Service Brokers MUST support this endpoint for all Service Plans of the Service Offering and 
     * this endpoint MUST be available immediately after the Polling Last Operation for Service Instances endpoint 
     * returns "state": "succeeded" for a Provisioning operation. 
     * Otherwise, Platforms SHOULD NOT attempt to call this endpoint under any circumstances.
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#fetching-a-service-instance
     */
    abstract fetchInstance(request: ProvisionRequest): PromiseOrNot<Provision>;

    /**
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#updating-a-service-instance
     */
    abstract updateInstance(request: ProvisionRequest<UpdateProvisioning>): PromiseOrNot<Provision>;

    /**
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#polling-last-operation-for-service-instances
     */
    abstract getInstanceLastOperation(request: ProvisionRequest<OperationRequest>): PromiseOrNot<Operation>;


    /**
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#binding
     */
    abstract bindInstance(request: BindingRequest<CreateBinding>): PromiseOrNot<Binding>;

    /**
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#unbinding
     */
    abstract unbindInstance(request: BindingRequest): PromiseOrNot<void>;

    /**
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#fetching-a-service-binding
     */
    abstract fetchBinding(request: BindingRequest): PromiseOrNot<Binding>;

    /**
    * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#polling-last-operation-for-service-bindings
    */
    abstract getBindingLastOperation(request: BindingRequest<OperationRequest>): PromiseOrNot<Operation>;


    /**
     *  When event is raised
     */
    on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) {
        const eventHandler = this._eventHandlers[event] ?? new Set()
        eventHandler.add(handler)
        this._eventHandlers[event] = eventHandler
    }

    /**
     *  Raise an event
     */
    emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]) {
        const eventHandler = this._eventHandlers[event] ?? new Set()
        eventHandler.forEach(handler => handler(...args))
    }

}

/**
 * Define a Standard OsbService with the minimum implementation
 */
export class DefaultOsbService extends OsbAbstractService {

    provision(request: ProvisionRequest<CreateProvisioning>): PromiseOrNot<Provision> {
        return {}
    }

    deprovision(request: ProvisionRequest): PromiseOrNot<void> {

    }

    fetchInstance(request: ProvisionRequest): PromiseOrNot<Provision> {
        return {}
    }

    updateInstance(request: ProvisionRequest<UpdateProvisioning>): PromiseOrNot<Provision> {
        return {}
    }

    getInstanceLastOperation(request: ProvisionRequest<OperationRequest>): PromiseOrNot<Operation> {
        return {
            state: "succeeded"
        }
    }

    bindInstance(request: BindingRequest<CreateBinding>): PromiseOrNot<Binding> {
        return {}
    }

    unbindInstance(request: BindingRequest): PromiseOrNot<void> {
    }

    fetchBinding(request: BindingRequest): PromiseOrNot<Binding> {
        return {}
    }

    getBindingLastOperation(request: BindingRequest<OperationRequest>): PromiseOrNot<Operation> {
        return {
            state: "succeeded"
        }
    }
}


type FlowValidator = {
    createProvision?: ParameterValidator,
    updateProvision?: ParameterValidator,
    createBinding?: ParameterValidator,
}

/**
 * The With Checks
 */
export class OsbService extends DefaultOsbService {
    private _parametersValidators: Map<PlanId, FlowValidator> = new Map()


    constructor(configuration: OsbServiceConfiguration) {
        super(configuration)

        this.createValidator()
    }

    provision(request: ProvisionRequest<CreateProvisioning<Record<string, any>>>): PromiseOrNot<Provision> {
        const {plan_id, parameters} = request
        this.validate("createProvision", plan_id, parameters)
        return super.provision(request)
    }

    updateInstance(request: ProvisionRequest<UpdateProvisioning>): PromiseOrNot<Provision> {
        const {plan_id, parameters} = request
        this.validate("updateProvision", plan_id, parameters)
        return super.updateInstance(request)
    }

    bindInstance(request: BindingRequest<CreateBinding<Record<string, any>>>): PromiseOrNot<Binding> {
        const {plan_id, parameters} = request
        this.validate("createBinding", plan_id, parameters)
        return super.bindInstance(request)
    }

    protected validate<K extends keyof FlowValidator>(flow: K, planId: PlanId, inputParameter?: any) {
        const planValidator = this._parametersValidators.get(planId)
        planValidator && planValidator[flow]?.validate(inputParameter)
    }

    private createValidator() {
        this.configuration.plans.forEach(plan => {
            const paramValidator = this._parametersValidators.get(plan.id) ?? {}

            const {schemas} = plan

            if(schemas && schemas.service_instance && schemas.service_instance.create && schemas.service_instance.create.parameters) {
                paramValidator.createProvision = new ParameterValidator(schemas.service_instance.create.parameters)
            }

            if(schemas && schemas.service_instance && schemas.service_instance.update && schemas.service_instance.update.parameters) {
                paramValidator.updateProvision = new ParameterValidator(schemas.service_instance.update.parameters)
            }

            if(schemas && schemas.service_binding && schemas.service_binding.create && schemas.service_binding.create.parameters) {
                paramValidator.createBinding = new ParameterValidator(schemas.service_binding.create.parameters)
            }

            this._parametersValidators.set(plan.id, paramValidator)
        })
    }

}