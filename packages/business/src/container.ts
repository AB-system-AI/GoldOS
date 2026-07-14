import type { PrismaClient } from '@goldos/database';
import { prisma } from '@goldos/database';

import { GlobalSearchService } from './search/global-search.service.js';
import { PrismaSearchBackend } from './search/prisma-search.backend.js';
import { SearchRepository } from './search/search.repository.js';
import { GoldPriceEngineService } from './engines/gold-price/gold-price.service.js';
import { AssetIdGenerator } from './inventory/engines/asset-id.generator.js';
import { LifecycleEngine } from './inventory/engines/lifecycle.engine.js';
import { LockEngine } from './inventory/engines/lock.engine.js';
import { MovementEngine } from './inventory/engines/movement.engine.js';
import { SkuGenerator } from './inventory/engines/sku-generator.js';
import {
  BrandRepository,
  CategoryRepository,
  CollectionRepository,
  CustodyEventRepository,
  InventoryAdjustmentRepository,
  InventoryItemRepository,
  InventoryLockRepository,
  InventoryLotRepository,
  LifecycleEventRepository,
  PriceHistoryRepository,
  ProductRepository,
  ProductTagRepository,
  ReservationRepository,
  StockCountRepository,
  StockMovementRepository,
  TransferRepository,
  WarehouseZoneRepository,
  WeightHistoryRepository,
} from './inventory/repositories/index.js';
import {
  BrandService,
  CategoryService,
  CollectionService,
  InventoryAdjustmentService,
  InventoryItemService,
  InventoryLotService,
  InventorySearchService,
  ProductService,
  ReservationService,
  StockCountService,
  TransferService,
  WarehouseZoneService,
} from './inventory/services/index.js';
import {
  BuybackService,
  CustomerSalesHistoryService,
  DocumentNumberGenerator,
  InvoiceService,
  PaymentService,
  PosService,
  SalesOrderService,
  SalesReturnService,
  BuybackRepository,
  InvoiceRepository,
  LoyaltyRepository,
  PaymentRepository,
  PosSessionRepository,
  SalesOrderRepository,
  SalesReturnRepository,
  SalesExchangeRepository,
  DiscountApprovalRepository,
  CashierQueueRepository,
  InvoiceTemplateRepository,
  ManualOverrideRepository,
  SalesEventLogRepository,
  SalesExchangeService,
  DiscountApprovalService,
  LoyaltyService,
  CashierQueueService,
  InvoiceTemplateService,
  InvoicePrintService,
  InvoiceSearchService,
  ManualOverrideService,
  SalesNotificationService,
  CheckoutOrchestratorService,
  ExchangeRateSnapshotService,
} from './sales/index.js';
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
import {
  AccountBalanceRepository,
  AccountingPeriodRepository,
  AccountingPostingService,
  AccountingTransactionRepository,
  BankAccountingService,
  BankReconciliationRepository,
  BankTransactionRepository,
  CashMovementRepository,
  CashRegisterService,
  CashRegisterShiftRepository,
  ChartOfAccountRepository,
  ChartOfAccountService,
  CustomerLedgerRepository,
  CustomerLedgerService,
  ExpenseAccountingService,
  ExpenseCategoryRepository,
  ExpenseRepository,
  FinancialReportService,
  FiscalPeriodService,
  FiscalYearRepository,
  GoldCostRepository,
  JewelryReportService,
  JournalEntryRepository,
  JournalService,
  OperationsAccountingIntegrationService,
  PurchaseAccountingIntegrationService,
  PurchaseOrderRepository,
  PurchaseOrderService,
  ManufacturingOrderRepository,
  RepairOrderRepository,
  ManufacturingOrderService,
  RepairOrderService,
  LedgerQueryService,
  TenantFinanceBootstrapService,
  SalesAccountingIntegrationService,
  SupplierLedgerRepository,
  SupplierLedgerService,
} from './accounting/index.js';
import {
  GoodsReceiptRepository,
  GoodsReceiptService,
  ProcurementService,
  PurchaseApprovalRepository,
  PurchaseApprovalService,
  PurchaseInvoiceRepository,
  PurchaseInvoiceService,
  PurchaseReportService,
  PurchaseRequestRepository,
  PurchaseRequestService,
  PurchaseReturnRepository,
  PurchaseReturnService,
  PurchaseRfqRepository,
  PurchaseRfqService,
  PurchasingDocumentNumberGenerator,
  PurchasingIntegrationService,
  SupplierPerformanceService,
  SupplierQuotationRepository,
  SupplierQuotationService,
  TenantPurchasingBootstrapService,
} from './purchasing/index.js';

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
  categoryService: CategoryService;
  brandService: BrandService;
  collectionService: CollectionService;
  productService: ProductService;
  inventoryItemService: InventoryItemService;
  inventoryLotService: InventoryLotService;
  transferService: TransferService;
  reservationService: ReservationService;
  inventoryAdjustmentService: InventoryAdjustmentService;
  stockCountService: StockCountService;
  warehouseZoneService: WarehouseZoneService;
  inventorySearchService: InventorySearchService;
  salesOrderService: SalesOrderService;
  invoiceService: InvoiceService;
  paymentService: PaymentService;
  posService: PosService;
  salesReturnService: SalesReturnService;
  buybackService: BuybackService;
  customerSalesHistoryService: CustomerSalesHistoryService;
  salesExchangeService: SalesExchangeService;
  discountApprovalService: DiscountApprovalService;
  loyaltyService: LoyaltyService;
  cashierQueueService: CashierQueueService;
  invoiceTemplateService: InvoiceTemplateService;
  invoicePrintService: InvoicePrintService;
  invoiceSearchService: InvoiceSearchService;
  manualOverrideService: ManualOverrideService;
  salesNotificationService: SalesNotificationService;
  checkoutOrchestratorService: CheckoutOrchestratorService;
  exchangeRateSnapshotService: ExchangeRateSnapshotService;
  chartOfAccountService: ChartOfAccountService;
  journalService: JournalService;
  accountingPostingService: AccountingPostingService;
  fiscalPeriodService: FiscalPeriodService;
  cashRegisterService: CashRegisterService;
  bankAccountingService: BankAccountingService;
  expenseAccountingService: ExpenseAccountingService;
  customerLedgerService: CustomerLedgerService;
  supplierLedgerService: SupplierLedgerService;
  salesAccountingIntegrationService: SalesAccountingIntegrationService;
  purchaseAccountingIntegrationService: PurchaseAccountingIntegrationService;
  financialReportService: FinancialReportService;
  jewelryReportService: JewelryReportService;
  operationsAccountingIntegrationService: OperationsAccountingIntegrationService;
  purchaseOrderService: PurchaseOrderService;
  manufacturingOrderService: ManufacturingOrderService;
  repairOrderService: RepairOrderService;
  ledgerQueryService: LedgerQueryService;
  tenantFinanceBootstrapService: TenantFinanceBootstrapService;
  purchaseRequestService: PurchaseRequestService;
  purchaseRfqService: PurchaseRfqService;
  supplierQuotationService: SupplierQuotationService;
  goodsReceiptService: GoodsReceiptService;
  purchaseInvoiceService: PurchaseInvoiceService;
  purchaseReturnService: PurchaseReturnService;
  purchaseApprovalService: PurchaseApprovalService;
  procurementService: ProcurementService;
  supplierPerformanceService: SupplierPerformanceService;
  purchaseReportService: PurchaseReportService;
  tenantPurchasingBootstrapService: TenantPurchasingBootstrapService;
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

  const categoryRepository = new CategoryRepository(prismaClient);
  const brandRepository = new BrandRepository(prismaClient);
  const collectionRepository = new CollectionRepository(prismaClient);
  const productRepository = new ProductRepository(prismaClient);
  const productTagRepository = new ProductTagRepository(prismaClient);
  const inventoryItemRepository = new InventoryItemRepository(prismaClient);
  const inventoryLotRepository = new InventoryLotRepository(prismaClient);
  const stockMovementRepository = new StockMovementRepository(prismaClient);
  const transferRepository = new TransferRepository(prismaClient);
  const reservationRepository = new ReservationRepository(prismaClient);
  const inventoryAdjustmentRepository = new InventoryAdjustmentRepository(prismaClient);
  const inventoryLockRepository = new InventoryLockRepository(prismaClient);
  const custodyEventRepository = new CustodyEventRepository(prismaClient);
  const lifecycleEventRepository = new LifecycleEventRepository(prismaClient);
  const priceHistoryRepository = new PriceHistoryRepository(prismaClient);
  const weightHistoryRepository = new WeightHistoryRepository(prismaClient);
  const stockCountRepository = new StockCountRepository(prismaClient);
  const warehouseZoneRepository = new WarehouseZoneRepository(prismaClient);

  const auditService = new AuditService(auditRepository);
  const skuGenerator = new SkuGenerator(prismaClient);
  const assetIdGenerator = new AssetIdGenerator(prismaClient);
  const lockEngine = new LockEngine(inventoryItemRepository, inventoryLockRepository);
  const lifecycleEngine = new LifecycleEngine(
    inventoryItemRepository,
    lifecycleEventRepository,
    lockEngine,
  );
  const movementEngine = new MovementEngine(
    inventoryItemRepository,
    stockMovementRepository,
    auditService,
  );

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

  const chartOfAccountRepository = new ChartOfAccountRepository(prismaClient);
  const journalEntryRepository = new JournalEntryRepository(prismaClient);
  const accountBalanceRepository = new AccountBalanceRepository(prismaClient);
  const accountingTransactionRepository = new AccountingTransactionRepository(prismaClient);
  const fiscalYearRepository = new FiscalYearRepository(prismaClient);
  const accountingPeriodRepository = new AccountingPeriodRepository(prismaClient);
  const cashRegisterShiftRepository = new CashRegisterShiftRepository(prismaClient);
  const cashMovementRepository = new CashMovementRepository(prismaClient);
  const bankTransactionRepository = new BankTransactionRepository(prismaClient);
  const bankReconciliationRepository = new BankReconciliationRepository(prismaClient);
  const customerLedgerRepository = new CustomerLedgerRepository(prismaClient);
  const supplierLedgerRepository = new SupplierLedgerRepository(prismaClient);
  const expenseCategoryRepository = new ExpenseCategoryRepository(prismaClient);
  const expenseRepository = new ExpenseRepository(prismaClient);
  const goldCostRepository = new GoldCostRepository(prismaClient);
  const purchaseOrderRepository = new PurchaseOrderRepository(prismaClient);
  const manufacturingOrderRepository = new ManufacturingOrderRepository(prismaClient);
  const repairOrderRepository = new RepairOrderRepository(prismaClient);

  const chartOfAccountService = new ChartOfAccountService(chartOfAccountRepository, auditService);
  const journalService = new JournalService(
    prismaClient,
    journalEntryRepository,
    chartOfAccountRepository,
    accountBalanceRepository,
    accountingTransactionRepository,
    accountingPeriodRepository,
    auditService,
  );
  const accountingPostingService = new AccountingPostingService(
    chartOfAccountRepository,
    accountingTransactionRepository,
    journalService,
  );
  const fiscalPeriodService = new FiscalPeriodService(
    fiscalYearRepository,
    accountingPeriodRepository,
    journalEntryRepository,
    auditService,
  );
  const operationsAccountingIntegrationService = new OperationsAccountingIntegrationService(
    accountingPostingService,
    goldCostRepository,
  );
  const customerLedgerService = new CustomerLedgerService(prismaClient, customerLedgerRepository);
  const supplierLedgerService = new SupplierLedgerService(prismaClient, supplierLedgerRepository);
  const salesAccountingIntegrationService = new SalesAccountingIntegrationService(
    accountingPostingService,
    customerLedgerService,
    goldCostRepository,
  );
  const purchaseAccountingIntegrationService = new PurchaseAccountingIntegrationService(
    accountingPostingService,
    supplierLedgerService,
  );
  const cashRegisterService = new CashRegisterService(
    cashRegisterShiftRepository,
    cashMovementRepository,
    auditService,
    operationsAccountingIntegrationService,
  );
  const bankAccountingService = new BankAccountingService(
    bankTransactionRepository,
    bankReconciliationRepository,
    auditService,
    operationsAccountingIntegrationService,
  );
  const expenseAccountingService = new ExpenseAccountingService(
    prismaClient,
    expenseRepository,
    expenseCategoryRepository,
    accountingPostingService,
    auditService,
  );
  const financialReportService = new FinancialReportService(
    accountBalanceRepository,
    chartOfAccountRepository,
    journalEntryRepository,
  );
  const jewelryReportService = new JewelryReportService(prismaClient);
  const ledgerQueryService = new LedgerQueryService(
    financialReportService,
    customerLedgerService,
    supplierLedgerService,
  );
  const tenantFinanceBootstrapService = new TenantFinanceBootstrapService(
    chartOfAccountService,
    expenseCategoryRepository,
    auditService,
  );
  const manufacturingOrderService = new ManufacturingOrderService(
    manufacturingOrderRepository,
    auditService,
    operationsAccountingIntegrationService,
  );
  const repairOrderService = new RepairOrderService(
    repairOrderRepository,
    auditService,
    operationsAccountingIntegrationService,
  );

  const goldPriceService = new GoldPriceEngineService(
    goldPriceRepository,
    auditService,
    operationsAccountingIntegrationService,
  );
  const globalSearchService = new GlobalSearchService(prismaSearchBackend);

  const categoryService = new CategoryService(
    categoryRepository,
    entityOwnershipRepository,
    auditService,
  );
  const brandService = new BrandService(brandRepository, auditService);
  const collectionService = new CollectionService(collectionRepository, auditService);
  const productService = new ProductService(
    productRepository,
    productTagRepository,
    entityOwnershipRepository,
    skuGenerator,
    auditService,
  );
  const inventoryItemService = new InventoryItemService(
    inventoryItemRepository,
    inventoryLotRepository,
    custodyEventRepository,
    lifecycleEventRepository,
    priceHistoryRepository,
    weightHistoryRepository,
    inventoryLockRepository,
    entityOwnershipRepository,
    assetIdGenerator,
    movementEngine,
    lifecycleEngine,
    lockEngine,
    auditService,
  );
  const inventoryLotService = new InventoryLotService(inventoryLotRepository, auditService);
  const transferService = new TransferService(
    transferRepository,
    inventoryItemRepository,
    entityOwnershipRepository,
    skuGenerator,
    movementEngine,
    lifecycleEngine,
    lockEngine,
    auditService,
  );
  const reservationService = new ReservationService(
    reservationRepository,
    inventoryItemRepository,
    entityOwnershipRepository,
    skuGenerator,
    movementEngine,
    lifecycleEngine,
    lockEngine,
    auditService,
  );
  const inventoryAdjustmentService = new InventoryAdjustmentService(
    inventoryAdjustmentRepository,
    inventoryItemRepository,
    entityOwnershipRepository,
    skuGenerator,
    movementEngine,
    lifecycleEngine,
    auditService,
    operationsAccountingIntegrationService,
  );
  const stockCountService = new StockCountService(
    stockCountRepository,
    inventoryItemRepository,
    entityOwnershipRepository,
    skuGenerator,
    auditService,
    operationsAccountingIntegrationService,
  );
  const warehouseZoneService = new WarehouseZoneService(
    warehouseZoneRepository,
    entityOwnershipRepository,
    auditService,
  );
  const inventorySearchService = new InventorySearchService(
    inventoryItemRepository,
    productRepository,
  );

  const salesOrderRepository = new SalesOrderRepository(prismaClient);
  const invoiceRepository = new InvoiceRepository(prismaClient);
  const paymentRepository = new PaymentRepository(prismaClient);
  const posSessionRepository = new PosSessionRepository(prismaClient);
  const salesReturnRepository = new SalesReturnRepository(prismaClient);
  const buybackRepository = new BuybackRepository(prismaClient);
  const loyaltyRepository = new LoyaltyRepository(prismaClient);
  const salesExchangeRepository = new SalesExchangeRepository(prismaClient);
  const discountApprovalRepository = new DiscountApprovalRepository(prismaClient);
  const cashierQueueRepository = new CashierQueueRepository(prismaClient);
  const invoiceTemplateRepository = new InvoiceTemplateRepository(prismaClient);
  const manualOverrideRepository = new ManualOverrideRepository(prismaClient);
  const salesEventLogRepository = new SalesEventLogRepository(prismaClient);
  const documentNumberGenerator = new DocumentNumberGenerator(prismaClient);
  const purchasingDocumentNumberGenerator = new PurchasingDocumentNumberGenerator(prismaClient);

  const purchaseRequestRepository = new PurchaseRequestRepository(prismaClient);
  const purchaseRfqRepository = new PurchaseRfqRepository(prismaClient);
  const supplierQuotationRepository = new SupplierQuotationRepository(prismaClient);
  const goodsReceiptRepository = new GoodsReceiptRepository(prismaClient);
  const purchaseInvoiceRepository = new PurchaseInvoiceRepository(prismaClient);
  const purchaseReturnRepository = new PurchaseReturnRepository(prismaClient);
  const purchaseApprovalRepository = new PurchaseApprovalRepository(prismaClient);

  const purchaseApprovalService = new PurchaseApprovalService(
    purchaseApprovalRepository,
    entityOwnershipRepository,
    auditService,
  );

  const purchasingIntegrationService = new PurchasingIntegrationService(
    inventoryItemService,
    goldCostRepository,
    priceHistoryRepository,
    purchaseAccountingIntegrationService,
  );

  const purchaseRequestService = new PurchaseRequestService(
    purchaseRequestRepository,
    entityOwnershipRepository,
    purchasingDocumentNumberGenerator,
    purchaseApprovalService,
    auditService,
  );
  const purchaseRfqService = new PurchaseRfqService(
    purchaseRfqRepository,
    entityOwnershipRepository,
    purchasingDocumentNumberGenerator,
    auditService,
  );
  const supplierQuotationService = new SupplierQuotationService(
    supplierQuotationRepository,
    purchaseRfqRepository,
    entityOwnershipRepository,
    purchasingDocumentNumberGenerator,
    auditService,
  );
  const supplierPerformanceService = new SupplierPerformanceService(prismaClient);
  const goodsReceiptService = new GoodsReceiptService(
    goodsReceiptRepository,
    purchaseOrderRepository,
    entityOwnershipRepository,
    purchasingDocumentNumberGenerator,
    purchasingIntegrationService,
    supplierPerformanceService,
    auditService,
  );
  const purchaseInvoiceService = new PurchaseInvoiceService(
    purchaseInvoiceRepository,
    purchaseOrderRepository,
    entityOwnershipRepository,
    purchasingDocumentNumberGenerator,
    purchasingIntegrationService,
    auditService,
  );
  const purchaseReturnService = new PurchaseReturnService(
    purchaseReturnRepository,
    entityOwnershipRepository,
    purchasingDocumentNumberGenerator,
    movementEngine,
    lifecycleEngine,
    purchaseApprovalService,
    purchasingIntegrationService,
    auditService,
  );
  const purchaseReportService = new PurchaseReportService(prismaClient);
  const tenantPurchasingBootstrapService = new TenantPurchasingBootstrapService(
    purchaseApprovalRepository,
    auditService,
  );

  const salesNotificationService = new SalesNotificationService(salesEventLogRepository);
  const loyaltyService = new LoyaltyService(loyaltyRepository, auditService);
  const discountApprovalService = new DiscountApprovalService(
    discountApprovalRepository,
    salesNotificationService,
    auditService,
  );
  const exchangeRateSnapshotService = new ExchangeRateSnapshotService(
    currencyRepository,
    exchangeRateRepository,
  );

  const salesOrderService = new SalesOrderService(
    salesOrderRepository,
    inventoryItemRepository,
    entityOwnershipRepository,
    documentNumberGenerator,
    goldPriceService,
    exchangeRateSnapshotService,
    movementEngine,
    lifecycleEngine,
    lockEngine,
    auditService,
  );
  const invoiceService = new InvoiceService(
    invoiceRepository,
    salesOrderRepository,
    documentNumberGenerator,
    goldPriceService,
    auditService,
    salesNotificationService,
  );
  const paymentService = new PaymentService(
    paymentRepository,
    invoiceRepository,
    salesOrderRepository,
    documentNumberGenerator,
    auditService,
    salesAccountingIntegrationService,
    purchaseAccountingIntegrationService,
  );

  const purchaseOrderService = new PurchaseOrderService(
    purchaseOrderRepository,
    entityOwnershipRepository,
    purchasingDocumentNumberGenerator,
    auditService,
    purchaseApprovalService,
    purchaseAccountingIntegrationService,
  );

  const procurementService = new ProcurementService(
    purchaseRequestService,
    purchaseRfqService,
    supplierQuotationService,
    purchaseOrderService,
    goodsReceiptService,
    purchaseInvoiceService,
    purchaseRfqRepository,
    purchaseOrderRepository,
  );

  const checkoutOrchestratorService = new CheckoutOrchestratorService(
    prismaClient,
    salesOrderRepository,
    salesOrderService,
    invoiceService,
    paymentService,
    discountApprovalService,
    loyaltyService,
    lockEngine,
    reservationService,
    salesNotificationService,
    salesAccountingIntegrationService,
  );
  const posService = new PosService(
    posSessionRepository,
    entityOwnershipRepository,
    documentNumberGenerator,
    inventorySearchService,
    salesOrderService,
    checkoutOrchestratorService,
    salesNotificationService,
    auditService,
  );
  const salesReturnService = new SalesReturnService(
    salesReturnRepository,
    invoiceRepository,
    entityOwnershipRepository,
    documentNumberGenerator,
    movementEngine,
    lifecycleEngine,
    auditService,
    loyaltyService,
    salesNotificationService,
    salesAccountingIntegrationService,
  );
  const buybackService = new BuybackService(
    buybackRepository,
    entityOwnershipRepository,
    documentNumberGenerator,
    goldPriceService,
    movementEngine,
    auditService,
    salesNotificationService,
    salesAccountingIntegrationService,
  );
  const customerSalesHistoryService = new CustomerSalesHistoryService(
    prismaClient,
    customerRepository,
    loyaltyRepository,
  );
  const salesExchangeService = new SalesExchangeService(
    salesExchangeRepository,
    invoiceRepository,
    entityOwnershipRepository,
    documentNumberGenerator,
    goldPriceService,
    exchangeRateSnapshotService,
    movementEngine,
    lifecycleEngine,
    salesNotificationService,
    auditService,
    salesAccountingIntegrationService,
  );
  const cashierQueueService = new CashierQueueService(
    cashierQueueRepository,
    salesOrderRepository,
    entityOwnershipRepository,
    lockEngine,
    salesNotificationService,
    auditService,
  );
  const invoiceTemplateService = new InvoiceTemplateService(
    invoiceTemplateRepository,
    auditService,
  );
  const invoicePrintService = new InvoicePrintService(invoiceRepository, invoiceTemplateService);
  const invoiceSearchService = new InvoiceSearchService(prismaClient);
  const manualOverrideService = new ManualOverrideService(
    manualOverrideRepository,
    entityOwnershipRepository,
    auditService,
  );

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
    categoryService,
    brandService,
    collectionService,
    productService,
    inventoryItemService,
    inventoryLotService,
    transferService,
    reservationService,
    inventoryAdjustmentService,
    stockCountService,
    warehouseZoneService,
    inventorySearchService,
    salesOrderService,
    invoiceService,
    paymentService,
    posService,
    salesReturnService,
    buybackService,
    customerSalesHistoryService,
    salesExchangeService,
    discountApprovalService,
    loyaltyService,
    cashierQueueService,
    invoiceTemplateService,
    invoicePrintService,
    invoiceSearchService,
    manualOverrideService,
    salesNotificationService,
    checkoutOrchestratorService,
    exchangeRateSnapshotService,
    chartOfAccountService,
    journalService,
    accountingPostingService,
    fiscalPeriodService,
    cashRegisterService,
    bankAccountingService,
    expenseAccountingService,
    customerLedgerService,
    supplierLedgerService,
    salesAccountingIntegrationService,
    purchaseAccountingIntegrationService,
    financialReportService,
    jewelryReportService,
    operationsAccountingIntegrationService,
    purchaseOrderService,
    manufacturingOrderService,
    repairOrderService,
    ledgerQueryService,
    tenantFinanceBootstrapService,
    purchaseRequestService,
    purchaseRfqService,
    supplierQuotationService,
    goodsReceiptService,
    purchaseInvoiceService,
    purchaseReturnService,
    purchaseApprovalService,
    procurementService,
    supplierPerformanceService,
    purchaseReportService,
    tenantPurchasingBootstrapService,
  };
}
