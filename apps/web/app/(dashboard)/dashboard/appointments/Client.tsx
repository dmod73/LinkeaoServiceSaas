"use client";

import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import type {
  Appointment,
  AppointmentAvailability,
  AppointmentTimeOff,
  AppointmentService,
  AppointmentClient
} from "@/lib/features/appointments/types";
import type { AppointmentDashboardData } from "@/lib/features/appointments/dashboard";
import styles from "./appointments.module.css";

// SVG Icon Components
const OverviewIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 11h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zM4 21h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1zm10 0h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
  </svg>
);

const AppointmentsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
  </svg>
);

const ClientsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const ServicesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

const ReportsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
  </svg>
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Props = {
  initialData: AppointmentDashboardData;
  tenantId: string;
};

type Tab = "overview" | "calendar" | "appointments" | "clients" | "services" | "settings" | "reports";
type ModalType = "create-appointment" | "edit-appointment" | "config-hours" | "config-breaks" | "create-service" | null;

type ToastType = "success" | "error" | "info" | "warning";

export function AppointmentsDashboardClient({ initialData, tenantId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<"day" | "month">("month");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Initialize report filters with today and 2 days from now
  const getDefaultReportFilters = () => {
    const today = new Date();
    const twoDaysLater = new Date();
    twoDaysLater.setDate(today.getDate() + 2);
    
    return {
      dateFrom: today.toISOString().split('T')[0],
      dateTo: twoDaysLater.toISOString().split('T')[0]
    };
  };
  
  const [reportFilters, setReportFilters] = useState(getDefaultReportFilters());
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: "",
    type: "success"
  });

  const { data, mutate } = useSWR<AppointmentDashboardData>("/api/appointments/dashboard", fetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false
  });

  // Cerrar dropdown al hacer click fuera - SIMPLIFICADO
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };

    // Pequeño delay para evitar cierre inmediato
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  if (!data?.enabled) {
    return null;
  }

  const upcoming = data.upcoming ?? [];
  const availability = data.availability ?? [];
  const timeOff = data.timeOff ?? [];
  const summary = data.summary;

  // AUTO-FIX DISABLED: Migration was needed once, but now it runs every refresh causing issues
  // If you need to re-enable migration, uncomment this useEffect
  /*
  React.useEffect(() => {
    const migrateWeekdays = async () => {
      const needsMigration = availability.some((a: any) => 
        a.weekday > 0 && !availability.find((x: any) => x.weekday === 0)
      );

      if (needsMigration && availability.length > 0) {
        console.log('🔄 Migrating weekday system from JS (0=Sunday) to standard (0=Monday)...');
        
        const migratedHours = availability.map((a: any) => ({
          weekday: a.weekday === 0 ? 6 : a.weekday - 1,
          start: a.start,
          end: a.end
        }));

        try {
          const response = await fetch("/api/appointments/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantId: tenantId,
              businessHours: migratedHours
            })
          });

          if (response.ok) {
            console.log('✅ Weekday migration completed successfully');
            mutate();
          } else {
            console.error('❌ Migration failed:', await response.text());
          }
        } catch (error) {
          console.error('❌ Migration error:', error);
        }
      }
    };

    const migrateBreaks = async () => {
      try {
        const settingsRes = await fetch(`/api/appointments/settings?tenantId=${tenantId}`);
        if (!settingsRes.ok) return;
        
        const settingsData = await settingsRes.json();
        const breaks = settingsData.breaks || [];
        
        const needsBreaksMigration = breaks.some((b: any) => 
          b.weekday > 0 && !breaks.find((x: any) => x.weekday === 0)
        );

        if (needsBreaksMigration && breaks.length > 0) {
          console.log('🔄 Migrating breaks weekday system...');
          
          const migratedBreaks = breaks.map((b: any) => ({
            weekday: b.weekday === 0 ? 6 : b.weekday - 1,
            start: b.start,
            end: b.end
          }));

          const response = await fetch("/api/appointments/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantId: tenantId,
              breaks: migratedBreaks
            })
          });

          if (response.ok) {
            console.log('✅ Breaks migration completed successfully');
          } else {
            console.error('❌ Breaks migration failed:', await response.text());
          }
        }
      } catch (error) {
        console.error('❌ Breaks migration error:', error);
      }
    };

    if (availability.length > 0) {
      migrateWeekdays();
      migrateBreaks();
    }
  }, []);
  */

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/appointments?tenant=${encodeURIComponent(tenantId)}`
    : "";

  // 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
  const weekdayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const openPublicView = () => {
    window.open(publicUrl, "_blank");
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    showToast("✅ URL copiada al portapapeles", "success");
  };

  // Tabs configuration
  const tabs = [
    { id: "overview" as Tab, label: "Resumen", icon: <OverviewIcon /> },
    { id: "calendar" as Tab, label: "Calendario", icon: <CalendarIcon /> },
    { id: "appointments" as Tab, label: "Citas", icon: <AppointmentsIcon /> },
    { id: "clients" as Tab, label: "Clientes", icon: <ClientsIcon /> },
    { id: "services" as Tab, label: "Servicios", icon: <ServicesIcon /> },
    { id: "settings" as Tab, label: "Configuracion", icon: <SettingsIcon /> },
    { id: "reports" as Tab, label: "Reportes", icon: <ReportsIcon /> }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    setDropdownOpen(false);
  };

  const handleStatusClick = (status: string) => {
    setStatusFilter(status);
    setActiveTab("appointments");
  };

  return (
    <div 
      className={styles.dashboard}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Elegante y Profesional - REDISEÑO COMPLETO */}
      <header style={{
        background: '#0f172a',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        {/* Contenedor principal con padding elegante */}
        <div style={{ padding: '1.25rem 1rem' }}>
          
          {/* Título elegante sin fondo blanco - más minimalista */}
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
                background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                letterSpacing: '-0.025em'
              }}>Panel de Citas</h1>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(148, 163, 184, 0.8)',
                margin: '0.25rem 0 0 0'
              }}>Gestiona tus reservas</p>
            </div>
            
            {/* Botón Vista Pública - más discreto y elegante */}
            <button 
              onClick={openPublicView}
              style={{
                padding: '0.625rem 1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className={styles.desktopOnly}>Vista Pública</span>
            </button>
          </div>

          {/* Navegación responsive - 7 opciones en grid */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.5rem',
              padding: '0.5rem 0'
            }}>
              {/* Fila 1: 4 botones */}
              {/* Tab Resumen */}
              <button
                onClick={() => handleTabChange("overview")}
                style={{
                  padding: '0.625rem 0.5rem',
                  background: activeTab === "overview" 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === "overview" ? 'white' : 'rgba(148, 163, 184, 0.9)',
                  border: activeTab === "overview" 
                    ? '1px solid rgba(59, 130, 246, 0.3)'
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
                  boxShadow: activeTab === "overview" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <OverviewIcon />
                </span>
                <span style={{ fontSize: '0.7rem' }}>Resumen</span>
              </button>
              
              {/* Tab Calendario */}
              <button
                onClick={() => handleTabChange("calendar")}
                style={{
                  padding: '0.625rem 0.5rem',
                  background: activeTab === "calendar" 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === "calendar" ? 'white' : 'rgba(148, 163, 184, 0.9)',
                  border: activeTab === "calendar" 
                    ? '1px solid rgba(59, 130, 246, 0.3)'
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
                  boxShadow: activeTab === "calendar" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarIcon />
                </span>
                <span style={{ fontSize: '0.7rem' }}>Calendario</span>
              </button>
              
              {/* Tab Citas */}
              <button
                onClick={() => handleTabChange("appointments")}
                style={{
                  padding: '0.625rem 0.5rem',
                  background: activeTab === "appointments" 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === "appointments" ? 'white' : 'rgba(148, 163, 184, 0.9)',
                  border: activeTab === "appointments" 
                    ? '1px solid rgba(59, 130, 246, 0.3)'
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
                  boxShadow: activeTab === "appointments" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AppointmentsIcon />
                </span>
                <span style={{ fontSize: '0.7rem' }}>Citas</span>
              </button>
              
              {/* Tab Clientes */}
              <button
                onClick={() => handleTabChange("clients")}
                style={{
                  padding: '0.625rem 0.5rem',
                  background: activeTab === "clients" 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === "clients" ? 'white' : 'rgba(148, 163, 184, 0.9)',
                  border: activeTab === "clients" 
                    ? '1px solid rgba(59, 130, 246, 0.3)'
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
                  boxShadow: activeTab === "clients" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClientsIcon />
                </span>
                <span style={{ fontSize: '0.7rem' }}>Clientes</span>
              </button>

              {/* Fila 2: 3 botones centrados */}
              <button
                onClick={() => handleTabChange("services")}
                style={{
                  padding: '0.625rem 0.5rem',
                  background: activeTab === "services" 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === "services" ? 'white' : 'rgba(148, 163, 184, 0.9)',
                  border: activeTab === "services" 
                    ? '1px solid rgba(59, 130, 246, 0.3)'
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
                  boxShadow: activeTab === "services" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                  gridColumn: '1 / 2'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ServicesIcon />
                </span>
                <span style={{ fontSize: '0.7rem' }}>Servicios</span>
              </button>

              <button
                onClick={() => handleTabChange("settings")}
                style={{
                  padding: '0.625rem 0.5rem',
                  background: activeTab === "settings" 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === "settings" ? 'white' : 'rgba(148, 163, 184, 0.9)',
                  border: activeTab === "settings" 
                    ? '1px solid rgba(59, 130, 246, 0.3)'
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
                  boxShadow: activeTab === "settings" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                  gridColumn: '2 / 3'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SettingsIcon />
                </span>
                <span style={{ fontSize: '0.7rem' }}>Config.</span>
              </button>

              <button
                onClick={() => handleTabChange("reports")}
                style={{
                  padding: '0.625rem 0.5rem',
                  background: activeTab === "reports" 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === "reports" ? 'white' : 'rgba(148, 163, 184, 0.9)',
                  border: activeTab === "reports" 
                    ? '1px solid rgba(59, 130, 246, 0.3)'
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
                  boxShadow: activeTab === "reports" ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                  gridColumn: '3 / 4'
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ReportsIcon />
                </span>
                <span style={{ fontSize: '0.7rem' }}>Reportes</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido por Tab */}
      <div 
        className={styles.tabContent}
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {activeTab === "overview" && (
          <OverviewTab
            summary={summary}
            upcoming={upcoming}
            publicUrl={publicUrl}
            copyPublicUrl={copyPublicUrl}
            onCreateAppointment={() => setModalOpen("create-appointment")}
            showToast={showToast}
            onStatusClick={handleStatusClick}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarTab
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            calendarView={calendarView}
            setCalendarView={setCalendarView}
            upcoming={upcoming}
            mutate={mutate}
            showToast={showToast}
          />
        )}

        {activeTab === "appointments" && (
          <AppointmentsTab
            upcoming={upcoming}
            onCreateAppointment={() => setModalOpen("create-appointment")}
            mutate={mutate}
            showToast={showToast}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}

        {activeTab === "clients" && (
          <ClientsTab tenantId={tenantId} showToast={showToast} />
        )}

        {activeTab === "services" && (
          <ServicesTab
            tenantId={tenantId}
            onCreateService={() => setModalOpen("create-service")}
            showToast={showToast}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            availability={availability}
            timeOff={timeOff}
            weekdayNames={weekdayNames}
            onConfigHours={() => setModalOpen("config-hours")}
            onConfigBreaks={() => setModalOpen("config-breaks")}
            mutate={mutate}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            filters={reportFilters}
            setFilters={setReportFilters}
            tenantId={tenantId}
          />
        )}
      </div>

      {/* Modales */}
      {modalOpen === "create-appointment" && (
        <CreateAppointmentModal
          tenantId={tenantId}
          availability={availability}
          timeOff={timeOff}
          upcoming={upcoming}
          onClose={() => setModalOpen(null)}
          onSuccess={() => {
            mutate();
            setModalOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "config-hours" && (
        <ConfigHoursModal
          tenantId={tenantId}
          availability={availability}
          weekdayNames={weekdayNames}
          onClose={() => setModalOpen(null)}
          onSuccess={() => {
            mutate();
            setModalOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "config-breaks" && (
        <ConfigBreaksModal
          tenantId={tenantId}
          onClose={() => setModalOpen(null)}
          onSuccess={() => {
            mutate();
            setModalOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {modalOpen === "create-service" && (
        <CreateServiceModal
          tenantId={tenantId}
          onClose={() => setModalOpen(null)}
          onSuccess={() => {
            setModalOpen(null);
          }}
          showToast={showToast}
        />
      )}

      {/* Toast Notification */}
      {toast.show && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

// ===== COMPONENTE DE DIÁLOGO ELEGANTE =====

function ElegantConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  type = "danger" // "danger", "warning", "info"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}) {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      iconBg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      icon: '🗑️',
      iconColor: '#dc2626',
      confirmBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      confirmHover: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'
    },
    warning: {
      iconBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      icon: '⚠️',
      iconColor: '#f59e0b',
      confirmBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      confirmHover: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
    },
    info: {
      iconBg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      icon: 'ℹ️',
      iconColor: '#3b82f6',
      confirmBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      confirmHover: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
    }
  };

  const currentStyle = typeStyles[type];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: currentStyle.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            marginBottom: '1.5rem',
            boxShadow: `0 8px 16px ${currentStyle.iconColor}33`
          }}>
            {currentStyle.icon}
          </div>

          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: 'white',
            marginBottom: '0.75rem'
          }}>
            {title}
          </h3>

          <p style={{
            fontSize: '0.9375rem',
            color: 'rgba(203, 213, 225, 0.9)',
            lineHeight: '1.6',
            marginBottom: '2rem'
          }}>
            {message}
          </p>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            width: '100%'
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1,
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: currentStyle.confirmBg,
                color: 'white',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: `0 4px 12px ${currentStyle.iconColor}40`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = currentStyle.confirmHover;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 16px ${currentStyle.iconColor}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = currentStyle.confirmBg;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${currentStyle.iconColor}40`;
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== TABS =====

