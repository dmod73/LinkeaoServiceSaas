"use client";

import React, { useState } from "react";
import useSWR from "swr";
import CreateDocumentModalNew from "./CreateDocumentModalNew";
import type {
  InvoicingDashboardData,
  InvoicingClient,
  InvoicingItem,
  InvoicingDocument,
  DocumentType,
  DocumentStatus,
} from "@/lib/features/invoicing/types";
import {
  formatCurrency,
  getStatusLabel,
  calculateBalanceDue,
  calculateDocumentTotal,
} from "@/lib/features/invoicing/utils";
import styles from "./invoicing.module.css";

// SVG Icon Components
const InvoiceIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-8h8v2H8v-2zm0 4h8v2H8v-2z"/>
  </svg>
);

const EstimateIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm6-4a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
  </svg>
);

const RevenueIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
  </svg>
);

const PendingIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
  </svg>
);

const OverdueIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

const PaidIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

// Tab Navigation Icons
const OverviewTabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 11h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zM4 21h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1z"/>
  </svg>
);

const InvoicesTabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
  </svg>
);

const EstimatesTabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
  </svg>
);

const ClientsTabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const ItemsTabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-9l1.96 2.5H17V9h2.5zm-1.5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
  </svg>
);

const ReportsTabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
  </svg>
);

const SettingsTabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Props = {
  initialData: InvoicingDashboardData;
  tenantId: string;
};

type Tab = "overview" | "invoices" | "estimates" | "clients" | "items" | "reports" | "settings";

type ToastType = "success" | "error" | "info" | "warning";

type ModalType = 
  | "create-client" 
  | "edit-client" 
  | "create-item" 
  | "edit-item"
  | "create-invoice"
  | "create-estimate"
  | "edit-document"
  | "record-payment"
  | "settings"
  | null;

