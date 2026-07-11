import type { PrismaClient } from '@goldos/database';
import { prisma } from '@goldos/database';

import { GlobalSearchService } from './search/global-search.service.js';
import { PrismaSearchBackend } from './search/prisma-search.backend.js';
import { SearchRepository } from './search/search.repository.js';
import { GoldPriceEngineService } from './engines/gold-price/gold-price.service.js';
import { AddressRepository } from './repositories/address.repository.js';
import { AuditRepository } from './repositories/audit.repository.js';
import { BranchRepository } from './repositories/branch.repository.js';
import { CurrencyRepository } from './repositories/currency.repository.js';
import { CustomerGroupRepository } from './repositories/customer-group.repository.js';
import { CustomerRepository } from './repositories/customer.repository.js';
import { DepartmentRepository } from './repositories/department.repository.js';
import { EmployeeRepository } from './repositories/employee.repository.js';
import { EntityOwnershipRepository } from './repositories/entity-ownership.repository.js';
import { ExchangeRateRepository } from './repositories/exchange-rate.repository.js';
import { GeoRepository } from './repositories/geo.repository.js';
import { GoldPriceRepository } from './repositories/gold-price.repository.js';
import { JobTitleRepository } from './repositories/job-title.repository.js';
import { OrganizationRepository } from './repositories/organization.repository.js';
import { PricingRuleRepository } from './repositories/pricing-rule.repository.js';
import { SettingsRepository } from './repositories/settings.repository.js';
import { SupplierRepository } from './repositories/supplier.repository.js';
import { TaxRuleRepository } from './repositories/tax-rule.repository.js';
import { WorkshopRepository } from './repositories/workshop.repository.js';
import { AddressService } from './services/address.service.js';
import { AuditService } from './services/audit.service.js';
import { BranchService } from './services/branch.service.js';
import { CurrencyService } from './services/currency.service.js';
import { CustomerGroupService } from './services/customer-group.service.js';
import { CustomerService } from './services/customer.service.js';
import { DepartmentService } from './services/department.service.js';
import { EmployeeService } from './services/employee.service.js';
import { ExchangeRateService } from './services/exchange-rate.service.js';
import { GeoService } from './services/geo.service.js';
import { ManagerValidationService } from './services/manager-validation.service.js';
import { JobTitleService } from './services/job-title.service.js';
import { OrganizationService } from './services/organization.service.js';
import { PricingRuleService } from './services/pricing-rule.service.js';
import { SettingsService } from './services/settings.service.js';
import { SupplierService } from './services/supplier.service.js';
import { TaxRuleService } from './services/tax-rule.service.js';
import { WorkshopService } from './services/workshop.service.js';

export interface BusinessContainerOptions {
  prisma?: PrismaClient;
}

export interface BusinessContainer {
  auditService: AuditService;
  organizationService: OrganizationService;
  branchService: BranchService;
  employeeService: EmployeeService;
  departmentService: DepartmentService;
  jobTitleService: JobTitleService;
  workshopService: WorkshopService;
  customerService: CustomerService;
  customerGroupService: CustomerGroupService;
  supplierService: SupplierService;
  addressService: AddressService;
  geoService: GeoService;
  currencyService: CurrencyService;
  exchangeRateService: ExchangeRateService;
  pricingRuleService: PricingRuleService;
  taxRuleService: TaxRuleService;
  settingsService: SettingsService;
  goldPriceService: GoldPriceEngineService;
  globalSearchService: GlobalSearchService;
}

export function createBusinessContainer(options: BusinessContainerOptions = {}): BusinessContainer {
  const prismaClient = options.prisma ?? prisma;

  const auditRepository = new AuditRepository(prismaClient);
  const organizationRepository = new OrganizationRepository(prismaClient);
  const branchRepository = new BranchRepository(prismaClient);
  const employeeRepository = new EmployeeRepository(prismaClient);
  const departmentRepository = new DepartmentRepository(prismaClient);
  const jobTitleRepository = new JobTitleRepository(prismaClient);
  const workshopRepository = new WorkshopRepository(prismaClient);
  const customerRepository = new CustomerRepository(prismaClient);
  const customerGroupRepository = new CustomerGroupRepository(prismaClient);
  const supplierRepository = new SupplierRepository(prismaClient);
  const addressRepository = new AddressRepository(prismaClient);
  const geoRepository = new GeoRepository(prismaClient);
  const currencyRepository = new CurrencyRepository(prismaClient);
  const exchangeRateRepository = new ExchangeRateRepository(prismaClient);
  const pricingRuleRepository = new PricingRuleRepository(prismaClient);
  const taxRuleRepository = new TaxRuleRepository(prismaClient);
  const settingsRepository = new SettingsRepository(prismaClient);
  const goldPriceRepository = new GoldPriceRepository(prismaClient);
  const entityOwnershipRepository = new EntityOwnershipRepository(prismaClient);
  const searchRepository = new SearchRepository(prismaClient);
  const prismaSearchBackend = new PrismaSearchBackend(searchRepository);

  const auditService = new AuditService(auditRepository);
  const managerValidationService = new ManagerValidationService(employeeRepository);
  const organizationService = new OrganizationService(organizationRepository, auditService);
  const branchService = new BranchService(
    branchRepository,
    organizationRepository,
    managerValidationService,
    auditService,
  );
  const employeeService = new EmployeeService(
    employeeRepository,
    branchRepository,
    managerValidationService,
    auditService,
  );
  const departmentService = new DepartmentService(departmentRepository, auditService);
  const jobTitleService = new JobTitleService(jobTitleRepository, auditService);
  const workshopService = new WorkshopService(workshopRepository, auditService);
  const customerService = new CustomerService(
    customerRepository,
    entityOwnershipRepository,
    auditService,
  );
  const customerGroupService = new CustomerGroupService(customerGroupRepository, auditService);
  const supplierService = new SupplierService(supplierRepository, auditService);
  const addressService = new AddressService(
    addressRepository,
    entityOwnershipRepository,
    auditService,
  );
  const geoService = new GeoService(geoRepository);
  const currencyService = new CurrencyService(currencyRepository, auditService);
  const exchangeRateService = new ExchangeRateService(exchangeRateRepository, auditService);
  const pricingRuleService = new PricingRuleService(pricingRuleRepository, auditService);
  const taxRuleService = new TaxRuleService(taxRuleRepository, auditService);
  const settingsService = new SettingsService(settingsRepository, auditService);
  const goldPriceService = new GoldPriceEngineService(goldPriceRepository, auditService);
  const globalSearchService = new GlobalSearchService(prismaSearchBackend);

  return {
    auditService,
    organizationService,
    branchService,
    employeeService,
    departmentService,
    jobTitleService,
    workshopService,
    customerService,
    customerGroupService,
    supplierService,
    addressService,
    geoService,
    currencyService,
    exchangeRateService,
    pricingRuleService,
    taxRuleService,
    settingsService,
    goldPriceService,
    globalSearchService,
  };
}
