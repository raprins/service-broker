
import BrokerError from "./error.js";
import { ProvisionRequest, CreateProvisioning, UpdateProvisioning, Provision, OsbServiceProxy, Operation, CreateBinding, BindingRequest, Binding, OperationRequest, OsbPlan } from "./service.js";

export default class SimpleServiceProxy extends OsbServiceProxy {

    async provision(request: ProvisionRequest<CreateProvisioning>): Promise<Provision> {

        this._checkProvisionMaintenanceInfo(request)
        return await this.managedService.provision(request)
    }

    async deprovision(request: ProvisionRequest<Record<string, any>>): Promise<void> {
        return await this.managedService.deprovision(request)
    }


    async fetchInstance(request: ProvisionRequest<Record<string, any>>): Promise<Provision> {

        const { instances_retrievable } = this.managedService.configuration
        if (!instances_retrievable) {
            throw BrokerError.UnsupportedOperation(`Could not retrieve instance instances_retrievable is false or undefined`)
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

    async fetchBinding(request: BindingRequest<Record<string, any>>): Promise<Binding<Record<string, any>>> {

        const { bindings_retrievable } = this.managedService.configuration
        if (!bindings_retrievable) {
            throw BrokerError.UnsupportedOperation(`Could not retrieve instance bindings_retrievable is false or undefined`)
        }

        return await this.managedService.fetchBinding(request)
    }

    async getBindingLastOperation(request: BindingRequest<OperationRequest>): Promise<Operation> {
        throw new Error("Method not implemented.");
    }


    private _getPlan(planId: string): OsbPlan {
        const plan = this.managedService.configuration.plans.find(p => p.id === planId)
        if (!plan) throw BrokerError.NotFound(`Plan ${planId} does not exist`)
        return plan
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



}