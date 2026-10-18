-- TASK-002: atomic, additive migration. Existing document/payment/audit rows are preserved.
BEGIN;

-- CreateEnum
CREATE TYPE "ContactStage" AS ENUM ('LEAD', 'PROSPECT', 'CUSTOMER', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CARD', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'PARENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- DropForeignKey
ALTER TABLE "AuditEvent" DROP CONSTRAINT "AuditEvent_workspaceId_fkey";

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "requestId" TEXT;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'VIEWER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "stage" "ContactStage" NOT NULL DEFAULT 'LEAD',
    "ownerId" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "ownerId" TEXT,
    "stage" "DealStage" NOT NULL DEFAULT 'NEW',
    "value" DECIMAL(20,0) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'RUB',
    "expectedCloseDate" DATE,
    "closedAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "contactId" TEXT,
    "dealId" TEXT,
    "assignedToId" TEXT,
    "description" TEXT,
    "dueAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "number" VARCHAR(64) NOT NULL,
    "contactId" TEXT NOT NULL,
    "dealId" TEXT,
    "projectId" TEXT,
    "createdById" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL DEFAULT 'RUB',
    "subtotal" DECIMAL(20,0) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(20,0) NOT NULL,
    "issueDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(20,3) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(20,0) NOT NULL,
    "total" DECIMAL(20,0) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "receivedById" TEXT,
    "amount" DECIMAL(20,0) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" VARCHAR(32) NOT NULL DEFAULT 'pcs',
    "currency" CHAR(3) NOT NULL DEFAULT 'RUB',
    "costPrice" DECIMAL(20,0) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(20,0) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(20,3) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "qty" DECIMAL(20,3) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "createdById" TEXT,
    "type" "MovementType" NOT NULL,
    "quantity" DECIMAL(20,3) NOT NULL,
    "qtyBefore" DECIMAL(20,3) NOT NULL,
    "qtyAfter" DECIMAL(20,3) NOT NULL,
    "transferId" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "position" TEXT,
    "hireDate" DATE NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "managerId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "approvedById" TEXT,
    "type" "LeaveType" NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" DECIMAL(6,2) NOT NULL,
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contactId" TEXT,
    "managerId" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "budget" DECIMAL(20,0) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'RUB',
    "startDate" DATE,
    "endDate" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "position" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_workspaceId_stage_idx" ON "Contact"("workspaceId", "stage");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_email_idx" ON "Contact"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_ownerId_idx" ON "Contact"("workspaceId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_id_workspaceId_key" ON "Contact"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "Deal_workspaceId_stage_idx" ON "Deal"("workspaceId", "stage");

-- CreateIndex
CREATE INDEX "Deal_workspaceId_contactId_idx" ON "Deal"("workspaceId", "contactId");

-- CreateIndex
CREATE INDEX "Deal_workspaceId_ownerId_idx" ON "Deal"("workspaceId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_id_workspaceId_key" ON "Deal"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "Activity_workspaceId_contactId_idx" ON "Activity"("workspaceId", "contactId");

-- CreateIndex
CREATE INDEX "Activity_workspaceId_dealId_idx" ON "Activity"("workspaceId", "dealId");

-- CreateIndex
CREATE INDEX "Activity_workspaceId_assignedToId_dueAt_idx" ON "Activity"("workspaceId", "assignedToId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_id_workspaceId_key" ON "Activity"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_status_dueDate_idx" ON "Invoice"("workspaceId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_contactId_idx" ON "Invoice"("workspaceId", "contactId");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_dealId_idx" ON "Invoice"("workspaceId", "dealId");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_projectId_idx" ON "Invoice"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_createdById_idx" ON "Invoice"("workspaceId", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_id_workspaceId_key" ON "Invoice"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_workspaceId_number_key" ON "Invoice"("workspaceId", "number");

-- CreateIndex
CREATE INDEX "InvoiceItem_workspaceId_productId_idx" ON "InvoiceItem"("workspaceId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_id_workspaceId_key" ON "InvoiceItem"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_workspaceId_invoiceId_position_key" ON "InvoiceItem"("workspaceId", "invoiceId", "position");

-- CreateIndex
CREATE INDEX "invoice_payments_workspaceId_invoiceId_idx" ON "invoice_payments"("workspaceId", "invoiceId");

-- CreateIndex
CREATE INDEX "invoice_payments_workspaceId_receivedAt_idx" ON "invoice_payments"("workspaceId", "receivedAt");

-- CreateIndex
CREATE INDEX "invoice_payments_workspaceId_receivedById_idx" ON "invoice_payments"("workspaceId", "receivedById");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payments_id_workspaceId_key" ON "invoice_payments"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_payments_workspaceId_reference_key" ON "invoice_payments"("workspaceId", "reference");

-- CreateIndex
CREATE INDEX "Product_workspaceId_isActive_name_idx" ON "Product"("workspaceId", "isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_workspaceId_key" ON "Product"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_workspaceId_sku_key" ON "Product"("workspaceId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_id_workspaceId_key" ON "Warehouse"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_workspaceId_code_key" ON "Warehouse"("workspaceId", "code");

-- CreateIndex
CREATE INDEX "StockItem_workspaceId_warehouseId_idx" ON "StockItem"("workspaceId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_id_workspaceId_key" ON "StockItem"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_workspaceId_productId_warehouseId_key" ON "StockItem"("workspaceId", "productId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_workspaceId_stockItemId_createdAt_idx" ON "StockMovement"("workspaceId", "stockItemId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_workspaceId_transferId_idx" ON "StockMovement"("workspaceId", "transferId");

-- CreateIndex
CREATE INDEX "StockMovement_workspaceId_createdById_idx" ON "StockMovement"("workspaceId", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_id_workspaceId_key" ON "StockMovement"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "Employee_workspaceId_status_idx" ON "Employee"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Employee_workspaceId_managerId_idx" ON "Employee"("workspaceId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_id_workspaceId_key" ON "Employee"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_workspaceId_employeeId_key" ON "Employee"("workspaceId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_workspaceId_key" ON "Employee"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "Leave_workspaceId_employeeId_startDate_idx" ON "Leave"("workspaceId", "employeeId", "startDate");

-- CreateIndex
CREATE INDEX "Leave_workspaceId_status_startDate_idx" ON "Leave"("workspaceId", "status", "startDate");

-- CreateIndex
CREATE INDEX "Leave_workspaceId_approvedById_idx" ON "Leave"("workspaceId", "approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "Leave_id_workspaceId_key" ON "Leave"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_status_idx" ON "Project"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Project_workspaceId_contactId_idx" ON "Project"("workspaceId", "contactId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_managerId_idx" ON "Project"("workspaceId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_workspaceId_key" ON "Project"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_code_key" ON "Project"("workspaceId", "code");

-- CreateIndex
CREATE INDEX "Task_workspaceId_projectId_status_position_idx" ON "Task"("workspaceId", "projectId", "status", "position");

-- CreateIndex
CREATE INDEX "Task_workspaceId_assignedToId_status_idx" ON "Task"("workspaceId", "assignedToId", "status");

-- CreateIndex
CREATE INDEX "Task_parentId_projectId_workspaceId_idx" ON "Task"("parentId", "projectId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_id_workspaceId_key" ON "Task"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_id_projectId_workspaceId_key" ON "Task"("id", "projectId", "workspaceId");

-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_entityType_entityId_idx" ON "AuditEvent"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_actorId_idx" ON "AuditEvent"("workspaceId", "actorId");

-- CreateIndex
CREATE INDEX "Membership_workspaceId_isActive_role_idx" ON "Membership"("workspaceId", "isActive", "role");

-- CreateIndex
CREATE INDEX "Session_workspaceId_userId_idx" ON "Session"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_workspaceId_fkey" FOREIGN KEY ("userId", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_workspaceId_fkey" FOREIGN KEY ("actorId", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_workspaceId_fkey" FOREIGN KEY ("ownerId", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_workspaceId_fkey" FOREIGN KEY ("contactId", "workspaceId") REFERENCES "Contact"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_workspaceId_fkey" FOREIGN KEY ("ownerId", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_workspaceId_fkey" FOREIGN KEY ("contactId", "workspaceId") REFERENCES "Contact"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_workspaceId_fkey" FOREIGN KEY ("dealId", "workspaceId") REFERENCES "Deal"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_assignedToId_workspaceId_fkey" FOREIGN KEY ("assignedToId", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contactId_workspaceId_fkey" FOREIGN KEY ("contactId", "workspaceId") REFERENCES "Contact"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dealId_workspaceId_fkey" FOREIGN KEY ("dealId", "workspaceId") REFERENCES "Deal"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_workspaceId_fkey" FOREIGN KEY ("projectId", "workspaceId") REFERENCES "Project"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_workspaceId_fkey" FOREIGN KEY ("createdById", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_workspaceId_fkey" FOREIGN KEY ("invoiceId", "workspaceId") REFERENCES "Invoice"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_workspaceId_fkey" FOREIGN KEY ("productId", "workspaceId") REFERENCES "Product"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoiceId_workspaceId_fkey" FOREIGN KEY ("invoiceId", "workspaceId") REFERENCES "Invoice"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_receivedById_workspaceId_fkey" FOREIGN KEY ("receivedById", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_productId_workspaceId_fkey" FOREIGN KEY ("productId", "workspaceId") REFERENCES "Product"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_warehouseId_workspaceId_fkey" FOREIGN KEY ("warehouseId", "workspaceId") REFERENCES "Warehouse"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockItemId_workspaceId_fkey" FOREIGN KEY ("stockItemId", "workspaceId") REFERENCES "StockItem"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_workspaceId_fkey" FOREIGN KEY ("createdById", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_workspaceId_fkey" FOREIGN KEY ("userId", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_workspaceId_fkey" FOREIGN KEY ("managerId", "workspaceId") REFERENCES "Employee"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_workspaceId_fkey" FOREIGN KEY ("employeeId", "workspaceId") REFERENCES "Employee"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_approvedById_workspaceId_fkey" FOREIGN KEY ("approvedById", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_contactId_workspaceId_fkey" FOREIGN KEY ("contactId", "workspaceId") REFERENCES "Contact"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_workspaceId_fkey" FOREIGN KEY ("managerId", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_workspaceId_fkey" FOREIGN KEY ("projectId", "workspaceId") REFERENCES "Project"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_projectId_workspaceId_fkey" FOREIGN KEY ("parentId", "projectId", "workspaceId") REFERENCES "Task"("id", "projectId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_workspaceId_fkey" FOREIGN KEY ("assignedToId", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business CHECK constraints cannot be represented in Prisma 6 schema syntax.
-- Keep them in migration history so migrate dev/deploy and shadow DB agree.
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_name_check" CHECK (btrim("name") <> '');
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_value_check" CHECK ("value" >= 0);
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_context_check" CHECK ("contactId" IS NOT NULL OR "dealId" IS NOT NULL);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amounts_check" CHECK ("subtotal" >= 0 AND "total" >= 0 AND "taxRate" >= 0 AND "taxRate" <= 100);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_total_check" CHECK ("total" = round("subtotal" * (1 + "taxRate" / 100), 0));
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dates_check" CHECK ("dueDate" >= "issueDate");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_number_check" CHECK (btrim("number") <> '');
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_values_check" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "total" >= 0 AND "position" >= 0);
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_total_check" CHECK ("total" = round("quantity" * "unitPrice", 0));
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_amount_check" CHECK ("amount" > 0 AND btrim("reference") <> '');
ALTER TABLE "Product" ADD CONSTRAINT "Product_values_check" CHECK ("costPrice" >= 0 AND "salePrice" >= 0 AND "minStock" >= 0 AND btrim("sku") <> '' AND btrim("name") <> '');
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_code_check" CHECK (btrim("code") <> '' AND btrim("name") <> '');
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_qty_check" CHECK ("qty" >= 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_balance_check" CHECK ("quantity" <> 0 AND "qtyBefore" >= 0 AND "qtyAfter" >= 0 AND "qtyAfter" = "qtyBefore" + "quantity");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_direction_check" CHECK (("type" IN ('IN', 'TRANSFER_IN') AND "quantity" > 0) OR ("type" IN ('OUT', 'TRANSFER_OUT') AND "quantity" < 0) OR "type" = 'ADJUSTMENT');
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_transfer_check" CHECK (("type" IN ('TRANSFER_IN', 'TRANSFER_OUT') AND "transferId" IS NOT NULL) OR ("type" NOT IN ('TRANSFER_IN', 'TRANSFER_OUT') AND "transferId" IS NULL));
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_manager_check" CHECK ("managerId" IS NULL OR "managerId" <> "id");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_identifier_check" CHECK (btrim("employeeId") <> '' AND btrim("name") <> '');
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_dates_check" CHECK ("endDate" >= "startDate" AND "days" > 0);
ALTER TABLE "Project" ADD CONSTRAINT "Project_budget_check" CHECK ("budget" >= 0 AND btrim("code") <> '' AND btrim("name") <> '');
ALTER TABLE "Project" ADD CONSTRAINT "Project_dates_check" CHECK ("startDate" IS NULL OR "endDate" IS NULL OR "endDate" >= "startDate");
ALTER TABLE "Task" ADD CONSTRAINT "Task_parent_check" CHECK ("parentId" IS NULL OR "parentId" <> "id");
ALTER TABLE "Task" ADD CONSTRAINT "Task_values_check" CHECK ("position" >= 0 AND btrim("title") <> '');
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_legacy_amount_check" CHECK ("amount" > 0);
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_version_check" CHECK ("version" > 0);
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_version_check" CHECK ("version" > 0);
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_version_check" CHECK ("version" > 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_version_check" CHECK ("version" > 0);
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_version_check" CHECK ("version" > 0);
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_version_check" CHECK ("version" > 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_version_check" CHECK ("version" > 0);
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_version_check" CHECK ("version" > 0);
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_version_check" CHECK ("version" > 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_version_check" CHECK ("version" > 0);
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_version_check" CHECK ("version" > 0);
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_version_check" CHECK ("version" > 0);
ALTER TABLE "Project" ADD CONSTRAINT "Project_version_check" CHECK ("version" > 0);
ALTER TABLE "Task" ADD CONSTRAINT "Task_version_check" CHECK ("version" > 0);
ALTER TABLE "Document" ADD CONSTRAINT "Document_version_check" CHECK ("version" > 0);
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "Product" ADD CONSTRAINT "Product_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "Project" ADD CONSTRAINT "Project_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');

COMMIT;
