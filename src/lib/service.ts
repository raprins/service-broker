export type OsbServiceCatalog = {
    services: OsbServiceConfiguration[]
}


/**
 * Service Configuration
 */
export type OsbServiceConfiguration = {
    name: string
    id: string
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
    plan_updateable: boolean
    plans: OsbPlan[]
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
    service_id: string
    /** MUST be the ID of a Service Plan from the Service Offering that has been requested. */
    plan_id: string
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
    instance_id: string
    /** A value of true indicates that the Platform and its clients support asynchronous Service Broker operations. 
     * If this parameter is not included in the request, and the Service Broker can only provision a Service Instance of the requested Service Plan asynchronously, the Service Broker MUST reject the request with a 422 Unprocessable Entity as described below. */
    accepts_incomplete?: boolean
}




export type CreateProvisioning = OsbServicePlanKey & {
    /** Contextual data for the Service Instance. */
    context?: Record<string, any>
    organization_guid?: string
    space_guid?: string
    /** 
     * Configuration parameters for the Service Instance.
     * Service Brokers SHOULD ensure that the client has provided valid configuration parameters and values for the operation. 
     * */
    parameters?: Record<string, any>
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
    operation?: string
}

/**
 * Define a Service Instance Provision
 */
export type Provision = {
    dashboard_url?: string
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
    route_service_url?: string
    parameters?: Record<string, any>
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

export type PromiseOrNot<T> = T | Promise<T> 

/**
 * Define a Service in Cloud
 */
export abstract class OsbService {

    /**
     * 
     * @param configuration : Osb Api Service Configuration
     */
    constructor(public configuration: OsbServiceConfiguration) { };


    /**
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#provisioning
     */
    abstract provision(request: ProvisionRequest<CreateProvisioning>): PromiseOrNot<Provision>;

    /**
     * @link https://github.com/openservicebrokerapi/servicebroker/blob/master/spec.md#deprovisioning
     */
    abstract deprovision(request: ProvisionRequest): PromiseOrNot<void>;

    /**
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
}


/**
 * Define Proxy Structure
 */
export abstract class OsbServiceProxy extends OsbService {
    constructor(protected managedService: OsbService) {
        super(managedService.configuration)
    }
} 