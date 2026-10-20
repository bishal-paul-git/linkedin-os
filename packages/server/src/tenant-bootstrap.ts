import type { PlatformRepositories, TenantRecord } from "./repositories.ts";

export interface BootstrapTenantInput {
  slug: string;
  name: string;
  organization?: string | null;
  createdBy?: string | null;
}

export class TenantBootstrapService {
  constructor(private readonly repos: PlatformRepositories) {}

  async bootstrap(input: BootstrapTenantInput): Promise<TenantRecord> {
    return this.repos.transaction(async () => {
      const tenant = await this.repos.createTenant(input);

      if (input.createdBy) {
        await this.repos.createOwnerMembership(tenant.id, input.createdBy);
      }

      await this.repos.createRunControl(tenant.id);
      await this.repos.createDefaultConfig(tenant.id);
      await this.repos.createDefaultCapabilities(tenant.id);
      await this.repos.createDefaultAgentSettings(tenant.id);
      await this.repos.createDefaultWorkflowSettings(tenant.id);

      await this.repos.appendActivity({
        tenantId: tenant.id,
        agent: "SYSTEM",
        action: "TENANT_BOOTSTRAPPED",
        reason: "Initial LinkedIn OS workspace setup",
        result: "SUCCEEDED",
      });

      return tenant;
    });
  }
}
