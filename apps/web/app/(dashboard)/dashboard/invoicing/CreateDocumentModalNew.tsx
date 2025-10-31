"use client";

import React, { useState } from "react";
import styles from "./invoicing.module.css";

type ToastType = "success" | "error" | "info" | "warning";

interface CreateDocumentModalProps {
  tenantId: string;
  docType: "invoice" | "estimate";
  clients: any[];
  items: any[];
  settings: any;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type?: ToastType) => void;
  document?: any; // Para modo edición
}

export default function CreateDocumentModalNew({
  tenantId,
  docType,
  clients,
  items,
  settings,
  onClose,
  onSuccess,
  showToast,
  document,
}: CreateDocumentModalProps) {
  const isEditMode = !!document;
  
  // Generar número de documento automático usando los contadores de settings
  const generateDocumentNumber = () => {
    if (isEditMode) return document.doc_number;
    
    const prefix = docType === "invoice" 
      ? (settings?.invoice_prefix || "INV")
      : (settings?.estimate_prefix || "EST");
    
    const nextNumber = docType === "invoice"
      ? (settings?.next_invoice_number || 1)
      : (settings?.next_estimate_number || 1);
    
    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  };
  
  // Normalizar line_items al editar
  const normalizeLineItems = (items: any[]) => {
    if (!items || items.length === 0) return [];
    
    return items.map((item: any) => ({
      item_id: item.item_id || "",
      name: item.name || "",
      description: item.description || "",
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      tax_rate: item.tax_rate || 0,
    }));
  };
  
  const [formData, setFormData] = useState({
    client_id: document?.client_id || "",
    issue_date: document?.issue_date?.split("T")[0] || new Date().toISOString().split("T")[0],
    due_date: document?.due_date?.split("T")[0] || "",
    notes: document?.notes || "",
    line_items: normalizeLineItems(document?.line_items || document?.items || []),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<"minimal" | "professional">(
    (document?.template_id as "minimal" | "professional") || 
    (settings?.selected_template_id as "minimal" | "professional") || 
    "minimal"
  );
  
  // Fixed colors per template (darker gray for minimal, dark blue for professional)
  const templateColor = selectedTemplate === "minimal" ? "#4b5563" : "#1e293b";
  
  // Número de documento para mostrar (será generado por el backend)
  const displayDocumentNumber = document?.doc_number || generateDocumentNumber();
  const [showPreview, setShowPreview] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    email: "",
    phone: "",
    address_line1: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [localClients, setLocalClients] = useState(clients);
  
  const [showItemForm, setShowItemForm] = useState<number | null>(null); // Índice del line item
  const [newItemData, setNewItemData] = useState({
    item_type: "service",
    name: "",
    description: "",
    unit_price: 0,
    tax_rate: 0,
  });
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [localItems, setLocalItems] = useState(items);

  const selectedClient = localClients.find((c) => c.id === formData.client_id);

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [
        ...formData.line_items,
        { item_id: "", name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
      ],
    });
  };

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      line_items: formData.line_items.filter((_: any, i: number) => i !== index),
    });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.line_items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "item_id" && value) {
      const item = items.find((i: any) => i.id === value);
      if (item) {
        newItems[index] = {
          ...newItems[index],
          name: item.name || "",
          description: item.description || item.name || "",
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
        };
      }
    }

    setFormData({ ...formData, line_items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.line_items.reduce((sum: number, item: any) => {
      return sum + item.quantity * item.unit_price;
    }, 0);
  };

  const calculateTax = () => {
    return formData.line_items.reduce((sum: number, item: any) => {
      const subtotal = item.quantity * item.unit_price;
      return sum + subtotal * (item.tax_rate / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showClientForm) {
      showToast("Por favor, completa o cancela la creación del cliente primero", "error");
      return;
    }
    
    if (!formData.client_id || formData.line_items.length === 0) {
      showToast("Selecciona un cliente y agrega al menos un artículo", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = "/api/invoicing/documents";
      const method = isEditMode ? "PATCH" : "POST";
      
      // Normalize line items - ensure each item has the correct name from catalog if applicable
      const normalizedItems = formData.line_items.map((item: any) => {
        const catalogItem = localItems.find((i: any) => i.id === item.item_id);
        return {
          item_id: item.item_id || null,
          name: item.name || catalogItem?.name || item.description || "",
          description: item.description || "",
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
        };
      });
      
      const requestBody: any = {
        tenant_id: tenantId,
        doc_type: docType,
        client_id: formData.client_id,
        issue_date: formData.issue_date,
        due_date: formData.due_date || null,
        items: normalizedItems, // API expects "items" not "line_items"
        notes: formData.notes,
        template_id: selectedTemplate,
      };
      
      // Add id field when editing
      if (isEditMode) {
        requestBody.id = document.id;
      }
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(`Error al ${isEditMode ? "actualizar" : "crear"} documento`);
      
      const action = isEditMode ? "actualizado" : "creado";
      showToast(`✓ ${docType === "invoice" ? "Factura" : "Estimado"} ${action} exitosamente`, "success");
      onSuccess();
      onClose();
    } catch (error) {
      const action = isEditMode ? "actualizar" : "crear";
      showToast(`✗ Error al ${action} ${docType === "invoice" ? "factura" : "estimado"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!formData.client_id) {
      showToast("Selecciona un cliente para generar el PDF", "warning");
      return;
    }
    if (formData.line_items.length === 0) {
      showToast("Agrega al menos un artículo para generar el PDF", "warning");
      return;
    }

    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default as any;

      // Create a temporary div with the preview content
      const client = localClients.find((c) => c.id === formData.client_id);
      const subtotal = calculateSubtotal();
      const tax = calculateTax();
      const total = subtotal + tax;

      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.background = 'white';
      tempDiv.style.padding = '2rem';
      
      // Generate HTML based on selected template
      if (selectedTemplate === "minimal") {
        tempDiv.innerHTML = `
          <div style="max-width: 800px; margin: 0 auto; padding: 2rem; background: white; color: #000;">
            <div style="border-bottom: 2px solid ${templateColor}; padding-bottom: 1.5rem; margin-bottom: 2rem;">
              <h1 style="margin: 0; font-size: 2rem; font-weight: 300; color: #000;">
                ${docType === "invoice" ? "FACTURA" : "ESTIMADO"}
              </h1>
              <p style="margin: 0.5rem 0 0 0; color: ${templateColor}; font-weight: 500;">
                ${displayDocumentNumber}
              </p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-bottom: 2rem;">
              <div>
                <p style="margin: 0; font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">De:</p>
                <h3 style="margin: 0; margin-bottom: 0.5rem; color: #000; font-size: 1.125rem;">
                  ${settings?.company_name || "Tu Empresa"}
                </h3>
                <p style="margin: 0; font-size: 0.875rem; color: #666; line-height: 1.6;">
                  ${settings?.company_email || ""}<br/>
                  ${settings?.company_phone || ""}
                </p>
              </div>
              <div>
                <p style="margin: 0; font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Facturar a:</p>
                <h4 style="margin: 0; margin-bottom: 0.5rem; color: #000; font-size: 1.125rem;">
                  ${client?.full_name || client?.business_name || ""}
                </h4>
                <p style="margin: 0; font-size: 0.875rem; color: #666; line-height: 1.6;">
                  ${client?.email || ""}<br/>
                  ${client?.phone || ""}
                </p>
              </div>
              <div>
                <p style="margin: 0; font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Fecha de emisión:</p>
                <p style="margin: 0; font-size: 1rem; color: #000; font-weight: 500;">
                  ${formData.issue_date ? new Date(formData.issue_date + 'T00:00:00').toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : ''}
                </p>
              </div>
            </div>

            <div style="margin-bottom: 2rem;">
              ${formData.line_items.map((item: any, index: number) => {
                const itemData = localItems.find((i: any) => i.id === item.item_id);
                const itemTaxRate = item.tax_rate || itemData?.tax_rate || 0;
                return `
                  <div style="padding: 1.25rem; margin-bottom: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff;">
                    <div style="font-weight: 700; margin-bottom: 1rem; color: ${templateColor}; font-size: 1.125rem; padding-bottom: 0.75rem; border-bottom: 2px solid ${templateColor};">
                      ${itemData?.name || item.description}
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; font-size: 0.875rem;">
                      <div>
                        <div style="color: #999; font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Cantidad</div>
                        <div style="color: #000; font-weight: 700; font-size: 1.125rem;">${item.quantity}</div>
                      </div>
                      <div>
                        <div style="color: #999; font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Precio</div>
                        <div style="color: #000; font-weight: 700; font-size: 1.125rem;">$${item.unit_price.toFixed(2)}</div>
                      </div>
                      ${itemTaxRate > 0 ? `
                        <div>
                          <div style="color: #999; font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Tax</div>
                          <div style="color: #000; font-weight: 700; font-size: 1.125rem;">${itemTaxRate}%</div>
                        </div>
                      ` : ''}
                      <div>
                        <div style="color: #999; font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Total</div>
                        <div style="color: #fff; background: ${templateColor}; font-weight: 700; font-size: 1.25rem; padding: 0.5rem 1rem; border-radius: 6px; display: inline-block;">
                          $${(item.quantity * item.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div style="max-width: 400px; margin-left: auto; background: #f9fafb; padding: 1.5rem; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                <span style="color: #666;">Subtotal:</span>
                <span style="color: #000; font-weight: 600;">$${subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                <span style="color: #666;">Impuestos:</span>
                <span style="color: #000; font-weight: 600;">$${tax.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 1rem 0; border-top: 2px solid ${templateColor}; margin-top: 0.5rem;">
                <span style="color: #000; font-weight: 700; font-size: 1.25rem;">TOTAL:</span>
                <span style="color: ${templateColor}; font-weight: 700; font-size: 1.5rem;">$${total.toFixed(2)}</span>
              </div>
            </div>

            ${formData.notes ? `
              <div style="margin-top: 2rem; padding: 1rem; background: #f9fafb; border-radius: 8px; border-left: 4px solid ${templateColor};">
                <p style="margin: 0; font-size: 0.75rem; color: #999; font-weight: 600; margin-bottom: 0.75rem; text-transform: uppercase;">Notas y condiciones:</p>
                <p style="margin: 0; font-size: 0.875rem; color: #000; white-space: pre-wrap; line-height: 1.8;">${formData.notes}</p>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        // Professional template
        tempDiv.innerHTML = `
          <div style="max-width: 800px; margin: 0 auto; background: white; color: #000;">
            <div style="background: ${templateColor}; color: #fff; padding: 2rem; margin-bottom: 2rem;">
              <h1 style="margin: 0; font-size: 2.5rem; font-weight: 700;">
                ${settings?.company_name || "Tu Empresa"}
              </h1>
              <p style="margin: 0.5rem 0 0 0; font-size: 1.25rem; opacity: 0.95;">
                ${docType === "invoice" ? "FACTURA" : "ESTIMADO"} ${displayDocumentNumber}
              </p>
            </div>

            <div style="padding: 0 2rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div style="padding: 1.5rem; background: #f9fafb; border-radius: 8px;">
                  <p style="margin: 0; font-size: 0.75rem; color: ${templateColor}; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">De:</p>
                  <h4 style="margin: 0; margin-bottom: 0.25rem; color: #000; font-size: 1.125rem;">
                    ${settings?.company_name || "Tu Empresa"}
                  </h4>
                  <p style="margin: 0; font-size: 0.875rem; color: #666; line-height: 1.6;">
                    ${settings?.company_email || ""}<br/>
                    ${settings?.company_phone || ""}
                  </p>
                </div>
                <div style="padding: 1.5rem; background: #f9fafb; border-radius: 8px;">
                  <p style="margin: 0; font-size: 0.75rem; color: ${templateColor}; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">Facturar a:</p>
                  <h4 style="margin: 0; margin-bottom: 0.25rem; color: #000; font-size: 1.125rem;">
                    ${client?.full_name || client?.business_name || ""}
                  </h4>
                  <p style="margin: 0; font-size: 0.875rem; color: #666; line-height: 1.6;">
                    ${client?.email || ""}<br/>
                    ${client?.phone || ""}
                  </p>
                </div>
                <div style="padding: 1.5rem; background: #f9fafb; border-radius: 8px;">
                  <p style="margin: 0; font-size: 0.75rem; color: ${templateColor}; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">Fecha de emisión:</p>
                  <p style="margin: 0; font-size: 1rem; color: #000; font-weight: 500;">
                    ${formData.issue_date ? new Date(formData.issue_date + 'T00:00:00').toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : ''}
                  </p>
                </div>
              </div>

              <div style="margin-bottom: 2rem;">
                ${formData.line_items.map((item: any, index: number) => {
                  const itemData = localItems.find((i: any) => i.id === item.item_id);
                  const itemTaxRate = item.tax_rate || itemData?.tax_rate || 0;
                  return `
                    <div style="padding: 1.25rem; margin-bottom: 1rem; background: ${index % 2 === 0 ? '#fafafa' : '#fff'}; border-radius: 8px; border: 1px solid #e5e7eb;">
                      <div style="font-weight: 700; margin-bottom: 0.75rem; color: ${templateColor}; font-size: 1.125rem; padding-bottom: 0.5rem; border-bottom: 2px solid ${templateColor};">
                        ${itemData?.name || item.description}
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <div>
                          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">Cantidad</div>
                          <div style="font-size: 1rem; color: #000; font-weight: 600;">${item.quantity}</div>
                        </div>
                        <div>
                          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">Precio Unit.</div>
                          <div style="font-size: 1rem; color: #000; font-weight: 600;">$${item.unit_price.toFixed(2)}</div>
                        </div>
                        ${itemTaxRate > 0 ? `
                          <div>
                            <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">Impuesto</div>
                            <div style="font-size: 1rem; color: #000; font-weight: 600;">${itemTaxRate}%</div>
                          </div>
                        ` : ''}
                        <div style="grid-column: span 2; margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb;">
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.875rem; color: #666; font-weight: 600;">Total:</span>
                            <span style="font-size: 1.5rem; color: ${templateColor}; font-weight: 700;">$${(item.quantity * item.unit_price).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <div style="max-width: 400px; margin-left: auto; background: ${templateColor}; color: #fff; padding: 1.5rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; opacity: 0.9;">
                  <span>Subtotal:</span>
                  <span style="font-weight: 600;">$${subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; opacity: 0.9;">
                  <span>Impuestos:</span>
                  <span style="font-weight: 600;">$${tax.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 1rem 0; border-top: 2px solid rgba(255,255,255,0.3); margin-top: 0.5rem;">
                  <span style="font-weight: 700; font-size: 1.25rem;">TOTAL:</span>
                  <span style="font-weight: 700; font-size: 1.5rem;">$${total.toFixed(2)}</span>
                </div>
              </div>

              ${formData.notes ? `
                <div style="margin-top: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 8px; border-top: 4px solid ${templateColor}; margin-bottom: 2rem;">
                  <p style="margin: 0; font-size: 0.75rem; color: ${templateColor}; font-weight: 600; margin-bottom: 0.75rem; text-transform: uppercase;">Notas y condiciones:</p>
                  <p style="margin: 0; font-size: 0.875rem; color: #000; white-space: pre-wrap; line-height: 1.8;">${formData.notes}</p>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }

      document.body.appendChild(tempDiv);

      // Generate canvas from HTML
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Remove temporary div
      document.body.removeChild(tempDiv);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Download the PDF
      const fileName = `${docType === "invoice" ? "factura" : "estimado"}-${displayDocumentNumber}.pdf`;
      pdf.save(fileName);

      showToast("PDF generado exitosamente", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Error al generar el PDF", "error");
    }
  };

  const handleCreateClient = async () => {
    if (!newClientData.name || !newClientData.email) {
      showToast("Nombre y email son requeridos", "error");
      return;
    }

    setIsCreatingClient(true);
    try {
      const response = await fetch("/api/invoicing/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          client_type: "individual",
          full_name: newClientData.name,
          email: newClientData.email,
          phone: newClientData.phone,
          address_line1: newClientData.address_line1,
          city: newClientData.city,
          state: newClientData.state,
          postal_code: newClientData.postal_code,
        }),
      });

      if (!response.ok) throw new Error("Error al crear cliente");
      
      const data = await response.json();
      const newClient = data.client || data;
      
      // Cerrar el formulario PRIMERO
      setShowClientForm(false);
      
      // Actualizar la lista local de clientes
      setLocalClients([newClient, ...localClients]);
      
      // Seleccionar el nuevo cliente
      setFormData({ ...formData, client_id: newClient.id });
      
      // Limpiar los datos del nuevo cliente
      setNewClientData({
        name: "",
        email: "",
        phone: "",
        address_line1: "",
        city: "",
        state: "",
        postal_code: "",
      });
      
      showToast("✓ Cliente creado y seleccionado", "success");
      
    } catch (error) {
      console.error("Error creating client:", error);
      showToast("✗ Error al crear cliente", "error");
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleClientSelectChange = (value: string) => {
    if (value === "CREATE_NEW") {
      setShowClientForm(true);
      setFormData({ ...formData, client_id: "" });
    } else {
      setFormData({ ...formData, client_id: value });
      setShowClientForm(false);
    }
  };

  const handleCreateItem = async (lineItemIndex: number) => {
    if (!newItemData.name) {
      showToast("El nombre del artículo es requerido", "error");
      return;
    }

    setIsCreatingItem(true);
    try {
      const payload = {
        tenant_id: tenantId,
        item_type: newItemData.item_type,
        name: newItemData.name,
        description: newItemData.description || null,
        unit_price: newItemData.unit_price,
        tax_rate: newItemData.tax_rate,
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
      const newItem = data.item || data; // API devuelve { item } o directamente el item
      
      console.log("Item created:", newItem);
      
      // Actualizar la lista local de artículos
      setLocalItems([newItem, ...localItems]);
      
      // Seleccionar el nuevo artículo en el line item
      updateLineItem(lineItemIndex, "item_id", newItem.id);
      
      // Cerrar el formulario y limpiar datos
      setShowItemForm(null);
      setNewItemData({
        item_type: "service",
        name: "",
        description: "",
        unit_price: 0,
        tax_rate: 0,
      });
      
      showToast("✓ Artículo creado y seleccionado", "success");
      
    } catch (error: any) {
      console.error("Error creating item:", error);
      showToast(`✗ ${error.message || "Error al crear artículo"}`, "error");
    } finally {
      setIsCreatingItem(false);
    }
  };

  const handleItemSelectChange = (index: number, value: string) => {
    if (value === "CREATE_NEW") {
      setShowItemForm(index);
    } else if (value) {
      // Encontrar el artículo seleccionado
      const selectedItem = localItems.find((item: any) => item.id === value);
      if (selectedItem) {
        // Actualizar el line item con los datos del artículo
        const updatedItems = [...formData.line_items];
        updatedItems[index] = {
          ...updatedItems[index],
          item_id: value,
          unit_price: selectedItem.unit_price,
          tax_rate: selectedItem.tax_rate || 0,
          description: selectedItem.description || selectedItem.name
        };
        setFormData({ ...formData, line_items: updatedItems });
      }
      setShowItemForm(null);
    } else {
      updateLineItem(index, "item_id", value);
      setShowItemForm(null);
    }
  };

  // Renderizar vista previa
  if (showPreview) {
    const client = localClients.find((c) => c.id === formData.client_id);
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const total = subtotal + tax;

    // Template Minimalista - Diseño simple con tabla responsive
    const MinimalPreview = () => (
      <div style={{ padding: "2rem", background: "white", color: "#000" }}>
        {/* Header simple */}
        <div style={{ 
          borderBottom: `3px solid ${templateColor}`,
          paddingBottom: "1.5rem",
          marginBottom: "2rem"
        }}>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 300, color: templateColor }}>
            {docType === "invoice" ? "FACTURA" : "ESTIMADO"}
          </h1>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "1.25rem", color: "#666" }}>
            {displayDocumentNumber}
          </p>
        </div>

        {/* Info Grid Responsive */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem" 
        }}>
          {/* Company Info */}
          <div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#999", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              De:
            </p>
            <h3 style={{ margin: 0, marginBottom: "0.25rem", color: "#000", fontSize: "1rem" }}>
              {settings?.company_name || "Tu Empresa"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#666", lineHeight: 1.6 }}>
              {settings?.company_email || ""}<br/>
              {settings?.company_phone || ""}
            </p>
          </div>

          {/* Client Info */}
          <div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#999", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Para:
            </p>
            <h4 style={{ margin: 0, marginBottom: "0.25rem", color: "#000", fontSize: "1rem" }}>
              {client?.full_name || client?.business_name || "Selecciona un cliente"}
            </h4>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#666", lineHeight: 1.6 }}>
              {client?.email || ""}<br/>
              {client?.phone || ""}
            </p>
          </div>

          {/* Date */}
          <div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#999", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Fecha:
            </p>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#000", fontWeight: 500 }}>
              {formData.issue_date ? new Date(formData.issue_date + 'T00:00:00').toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : ''}
            </p>
          </div>
        </div>

        {/* Line Items - Mobile Responsive Cards */}
        <div style={{ marginBottom: "2rem" }}>
          {formData.line_items.map((item: any, index: number) => {
            const itemData = localItems.find((i: any) => i.id === item.item_id);
            const itemTaxRate = item.tax_rate || itemData?.tax_rate || 0;
            return (
              <div key={index} style={{ 
                padding: "1.25rem", 
                marginBottom: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: "#fff"
              }}>
                <div style={{ 
                  fontWeight: 700, 
                  marginBottom: "1rem", 
                  color: templateColor, 
                  fontSize: "1.125rem",
                  paddingBottom: "0.75rem",
                  borderBottom: `2px solid ${templateColor}`
                }}>
                  {itemData?.name || item.description}
                </div>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
                  gap: "1rem", 
                  fontSize: "0.875rem" 
                }}>
                  <div>
                    <div style={{ color: "#999", fontSize: "0.75rem", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cantidad</div>
                    <div style={{ color: "#000", fontWeight: 700, fontSize: "1.125rem" }}>{item.quantity}</div>
                  </div>
                  <div>
                    <div style={{ color: "#999", fontSize: "0.75rem", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Precio</div>
                    <div style={{ color: "#000", fontWeight: 700, fontSize: "1.125rem" }}>${item.unit_price.toFixed(2)}</div>
                  </div>
                  {itemTaxRate > 0 && (
                    <div>
                      <div style={{ color: "#999", fontSize: "0.75rem", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tax</div>
                      <div style={{ color: "#000", fontWeight: 700, fontSize: "1.125rem" }}>{itemTaxRate}%</div>
                    </div>
                  )}
                  <div>
                    <div style={{ color: "#999", fontSize: "0.75rem", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</div>
                    <div style={{ color: "#fff", background: templateColor, fontWeight: 700, fontSize: "1.25rem", padding: "0.5rem 1rem", borderRadius: "6px", display: "inline-block" }}>
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div style={{ 
          maxWidth: "300px", 
          marginLeft: "auto",
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
            <span style={{ color: "#666" }}>Subtotal:</span>
            <span style={{ color: "#000", fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
            <span style={{ color: "#666" }}>Impuestos:</span>
            <span style={{ color: "#000", fontWeight: 600 }}>${tax.toFixed(2)}</span>
          </div>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            padding: "0.75rem 0",
            borderTop: `2px solid ${templateColor}`,
            marginTop: "0.5rem"
          }}>
            <span style={{ color: "#000", fontWeight: 700, fontSize: "1.125rem" }}>Total:</span>
            <span style={{ color: templateColor, fontWeight: 700, fontSize: "1.125rem" }}>
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {formData.notes && (
          <div style={{ marginTop: "2rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px", borderLeft: `4px solid ${templateColor}` }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#666", marginBottom: "0.5rem", textTransform: "uppercase" }}>Notas:</p>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#000", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {formData.notes}
            </p>
          </div>
        )}
      </div>
    );

    // Template Profesional - Diseño corporativo con header destacado
    const ProfessionalPreview = () => (
      <div style={{ background: "#f9fafb" }}>
        {/* Header con color de plantilla */}
        <div style={{ 
          background: templateColor, 
          color: "#fff",
          padding: "2rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "2.5rem", fontWeight: "bold" }}>
                {docType === "invoice" ? "FACTURA" : "ESTIMADO"}
              </h1>
              <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "1.125rem" }}>
                {displayDocumentNumber}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", marginBottom: "0.25rem" }}>
                {settings?.company_name || "Tu Empresa"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.9, lineHeight: 1.5 }}>
                {settings?.company_email || ""}<br/>
                {settings?.company_phone || ""}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "2rem", background: "white" }}>
          {/* Client and Date Info */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
            padding: "1.5rem",
            background: "#f9fafb",
            borderRadius: "8px"
          }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: templateColor, fontWeight: 600, textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Facturar a:
              </p>
              <h4 style={{ margin: 0, marginBottom: "0.25rem", color: "#000", fontSize: "1.125rem" }}>
                {client?.full_name || client?.business_name || "Selecciona un cliente"}
              </h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#666", lineHeight: 1.6 }}>
                {client?.email || ""}<br/>
                {client?.phone || ""}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: templateColor, fontWeight: 600, textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Fecha de emisión:
              </p>
              <p style={{ margin: 0, fontSize: "1rem", color: "#000", fontWeight: 500 }}>
                {formData.issue_date ? new Date(formData.issue_date + 'T00:00:00').toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : ''}
              </p>
            </div>
          </div>

          {/* Line Items - Responsive Cards */}
          <div style={{ marginBottom: "2rem" }}>
            {formData.line_items.map((item: any, index: number) => {
              const itemData = localItems.find((i: any) => i.id === item.item_id);
              const itemTaxRate = item.tax_rate || itemData?.tax_rate || 0;
              return (
                <div key={index} style={{ 
                  padding: "1.25rem", 
                  marginBottom: "1rem",
                  background: index % 2 === 0 ? "#fafafa" : "#fff",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb"
                }}>
                  <div style={{ 
                    fontWeight: 700, 
                    marginBottom: "0.75rem", 
                    color: templateColor,
                    fontSize: "1.125rem",
                    paddingBottom: "0.5rem",
                    borderBottom: `2px solid ${templateColor}`
                  }}>
                    {itemData?.name || item.description}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>Cantidad</div>
                      <div style={{ fontSize: "1rem", color: "#000", fontWeight: 600 }}>{item.quantity}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>Precio Unit.</div>
                      <div style={{ fontSize: "1rem", color: "#000", fontWeight: 600 }}>${item.unit_price.toFixed(2)}</div>
                    </div>
                    {itemTaxRate > 0 && (
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>Impuesto</div>
                        <div style={{ fontSize: "1rem", color: "#000", fontWeight: 600 }}>{itemTaxRate}%</div>
                      </div>
                    )}
                    <div style={{ gridColumn: "span 2", marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.875rem", color: "#666", fontWeight: 600 }}>Total:</span>
                        <span style={{ fontSize: "1.5rem", color: templateColor, fontWeight: 700 }}>
                          ${(item.quantity * item.unit_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div style={{ 
            maxWidth: "400px", 
            marginLeft: "auto",
            background: templateColor,
            color: "#fff",
            padding: "1.5rem",
            borderRadius: "8px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", opacity: 0.9 }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", opacity: 0.9 }}>
              <span>Impuestos:</span>
              <span style={{ fontWeight: 600 }}>${tax.toFixed(2)}</span>
            </div>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              padding: "1rem 0",
              borderTop: "2px solid rgba(255,255,255,0.3)",
              marginTop: "0.5rem"
            }}>
              <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>TOTAL:</span>
              <span style={{ fontWeight: 700, fontSize: "1.5rem" }}>
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {formData.notes && (
            <div style={{ 
              marginTop: "2rem", 
              padding: "1.5rem", 
              background: "#f9fafb", 
              borderRadius: "8px",
              borderTop: `4px solid ${templateColor}`
            }}>
              <p style={{ margin: 0, fontSize: "0.75rem", color: templateColor, fontWeight: 600, marginBottom: "0.75rem", textTransform: "uppercase" }}>
                Notas y condiciones:
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#000", whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                {formData.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className={styles.modalOverlay} onClick={() => setShowPreview(false)}>
        <div
          className={styles.modalContent}
          style={{ maxWidth: "900px", maxHeight: "90vh", overflow: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2>Vista Previa - {docType === "invoice" ? "Factura" : "Estimado"}</h2>
            <button onClick={() => setShowPreview(false)} className={styles.modalCloseBtn}>&times;</button>
          </div>
          
          {selectedTemplate === "minimal" ? <MinimalPreview /> : <ProfessionalPreview />}

          <div className={styles.modalFooter}>
            <button 
              type="button" 
              onClick={() => setShowPreview(false)} 
              className={styles.btnSecondary}
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        style={{ maxWidth: "1000px", maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h2>
              {isEditMode ? "Editar " : "Crear "}{docType === "invoice" ? "Factura" : "Estimado"}
            </h2>
          </div>
          <button onClick={onClose} className={styles.modalCloseBtn}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody} style={{ padding: "2rem" }}>
            {/* Header Section */}
            <div style={{ marginBottom: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              {/* From Section */}
              <div>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", color: "rgba(255,255,255,0.7)" }}>
                  De
                </h3>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={settings?.company_name || ""}
                    placeholder="Nombre de la empresa"
                    disabled
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  />
                  <input
                    type="email"
                    className={styles.formInput}
                    value={settings?.company_email || ""}
                    placeholder="email@empresa.com"
                    disabled
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  />
                  <input
                    type="text"
                    className={styles.formInput}
                    value={settings?.company_address_line1 || ""}
                    placeholder="Dirección"
                    disabled
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  />
                  <input
                    type="text"
                    className={styles.formInput}
                    value={settings?.company_city && settings?.company_state 
                      ? `${settings.company_city}, ${settings.company_state}` 
                      : ""}
                    placeholder="Ciudad, Estado"
                    disabled
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  />
                  <input
                    type="text"
                    className={styles.formInput}
                    value={settings?.company_postal_code || ""}
                    placeholder="Código postal"
                    disabled
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  />
                  <input
                    type="text"
                    className={styles.formInput}
                    value={settings?.company_phone || ""}
                    placeholder="+1 (555) 000-0000"
                    disabled
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  />
                  <input
                    type="text"
                    className={styles.formInput}
                    value={settings?.company_website || ""}
                    placeholder="www.empresa.com"
                    disabled
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  />
                </div>
              </div>

              {/* Bill To Section */}
              <div>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem", color: "rgba(255,255,255,0.7)" }}>
                  Facturar a
                </h3>
                <select
                  className={styles.formInput}
                  value={formData.client_id || ""}
                  onChange={(e) => handleClientSelectChange(e.target.value)}
                  required={!showClientForm}
                  style={{ marginBottom: "0.75rem" }}
                >
                  <option value="">Seleccionar cliente...</option>
                  <option value="CREATE_NEW" style={{ background: "#3b82f6", fontWeight: 600 }}>
                    ➕ Crear nuevo cliente
                  </option>
                  {localClients.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name || client.business_name || client.email}
                    </option>
                  ))}
                </select>

                {showClientForm ? (
                  <div style={{ 
                    display: "grid", 
                    gap: "0.75rem", 
                    padding: "1rem", 
                    background: "rgba(59, 130, 246, 0.1)", 
                    borderRadius: "8px",
                    border: "1px solid rgba(59, 130, 246, 0.3)"
                  }}>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={newClientData.name}
                      onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                      placeholder="Nombre del cliente *"
                      required
                    />
                    <input
                      type="email"
                      className={styles.formInput}
                      value={newClientData.email}
                      onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                      placeholder="Email *"
                      required
                    />
                    <input
                      type="tel"
                      className={styles.formInput}
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                      placeholder="Teléfono"
                    />
                    <input
                      type="text"
                      className={styles.formInput}
                      value={newClientData.address_line1}
                      onChange={(e) => setNewClientData({ ...newClientData, address_line1: e.target.value })}
                      placeholder="Dirección"
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={newClientData.city}
                        onChange={(e) => setNewClientData({ ...newClientData, city: e.target.value })}
                        placeholder="Ciudad"
                      />
                      <input
                        type="text"
                        className={styles.formInput}
                        value={newClientData.state}
                        onChange={(e) => setNewClientData({ ...newClientData, state: e.target.value })}
                        placeholder="Estado"
                      />
                    </div>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={newClientData.postal_code}
                      onChange={(e) => setNewClientData({ ...newClientData, postal_code: e.target.value })}
                      placeholder="Código postal"
                    />
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={handleCreateClient}
                        disabled={isCreatingClient || !newClientData.name || !newClientData.email}
                        style={{
                          flex: 1,
                          padding: "0.625rem",
                          background: "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: isCreatingClient ? "not-allowed" : "pointer",
                          fontWeight: 500,
                          fontSize: "0.875rem",
                          opacity: isCreatingClient || !newClientData.name || !newClientData.email ? 0.5 : 1,
                        }}
                      >
                        {isCreatingClient ? "Creando..." : "✓ Crear y seleccionar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowClientForm(false);
                          setNewClientData({
                            name: "",
                            email: "",
                            phone: "",
                            address_line1: "",
                            city: "",
                            state: "",
                            postal_code: "",
                          });
                        }}
                        style={{
                          padding: "0.625rem",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "white",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: 500,
                          fontSize: "0.875rem",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : selectedClient ? (
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={selectedClient.email || ""}
                      placeholder="cliente@email.com"
                      disabled
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    />
                    <input
                      type="text"
                      className={styles.formInput}
                      value={selectedClient.address_line1 || ""}
                      placeholder="Dirección del cliente"
                      disabled
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    />
                    <input
                      type="text"
                      className={styles.formInput}
                      value={selectedClient.city && selectedClient.state 
                        ? `${selectedClient.city}, ${selectedClient.state}` 
                        : ""}
                      placeholder="Ciudad, Estado"
                      disabled
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    />
                    <input
                      type="text"
                      className={styles.formInput}
                      value={selectedClient.postal_code || ""}
                      placeholder="Código postal"
                      disabled
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Line Items Section */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                  Artículos
                </h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "6px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  + Artículo
                </button>
              </div>

              {formData.line_items.map((item: any, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: "1rem",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    <select
                      className={styles.formInput}
                      value={showItemForm === index ? "CREATE_NEW" : (item.item_id || "")}
                      onChange={(e) => handleItemSelectChange(index, e.target.value)}
                      style={{
                        fontSize: "0.875rem"
                      }}
                    >
                      <option key="empty" value="">Seleccionar artículo...</option>
                      <option key="create-new" value="CREATE_NEW" style={{ background: "#22c55e", fontWeight: 600 }}>
                        ➕ Crear nuevo artículo
                      </option>
                      {localItems.map((catalogItem: any) => (
                        <option key={catalogItem.id} value={catalogItem.id}>
                          {catalogItem.name} - ${catalogItem.unit_price.toFixed(2)}
                        </option>
                      ))}
                    </select>

                    {item.item_id && !showItemForm && (
                      <div style={{
                        padding: "0.5rem 0.75rem",
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        color: "rgba(147, 197, 253, 0.9)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}>
                        <span>ℹ️</span>
                        <span>Precio e impuestos automáticos del artículo. Solo edita la cantidad.</span>
                      </div>
                    )}

                    {showItemForm === index ? (
                      <div style={{ 
                        display: "grid", 
                        gap: "1rem", 
                        padding: "1rem", 
                        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)", 
                        borderRadius: "12px",
                        border: "2px solid rgba(34, 197, 94, 0.3)",
                        boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15)"
                      }}>
                        {/* Header del formulario */}
                        <div style={{ 
                          paddingBottom: "0.75rem",
                          borderBottom: "1px solid rgba(34, 197, 94, 0.2)"
                        }}>
                          <h4 style={{ 
                            margin: 0, 
                            fontSize: "0.9375rem", 
                            fontWeight: 600,
                            color: "#22c55e",
                            marginBottom: "0.25rem"
                          }}>
                            Crear Nuevo Artículo
                          </h4>
                          <p style={{ 
                            margin: 0, 
                            fontSize: "0.6875rem", 
                            color: "rgba(255, 255, 255, 0.5)",
                            lineHeight: 1.3
                          }}>
                            Completa los campos y se agregará automáticamente
                          </p>
                        </div>

                        {/* Tipo y Nombre */}
                        <div style={{ 
                          display: "grid", 
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
                          gap: "0.75rem" 
                        }}>
                          <div>
                            <label style={{ 
                              display: "block", 
                              fontSize: "0.75rem", 
                              fontWeight: 600,
                              color: "rgba(255, 255, 255, 0.7)",
                              marginBottom: "0.375rem"
                            }}>
                              Tipo
                            </label>
                            <select
                              className={styles.formInput}
                              value={newItemData.item_type}
                              onChange={(e) => setNewItemData({ ...newItemData, item_type: e.target.value })}
                              style={{
                                background: "rgba(30, 41, 59, 0.6)",
                                border: "1px solid rgba(34, 197, 94, 0.3)"
                              }}
                            >
                              <option value="service">Servicio</option>
                              <option value="product">Producto</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ 
                              display: "block", 
                              fontSize: "0.75rem", 
                              fontWeight: 600,
                              color: "rgba(255, 255, 255, 0.7)",
                              marginBottom: "0.375rem"
                            }}>
                              Nombre <span style={{ color: "#22c55e" }}>*</span>
                            </label>
                            <input
                              type="text"
                              className={styles.formInput}
                              value={newItemData.name}
                              onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                              placeholder="Ej: Corte de cabello..."
                              required
                              style={{
                                background: "rgba(30, 41, 59, 0.6)",
                                border: newItemData.name ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid rgba(34, 197, 94, 0.3)"
                              }}
                            />
                          </div>
                        </div>

                        {/* Precio y Tax */}
                        <div style={{ 
                          display: "grid", 
                          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
                          gap: "0.75rem" 
                        }}>
                          <div>
                            <label style={{ 
                              display: "block", 
                              fontSize: "0.75rem", 
                              fontWeight: 600,
                              color: "rgba(255, 255, 255, 0.7)",
                              marginBottom: "0.375rem"
                            }}>
                              Precio Unitario
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className={styles.formInput}
                              value={newItemData.unit_price || ""}
                              onChange={(e) => setNewItemData({ ...newItemData, unit_price: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              style={{
                                background: "rgba(30, 41, 59, 0.6)",
                                border: "1px solid rgba(34, 197, 94, 0.3)"
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ 
                              display: "block", 
                              fontSize: "0.75rem", 
                              fontWeight: 600,
                              color: "rgba(255, 255, 255, 0.7)",
                              marginBottom: "0.375rem"
                            }}>
                              Impuesto (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className={styles.formInput}
                              value={newItemData.tax_rate === 0 ? "0" : (newItemData.tax_rate || "")}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNewItemData({ 
                                  ...newItemData, 
                                  tax_rate: value === "" ? 0 : parseFloat(value) 
                                });
                              }}
                              placeholder="0.00"
                              style={{
                                background: "rgba(30, 41, 59, 0.6)",
                                border: "1px solid rgba(34, 197, 94, 0.3)"
                              }}
                            />
                          </div>
                        </div>

                        {/* Descripción */}
                        <div>
                          <label style={{ 
                            display: "block", 
                            fontSize: "0.75rem", 
                            fontWeight: 600,
                            color: "rgba(255, 255, 255, 0.7)",
                            marginBottom: "0.375rem"
                          }}>
                            Descripción (opcional)
                          </label>
                          <textarea
                            className={styles.formTextarea}
                            value={newItemData.description}
                            onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                            placeholder="Detalles adicionales..."
                            rows={2}
                            style={{
                              background: "rgba(30, 41, 59, 0.6)",
                              border: "1px solid rgba(34, 197, 94, 0.3)",
                              resize: "vertical",
                              minHeight: "60px",
                              maxHeight: "100px"
                            }}
                          />
                        </div>

                        {/* Botones */}
                        <div style={{ 
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: "0.75rem", 
                          paddingTop: "0.5rem"
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowItemForm(null);
                              setNewItemData({
                                item_type: "service",
                                name: "",
                                description: "",
                                unit_price: 0,
                                tax_rate: 0,
                              });
                            }}
                            style={{
                              padding: "0.625rem 1rem",
                              borderRadius: "8px",
                              border: "1px solid rgba(148, 163, 184, 0.3)",
                              background: "rgba(30, 41, 59, 0.5)",
                              color: "rgba(255, 255, 255, 0.85)",
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              whiteSpace: "nowrap"
                            }}
                            disabled={isCreatingItem}
                            onMouseEnter={(e) => {
                              if (!isCreatingItem) {
                                e.currentTarget.style.background = "rgba(30, 41, 59, 0.8)";
                                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.5)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(30, 41, 59, 0.5)";
                              e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateItem(index)}
                            style={{
                              padding: "0.625rem 1rem",
                              borderRadius: "8px",
                              border: "1px solid rgba(34, 197, 94, 0.5)",
                              background: isCreatingItem || !newItemData.name 
                                ? "rgba(34, 197, 94, 0.3)" 
                                : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                              color: "#ffffff",
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              cursor: isCreatingItem || !newItemData.name ? "not-allowed" : "pointer",
                              transition: "all 0.2s ease",
                              boxShadow: isCreatingItem || !newItemData.name ? "none" : "0 4px 12px rgba(34, 197, 94, 0.25)",
                              opacity: isCreatingItem || !newItemData.name ? 0.6 : 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                            disabled={isCreatingItem || !newItemData.name}
                            onMouseEnter={(e) => {
                              if (!isCreatingItem && newItemData.name) {
                                e.currentTarget.style.transform = "translateY(-1px)";
                                e.currentTarget.style.boxShadow = "0 6px 20px rgba(34, 197, 94, 0.35)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.25)";
                            }}
                          >
                            {isCreatingItem ? (
                              <>
                                <span style={{ 
                                  display: "inline-block", 
                                  marginRight: "0.5rem" 
                                }}>⟳</span>
                                Creando...
                              </>
                            ) : (
                              <>✓ Crear</>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        className={styles.formTextarea}
                        value={item.description || ""}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        placeholder="Detalles adicionales"
                        rows={1}
                        style={{
                          minHeight: "40px",
                          maxHeight: "80px",
                          resize: "vertical"
                        }}
                      />
                    )}

                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", 
                      gap: "0.75rem", 
                      alignItems: "end" 
                    }}>
                      <div>
                        <label style={{ 
                          display: "block", 
                          fontSize: "0.7rem", 
                          color: "rgba(255, 255, 255, 0.5)",
                          marginBottom: "0.25rem"
                        }}>Precio</label>
                        <input
                          type="number"
                          step="0.01"
                          className={styles.formInput}
                          value={item.unit_price || ""}
                          onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          disabled={!!item.item_id}
                          style={{ 
                            background: item.item_id ? "rgba(255,255,255,0.02)" : undefined,
                            cursor: item.item_id ? "not-allowed" : undefined,
                            opacity: item.item_id ? 0.6 : 1
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ 
                          display: "block", 
                          fontSize: "0.7rem", 
                          color: "rgba(255, 255, 255, 0.5)",
                          marginBottom: "0.25rem"
                        }}>Cantidad</label>
                        <input
                          type="number"
                          step="1"
                          className={styles.formInput}
                          value={item.quantity || ""}
                          onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label style={{ 
                          display: "block", 
                          fontSize: "0.7rem", 
                          color: "rgba(255, 255, 255, 0.5)",
                          marginBottom: "0.25rem"
                        }}>Total</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={`$${(item.quantity * item.unit_price).toFixed(2)}`}
                          disabled
                          style={{ textAlign: "right", background: "rgba(255,255,255,0.02)" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        style={{
                          padding: "0.5rem",
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {formData.line_items.length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
                  No hay artículos todavía. Haz clic en "+ Artículo" para agregar uno.
                </div>
              )}
            </div>

            {/* Totals Section */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "2rem" }}>
              <div style={{ minWidth: "300px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>Impuesto</span>
                  <span style={{ fontWeight: 600 }}>${calculateTax().toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", fontSize: "1.125rem" }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 700 }}>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Document Details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontSize: "0.875rem" }}>
                  Número {!isEditMode && <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>(auto)</span>}
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={displayDocumentNumber || ""}
                  readOnly
                  style={{ 
                    background: "rgba(255,255,255,0.02)",
                    cursor: "not-allowed",
                    opacity: 0.7
                  }}
                  placeholder={docType === "invoice" ? "INV-0001" : "EST-0001"}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontSize: "0.875rem" }}>Fecha</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                />
              </div>
            </div>

            {/* Due Date (para facturas y estimados) */}
            <div style={{ marginBottom: "2rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontSize: "0.875rem" }}>
                  Fecha de Vencimiento {formData.due_date && <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>(opcional)</span>}
                </label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  min={formData.issue_date}
                />
              </div>
            </div>

            {/* Notes Section */}
            <div className={styles.formGroup} style={{ marginBottom: "2rem" }}>
              <label className={styles.formLabel} style={{ fontSize: "0.875rem" }}>Notas</label>
              <textarea
                className={styles.formTextarea}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Términos de pago, información adicional, etc."
              />
            </div>

            {/* Template Selection Section - Solo al crear */}
            {!isEditMode && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel} style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
                  PLANTILLA
                </label>
                
                {/* Template Tabs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {/* Minimal Template */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("minimal")}
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      background: selectedTemplate === "minimal" 
                        ? "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)" 
                        : "rgba(255,255,255,0.05)",
                      border: selectedTemplate === "minimal" 
                        ? "2px solid #22c55e" 
                        : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fff", marginBottom: "0.25rem" }}>
                      Minimalista
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                      Diseño simple con tonos claros
                    </div>
                  </button>

                  {/* Professional Template */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate("professional")}
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      background: selectedTemplate === "professional" 
                        ? "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)" 
                        : "rgba(255,255,255,0.05)",
                      border: selectedTemplate === "professional" 
                        ? "2px solid #22c55e" 
                        : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fff", marginBottom: "0.25rem" }}>
                      Profesional
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                      Diseño corporativo con tonos oscuros
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
              Cancelar
            </button>
            <button 
              type="button" 
              onClick={() => {
                if (!formData.client_id) {
                  showToast("Selecciona un cliente para ver la vista previa", "warning");
                  return;
                }
                if (formData.line_items.length === 0) {
                  showToast("Agrega al menos un artículo para ver la vista previa", "warning");
                  return;
                }
                setShowPreview(true);
              }}
              className={styles.btnSecondary}
              disabled={isSubmitting || formData.line_items.length === 0 || !formData.client_id}
              style={{
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)",
                border: "1px solid rgba(59, 130, 246, 0.5)",
                color: "#60a5fa"
              }}
            >
              Vista Previa
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting || formData.line_items.length === 0}>
              {isSubmitting 
                ? (isEditMode ? "Actualizando..." : "Creando...") 
                : `${isEditMode ? "Actualizar" : "Crear"} ${docType === "invoice" ? "Factura" : "Estimado"}`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