export function InvoicingDashboardClient({ initialData, tenantId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [paymentHistoryDoc, setPaymentHistoryDoc] = useState<InvoicingDocument | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: "",
    type: "success",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Confirmar",
    cancelText: "Cancelar",
  });

  const { data, mutate } = useSWR<InvoicingDashboardData>(
    `/api/invoicing/dashboard?tenantId=${tenantId}`,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
    }
  );

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  if (!data?.enabled) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>[X]</div>
          <h2 className={styles.emptyStateTitle}>Modulo de Facturacion no habilitado</h2>
          <p className={styles.emptyStateText}>
            Contacta al administrador para habilitar este modulo en tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  const clients = data.clients ?? [];
  const items = data.items ?? [];
  const templates = data.templates ?? [];
  const settings = data.settings;
  
  // Map documents to normalize field names from database
  const documents = (data.recentDocuments ?? []).map((doc: any) => ({
    ...doc,
    line_items: doc.items || doc.line_items || [],
    tax_amount: doc.tax_total ?? doc.tax_amount ?? 0,
    discount_amount: doc.discount_value ?? 0,
  }));
  
  const summary = data.summary;

  const invoices = documents.filter((d) => d.doc_type === "invoice");
  const estimates = documents.filter((d) => d.doc_type === "estimate");

  const tabs = [
    { id: "overview" as Tab, label: "Resumen", icon: <OverviewTabIcon /> },
    { id: "invoices" as Tab, label: "Facturas", icon: <InvoicesTabIcon /> },
    { id: "estimates" as Tab, label: "Estimados", icon: <EstimatesTabIcon /> },
    { id: "clients" as Tab, label: "Clientes", icon: <ClientsTabIcon /> },
    { id: "items" as Tab, label: "Articulos", icon: <ItemsTabIcon /> },
    { id: "reports" as Tab, label: "Reportes", icon: <ReportsTabIcon /> },
    { id: "settings" as Tab, label: "Config", icon: <SettingsTabIcon /> },
  ];

  return (
    <div 
      className={styles.container}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Elegante y Profesional */}
      <header style={{
        background: '#0f172a',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        <div style={{ padding: '1.25rem 1rem' }}>
          
          {/* Ttulo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem'
          }}>
            <div>
              <h1 style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                letterSpacing: '-0.025em'
              }}>Panel de Facturacion</h1>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(148, 163, 184, 0.8)',
                margin: '0.25rem 0 0 0'
              }}>Gestiona facturas y estimados</p>
            </div>
            
            {/* Botones de accin segn tab activo */}
            <div>
              {activeTab === "invoices" && (
                <button
                  onClick={() => setModalOpen("create-invoice")}
                  style={{
                    padding: '0.625rem 1rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  + Nueva Factura
                </button>
              )}
              {activeTab === "estimates" && (
                <button
                  onClick={() => setModalOpen("create-estimate")}
                  style={{
                    padding: '0.625rem 1rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  + Nuevo Estimado
                </button>
              )}
              {activeTab === "clients" && (
                <button
                  onClick={() => setModalOpen("create-client")}
                  style={{
                    padding: '0.625rem 1rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  + Nuevo Cliente
                </button>
              )}
              {activeTab === "items" && (
                <button
                  onClick={() => setModalOpen("create-item")}
                  style={{
                    padding: '0.625rem 1rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  + Nuevo Artculo
                </button>
              )}
            </div>
          </div>

          {/* Navegacin responsive - Grid 4 columnas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            padding: '0.5rem 0'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.625rem 0.5rem',
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === tab.id ? 'white' : 'rgba(148, 163, 184, 0.9)',
                  border: activeTab === tab.id
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  boxShadow: activeTab === tab.id ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.125rem' }}>{tab.icon}</span>
                <span style={{ fontSize: '0.7rem' }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <div style={{ padding: '1rem' }}>
      {activeTab === "overview" && (
        <OverviewTab summary={summary} documents={documents} showToast={showToast} />
      )}

      {activeTab === "invoices" && (
        <DocumentsTab
          documents={invoices}
          docType="invoice"
          clients={clients}
          onEdit={(doc: InvoicingDocument) => {
            setSelectedItem(doc);
            setModalOpen("edit-document");
          }}
          onRecordPayment={(doc: InvoicingDocument) => {
            setSelectedItem(doc);
            setModalOpen("record-payment");
          }}
          onViewPayments={(doc: InvoicingDocument) => {
            setPaymentHistoryDoc(doc);
          }}
          showToast={showToast}
          mutate={mutate}
          tenantId={tenantId}
          setConfirmDialog={setConfirmDialog}
        />
      )}

      {activeTab === "estimates" && (
        <DocumentsTab
          documents={estimates}
          docType="estimate"
          clients={clients}
          onEdit={(doc: InvoicingDocument) => {
            setSelectedItem(doc);
            setModalOpen("edit-document");
          }}
          onViewPayments={(doc: InvoicingDocument) => {
            setPaymentHistoryDoc(doc);
          }}
          showToast={showToast}
          mutate={mutate}
          tenantId={tenantId}
          setConfirmDialog={setConfirmDialog}
        />
      )}

      {activeTab === "clients" && (
        <ClientsTab
          clients={clients}
          onEdit={(client: InvoicingClient) => {
            setSelectedItem(client);
            setModalOpen("edit-client");
          }}
          showToast={showToast}
          mutate={mutate}
          tenantId={tenantId}
          setConfirmDialog={setConfirmDialog}
        />
      )}

      {activeTab === "items" && (
        <ItemsTab
          items={items}
          onEdit={(item: InvoicingItem) => {
            setSelectedItem(item);
            setModalOpen("edit-item");
          }}
          showToast={showToast}
          mutate={mutate}
          tenantId={tenantId}
          setConfirmDialog={setConfirmDialog}
        />
      )}

      {activeTab === "reports" && (
        <ReportsTab tenantId={tenantId} clients={clients} showToast={showToast} />
      )}

      {activeTab === "settings" && (
        <SettingsTab
          settings={settings}
          templates={templates}
          tenantId={tenantId}
          showToast={showToast}
          mutate={mutate}
        />
      )}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>
          {toast.message}
        </div>
      )}

      {/* Modals */}
      {modalOpen === "create-client" && (
        <CreateClientModal
          tenantId={tenantId}
          onClose={() => setModalOpen(null)}
          onSuccess={() => {
            showToast("Cliente creado exitosamente", "success");
            mutate();
            setModalOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "create-item" && (
        <CreateItemModal
          tenantId={tenantId}
          onClose={() => setModalOpen(null)}
          onSuccess={() => {
            showToast("Articulo creado exitosamente", "success");
            mutate();
            setModalOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "edit-client" && selectedItem && (
        <EditClientModal
          tenantId={tenantId}
          client={selectedItem}
          onClose={() => {
            setModalOpen(null);
            setSelectedItem(null);
          }}
          onSuccess={() => {
            showToast("✓ Cliente actualizado", "success");
            mutate();
            setModalOpen(null);
            setSelectedItem(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "edit-item" && selectedItem && (
        <EditItemModal
          tenantId={tenantId}
          item={selectedItem}
          onClose={() => {
            setModalOpen(null);
            setSelectedItem(null);
          }}
          onSuccess={() => {
            showToast("✓ Artículo actualizado", "success");
            mutate();
            setModalOpen(null);
            setSelectedItem(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "create-invoice" && (
        <CreateDocumentModalNew
          tenantId={tenantId}
          docType="invoice"
          clients={clients}
          items={items}
          settings={settings}
          onClose={() => setModalOpen(null)}
          onSuccess={() => {
            mutate();
            setModalOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "create-estimate" && (
        <CreateDocumentModalNew
          tenantId={tenantId}
          docType="estimate"
          clients={clients}
          items={items}
          settings={settings}
          onClose={() => setModalOpen(null)}
          onSuccess={() => {
            mutate();
            setModalOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "edit-document" && selectedItem && (
        <CreateDocumentModalNew
          tenantId={tenantId}
          docType={selectedItem.doc_type}
          clients={clients}
          items={items}
          settings={settings}
          document={selectedItem}
          onClose={() => {
            setModalOpen(null);
            setSelectedItem(null);
          }}
          onSuccess={() => {
            showToast("✓ Documento actualizado", "success");
            mutate();
            setModalOpen(null);
            setSelectedItem(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "record-payment" && selectedItem && (
        <PaymentModal
          tenantId={tenantId}
          document={selectedItem}
          onClose={() => {
            setModalOpen(null);
            setSelectedItem(null);
          }}
          showToast={showToast}
          mutate={mutate}
        />
      )}

      {/* Payment History Modal */}
      {paymentHistoryDoc && (
        <PaymentHistoryModal
          document={paymentHistoryDoc}
          onClose={() => setPaymentHistoryDoc(null)}
          tenantId={tenantId}
        />
      )}

      {/* Dilogo de Confirmacin Elegante */}
      {confirmDialog.show && (
        <div className={styles.modalOverlay}>
          <div 
            className={styles.modalContent}
            style={{
              maxWidth: '450px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(248, 113, 113, 0.15)'
            }}
          >
            {/* Header con icono de advertencia */}
            <div 
              className={styles.modalHeader}
              style={{
                borderBottom: '1px solid rgba(248, 113, 113, 0.2)',
                paddingBottom: '1rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(248, 113, 113, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(248, 113, 113, 0.3)'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <h2 style={{
                  fontSize: '1.375rem',
                  fontWeight: '700',
                  color: '#f87171',
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}>
                  {confirmDialog.title}
                </h2>
              </div>
            </div>

            {/* Mensaje */}
            <div style={{
              padding: '1rem 0',
              marginBottom: '2rem'
            }}>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: '1.6',
                margin: 0
              }}>
                {confirmDialog.message}
              </p>
            </div>

            {/* Botones de accin */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  background: 'rgba(30, 41, 59, 0.5)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {confirmDialog.cancelText || "Cancelar"}
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, show: false });
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: '1px solid rgba(248, 113, 113, 0.5)',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.25)';
                }}
              >
                {confirmDialog.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ===== OVERVIEW TAB =====
function OverviewTab({ summary, documents, showToast }: any) {
  const stats = [
    {
      icon: <InvoiceIcon />,
      label: "Total Facturas",
      value: summary.totalInvoices,
      color: "#3b82f6",
    },
    {
      icon: <EstimateIcon />,
      label: "Total Estimados",
      value: summary.totalEstimates,
      color: "#8b5cf6",
    },
    {
      icon: <RevenueIcon />,
      label: "Revenue Total",
      value: formatCurrency(summary.totalRevenue),
      color: "#10b981",
    },
    {
      icon: <PendingIcon />,
      label: "Pendiente",
      value: formatCurrency(summary.pendingAmount),
      color: "#f59e0b",
    },
    {
      icon: <OverdueIcon />,
      label: "Vencido",
      value: formatCurrency(summary.overdueAmount),
      color: "#ef4444",
    },
    {
      icon: <PaidIcon />,
      label: "Pagado",
      value: formatCurrency(summary.paidAmount),
      color: "#10b981",
    },
  ];

  return (
    <div>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {stats.map((stat, index) => (
          <div key={index} className={styles.statCard}>
            <div className={styles.statIcon}>{stat.icon}</div>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValue}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Documents */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
          Documentos Recientes
        </h2>
        
        {documents.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}></div>
            <h3 className={styles.emptyStateTitle}>No hay documentos</h3>
            <p className={styles.emptyStateText}>
              Comienza creando tu primera factura o estimado
            </p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th className={styles.tableHeaderCell}>Nmero</th>
                  <th className={styles.tableHeaderCell}>Tipo</th>
                  <th className={styles.tableHeaderCell}>Cliente</th>
                  <th className={styles.tableHeaderCell}>Fecha</th>
                  <th className={styles.tableHeaderCell}>Total</th>
                  <th className={styles.tableHeaderCell}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {documents.slice(0, 10).map((doc: InvoicingDocument) => (
                  <tr key={doc.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{doc.doc_number}</td>
                    <td className={styles.tableCell}>
                      {doc.doc_type === "invoice" ? "Factura" : "Estimado"}
                    </td>
                    <td className={styles.tableCell}>
                      {doc.client_snapshot?.business_name || doc.client_snapshot?.full_name || "Sin cliente"}
                    </td>
                    <td className={styles.tableCell}>{formatShortDate(doc.issue_date)}</td>
                    <td className={styles.tableCell}>{formatCurrency(doc.total)}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${styles[`status${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`]}`}>
                        {getStatusLabel(doc.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== DOCUMENTS TAB =====
function DocumentsTab({ documents, docType, clients, onEdit, onRecordPayment, onViewPayments, showToast, mutate, tenantId, setConfirmDialog }: any) {
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");

  const filteredDocs = statusFilter === "all" 
    ? documents 
    : documents.filter((d: InvoicingDocument) => d.status === statusFilter);

  const handleDelete = async (docId: string) => {
    setConfirmDialog({
      show: true,
      title: "Confirmar Cancelación",
      message: "¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.",
      confirmText: "Sí, eliminar",
      cancelText: "No, mantener",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/invoicing/documents?id=${docId}&tenantId=${tenantId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            showToast("✓ Documento eliminado", "success");
            mutate();
          } else {
            showToast("✗ Error al eliminar documento", "error");
          }
        } catch (error) {
          showToast("✗ Error al eliminar documento", "error");
        }
      }
    });
  };

  const handleCancel = async (doc: InvoicingDocument) => {
    setConfirmDialog({
      show: true,
      title: "Cancelar Documento",
      message: "¿Estás seguro de que deseas cancelar este documento? El documento se marcará como cancelado pero no se eliminará.",
      confirmText: "Sí, cancelar",
      cancelText: "No, mantener",
      onConfirm: async () => {
        try {
          const response = await fetch("/api/invoicing/documents", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: doc.id,
              tenant_id: tenantId,
              status: "cancelled",
            }),
          });

          if (response.ok) {
            showToast("✓ Documento cancelado", "success");
            mutate();
          } else {
            showToast("✗ Error al cancelar documento", "error");
          }
        } catch (error) {
          showToast("✗ Error al cancelar documento", "error");
        }
      }
    });
  };

  return (
    <div>
      {/* Filters */}
      <div className={styles.filters}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>Filtrar por estado:</label>
          <select
            className={styles.formSelect}
            style={{ maxWidth: "200px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="sent">Enviado</option>
            <option value="viewed">Visto</option>
            <option value="paid">Pagado</option>
            <option value="partial">Parcial</option>
            <option value="overdue">Vencido</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <span style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)" }}>
            Mostrando {filteredDocs.length} de {documents.length} documentos
          </span>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>{docType === "invoice" ? "" : ""}</div>
          <h3 className={styles.emptyStateTitle}>
            No hay {docType === "invoice" ? "facturas" : "estimados"}
          </h3>
          <p className={styles.emptyStateText}>
            Comienza creando tu primer {docType === "invoice" ? "factura" : "estimado"}
          </p>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {filteredDocs.map((doc: InvoicingDocument) => (
            <div key={doc.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>{doc.doc_number}</h3>
                  <p className={styles.cardMeta}>
                    {doc.client_snapshot?.business_name || doc.client_snapshot?.full_name || "Sin cliente"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  {/* Badge de Pago Vencido */}
                  {docType === "invoice" && doc.due_date && !['paid', 'cancelled'].includes(doc.status) && new Date(doc.due_date) < new Date() && (
                    <span 
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.2)"
                      }}
                    >
                      Pago Vencido
                    </span>
                  )}
                  <span className={`${styles.statusBadge} ${styles[`status${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`]}`}>
                    {getStatusLabel(doc.status)}
                  </span>
                </div>
              </div>

              <div className={styles.cardContent}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Fecha:</span>
                  <span>{formatShortDate(doc.issue_date)}</span>
                </div>
                {doc.due_date && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Vencimiento:</span>
                    <span>{formatShortDate(doc.due_date)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Total:</span>
                  <span style={{ fontWeight: 600, fontSize: "1.125rem" }}>
                    {formatCurrency(doc.total)}
                  </span>
                </div>
                {docType === "invoice" && doc.amount_paid > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Balance:</span>
                    <span style={{ color: "#f59e0b" }}>
                      {formatCurrency(calculateBalanceDue(doc))}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.cardFooter}>
                {/* Primera fila: Botones de acción principales */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <button
                    className={styles.secondaryButton}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                    onClick={() => {
                      const url = `/api/invoicing/pdf?documentId=${doc.id}&tenantId=${tenantId}`;
                      window.open(url, "_blank");
                    }}
                  >
                    Ver PDF
                  </button>
                  {docType === "estimate" && (
                    <button
                      className={styles.primaryButton}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        fontSize: "0.875rem",
                        marginRight: "1rem",
                        opacity: doc.converted_to_invoice ? 0.5 : 1,
                        cursor: doc.converted_to_invoice ? "not-allowed" : "pointer"
                      }}
                      disabled={doc.converted_to_invoice}
                      onClick={async () => {
                        if (doc.converted_to_invoice) return;
                        
                        try {
                          // Create invoice
                          const response = await fetch("/api/invoicing/documents", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              tenant_id: tenantId,
                              doc_type: "invoice",
                              client_id: doc.client_id,
                              issue_date: new Date().toISOString().split("T")[0],
                              items: doc.line_items,
                              notes: doc.notes,
                              template_id: doc.template_id,
                            }),
                          });

                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || "Error al convertir a factura");
                          }

                          // Mark estimate as converted
                          const patchResponse = await fetch("/api/invoicing/documents", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: doc.id,
                              tenant_id: tenantId,
                              converted_to_invoice: true,
                            }),
                          });

                          if (!patchResponse.ok) {
                            const errorData = await patchResponse.json();
                            console.error("Error marking estimate as converted:", errorData);
                            // Invoice was created successfully, just log the error
                          }

                          showToast("✓ Estimado convertido a factura exitosamente", "success");
                          mutate();
                        } catch (error) {
                          console.error("Error converting estimate:", error);
                          showToast("✗ Error al convertir a factura", "error");
                        }
                      }}
                    >
                      {doc.converted_to_invoice ? "Ya convertido" : "Convertir a Factura"}
                    </button>
                  )}
                  {docType === "invoice" && calculateBalanceDue(doc) > 0 && (
                    <button
                      className={styles.primaryButton}
                      style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                      onClick={() => onRecordPayment && onRecordPayment(doc)}
                    >
                      Pago
                    </button>
                  )}
                  {docType === "invoice" && (
                    <button
                      className={styles.secondaryButton}
                      style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                      onClick={() => onViewPayments && onViewPayments(doc)}
                    >
                      Historial
                    </button>
                  )}
                </div>
                
                {/* Segunda fila: Botones de gestión */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    className={styles.secondaryButton}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                    onClick={() => onEdit && onEdit(doc)}
                  >
                    Editar
                  </button>
                  <button
                    className={styles.secondaryButton}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                    onClick={() => handleCancel(doc)}
                  >
                    Cancelar
                  </button>
                  <button
                    className={styles.dangerButton}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                    onClick={() => handleDelete(doc.id)}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== CLIENTS TAB =====
function ClientsTab({ clients, onEdit, showToast, mutate, tenantId, setConfirmDialog }: any) {
  const handleDelete = async (clientId: string) => {
    setConfirmDialog({
      show: true,
      title: "Eliminar Cliente",
      message: "Estás seguro de que deseas eliminar este cliente? Todos los documentos asociados se mantendrán pero sin referencia al cliente.",
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/invoicing/clients?id=${clientId}&tenantId=${tenantId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            showToast("✓ Cliente eliminado", "success");
            mutate();
          } else {
            showToast("✗ Error al eliminar cliente", "error");
          }
        } catch (error) {
          showToast("✗ Error al eliminar cliente", "error");
        }
      }
    });
  };

  if (clients.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}></div>
        <h3 className={styles.emptyStateTitle}>No hay clientes</h3>
        <p className={styles.emptyStateText}>Comienza agregando tu primer cliente</p>
      </div>
    );
  }

  return (
    <div className={styles.cardsGrid}>
      {clients.map((client: InvoicingClient) => (
        <div key={client.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                {client.business_name || client.full_name}
              </h3>
              <p className={styles.cardMeta}>
                {client.client_type === "business" ? "Empresa" : "Individual"}
              </p>
            </div>
          </div>

          <div className={styles.cardContent}>
            <div style={{ marginBottom: "0.5rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}> </span>
              {client.email}
            </div>
            {client.phone && (
              <div style={{ marginBottom: "0.5rem" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}> </span>
                {client.phone}
              </div>
            )}
            {client.city && (
              <div style={{ marginBottom: "0.5rem" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}> </span>
                {client.city}, {client.state || client.country}
              </div>
            )}
            {client.tax_id && (
              <div style={{ marginBottom: "0.5rem" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}> </span>
                {client.tax_id}
              </div>
            )}
          </div>

          <div className={styles.cardFooter}>
            <button
              className={styles.secondaryButton}
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              onClick={() => onEdit(client)}
            >
               Editar
            </button>
            <button
              className={styles.dangerButton}
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              onClick={() => handleDelete(client.id)}
            >
               Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== ITEMS TAB =====
function ItemsTab({ items, onEdit, showToast, mutate, tenantId, setConfirmDialog }: any) {
  const handleDelete = async (itemId: string) => {
    setConfirmDialog({
      show: true,
      title: "Archivar Artículo",
      message: "Estás seguro de que deseas archivar este artículo? No estará disponible para nuevos documentos.",
      confirmText: "S, archivar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/invoicing/items?id=${itemId}&tenantId=${tenantId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            showToast("✓ Artículo archivado", "success");
            mutate();
          } else {
            showToast("✗ Error al archivar artículo", "error");
          }
        } catch (error) {
          showToast("✗ Error al archivar artículo", "error");
        }
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}></div>
        <h3 className={styles.emptyStateTitle}>No hay artculos</h3>
        <p className={styles.emptyStateText}>
          Comienza agregando productos o servicios a tu catlogo
        </p>
      </div>
    );
  }

  return (
    <div className={styles.cardsGrid}>
      {items.map((item: InvoicingItem) => (
        <div key={item.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>{item.name}</h3>
              <p className={styles.cardMeta}>
                {item.item_type === "product" ? "Producto" : "Servicio"}
                {item.sku && `  SKU: ${item.sku}`}
              </p>
            </div>
          </div>

          <div className={styles.cardContent}>
            {item.description && (
              <div style={{ marginBottom: "0.75rem", color: "rgba(255, 255, 255, 0.8)" }}>
                {item.description}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Precio:</span>
              <span style={{ fontWeight: 600, fontSize: "1.125rem" }}>
                {formatCurrency(item.unit_price)}
              </span>
            </div>
            {item.taxable && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Impuesto:</span>
                <span>{item.tax_rate}%</span>
              </div>
            )}
            {item.track_inventory && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Stock:</span>
                <span>{item.quantity_in_stock} unidades</span>
              </div>
            )}
          </div>

          <div className={styles.cardFooter}>
            <button
              className={styles.secondaryButton}
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              onClick={() => onEdit(item)}
            >
               Editar
            </button>
            <button
              className={styles.dangerButton}
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              onClick={() => handleDelete(item.id)}
            >
               Archivar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== REPORTS TAB =====
function ReportsTab({ tenantId, clients, showToast }: any) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [docType, setDocType] = useState<"" | "invoice" | "estimate">("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (clientId) params.append("clientId", clientId);
      if (docType) params.append("docType", docType);

      const response = await fetch(`/api/invoicing/reports?${params}`);
      const data = await response.json();

      if (response.ok) {
        setReportData(data);
        showToast(" Reporte generado", "success");
      } else {
        showToast(" Error al generar reporte", "error");
      }
    } catch (error) {
      showToast(" Error al generar reporte", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filtersGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Desde</label>
            <input
              type="date"
              className={styles.formInput}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Hasta</label>
            <input
              type="date"
              className={styles.formInput}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Cliente</label>
            <select
              className={styles.formSelect}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Todos los clientes</option>
              {clients.map((client: InvoicingClient) => (
                <option key={client.id} value={client.id}>
                  {client.business_name || client.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tipo</label>
            <select
              className={styles.formSelect}
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
            >
              <option value="">Todos</option>
              <option value="invoice">Facturas</option>
              <option value="estimate">Estimados</option>
            </select>
          </div>
        </div>
        <button className={styles.primaryButton} onClick={generateReport} disabled={loading}>
          {loading ? "Generando..." : " Generar Reporte"}
        </button>
      </div>

      {/* Report Results */}
      {reportData && (
        <div>
          {/* Summary Stats */}
          <div className={styles.statsGrid} style={{ marginBottom: "2rem" }}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statLabel}>Total Documentos</div>
              <div className={styles.statValue}>{reportData.summary.totalDocuments}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statLabel}>Revenue Total</div>
              <div className={styles.statValue}>
                {formatCurrency(reportData.summary.totalRevenue)}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statLabel}>Pendiente</div>
              <div className={styles.statValue}>
                {formatCurrency(reportData.summary.totalPending)}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}></div>
              <div className={styles.statLabel}>Vencido</div>
              <div className={styles.statValue}>
                {formatCurrency(reportData.summary.totalOverdue)}
              </div>
            </div>
          </div>

          {/* Documents Table */}
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            Documentos ({reportData.documents.length})
          </h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th className={styles.tableHeaderCell}>Nmero</th>
                  <th className={styles.tableHeaderCell}>Tipo</th>
                  <th className={styles.tableHeaderCell}>Cliente</th>
                  <th className={styles.tableHeaderCell}>Fecha</th>
                  <th className={styles.tableHeaderCell}>Total</th>
                  <th className={styles.tableHeaderCell}>Pagado</th>
                  <th className={styles.tableHeaderCell}>Balance</th>
                  <th className={styles.tableHeaderCell}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reportData.documents.map((doc: InvoicingDocument) => (
                  <tr key={doc.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{doc.doc_number}</td>
                    <td className={styles.tableCell}>
                      {doc.doc_type === "invoice" ? "Factura" : "Estimado"}
                    </td>
                    <td className={styles.tableCell}>
                      {doc.client_snapshot?.business_name ||
                        doc.client_snapshot?.full_name ||
                        "Sin cliente"}
                    </td>
                    <td className={styles.tableCell}>{formatShortDate(doc.issue_date)}</td>
                    <td className={styles.tableCell}>{formatCurrency(doc.total)}</td>
                    <td className={styles.tableCell}>{formatCurrency(doc.amount_paid)}</td>
                    <td className={styles.tableCell}>
                      {formatCurrency(calculateBalanceDue(doc))}
                    </td>
                    <td className={styles.tableCell}>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[`status${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`]
                        }`}
                      >
                        {getStatusLabel(doc.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== MODAL COMPONENTS =====

// CreateClientModal Component
function CreateClientModal({ tenantId, onClose, onSuccess, showToast }: any) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    tax_id: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast("Nombre y email son requeridos", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/invoicing/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, tenant_id: tenantId }),
      });

      if (!response.ok) throw new Error("Error al crear cliente");
      onSuccess();
    } catch (error) {
      showToast("Error al crear cliente", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Nuevo Cliente</h2>
          <button onClick={onClose} className={styles.modalCloseBtn}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre *</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email *</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Telefono</label>
                <input
                  type="tel"
                  className={styles.formInput}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>RFC/Tax ID</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Direccion Linea 1</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Direccion Linea 2</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ciudad</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Estado</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Codigo Postal</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Pais</label>
                <select
                  className={styles.formSelect}
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                >
                  <option value="US">Estados Unidos</option>
                  <option value="MX">Mexico</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// EditClientModal Component
function EditClientModal({ tenantId, client, onClose, onSuccess, showToast }: any) {
  const [formData, setFormData] = useState({
    name: client.full_name || client.business_name || "",
    email: client.email || "",
    phone: client.phone || "",
    tax_id: client.tax_id || "",
    address_line1: client.address_line1 || "",
    address_line2: client.address_line2 || "",
    city: client.city || "",
    state: client.state || "",
    postal_code: client.postal_code || "",
    country: client.country || "US",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast("Nombre y email son requeridos", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: client.id,
        tenant_id: tenantId,
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        tax_id: formData.tax_id || null,
        address_line1: formData.address_line1 || null,
        address_line2: formData.address_line2 || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postal_code || null,
        country: formData.country || "US",
      };

      console.log("Updating client with payload:", payload);

      const response = await fetch(`/api/invoicing/clients`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error updating client:", errorData);
        throw new Error(errorData.error || "Error al actualizar cliente");
      }
      
      showToast("✓ Cliente actualizado correctamente", "success");
      onSuccess();
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      showToast(`✗ ${error.message || "Error al actualizar cliente"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Editar Cliente</h2>
          <button onClick={onClose} className={styles.modalCloseBtn}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre *</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email *</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Teléfono</label>
                <input
                  type="tel"
                  className={styles.formInput}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>RFC/Tax ID</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Dirección Línea 1</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Dirección Línea 2</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ciudad</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Estado</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Código Postal</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>País</label>
                <select
                  className={styles.formSelect}
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                >
                  <option value="US">Estados Unidos</option>
                  <option value="MX">México</option>
                  <option value="CA">Canadá</option>
                </select>
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "Actualizando..." : "Actualizar Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// CreateItemModal Component
function CreateItemModal({ tenantId, onClose, onSuccess, showToast }: any) {
  const [formData, setFormData] = useState({
    item_type: "service",
    name: "",
    description: "",
    unit_price: 0,
    tax_rate: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("El nombre es requerido", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tenant_id: tenantId,
        item_type: formData.item_type,
        name: formData.name,
        description: formData.description || null,
        unit_price: formData.unit_price,
        tax_rate: formData.tax_rate,
      };

      console.log("Creating item with payload:", payload);

      const response = await fetch("/api/invoicing/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error creating item:", errorData);
        throw new Error(errorData.error || "Error al crear artículo");
      }
      
      const data = await response.json();
      console.log("Item created:", data);
      
      showToast("✓ Artículo creado correctamente", "success");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating item:", error);
      showToast(`✗ ${error.message || "Error al crear artículo"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className={styles.modalHeader}>
          <h2>{formData.item_type === "service" ? "Nuevo Servicio" : "Nuevo Producto"}</h2>
          <button onClick={onClose} className={styles.modalCloseBtn}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tipo *</label>
              <select
                className={styles.formInput}
                value={formData.item_type}
                onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                required
              >
                <option value="service">Servicio</option>
                <option value="product">Producto</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre *</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descripción</label>
              <textarea
                className={styles.formTextarea}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem' 
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Precio Unitario *</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tasa de Impuesto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  value={formData.tax_rate === 0 ? "0" : (formData.tax_rate || "")}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ 
                      ...formData, 
                      tax_rate: value === "" ? 0 : parseFloat(value) 
                    });
                  }}
                />
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Artículo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// EditItemModal Component
function EditItemModal({ tenantId, item, onClose, onSuccess, showToast }: any) {
  const [formData, setFormData] = useState({
    item_type: item.item_type || "service",
    name: item.name || "",
    description: item.description || "",
    unit_price: item.unit_price || 0,
    tax_rate: item.tax_rate || 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("El nombre es requerido", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tenant_id: tenantId,
        item_type: formData.item_type,
        name: formData.name,
        description: formData.description || null,
        unit_price: formData.unit_price,
        tax_rate: formData.tax_rate,
      };

      const response = await fetch(`/api/invoicing/items?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error updating item:", errorData);
        throw new Error(errorData.error || "Error al actualizar artículo");
      }
      
      showToast("✓ Artículo actualizado correctamente", "success");
      onSuccess();
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      showToast(`✗ ${error.message || "Error al actualizar artículo"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className={styles.modalHeader}>
          <h2>{formData.item_type === "service" ? "Editar Servicio" : "Editar Producto"}</h2>
          <button onClick={onClose} className={styles.modalCloseBtn}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tipo *</label>
              <select
                className={styles.formInput}
                value={formData.item_type}
                onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                required
              >
                <option value="service">Servicio</option>
                <option value="product">Producto</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre *</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descripción</label>
              <textarea
                className={styles.formTextarea}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem' 
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Precio Unitario *</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tasa de Impuesto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  value={formData.tax_rate === 0 ? "0" : (formData.tax_rate || "")}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ 
                      ...formData, 
                      tax_rate: value === "" ? 0 : parseFloat(value) 
                    });
                  }}
                />
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "Actualizando..." : "Actualizar Artículo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== SETTINGS TAB =====
function SettingsTab({ settings, templates, tenantId, showToast, mutate }: any) {
  const [formData, setFormData] = useState({
    company_name: settings?.company_name || "",
    company_email: settings?.company_email || "",
    company_phone: settings?.company_phone || "",
    company_website: settings?.company_website || "",
    company_address_line1: settings?.company_address_line1 || "",
    company_city: settings?.company_city || "",
    company_state: settings?.company_state || "",
    company_postal_code: settings?.company_postal_code || "",
    company_country: settings?.company_country || "US",
    company_tax_id: settings?.company_tax_id || "",
    selected_template_id: settings?.selected_template_id || "modern",
    invoice_prefix: settings?.invoice_prefix || "INV",
    estimate_prefix: settings?.estimate_prefix || "EST",
    default_payment_terms: settings?.default_payment_terms || "Net 30",
    default_tax_rate: settings?.default_tax_rate || 0,
  });

  const handleSave = async () => {
    try {
      const response = await fetch("/api/invoicing/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          ...formData,
        }),
      });

      if (response.ok) {
        showToast(" Configuracin guardada", "success");
        mutate();
      } else {
        showToast(" Error al guardar configuracin", "error");
      }
    } catch (error) {
      showToast(" Error al guardar configuracin", "error");
    }
  };

  return (
    <div style={{ maxWidth: "800px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Información de la Empresa
      </h2>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Nombre de la Empresa</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Email</label>
          <input
            type="email"
            className={styles.formInput}
            value={formData.company_email}
            onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Teléfono</label>
          <input
            type="tel"
            className={styles.formInput}
            value={formData.company_phone}
            onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Sitio Web</label>
          <input
            type="url"
            className={styles.formInput}
            value={formData.company_website}
            onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Dirección</label>
        <input
          type="text"
          className={styles.formInput}
          value={formData.company_address_line1}
          onChange={(e) => setFormData({ ...formData, company_address_line1: e.target.value })}
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Ciudad</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.company_city}
            onChange={(e) => setFormData({ ...formData, company_city: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Estado</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.company_state}
            onChange={(e) => setFormData({ ...formData, company_state: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Código Postal</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.company_postal_code}
            onChange={(e) => setFormData({ ...formData, company_postal_code: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>RFC / Tax ID</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.company_tax_id}
            onChange={(e) => setFormData({ ...formData, company_tax_id: e.target.value })}
          />
        </div>
      </div>

      <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }} />

      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Plantilla de Factura
      </h2>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Selecciona una plantilla</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
          {templates.map((template: any) => (
            <div
              key={template.id}
              onClick={() => setFormData({ ...formData, selected_template_id: template.id })}
              style={{
                padding: "1rem",
                borderRadius: "8px",
                border: formData.selected_template_id === template.id
                  ? "2px solid #3b82f6"
                  : "2px solid rgba(255, 255, 255, 0.1)",
                background: formData.selected_template_id === template.id
                  ? "rgba(59, 130, 246, 0.1)"
                  : "rgba(255, 255, 255, 0.05)",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}></div>
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{template.name}</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)" }}>
                {template.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }} />

      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Configuracin de Documentos
      </h2>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Prefijo de Facturas</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.invoice_prefix}
            onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Prefijo de Estimados</label>
          <input
            type="text"
            className={styles.formInput}
            value={formData.estimate_prefix}
            onChange={(e) => setFormData({ ...formData, estimate_prefix: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Trminos de Pago</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Net 30"
            value={formData.default_payment_terms}
            onChange={(e) => setFormData({ ...formData, default_payment_terms: e.target.value })}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Tasa de Impuesto por Defecto (%)</label>
          <input
            type="number"
            step="0.01"
            className={styles.formInput}
            value={formData.default_tax_rate}
            onChange={(e) => setFormData({ ...formData, default_tax_rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <button className={styles.primaryButton} onClick={handleSave}>
           Guardar Configuracin
        </button>
      </div>
    </div>
  );
}

// ===== MODALS =====

// Create/Edit Client Modal
function ClientModal({ client, onClose, showToast, mutate, tenantId }: any) {
  const isEdit = !!client;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client_type: client?.client_type || "individual",
    full_name: client?.full_name || "",
    business_name: client?.business_name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    address_line1: client?.address_line1 || "",
    city: client?.city || "",
    state: client?.state || "",
    postal_code: client?.postal_code || "",
    country: client?.country || "US",
    tax_id: client?.tax_id || "",
    notes: client?.notes || "",
  });

  const handleSubmit = async () => {
    if (!formData.email) {
      showToast(" El email es requerido", "error");
      return;
    }

    try {
      const url = isEdit
        ? `/api/invoicing/clients?id=${client.id}&tenantId=${tenantId}`
        : "/api/invoicing/clients";

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          ...formData,
        }),
      });

      if (response.ok) {
        showToast(` Cliente ${isEdit ? "actualizado" : "creado"}`, "success");
        mutate();
        onClose();
      } else {
        const error = await response.json();
        showToast(` ${error.error || "Error al guardar cliente"}`, "error");
      }
    } catch (error) {
      showToast(" Error al guardar cliente", "error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <button className={styles.modalClose} onClick={onClose}>
            
          </button>
        </div>

        <div className={styles.modalBody}>
          {step === 1 && !isEdit && (
            <div>
              <h3 style={{ marginBottom: "1.5rem", fontSize: "1.125rem" }}>
                Tipo de Cliente
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div
                  onClick={() => {
                    setFormData({ ...formData, client_type: "individual" });
                    setStep(2);
                  }}
                  style={{
                    padding: "2rem",
                    borderRadius: "8px",
                    border: "2px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}></div>
                  <div style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "0.5rem" }}>
                    Individual
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)" }}>
                    Persona fsica
                  </div>
                </div>
                <div
                  onClick={() => {
                    setFormData({ ...formData, client_type: "business" });
                    setStep(2);
                  }}
                  style={{
                    padding: "2rem",
                    borderRadius: "8px",
                    border: "2px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}></div>
                  <div style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "0.5rem" }}>
                    Empresa
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)" }}>
                    Persona moral
                  </div>
                </div>
              </div>
            </div>
          )}

          {(step === 2 || isEdit) && (
            <div>
              {formData.client_type === "business" ? (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre de la Empresa *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.business_name}
                    onChange={(e) =>
                      setFormData({ ...formData, business_name: e.target.value })
                    }
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre Completo *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                  />
                </div>
              )}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email *</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Telfono</label>
                  <input
                    type="tel"
                    className={styles.formInput}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Direccin</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Calle y nmero"
                  value={formData.address_line1}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line1: e.target.value })
                  }
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ciudad</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Estado</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Cdigo Postal</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.postal_code}
                    onChange={(e) =>
                      setFormData({ ...formData, postal_code: e.target.value })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>RFC / Tax ID</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notas</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          {(step === 2 || isEdit) && (
            <button className={styles.primaryButton} onClick={handleSubmit}>
              {isEdit ? "Actualizar" : "Crear"} Cliente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Create/Edit Item Modal
function ItemModal({ item, onClose, showToast, mutate, tenantId }: any) {
  const isEdit = !!item;
  const [formData, setFormData] = useState({
    item_type: item?.item_type || "product",
    name: item?.name || "",
    description: item?.description || "",
    sku: item?.sku || "",
    unit_price: item?.unit_price || 0,
    taxable: item?.taxable ?? true,
    tax_rate: item?.tax_rate || 0,
    track_inventory: item?.track_inventory ?? false,
    quantity_in_stock: item?.quantity_in_stock || 0,
    reorder_level: item?.reorder_level || 0,
  });

  const handleSubmit = async () => {
    if (!formData.name || formData.unit_price <= 0) {
      showToast(" Nombre y precio son requeridos", "error");
      return;
    }

    try {
      const url = isEdit
        ? `/api/invoicing/items?id=${item.id}&tenantId=${tenantId}`
        : "/api/invoicing/items";

      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          ...formData,
        }),
      });

      if (response.ok) {
        showToast(` Artculo ${isEdit ? "actualizado" : "creado"}`, "success");
        mutate();
        onClose();
      } else {
        showToast(" Error al guardar artculo", "error");
      }
    } catch (error) {
      showToast(" Error al guardar artculo", "error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEdit ? "Editar Artculo" : "Nuevo Artculo"}
          </h2>
          <button className={styles.modalClose} onClick={onClose}>
            
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tipo</label>
              <select
                className={styles.formSelect}
                value={formData.item_type}
                onChange={(e) =>
                  setFormData({ ...formData, item_type: e.target.value as any })
                }
              >
                <option value="product">Producto</option>
                <option value="service">Servicio</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>SKU</label>
              <input
                type="text"
                className={styles.formInput}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nombre *</label>
            <input
              type="text"
              className={styles.formInput}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Descripcin</label>
            <textarea
              className={styles.formTextarea}
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Precio Unitario *</label>
              <input
                type="number"
                step="0.01"
                className={styles.formInput}
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tasa de Impuesto (%)</label>
              <input
                type="number"
                step="0.01"
                className={styles.formInput}
                value={formData.tax_rate}
                onChange={(e) =>
                  setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })
                }
                disabled={!formData.taxable}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.taxable}
                onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
              />
              <span>Gravable (aplica impuesto)</span>
            </label>
          </div>

          {formData.item_type === "product" && (
            <>
              <div className={styles.formGroup}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.track_inventory}
                    onChange={(e) =>
                      setFormData({ ...formData, track_inventory: e.target.checked })
                    }
                  />
                  <span>Rastrear inventario</span>
                </label>
              </div>

              {formData.track_inventory && (
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Cantidad en Stock</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={formData.quantity_in_stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity_in_stock: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Nivel de Reorden</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={formData.reorder_level}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reorder_level: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.primaryButton} onClick={handleSubmit}>
            {isEdit ? "Actualizar" : "Crear"} Artculo
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Document Modal (Invoice/Estimate)
function DocumentModal({ type, onClose, showToast, mutate, tenantId, clients, items }: any) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    line_items: [] as any[],
    notes: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 0,
    tax_rate: 0,
  });

  const addLineItem = (item: InvoicingItem) => {
    setFormData({
      ...formData,
      line_items: [
        ...formData.line_items,
        {
          item_id: item.id,
          description: item.name,
          quantity: 1,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          discount: 0,
        },
      ],
    });
  };

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      line_items: formData.line_items.filter((_, i) => i !== index),
    });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...formData.line_items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, line_items: updated });
  };

  const calculateTotal = () => {
    return calculateDocumentTotal(
      formData.line_items,
      formData.discount_type,
      formData.discount_value
    );
  };

  const handleSubmit = async () => {
    if (!formData.client_id || formData.line_items.length === 0) {
      showToast(" Selecciona un cliente y agrega artculos", "error");
      return;
    }

    try {
      const totals = calculateTotal();

      const response = await fetch("/api/invoicing/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          doc_type: type,
          client_id: formData.client_id,
          issue_date: formData.issue_date,
          due_date: formData.due_date || null,
          line_items: formData.line_items,
          subtotal: totals.subtotal,
          discount_type: formData.discount_type,
          discount_value: formData.discount_value,
          discount_amount: totals.discountAmount,
          tax_amount: totals.taxTotal,
          total: totals.total,
          notes: formData.notes,
          status: "draft",
        }),
      });

      if (response.ok) {
        showToast(
          ` ${type === "invoice" ? "Factura" : "Estimado"} creado`,
          "success"
        );
        mutate();
        onClose();
      } else {
        showToast(" Error al crear documento", "error");
      }
    } catch (error) {
      showToast(" Error al crear documento", "error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        style={{ maxWidth: "900px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Nuevo {type === "invoice" ? "Factura" : "Estimado"}
          </h2>
          <button className={styles.modalClose} onClick={onClose}>
            
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Step 1: Select Client */}
          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: "1rem" }}>Selecciona un Cliente</h3>
              <div className={styles.formGroup}>
                <select
                  className={styles.formSelect}
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                >
                  <option value="">-- Seleccionar --</option>
                  {clients.map((client: InvoicingClient) => (
                    <option key={client.id} value={client.id}>
                      {client.business_name || client.full_name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow} style={{ marginTop: "1.5rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Fecha de Emisin</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Fecha de Vencimiento</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add Items */}
          {step === 2 && (
            <div>
              <h3 style={{ marginBottom: "1rem" }}>Artculos</h3>

              {/* Item Selector */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Agregar Artculo</label>
                <select
                  className={styles.formSelect}
                  onChange={(e) => {
                    const item = items.find((i: any) => i.id === e.target.value);
                    if (item) addLineItem(item);
                    e.target.value = "";
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  {items.map((item: InvoicingItem) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {formatCurrency(item.unit_price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items Table */}
              {formData.line_items.length > 0 && (
                <div className={styles.tableContainer} style={{ marginTop: "1.5rem" }}>
                  <table className={styles.table}>
                    <thead className={styles.tableHeader}>
                      <tr>
                        <th className={styles.tableHeaderCell}>Descripcin</th>
                        <th className={styles.tableHeaderCell}>Cant.</th>
                        <th className={styles.tableHeaderCell}>Precio</th>
                        <th className={styles.tableHeaderCell}>Total</th>
                        <th className={styles.tableHeaderCell}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.line_items.map((lineItem, index) => (
                        <tr key={index} className={styles.tableRow}>
                          <td className={styles.tableCell}>{lineItem.description}</td>
                          <td className={styles.tableCell}>
                            <input
                              type="number"
                              min="1"
                              className={styles.formInput}
                              style={{ width: "80px" }}
                              value={lineItem.quantity}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "quantity",
                                  parseInt(e.target.value) || 1
                                )
                              }
                            />
                          </td>
                          <td className={styles.tableCell}>
                            {formatCurrency(lineItem.unit_price)}
                          </td>
                          <td className={styles.tableCell}>
                            {formatCurrency(lineItem.quantity * lineItem.unit_price)}
                          </td>
                          <td className={styles.tableCell}>
                            <button
                              className={styles.dangerButton}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                              onClick={() => removeLineItem(index)}
                            >
                              
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Totals & Notes */}
          {step === 3 && (
            <div>
              <h3 style={{ marginBottom: "1rem" }}>Ajustes y Totales</h3>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tipo de Descuento</label>
                  <select
                    className={styles.formSelect}
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as any,
                      })
                    }
                  >
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed">Monto Fijo</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Descuento {formData.discount_type === "percentage" ? "(%)" : "($)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.formInput}
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Impuesto General (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  value={formData.tax_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notas</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Summary */}
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateTotal().subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span>Descuento:</span>
                  <span>-{formatCurrency(calculateTotal().discountAmount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span>Impuesto:</span>
                  <span>{formatCurrency(calculateTotal().taxTotal)}</span>
                </div>
                <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }} />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                  }}
                >
                  <span>Total:</span>
                  <span>{formatCurrency(calculateTotal().total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {step > 1 && (
            <button className={styles.secondaryButton} onClick={() => setStep(step - 1)}>
               Anterior
            </button>
          )}
          <button className={styles.secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          {step < 3 ? (
            <button
              className={styles.primaryButton}
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !formData.client_id}
            >
              Siguiente 
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              onClick={handleSubmit}
              disabled={formData.line_items.length === 0}
            >
              Crear {type === "invoice" ? "Factura" : "Estimado"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Record Payment Modal
function PaymentModal({ document, onClose, showToast, mutate, tenantId }: any) {
  const [formData, setFormData] = useState({
    amount: calculateBalanceDue(document),
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    reference: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (formData.amount <= 0 || formData.amount > calculateBalanceDue(document)) {
      showToast(" Monto invlido", "error");
      return;
    }

    try {
      const response = await fetch("/api/invoicing/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          document_id: document.id,
          ...formData,
        }),
      });

      if (response.ok) {
        showToast(" Pago registrado", "success");
        mutate();
        onClose();
      } else {
        showToast(" Error al registrar pago", "error");
      }
    } catch (error) {
      showToast(" Error al registrar pago", "error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Registrar Pago</h2>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div
            style={{
              padding: "1rem",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Documento:</span>
              <span style={{ fontWeight: 600 }}>{document.doc_number}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Total:</span>
              <span>{formatCurrency(document.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Pagado:</span>
              <span>{formatCurrency(document.amount_paid)}</span>
            </div>
            <hr style={{ margin: "0.75rem 0", border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.125rem", fontWeight: 700 }}>
              <span>Balance:</span>
              <span>{formatCurrency(calculateBalanceDue(document))}</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Monto del Pago *</label>
            <input
              type="number"
              step="0.01"
              className={styles.formInput}
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Fecha de Pago</label>
              <input
                type="date"
                className={styles.formInput}
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mtodo de Pago</label>
              <select
                className={styles.formSelect}
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({ ...formData, payment_method: e.target.value })
                }
              >
                <option value="cash">Efectivo</option>
                <option value="check">Cheque</option>
                <option value="credit_card">Tarjeta de Crdito</option>
                <option value="debit_card">Tarjeta de Dbito</option>
                <option value="bank_transfer">Transferencia Bancaria</option>
                <option value="paypal">PayPal</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Referencia</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Nmero de transaccin, cheque, etc."
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Notas</label>
            <textarea
              className={styles.formTextarea}
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.primaryButton} onClick={handleSubmit}>
            Registrar Pago
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment History Modal
function PaymentHistoryModal({ document, onClose, tenantId }: any) {
  const { data } = useSWR(
    `/api/invoicing/payments?documentId=${document.id}&tenantId=${tenantId}`,
    fetcher
  );

  const payments = data?.payments || [];

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      check: "Cheque",
      credit_card: "Tarjeta de Crédito",
      debit_card: "Tarjeta de Débito",
      bank_transfer: "Transferencia Bancaria",
      paypal: "PayPal",
      other: "Otro",
    };
    return labels[method] || method;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Historial de Pagos</h2>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Document Info */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Documento:</span>
              <span style={{ fontWeight: 600 }}>{document.doc_number}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Total:</span>
              <span>{formatCurrency(document.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Pagado:</span>
              <span style={{ color: "#10b981" }}>{formatCurrency(document.amount_paid)}</span>
            </div>
            <hr style={{ margin: "0.75rem 0", border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.125rem", fontWeight: 700 }}>
              <span>Balance:</span>
              <span style={{ color: calculateBalanceDue(document) > 0 ? "#f59e0b" : "#10b981" }}>
                {formatCurrency(calculateBalanceDue(document))}
              </span>
            </div>
          </div>

          {/* Payments List */}
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "rgba(255, 255, 255, 0.9)" }}>
              Pagos Realizados ({payments?.length || 0})
            </h3>

            {!payments || payments.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: "0.875rem",
                }}
              >
                No hay pagos registrados para esta factura
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "#10b981" }}>
                          {formatCurrency(payment.amount)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "0.25rem" }}>
                          {formatDateTime(payment.payment_date)}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          background: "rgba(59, 130, 246, 0.1)",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          fontSize: "0.75rem",
                          color: "#3b82f6",
                          fontWeight: 500,
                        }}
                      >
                        {getPaymentMethodLabel(payment.payment_method)}
                      </span>
                    </div>

                    {payment.reference && (
                      <div style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)", marginBottom: "0.25rem" }}>
                        <strong>Referencia:</strong> {payment.reference}
                      </div>
                    )}

                    {payment.notes && (
                      <div style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)" }}>
                        <strong>Notas:</strong> {payment.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function
function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default InvoicingDashboardClient;
