
import Ajv, { ValidateFunction } from "ajv"
import BrokerError from "./error.js";
import { ProvisionRequest, CreateProvisioning, UpdateProvisioning, Provision, Operation, CreateBinding, BindingRequest, Binding, OperationRequest, OsbPlan, OsbServiceAdapter, OsbService } from "./service.js";

// Get Ajv instance
const _ajv = new Ajv.default({
    strictSchema: true,
    allErrors: true
})

type ParameterValidator = ValidateFunction<Record<string, any>>

type jsonValidator = {
    provisionCreate?: ParameterValidator,
    provisionUpdate?: ParameterValidator,
    binding?: ParameterValidator
}

// For the sake of meaning
type PlanId = string

export default class DefaultServiceAdapter extends OsbServiceAdapter {

    private _parameterValidator: Map<PlanId, jsonValidator> = new Map<PlanId, any>()

    constructor(managedService: OsbService) {
        super(managedService)

        this._createValidator()
    }

    async provision(request: ProvisionRequest<CreateProvisioning>): Promise<Provision> {
        return await this.managedService.provision(request)
    }

    async deprovision(request: ProvisionRequest<Record<string, any>>): Promise<void> {
        return await this.managedService.deprovision(request)
    }


    async fetchInstance(request: ProvisionRequest<Record<string, any>>): Promise<Provision> {
        const { instances_retrievable } = this.managedService.configuration
        if (!instances_retrievable) {
            throw BrokerError.UnsupportedOperation(`Could not retrieve instance: instances_retrievable is false or undefined`)
        }

        return await this.managedService.fetchInstance(request)
    }

    async updateInstance(request: ProvisionRequest<UpdateProvisioning>): Promise<Provision> {
        this._checkProvisionMaintenanceInfo(request)
        return await this.managedService.updateInstance(request)
    }

    async getInstanceLastOperation(request: ProvisionRequest<OperationRequest>): Promise<Operation> {
        return await this.managedService.getInstanceLastOperation(request)
    }

    async bindInstance(request: BindingRequest<CreateBinding<Record<string, any>>>): Promise<Binding<Record<string, any>>> {

        const { bindable } = this.managedService.configuration
        if (!bindable) {
            throw BrokerError.UnsupportedOperation(`Could not retrieve instance bindable is false`)
        }

        return await this.managedService.bindInstance(request)
    }

    async unbindInstance(request: BindingRequest<Record<string, any>>): Promise<void> {
        return await this.managedService.unbindInstance(request)
    }

    async fetchBinding(request: BindingRequest<Record<string, any>>): Promise<Binding> {

        const { bindings_retrievable } = this.managedService.configuration
        if (!bindings_retrievable) {
            throw BrokerError.UnsupportedOperation(`Could not retrieve instance bindings_retrievable is false or undefined`)
        }

        return await this.managedService.fetchBinding(request)
    }

    async getBindingLastOperation(request: BindingRequest<OperationRequest>): Promise<Operation> {
        return await this.managedService.getBindingLastOperation(request)
    }


    protected _getPlan(planId: string): OsbPlan {
        const plan = this.managedService.configuration.plans.find(p => p.id === planId)
        if (!plan) throw BrokerError.NotFound(`Plan ${planId} does not exist`)
        return plan
    }

    private _checkParameter({ inputParameter, planId, query }: { planId: string, inputParameter?: Record<string, any>, query: 'createProvision' | 'updateProvision' | 'binding' }) {
        if (!inputParameter) return
        const _planValidator = this._parameterValidator.get(planId)

        if (!_planValidator) return

        let _validator: ParameterValidator | undefined = undefined


        switch (query) {
            case "createProvision":
                _validator = _planValidator.provisionCreate;
                break;
            case "updateProvision":
                _validator = _planValidator.provisionUpdate
                break;
            case "binding":
                _validator = _planValidator.binding
                break;
            default:
                break;
        }

        if(_validator) {
            const result = _validator(inputParameter)
            console.log(_validator.errors);
        }

    }


    /**
     * Check Maintenance Info
     * @param planId 
     * @param maintenance_info 
     */
    private _checkProvisionMaintenanceInfo(provision: ProvisionRequest<CreateProvisioning>) {
        const storedMaintInfo = this._getPlan(provision.plan_id).maintenance_info
        const inputMaintInfo = provision.maintenance_info

        if (storedMaintInfo && inputMaintInfo && inputMaintInfo.version !== storedMaintInfo.version) {
            throw BrokerError.MaintenanceInfoConflict()
        }
    }

    
    private _createValidator() {
        this.managedService.configuration.plans.forEach(plan => {
            this._parameterValidator.set(plan.id, {
                provisionCreate: this._createParameterValidator(plan.schemas?.service_instance?.create?.parameters),
                provisionUpdate: this._createParameterValidator(plan.schemas?.service_instance?.update?.parameters),
                binding: this._createParameterValidator(plan.schemas?.service_binding?.create?.parameters)
            })

        })
    }

    private _createParameterValidator(jsonSchema?: Record<string, any>): ParameterValidator | undefined {
        if (!jsonSchema) return
        const _schema: Partial<typeof jsonSchema> = jsonSchema
        delete _schema['$schema']
        return _ajv.compile<Record<string, any>>(_schema)
    }



}