function OverviewTab({ summary, upcoming, publicUrl, copyPublicUrl, onCreateAppointment, showToast, onStatusClick }: any) {
  return (
    <div className={styles.overviewTab}>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div 
          className={`${styles.statCard} ${styles.statCard_pending}`}
          onClick={() => onStatusClick('pending')}
          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span>Pendientes</span>
          <strong>{summary.pending}</strong>
        </div>
        <div 
          className={`${styles.statCard} ${styles.statCard_confirmed}`}
          onClick={() => onStatusClick('confirmed')}
          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span>Confirmadas</span>
          <strong>{summary.confirmed}</strong>
        </div>
        <div 
          className={`${styles.statCard} ${styles.statCard_completed}`}
          onClick={() => onStatusClick('completed')}
          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span>Completadas</span>
          <strong>{summary.completed}</strong>
        </div>
        <div 
          className={`${styles.statCard} ${styles.statCard_cancelled}`}
          onClick={() => onStatusClick('cancelled')}
          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span>Canceladas</span>
          <strong>{summary.cancelled}</strong>
        </div>
        <div 
          className={`${styles.statCard} ${styles.statCard_rejected}`}
          onClick={() => onStatusClick('rejected')}
          style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span>Rechazadas</span>
          <strong>{summary.rejected}</strong>
        </div>
      </div>

      {/* Quick Actions */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>Acciones Rápidas</h2>
        </div>
        <div className={styles.quickActions}>
          <button className={styles.actionCard} onClick={onCreateAppointment}>
            <span className={styles.actionIcon}></span>
            <span>Crear Cita</span>
          </button>
          <button className={styles.actionCard} onClick={copyPublicUrl}>
            <span className={styles.actionIcon}></span>
            <span>Copiar URL</span>
          </button>
          <button className={styles.actionCard} onClick={() => window.open(publicUrl, "_blank")}>
            <span className={styles.actionIcon}></span>
            <span>Ver Público</span>
          </button>
        </div>
      </section>

      {/* Próximas Citas */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>Próximas Citas</h2>
          <span className={styles.badge}>{upcoming.length} total</span>
        </div>
        {upcoming.length === 0 ? (
          <div className={styles.emptyState}>
            <p> No hay citas programadas</p>
          </div>
        ) : (
          <div className={styles.appointmentsList}>
            {upcoming.slice(0, 5).map((apt: Appointment) => (
              <AppointmentCard key={apt.id} appointment={apt} showToast={showToast} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CalendarTab({ selectedDate, setSelectedDate, calendarView, setCalendarView, upcoming, mutate, showToast }: any) {
  const [viewDate, setViewDate] = useState(new Date());
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);
  const [dayModalAppointments, setDayModalAppointments] = useState<Appointment[]>([]);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/appointments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointmentId, status: newStatus })
      });
      if (response.ok) {
        mutate();
        if (showToast) {
          showToast("✅ Estado actualizado correctamente", "success");
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      if (showToast) {
        showToast("❌ Error al actualizar el estado", "error");
      }
    }
  };

  const handleDayClick = (date: Date, appointments: Appointment[]) => {
    if (appointments.length > 0) {
      setDayModalDate(date);
      setDayModalAppointments(appointments);
      setDayModalOpen(true);
    }
  };

  return (
    <div className={styles.calendarTab}>
      <div className={styles.calendarControls}>
        <div className={styles.viewToggle}>
          <button
            className={calendarView === "day" ? styles.toggleActive : styles.toggleButton}
            onClick={() => setCalendarView("day")}
          >
            Día
          </button>
          <button
            className={calendarView === "month" ? styles.toggleActive : styles.toggleButton}
            onClick={() => setCalendarView("month")}
          >
            Mes
          </button>
        </div>
        <div className={styles.dateNav}>
          <button onClick={() => {
            const prev = new Date(viewDate);
            prev.setMonth(prev.getMonth() - 1);
            setViewDate(prev);
          }}></button>
          <span>{viewDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</span>
          <button onClick={() => {
            const next = new Date(viewDate);
            next.setMonth(next.getMonth() + 1);
            setViewDate(next);
          }}></button>
        </div>
      </div>

      {calendarView === "month" ? (
        <MonthCalendar viewDate={viewDate} appointments={upcoming} onDayClick={handleDayClick} />
      ) : (
        <DayCalendar selectedDate={selectedDate} appointments={upcoming} onStatusChange={handleStatusChange} mutate={mutate} showToast={showToast} />
      )}

      {/* Modal de citas del día */}
      {dayModalOpen && (
        <DayAppointmentsModal
          date={dayModalDate!}
          appointments={dayModalAppointments}
          onClose={() => setDayModalOpen(false)}
          onStatusChange={handleStatusChange}
          mutate={mutate}
        />
      )}
    </div>
  );
}

function AppointmentsTab({ upcoming, onCreateAppointment, mutate, showToast, statusFilter, setStatusFilter }: any) {
  const filteredAppointments = statusFilter 
    ? upcoming.filter((apt: Appointment) => apt.status === statusFilter)
    : upcoming;

  const statusLabels: Record<string, string> = {
    pending: 'Pendientes',
    confirmed: 'Confirmadas',
    completed: 'Completadas',
    cancelled: 'Canceladas',
    rejected: 'Rechazadas'
  };

  return (
    <div className={styles.appointmentsTab}>
      <div className={styles.sectionHeader}>
        <h2>
          {statusFilter ? `Citas ${statusLabels[statusFilter]} (${filteredAppointments.length})` : `Todas las Citas (${upcoming.length})`}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {statusFilter && (
            <button 
              className={styles.secondaryButton} 
              onClick={() => setStatusFilter(null)}
              style={{ fontSize: '0.875rem' }}
            >
              ✕ Quitar filtro
            </button>
          )}
          <button className={styles.primaryButton} onClick={onCreateAppointment}>
            ➕ Nueva Cita
          </button>
        </div>
      </div>
      {filteredAppointments.length === 0 ? (
        <div className={styles.emptyState}>
          <p>📋 {statusFilter ? `No hay citas ${statusLabels[statusFilter].toLowerCase()}` : 'No hay citas programadas'}</p>
          <button className={styles.primaryButton} onClick={onCreateAppointment}>
            Crear primera cita
          </button>
        </div>
      ) : (
        <div className={styles.appointmentsList}>
          {filteredAppointments.map((apt: Appointment) => (
            <AppointmentCard key={apt.id} appointment={apt} showActions mutate={mutate} showToast={showToast} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientsTab({ tenantId, showToast }: any) {
  const { data: clientsData, mutate } = useSWR(`/api/appointments/clients`, fetcher);
  const clients = clientsData?.clients ?? [];
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClient = async (clientId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/appointments/clients`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId })
      });

      if (response.ok) {
        mutate();
        showToast("✅ Cliente eliminado correctamente", "success");
        setConfirmingDelete(null);
      } else {
        const error = await response.json();
        showToast(`❌ ${error.error || "Error al eliminar cliente"}`, "error");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      showToast("❌ Error al eliminar cliente", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.clientsTab}>
      <div className={styles.sectionHeader}>
        <h2>Clientes Registrados</h2>
        <span className={styles.badge}>{clients.length} total</span>
      </div>
      {clients.length === 0 ? (
        <div className={styles.emptyState}>
          <p> No hay clientes registrados</p>
        </div>
      ) : (
        <div className={styles.clientsGrid}>
          {clients.map((client: AppointmentClient) => (
            <div key={client.id} className={styles.clientCard}>
              <div className={styles.clientAvatar}>{client.fullName.charAt(0).toUpperCase()}</div>
              <div className={styles.clientInfo}>
                <strong>{client.fullName}</strong>
                {client.email && <span>📧 {client.email}</span>}
                {client.phone && <span>📱 {client.phone}</span>}
              </div>
              
              {confirmingDelete === client.id ? (
                <div className={styles.inlineConfirmation}>
                  <div className={styles.confirmWarning}>
                    <span className={styles.warningIcon}>⚠️</span>
                    <div className={styles.warningText}>
                      <strong>¿Eliminar a {client.fullName}?</strong>
                      <p>Esta acción no se puede deshacer.</p>
                    </div>
                  </div>
                  <div className={styles.confirmButtons}>
                    <button
                      onClick={() => setConfirmingDelete(null)}
                      disabled={deleting}
                      className={styles.confirmCancelBtn}
                    >
                      No, mantener
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      disabled={deleting}
                      className={styles.confirmOkBtn}
                    >
                      {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={styles.deleteButton}
                  onClick={() => setConfirmingDelete(client.id)}
                  title="Eliminar cliente"
                  disabled={deleting}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicesTab({ tenantId, onCreateService, showToast }: any) {
  const { data: servicesData, mutate } = useSWR(`/api/appointments/services`, fetcher);
  const services = servicesData?.services ?? [];

  const handleToggleActive = async (serviceId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/appointments/services`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: serviceId, is_active: !currentActive })
      });
      if (response.ok) {
        mutate();
        if (showToast) {
          showToast("✅ Servicio actualizado", "success");
        }
      }
    } catch (error) {
      if (showToast) {
        showToast("❌ Error al actualizar servicio", "error");
      }
    }
  };

  return (
    <div className={styles.servicesTab}>
      <div className={styles.sectionHeader}>
        <h2>Servicios Disponibles</h2>
        <button className={styles.primaryButton} onClick={onCreateService}>
          ➕ Nuevo Servicio
        </button>
      </div>
      {services.length === 0 ? (
        <div className={styles.emptyState}>
          <p>� No hay servicios registrados</p>
          <button className={styles.primaryButton} onClick={onCreateService}>
            Crear primer servicio
          </button>
        </div>
      ) : (
        <div className={styles.servicesGrid}>
          {services.map((service: AppointmentService) => (
            <div key={service.id} className={styles.serviceCardLarge}>
              <div className={styles.serviceHeader}>
                <h3 style={{ color: '#000000' }}>{service.name}</h3>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={service.isActive !== false}
                    onChange={() => handleToggleActive(service.id, service.isActive !== false)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
              {service.description && (
                <p className={styles.serviceDescription}>{service.description}</p>
              )}
              <div className={styles.serviceDetails}>
                <span>⏱️ {service.durationMinutes} min</span>
                {service.price && <span>💰 ${service.price}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ availability, timeOff, weekdayNames, onConfigHours, onConfigBreaks, mutate }: any) {
  return (
    <div className={styles.settingsTab}>
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>Horarios de Atención</h2>
          <button className={styles.secondaryButton} onClick={onConfigHours}>
             Configurar
          </button>
        </div>
        {availability.length === 0 ? (
          <div className={styles.emptyState}>
            <p> No hay horarios configurados</p>
            <button className={styles.primaryButton} onClick={onConfigHours}>
              Configurar horarios
            </button>
          </div>
        ) : (
          <div className={styles.availabilityGrid}>
            {availability.map((avail: AppointmentAvailability) => (
              <div key={avail.id} className={styles.availabilityCard}>
                <div className={styles.weekdayLabel}>{weekdayNames[avail.weekday]}</div>
                <div className={styles.timeRange}>{avail.start} - {avail.end}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2>Horarios de Descanso</h2>
          <button className={styles.secondaryButton} onClick={onConfigBreaks}>
             Configurar
          </button>
        </div>
        <p className={styles.helpText}>
          Configura los horarios de descanso por día de la semana (ej: almuerzo de 1-2 PM)
        </p>
      </section>
    </div>
  );
}

function ReportsTab({ filters, setFilters, tenantId }: any) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  // Always fetch all appointments, filter only by date range
  const queryString = `/api/appointments/reports?status=all&from=${filters.dateFrom}&to=${filters.dateTo}`;
  const { data: reportData } = useSWR(queryString, fetcher, {
    revalidateOnFocus: true,
    revalidateOnMount: true
  });

  const handleStatClick = (status: string) => {
    if (selectedStatus === status) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(status);
    }
  };

  // Filter appointments based on clicked stat card
  const getFilteredAppointments = () => {
    if (!reportData?.appointments) return [];
    
    if (!selectedStatus) return [];
    
    if (selectedStatus === 'all') return reportData.appointments;
    
    return reportData.appointments.filter((apt: any) => apt.status === selectedStatus);
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className={styles.reportsTab}>
      <div className={styles.sectionHeader}>
        <h2>Reportes de Citas</h2>
      </div>

      <section className={styles.sectionCard}>
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            />
          </div>
        </div>
      </section>

      {reportData?.stats && (
        <section className={styles.sectionCard}>
          <h3>Estadísticas</h3>
          <div className={styles.statsGrid}>
            <div 
              className={`${styles.statCard} ${selectedStatus === 'all' ? styles.statCardActive : ''}`}
              onClick={() => handleStatClick('all')}
              style={{ cursor: 'pointer' }}
            >
              <span>TOTAL</span>
              <strong>{reportData.stats.total}</strong>
            </div>
            <div 
              className={`${styles.statCard} ${styles.statCard_pending} ${selectedStatus === 'pending' ? styles.statCardActive : ''}`}
              onClick={() => handleStatClick('pending')}
              style={{ cursor: 'pointer' }}
            >
              <span>PENDIENTES</span>
              <strong>{reportData.stats.pending}</strong>
            </div>
            <div 
              className={`${styles.statCard} ${styles.statCard_confirmed} ${selectedStatus === 'confirmed' ? styles.statCardActive : ''}`}
              onClick={() => handleStatClick('confirmed')}
              style={{ cursor: 'pointer' }}
            >
              <span>CONFIRMADAS</span>
              <strong>{reportData.stats.confirmed}</strong>
            </div>
            <div 
              className={`${styles.statCard} ${styles.statCard_completed} ${selectedStatus === 'completed' ? styles.statCardActive : ''}`}
              onClick={() => handleStatClick('completed')}
              style={{ cursor: 'pointer' }}
            >
              <span>COMPLETADAS</span>
              <strong>{reportData.stats.completed}</strong>
            </div>
            <div 
              className={`${styles.statCard} ${styles.statCard_rejected} ${selectedStatus === 'rejected' ? styles.statCardActive : ''}`}
              onClick={() => handleStatClick('rejected')}
              style={{ cursor: 'pointer' }}
            >
              <span>RECHAZADAS</span>
              <strong>{reportData.stats.rejected || 0}</strong>
            </div>
            <div 
              className={`${styles.statCard} ${styles.statCard_cancelled} ${selectedStatus === 'cancelled' ? styles.statCardActive : ''}`}
              onClick={() => handleStatClick('cancelled')}
              style={{ cursor: 'pointer' }}
            >
              <span>CANCELADAS</span>
              <strong>{reportData.stats.cancelled || 0}</strong>
            </div>
          </div>
        </section>
      )}

      {selectedStatus && filteredAppointments.length > 0 && (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3>
              {selectedStatus === 'all' && `Todas las citas (${filteredAppointments.length})`}
              {selectedStatus === 'pending' && `Citas Pendientes (${filteredAppointments.length})`}
              {selectedStatus === 'confirmed' && `Citas Confirmadas (${filteredAppointments.length})`}
              {selectedStatus === 'completed' && `Citas Completadas (${filteredAppointments.length})`}
              {selectedStatus === 'cancelled' && `Citas Canceladas (${filteredAppointments.length})`}
              {selectedStatus === 'rejected' && `Citas Rechazadas (${filteredAppointments.length})`}
            </h3>
            <button 
              className={styles.secondaryButton}
              onClick={() => setSelectedStatus(null)}
            >
              ✕ Cerrar
            </button>
          </div>
          <div className={styles.appointmentsList}>
            {filteredAppointments.map((appointment: any) => (
              <div key={appointment.id} className={styles.reportAppointmentCard}>
                <div className={styles.reportAppointmentDate}>
                  <div className={styles.reportDateDay}>
                    {new Date(appointment.scheduled_start).toLocaleDateString("es-ES", {
                      day: "2-digit"
                    })}
                  </div>
                  <div className={styles.reportDateMonth}>
                    {new Date(appointment.scheduled_start).toLocaleDateString("es-ES", {
                      month: "short"
                    }).toUpperCase()}
                  </div>
                  <div className={styles.reportDateTime}>
                    {new Date(appointment.scheduled_start).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
                <div className={styles.reportAppointmentInfo}>
                  <div className={styles.reportAppointmentClient}>
                    <strong>👤 {appointment.client?.full_name ?? "Sin nombre"}</strong>
                    {appointment.client?.email && (
                      <span className={styles.reportClientEmail}>📧 {appointment.client.email}</span>
                    )}
                    {appointment.client?.phone && (
                      <span className={styles.reportClientPhone}>📞 {appointment.client.phone}</span>
                    )}
                  </div>
                  <div className={styles.reportAppointmentService}>
                    <span className={styles.reportServiceLabel}>Servicio:</span>
                    <strong>{appointment.service?.name ?? "No especificado"}</strong>
                    {appointment.service?.duration_minutes && (
                      <span className={styles.reportServiceDuration}>
                        ⏱️ {appointment.service.duration_minutes} min
                      </span>
                    )}
                    {appointment.service?.price && (
                      <span className={styles.reportServicePrice}>
                        💰 ${appointment.service.price}
                      </span>
                    )}
                  </div>
                  {appointment.note && (
                    <div className={styles.reportAppointmentNote}>
                      <span className={styles.reportNoteLabel}>Nota:</span>
                      <p>{appointment.note}</p>
                    </div>
                  )}
                </div>
                <div className={styles.reportAppointmentStatus}>
                  <span className={`${styles.badge} ${styles[`badge_${appointment.status}`]}`}>
                    {appointment.status === "pending" && "⏳ Pendiente"}
                    {appointment.status === "confirmed" && "✅ Confirmada"}
                    {appointment.status === "completed" && "🎉 Completada"}
                    {appointment.status === "cancelled" && "❌ Cancelada"}
                    {appointment.status === "rejected" && "⛔ Rechazada"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedStatus && filteredAppointments.length === 0 && (
        <section className={styles.sectionCard}>
          <div className={styles.emptyState}>
            <p>No hay citas con este estado en el rango de fechas seleccionado</p>
            <button 
              className={styles.secondaryButton}
              onClick={() => setSelectedStatus(null)}
            >
              Volver a estadísticas
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ===== COMPONENTES =====

function AppointmentCard({ appointment, showActions, mutate, showToast }: any) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/appointments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointment.id, status: newStatus })
      });
      if (response.ok) {
        mutate?.();
        if (showToast) {
          showToast("✅ Estado actualizado correctamente", "success");
        }
      }
    } catch (error) {
      if (showToast) {
        showToast("❌ Error al actualizar el estado", "error");
      }
    }
  };

  const handleDeleteAppointment = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/appointments/appointments?id=${appointment.id}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        mutate?.();
        setShowDeleteDialog(false);
        if (showToast) {
          showToast("✅ Cita eliminada correctamente", "success");
        }
      } else {
        const error = await response.json();
        if (showToast) {
          showToast(`❌ ${error.error || 'Error al eliminar la cita'}`, "error");
        }
      }
    } catch (error) {
      if (showToast) {
        showToast("❌ Error al eliminar la cita", "error");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.appointmentCard}>
      <div className={styles.appointmentTime}>
        <div className={styles.appointmentDate}>
          {new Date(appointment.startsAt).toLocaleDateString("es-ES", {
            weekday: "short",
            day: "numeric",
            month: "short"
          })}
        </div>
        <div className={styles.appointmentHour}>
          {new Date(appointment.startsAt).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </div>
      </div>
      <div className={styles.appointmentInfo}>
        <div className={styles.appointmentClient}>
          <strong>{appointment.client?.fullName ?? "Sin nombre"}</strong>
          {appointment.client?.email && <span>{appointment.client.email}</span>}
        </div>
        <div className={styles.appointmentService}>
          {appointment.service?.name ?? "Servicio no especificado"}
        </div>
        {appointment.note && (
          <div className={styles.appointmentNote}>📝 {appointment.note}</div>
        )}
        {appointment.createdAt && (
          <div className={styles.appointmentCreated}>
            🗓️ Solicitada: {new Date(appointment.createdAt).toLocaleString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </div>
        )}
      </div>
      <div className={styles.appointmentActions}>
        <span className={`${styles.badge} ${styles[`badge_${appointment.status}`]}`}>
          {appointment.status === "pending" && " Pendiente"}
          {appointment.status === "confirmed" && " Confirmada"}
          {appointment.status === "completed" && " Completada"}
          {appointment.status === "cancelled" && " Cancelada"}
          {appointment.status === "rejected" && " Rechazada"}
        </span>
        {showActions && (
          <>
            <div className={styles.statusActions}>
              {appointment.status === "pending" && (
                <>
                  <button 
                    onClick={() => handleStatusChange("confirmed")} 
                    title="Confirmar"
                    style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '13px',
                      marginRight: '6px'
                    }}
                  >
                    ✓ Aceptar
                  </button>
                  <button 
                    onClick={() => handleStatusChange("rejected")} 
                    title="Rechazar"
                    style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '13px',
                      marginRight: '6px'
                    }}
                  >
                    ✗ Rechazar
                  </button>
                </>
              )}
              {(appointment.status === "pending" || appointment.status === "confirmed") && (
                <button 
                  onClick={() => handleStatusChange("cancelled")} 
                  title="Cancelar"
                  style={{
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    marginRight: '6px'
                  }}
                >
                  ⊘ Cancelar
                </button>
              )}
              {appointment.status === "confirmed" && (
                <button 
                  onClick={() => handleStatusChange("completed")} 
                  title="Completar"
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    marginRight: '6px'
                  }}
                >
                  ✓ Completar
                </button>
              )}
              <button 
                onClick={() => setShowDeleteDialog(true)} 
                title="Eliminar cita permanentemente"
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                🗑️ Eliminar
              </button>
            </div>

            {/* Diálogo de confirmación elegante */}
            <ElegantConfirmDialog
              isOpen={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              onConfirm={handleDeleteAppointment}
              title="¿Eliminar esta cita?"
              message="Esta acción no se puede deshacer. La cita será eliminada permanentemente del sistema."
              confirmText={deleting ? "Eliminando..." : "Sí, eliminar"}
              cancelText="No, mantener"
              type="danger"
            />
          </>
        )}
      </div>
    </div>
  );
}

function MonthCalendar({ viewDate, appointments, onDayClick }: any) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  // Calcular días del mes
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Días del mes anterior para llenar la primera semana
  const prevMonthDays = firstDayWeekday;
  const prevMonth = new Date(year, month, 0);
  const prevMonthLastDay = prevMonth.getDate();
  
  // Calcular total de celdas necesarias
  const totalCells = Math.ceil((prevMonthDays + daysInMonth) / 7) * 7;
  const nextMonthDays = totalCells - prevMonthDays - daysInMonth;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Generar array de días
  const days = [];
  
  // Días del mes anterior
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    days.push({ date, isCurrentMonth: false });
  }
  
  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({ date, isCurrentMonth: true });
  }
  
  // Días del siguiente mes
  for (let day = 1; day <= nextMonthDays; day++) {
    const date = new Date(year, month + 1, day);
    days.push({ date, isCurrentMonth: false });
  }
  
  // Contar citas por día
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt: Appointment) => {
      const aptDate = new Date(apt.startsAt);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === date.getTime();
    });
  };
  
  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div className={styles.monthCalendar}>
      <div className={styles.calendarHeader}>
        {weekdays.map((day) => (
          <div key={day} className={styles.calendarHeaderDay}>
            {day}
          </div>
        ))}
      </div>
      <div className={styles.monthCalendarGrid}>
        {days.map((dayData, index) => {
          const { date, isCurrentMonth } = dayData;
          const isToday = date.getTime() === today.getTime();
          const dayAppointments = getAppointmentsForDate(date);
          const hasAppointments = dayAppointments.length > 0;
          
          return (
            <div
              key={index}
              className={`${styles.calendarDay} ${!isCurrentMonth ? styles.calendarDayOtherMonth : ''} ${isToday ? styles.calendarDayToday : ''} ${hasAppointments ? styles.calendarDayHasAppointments : ''}`}
              onClick={() => {
                if (isCurrentMonth) {
                  onDayClick(date, dayAppointments);
                }
              }}
            >
              <div className={styles.calendarDayNumber}>
                {date.getDate()}
              </div>
              {hasAppointments && (
                <div className={styles.calendarDayCount}>
                  {dayAppointments.length} {dayAppointments.length === 1 ? 'cita' : 'citas'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayCalendar({ selectedDate, appointments, onStatusChange, mutate, showToast }: any) {
  const dayAppointments = appointments.filter((apt: Appointment) => {
    const aptDate = new Date(apt.startsAt);
    return aptDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <div className={styles.dayCalendar}>
      <h3 className={styles.dayCalendarTitle}>
        <span style={{ color: '#000000' }}>Hoy</span>
      </h3>
      {dayAppointments.length === 0 ? (
        <div className={styles.emptyState}>
          <p> No hay citas este día</p>
        </div>
      ) : (
        <div className={styles.appointmentsList}>
          {dayAppointments.map((apt: Appointment) => (
            <AppointmentCard key={apt.id} appointment={apt} showActions mutate={mutate} showToast={showToast} />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== MODALES =====

function CreateAppointmentModal({ tenantId, availability, timeOff, upcoming, onClose, onSuccess, showToast }: any) {
  const [step, setStep] = useState<"client" | "service" | "datetime">("client");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ fullName: "", email: "", phone: "" });
  const [useExisting, setUseExisting] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [note, setNote] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<Date[]>([]);

  const { data: clientsData } = useSWR(`/api/appointments/clients`, fetcher);
  const { data: servicesData } = useSWR(`/api/appointments/services`, fetcher);
  const { data: settingsData } = useSWR(`/api/appointments/settings?tenantId=${tenantId}`, fetcher);
  const clients = clientsData?.clients ?? [];
  const services = servicesData?.services ?? [];
  const breaks = settingsData?.breaks ?? [];

  const weekdayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Generar próximos 14 días disponibles cuando llegamos al paso datetime
  useEffect(() => {
    if (step === "datetime") {
      generateAvailableDays();
    }
  }, [step, availability, timeOff]);

  // Calcular slots disponibles cuando se selecciona fecha
  useEffect(() => {
    if (selectedDate && selectedService) {
      calculateAvailableSlots();
    }
  }, [selectedDate, selectedService]);

  const generateAvailableDays = () => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(today);
    let daysAdded = 0;
    const maxDaysToCheck = 60; // Revisar hasta 60 días adelante
    const maxDaysToShow = 14; // Mostrar máximo 14 días disponibles

    while (daysAdded < maxDaysToShow && maxDaysToCheck > 0) {
      // Convertir el día de JS (0=Domingo) al formato de availability (0=Lunes, 6=Domingo)
      const jsDay = currentDate.getDay();
      const weekday = jsDay === 0 ? 6 : jsDay - 1;
      
      // Verificar si hay disponibilidad para este día de la semana
      const dayAvailability = availability.find((a: AppointmentAvailability) => a.weekday === weekday);
      
      // Verificar si no es día libre
      const isTimeOff = timeOff.some((t: AppointmentTimeOff) => {
        const offStart = new Date(t.startsAt);
        const offEnd = new Date(t.endsAt);
        offStart.setHours(0, 0, 0, 0);
        offEnd.setHours(23, 59, 59, 999);
        return currentDate >= offStart && currentDate <= offEnd;
      });

      if (dayAvailability && !isTimeOff) {
        days.push(new Date(currentDate));
        daysAdded++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    setAvailableDays(days);
  };

  const calculateAvailableSlots = () => {
    if (!selectedDate || !selectedService) {
      setAvailableSlots([]);
      return;
    }

    const selectedServiceData = services.find((s: AppointmentService) => s.id === selectedService);
    if (!selectedServiceData) {
      setAvailableSlots([]);
      return;
    }

    // Convertir el día de JS (0=Domingo) al formato de availability (0=Lunes, 6=Domingo)
    const jsDay = selectedDate.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;
    
    // Buscar disponibilidad para ese día de la semana
    const dayAvailability = availability.find((a: AppointmentAvailability) => a.weekday === weekday);
    
    if (!dayAvailability) {
      setAvailableSlots([]);
      return;
    }

    // Generar slots
    const slots: string[] = [];
    const [startHour, startMin] = dayAvailability.start.split(':').map(Number);
    const [endHour, endMin] = dayAvailability.end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const serviceDuration = selectedServiceData.durationMinutes;

    // Obtener citas ocupadas para ese día
    const busySlots = upcoming
      .filter((apt: Appointment) => {
        const aptDate = new Date(apt.startsAt);
        return aptDate.toDateString() === selectedDate.toDateString();
      })
      .map((apt: Appointment) => {
        const aptTime = new Date(apt.startsAt);
        const duration = apt.service?.durationMinutes || 30;
        return {
          start: aptTime.getHours() * 60 + aptTime.getMinutes(),
          end: aptTime.getHours() * 60 + aptTime.getMinutes() + duration
        };
      });

    // Obtener horas de descanso (breaks) para ese día de la semana
    const dayBreaks = breaks
      .filter((b: any) => b.weekday === weekday)
      .map((b: any) => {
        const [startHour, startMin] = b.start.split(':').map(Number);
        const [endHour, endMin] = b.end.split(':').map(Number);
        return {
          start: startHour * 60 + startMin,
          end: endHour * 60 + endMin
        };
      });

    for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += 30) {
      // Verificar si el slot está ocupado por una cita
      const slotEnd = minutes + serviceDuration;
      const isOccupied = busySlots.some((busy: any) => {
        return (minutes < busy.end && slotEnd > busy.start);
      });

      // Verificar si el slot cae en una hora de descanso
      const isDuringBreak = dayBreaks.some((breakTime: any) => {
        return (minutes < breakTime.end && slotEnd > breakTime.start);
      });

      if (!isOccupied && !isDuringBreak) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }

    setAvailableSlots(slots);
  };

  const handleCreateAppointment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      showToast("⚠️ Por favor completa todos los campos", "warning");
      return;
    }

    if (!useExisting && (!newClient.fullName || !newClient.email)) {
      showToast("⚠️ Nombre y email son requeridos para nuevo cliente", "warning");
      return;
    }

    // Formatear la fecha correctamente
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const startsAt = `${year}-${month}-${day}T${selectedTime}:00`;

    try {
      const response = await fetch("/api/appointments/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          clientId: useExisting ? selectedClient : null,
          newClient: useExisting ? null : newClient,
          serviceId: selectedService,
          startsAt,
          note: note
        })
      });

      if (response.ok) {
        showToast("✅ Cita creada correctamente", "success");
        onSuccess();
      } else {
        const error = await response.json();
        showToast(`❌ Error: ${error.error || "No se pudo crear la cita"}`, "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("❌ Error al crear la cita", "error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2> Nueva Cita</h2>
          <button className={styles.closeButton} onClick={onClose}></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.stepIndicator}>
            <span className={step === "client" ? styles.stepActive : ""}>1. Cliente</span>
            <span className={step === "service" ? styles.stepActive : ""}>2. Servicio</span>
            <span className={step === "datetime" ? styles.stepActive : ""}>3. Fecha/Hora</span>
          </div>

          {step === "client" && (
            <div className={styles.formSection}>
              <div className={styles.toggleGroup}>
                <button
                  className={useExisting ? styles.toggleActive : styles.toggleButton}
                  onClick={() => setUseExisting(true)}
                >
                  Cliente Existente
                </button>
                <button
                  className={!useExisting ? styles.toggleActive : styles.toggleButton}
                  onClick={() => setUseExisting(false)}
                >
                  Nuevo Cliente
                </button>
              </div>

              {useExisting ? (
                <div className={styles.clientList}>
                  {clients.map((client: AppointmentClient) => (
                    <div
                      key={client.id}
                      className={selectedClient === client.id ? styles.clientItemSelected : styles.clientItem}
                      onClick={() => setSelectedClient(client.id)}
                    >
                      <strong>{client.fullName}</strong>
                      <span>{client.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.formFields}>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={newClient.fullName}
                    onChange={(e) => setNewClient({...newClient, fullName: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  />
                </div>
              )}
            </div>
          )}

          {step === "service" && (
            <div className={styles.serviceGrid}>
              {services.map((service: AppointmentService) => (
                <div
                  key={service.id}
                  className={selectedService === service.id ? styles.serviceCardSelected : styles.serviceCard}
                  onClick={() => setSelectedService(service.id)}
                >
                  <strong>{service.name}</strong>
                  <span>{service.durationMinutes} min</span>
                  {service.price && <span>${service.price}</span>}
                </div>
              ))}
            </div>
          )}

          {step === "datetime" && (
            <div className={styles.formFields}>
              {/* Selector de días */}
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: 'rgba(203, 213, 225, 0.9)',
                marginBottom: '0.75rem',
                display: 'block'
              }}>
                Selecciona un día disponible
              </label>
              
              {availableDays.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  color: 'rgba(239, 68, 68, 0.9)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  ⚠️ No hay días disponibles en las próximas semanas
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  padding: '0.5rem'
                }}>
                  {availableDays.map((day) => {
                    const isSelected = selectedDate?.toDateString() === day.toDateString();
                    const dayOfWeek = weekdayNames[day.getDay()];
                    const dayNumber = day.getDate();
                    const month = day.toLocaleDateString('es-ES', { month: 'short' });
                    
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedDate(day);
                          setSelectedTime(""); // Reset time when changing date
                        }}
                        style={{
                          padding: '0.75rem 0.5rem',
                          borderRadius: '10px',
                          border: isSelected 
                            ? '2px solid #000' 
                            : '2px solid #000',
                          background: isSelected
                            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                            : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? 'white' : '#000',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          boxShadow: isSelected 
                            ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                            : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = '#000';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = '#000';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          opacity: 0.8
                        }}>
                          {dayOfWeek}
                        </span>
                        <span style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: '700',
                          lineHeight: 1
                        }}>
                          {dayNumber}
                        </span>
                        <span style={{ 
                          fontSize: '0.7rem',
                          opacity: 0.7,
                          textTransform: 'uppercase'
                        }}>
                          {month}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selector de horas */}
              {selectedDate && (
                <>
                  <label style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: 'rgba(203, 213, 225, 0.9)',
                    marginBottom: '0.75rem',
                    display: 'block'
                  }}>
                    Selecciona una hora disponible
                  </label>
                  
                  {availableSlots.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem',
                      color: 'rgba(239, 68, 68, 0.9)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '1.5rem'
                    }}>
                      ⚠️ No hay horarios disponibles para esta fecha
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '0.75rem',
                      marginBottom: '1.5rem',
                      maxHeight: '240px',
                      overflowY: 'auto',
                      padding: '0.5rem'
                    }}>
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          style={{
                            padding: '0.75rem 0.5rem',
                            borderRadius: '8px',
                            border: selectedTime === slot 
                              ? '2px solid #000' 
                              : '2px solid #000',
                            background: selectedTime === slot
                              ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: selectedTime === slot ? 'white' : '#000',
                            fontSize: '0.875rem',
                            fontWeight: selectedTime === slot ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: selectedTime === slot 
                              ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                              : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedTime !== slot) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.borderColor = '#000';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedTime !== slot) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = '#000';
                            }
                          }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Nota opcional */}
              <label style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: 'rgba(203, 213, 225, 0.9)',
                marginBottom: '0.5rem',
                display: 'block'
              }}>
                Nota (opcional)
              </label>
              <textarea
                placeholder="Agrega una nota para esta cita..."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #000',
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#000',
                  fontSize: '0.9375rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              ></textarea>
            </div>
          )}
        </div>
        <div className={styles.modalActions}>
          {step !== "client" && (
            <button className={styles.secondaryButton} onClick={() => {
              if (step === "service") setStep("client");
              if (step === "datetime") setStep("service");
            }}>
               Anterior
            </button>
          )}
          <button className={styles.primaryButton} onClick={() => {
            if (step === "client") {
              if (useExisting && !selectedClient) {
                showToast("⚠️ Selecciona un cliente", "warning");
                return;
              }
              if (!useExisting && !newClient.fullName) {
                showToast("⚠️ Ingresa el nombre del cliente", "warning");
                return;
              }
              setStep("service");
            } else if (step === "service") {
              if (!selectedService) {
                showToast("⚠️ Selecciona un servicio", "warning");
                return;
              }
              setStep("datetime");
            } else {
              handleCreateAppointment();
            }
          }}>
            {step === "datetime" ? "Crear Cita" : "Siguiente "}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigHoursModal({ tenantId, availability, weekdayNames, onClose, onSuccess, showToast }: any) {
  const [hours, setHours] = useState(
    weekdayNames.map((name: string, index: number) => {
      const existing = availability.find((a: AppointmentAvailability) => a.weekday === index);
      return {
        weekday: index,
        enabled: !!existing,
        start: existing?.start || "09:00",
        end: existing?.end || "18:00"
      };
    })
  );

  const handleSave = async () => {
    if (!tenantId || tenantId === "") {
      console.log("ConfigHoursModal - tenantId:", tenantId);
      showToast("❌ Error: No se pudo identificar el tenant", "error");
      return;
    }

    try {
      const response = await fetch("/api/appointments/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenantId,
          businessHours: hours.filter((h: any) => h.enabled).map((h: any) => ({
            weekday: h.weekday,
            start: h.start,
            end: h.end
          }))
        })
      });
      if (response.ok) {
        showToast("✅ Horarios guardados correctamente", "success");
        onSuccess();
      } else {
        const error = await response.json();
        showToast(`❌ Error: ${error.error || "No se pudieron guardar los horarios"}`, "error");
      }
    } catch (error) {
      console.error("Error saving hours:", error);
      showToast("❌ Error al guardar los horarios", "error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>⏰ Configurar Horarios</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {hours.map((hour: any, index: number) => (
            <div key={index} className={styles.hourRow}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={hour.enabled}
                  onChange={(e) => {
                    const newHours = [...hours];
                    newHours[index].enabled = e.target.checked;
                    setHours(newHours);
                  }}
                />
                <span>{weekdayNames[index]}</span>
              </label>
              {hour.enabled && (
                <div className={styles.timeInputs}>
                  <input
                    type="time"
                    value={hour.start}
                    onChange={(e) => {
                      const newHours = [...hours];
                      newHours[index].start = e.target.value;
                      setHours(newHours);
                    }}
                  />
                  <span>-</span>
                  <input
                    type="time"
                    value={hour.end}
                    onChange={(e) => {
                      const newHours = [...hours];
                      newHours[index].end = e.target.value;
                      setHours(newHours);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.modalActions}>
          <button className={styles.secondaryButton} onClick={onClose}>Cancelar</button>
          <button className={styles.primaryButton} onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function ConfigBreaksModal({ tenantId, onClose, onSuccess, showToast }: any) {
  const [breaks, setBreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar breaks existentes al abrir el modal
  useEffect(() => {
    const loadBreaks = async () => {
      try {
        const response = await fetch("/api/appointments/availability");
        if (response.ok) {
          const data = await response.json();
          if (data.breaks && data.breaks.length > 0) {
            setBreaks(data.breaks);
          } else {
            // Si no hay breaks, dejar array vacío
            setBreaks([]);
          }
        }
      } catch (error) {
        console.error("Error loading breaks:", error);
      } finally {
        setLoading(false);
      }
    };
    loadBreaks();
  }, []);

  const handleSave = async () => {
    if (!tenantId || tenantId === "") {
      console.log("ConfigBreaksModal - tenantId:", tenantId);
      showToast("❌ Error: No se pudo identificar el tenant", "error");
      return;
    }

    try {
      const response = await fetch("/api/appointments/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenantId,
          breaks: breaks.map((brk: any) => ({
            weekday: brk.weekday,
            start: brk.start,
            end: brk.end
          }))
        })
      });
      if (response.ok) {
        showToast("✅ Descansos guardados correctamente", "success");
        onSuccess();
      } else {
        const error = await response.json();
        showToast(`❌ Error: ${error.error || "No se pudieron guardar los descansos"}`, "error");
      }
    } catch (error) {
      console.error("Error saving breaks:", error);
      showToast("❌ Error al guardar los descansos", "error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2> Configurar Descansos</h2>
          <button className={styles.closeButton} onClick={onClose}></button>
        </div>
        <div className={styles.modalBody}>
          {loading ? (
            <p>Cargando...</p>
          ) : breaks.length === 0 ? (
            <p className={styles.emptyMessage}>No hay descansos configurados. Haz clic en "Agregar Descanso" para crear uno.</p>
          ) : (
            breaks.map((brk: any, index: number) => (
              <div key={index} className={styles.breakRow}>
                <select
                  value={brk.weekday}
                  onChange={(e) => {
                    const newBreaks = [...breaks];
                    newBreaks[index].weekday = Number(e.target.value);
                    setBreaks(newBreaks);
                  }}
                >
                  <option value="0">Lunes</option>
                  <option value="1">Martes</option>
                  <option value="2">Miércoles</option>
                  <option value="3">Jueves</option>
                  <option value="4">Viernes</option>
                  <option value="5">Sábado</option>
                  <option value="6">Domingo</option>
                </select>
                <input
                  type="time"
                  value={brk.start}
                  onChange={(e) => {
                    const newBreaks = [...breaks];
                    newBreaks[index].start = e.target.value;
                    setBreaks(newBreaks);
                  }}
                />
                <span>-</span>
                <input
                  type="time"
                  value={brk.end}
                  onChange={(e) => {
                    const newBreaks = [...breaks];
                    newBreaks[index].end = e.target.value;
                    setBreaks(newBreaks);
                  }}
                />
                <button onClick={() => setBreaks(breaks.filter((_, i) => i !== index))}>✕</button>
              </div>
            ))
          )}
          <button
            className={styles.secondaryButton}
            onClick={() => setBreaks([...breaks, { weekday: 0, start: "13:00", end: "14:00" }])}
          >
            ➕ Agregar Descanso
          </button>
        </div>
        <div className={styles.modalActions}>
          <button 
            className={styles.secondaryButton} 
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              fontWeight: '500'
            }}
          >
            Cancelar
          </button>
          <button 
            className={styles.primaryButton} 
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateServiceModal({ tenantId, onClose, onSuccess, showToast }: any) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    durationMinutes: 30,
    price: ""
  });

  const handleSubmit = async () => {
    if (!formData.name) {
      showToast("⚠️ El nombre del servicio es requerido", "warning");
      return;
    }

    if (!tenantId || tenantId === "") {
      console.log("CreateServiceModal - tenantId:", tenantId);
      showToast("❌ Error: No se pudo identificar el tenant", "error");
      return;
    }

    try {
      const response = await fetch("/api/appointments/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenantId,
          name: formData.name,
          description: formData.description,
          durationMinutes: formData.durationMinutes,
          price: formData.price ? parseFloat(formData.price) : null
        })
      });

      if (response.ok) {
        showToast("✅ Servicio creado correctamente", "success");
        onSuccess();
      } else {
        const error = await response.json();
        showToast(`❌ Error: ${error.error || "No se pudo crear el servicio"}`, "error");
      }
    } catch (error) {
      console.error("Error creating service:", error);
      showToast("❌ Error al crear el servicio", "error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>🛠️ Nuevo Servicio</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formFields}>
            <div className={styles.formGroup}>
              <label>Nombre del Servicio *</label>
              <input
                type="text"
                placeholder="Ej: Consulta general"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Descripción</label>
              <textarea
                placeholder="Descripción opcional del servicio"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Duración (minutos) *</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
                />
              </div>
                            <div className={styles.formGroup}>
                <label>Precio (opcional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
                    <button className={styles.secondaryButton} onClick={onClose}>Cancelar</button>
          <button className={styles.primaryButton} onClick={handleSubmit}>Crear Servicio</button>
        </div>
      </div>
    </div>
  );
}

function DayAppointmentsModal({ date, appointments, onClose, onStatusChange, mutate }: any) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setLoading(true);
    await onStatusChange(appointmentId, newStatus);
    mutate();
    setLoading(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return styles.badgePending;
      case 'confirmed': return styles.badgeConfirmed;
      case 'completed': return styles.badgeCompleted;
      case 'cancelled': return styles.badgeCancelled;
      default: return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getAvailableActions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return [
          { label: '✓ Confirmar', status: 'confirmed', class: styles.btnConfirm },
          { label: '✕ Cancelar', status: 'cancelled', class: styles.btnCancel }
        ];
      case 'confirmed':
        return [
          { label: '✓ Completar', status: 'completed', class: styles.btnComplete },
          { label: '✕ Cancelar', status: 'cancelled', class: styles.btnCancel }
        ];
      case 'completed':
        return [];
      case 'cancelled':
        return [
          { label: '↻ Reactivar', status: 'pending', class: styles.btnReactivate }
        ];
      default:
        return [];
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>📅 Citas del {date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {appointments.length === 0 ? (
            <p className={styles.emptyState}>No hay citas para este día</p>
          ) : (
            <div className={styles.appointmentsList}>
              {appointments.map((apt: Appointment) => (
                <div key={apt.id} className={styles.appointmentCard}>
                  <div className={styles.appointmentCardHeader}>
                    <div className={styles.appointmentTime}>
                      <span className={styles.timeIcon}>🕐</span>
                      <span>{formatTime(apt.startsAt)}</span>
                    </div>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(apt.status)}`}>
                      {getStatusText(apt.status)}
                    </span>
                  </div>
                  <div className={styles.appointmentCardBody}>
                    <div className={styles.appointmentInfo}>
                      <p><strong>Cliente:</strong> {apt.client?.fullName || 'Sin nombre'}</p>
                      {apt.client?.email && <p><strong>Email:</strong> {apt.client.email}</p>}
                      {apt.client?.phone && <p><strong>Teléfono:</strong> {apt.client.phone}</p>}
                      {apt.service?.name && <p><strong>Servicio:</strong> {apt.service.name}</p>}
                      {apt.note && <p><strong>Notas:</strong> {apt.note}</p>}
                    </div>
                    {getAvailableActions(apt.status).length > 0 && (
                      <div className={styles.appointmentActions}>
                        {getAvailableActions(apt.status).map((action) => (
                          <button
                            key={action.status}
                            className={`${styles.actionButton} ${action.class}`}
                            onClick={() => handleStatusChange(apt.id, action.status)}
                            disabled={loading}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
                <div className={styles.modalActions}>
          <button className={styles.secondaryButton} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}


// ===== TOAST NOTIFICATION =====
function Toast({ message, type }: { message: string; type: ToastType }) {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ"
  };

  return (
    <div className={`${styles.toast} ${styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}>
      <span className={styles.toastIcon}>{icons[type]}</span>
      <span className={styles.toastMessage}>{message}</span>
    </div>
  );
}
      
