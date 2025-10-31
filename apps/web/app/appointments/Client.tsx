// (kept original implementation for now; re-exports were causing duplicate exports)
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import type {
  InvoiceAvailability,
  InvoiceClient,
  InvoiceService,
  InvoiceTimeOff
} from "@/lib/features/appointments/types";
import { buildSlotsForDate, type BusyInterval, type BreakInterval, type SlotCandidate } from "@/lib/features/appointments/slots";
import { useToast } from "../components/ToastProvider";
import styles from "./appointments-public.module.css";

type ServicesResponse = { services: InvoiceService[] };
type AvailabilityResponse = { 
  availability: InvoiceAvailability[]; 
  timeOff: InvoiceTimeOff[];
  breaks?: { weekday: number; start: string; end: string }[];
};
type ScheduleResponse = { appointments: BusyInterval[] };
type ClientSelfResponse = { client?: Pick<InvoiceClient, "id" | "fullName" | "email" | "phone"> | null };

interface Client {
  fullName: string;
  email: string;
  phone: string;
}

type Props = {
  isAuthenticated: boolean;
  userEmail?: string | null;
  tenantId?: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(payload.error ?? "Request failed");
  }
  return response.json();
};

function weekdayIndex(date: Date) {
  const js = date.getDay();
  return js === 0 ? 6 : js - 1;
}

function formatShort(date: Date) {
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function InvoicePublicClient({ isAuthenticated, userEmail, tenantId }: Props) {
  const toast = useToast();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<SlotCandidate | null>(null);
  const [note, setNote] = useState("");
  const [clientDraft, setClientDraft] = useState<Client>({ fullName: "", email: userEmail || "", phone: "" });
  const [savingClient, setSavingClient] = useState(false);
  const [booking, setBooking] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // Página de días (0 = días 0-6, 1 = días 7-13)
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [showMyAppointments, setShowMyAppointments] = useState(false); // Modal de mis citas

  const selectedDateIso = useMemo(() => {
    const clone = new Date(selectedDate);
    clone.setHours(0, 0, 0, 0);
    return clone.toISOString().slice(0, 10);
  }, [selectedDate]);

  // ALWAYS use public endpoints for this view, even if user is authenticated
  const publicTenantParam = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : "";
  const servicesKey = `/api/appointments/public/services${publicTenantParam}`;
  const availabilityKey = `/api/appointments/public/availability${publicTenantParam}`;
  const scheduleKey = `/api/appointments/public/schedule?date=${selectedDateIso}${tenantId ? `&tenant=${encodeURIComponent(tenantId)}` : ""}`;
  const clientKey = `/api/appointments/public/clients${publicTenantParam}`;

  const { data: servicesData } = useSWR<ServicesResponse>(servicesKey, fetcher, { fallbackData: { services: [] } });
  const { data: availabilityData } = useSWR<AvailabilityResponse>(availabilityKey, fetcher, {
    fallbackData: { availability: [], timeOff: [], breaks: [] }
  });
  const { data: scheduleData, isValidating: loadingSchedule, mutate: mutateSchedule } = useSWR<ScheduleResponse>(
    scheduleKey,
    fetcher,
    { 
      fallbackData: { appointments: [] },
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000 // Dedupe requests within 5 seconds
    }
  );
  const { data: clientSelf, mutate: mutateClientSelf } = useSWR<ClientSelfResponse>(clientKey, fetcher);

  const services = servicesData?.services ?? [];
  const availability = availabilityData?.availability ?? [];
  const timeOff = availabilityData?.timeOff ?? [];
  const breaks = availabilityData?.breaks ?? [];
  const busySlots = scheduleData?.appointments ?? [];

  const selectedService = useMemo(() => {
    if (!services.length) return undefined;
    if (!selectedServiceId) return services[0];
    return services.find((service) => service.id === selectedServiceId) ?? services[0];
  }, [services, selectedServiceId]);

  const dayAvailability = useMemo(() => {
    const index = weekdayIndex(selectedDate);
    return availability.find((entry) => entry.weekday === index);
  }, [availability, selectedDate]);

  // Generar array de días disponibles (solo días con horario de atención)
  const availableDays = useMemo(() => {
    const days: Date[] = [];
    let offset = 0;
    
    // Generar hasta 14 días que tengan disponibilidad
    while (days.length < 14 && offset < 60) { // Max 60 días para evitar loop infinito
      const day = new Date(today);
      day.setDate(today.getDate() + offset);
      day.setHours(0, 0, 0, 0);
      
      // Verificar si este día tiene disponibilidad
      const weekdayIdx = weekdayIndex(day);
      const hasAvailability = availability.find((entry: any) => entry.weekday === weekdayIdx);
      
      if (hasAvailability) {
        days.push(day);
      }
      
      offset++;
    }
    
    return days;
  }, [today, availability]);

  // Días visibles en la página actual (7 días)
  const visibleDays = useMemo(() => {
    const startIndex = currentPage * 7;
    return availableDays.slice(startIndex, startIndex + 7);
  }, [availableDays, currentPage]);

  const canGoNext = currentPage < 1; // Máximo 2 páginas (0 y 1)
  const canGoPrev = currentPage > 0;

  const slots = useMemo(() => {
    if (!selectedService) return [];
    
    const result = buildSlotsForDate({
      date: selectedDate,
      availability: dayAvailability,
      breaks,
      timeOff,
      busy: busySlots,
      durationMinutes: selectedService.durationMinutes,
      stepMinutes: 30,
      blockPastSlots: true // Bloquear horarios pasados en vista pública
    });
    
    return result;
  }, [selectedDate, dayAvailability, breaks, timeOff, busySlots, selectedService]);

  useEffect(() => {
    if (services.length && !selectedServiceId) setSelectedServiceId(services[0].id);
  }, [services, selectedServiceId]);

  // NUEVO: Recuperar datos guardados después del login
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      const savedData = localStorage.getItem('pending_appointment');
      if (savedData) {
        try {
          const bookingData = JSON.parse(savedData);
          
          // Solo restaurar si es para el mismo tenant
          if (bookingData.tenantId === tenantId) {
            // Restaurar servicio
            if (bookingData.serviceId) {
              setSelectedServiceId(bookingData.serviceId);
            }
            
            // Restaurar fecha
            if (bookingData.date) {
              const savedDate = new Date(bookingData.date);
              setSelectedDate(savedDate);
            }
            
            // Restaurar nota
            if (bookingData.note) {
              setNote(bookingData.note);
            }
            
            // Restaurar información del cliente
            if (bookingData.client) {
              setClientDraft({
                fullName: bookingData.client.fullName || "",
                email: bookingData.client.email || userEmail || "",
                phone: bookingData.client.phone || ""
              });
            }
            
            // Mostrar mensaje de bienvenida
            toast.success("¡Bienvenido! Tu información ha sido restaurada. Continúa con tu reserva.", { durationMs: 5000 });
            
            // Limpiar localStorage
            localStorage.removeItem('pending_appointment');
          }
        } catch (error) {
          console.error("Error al recuperar datos guardados:", error);
          localStorage.removeItem('pending_appointment');
        }
      }
    }
  }, [isAuthenticated, tenantId, userEmail, toast]);

  useEffect(() => {
    if (clientSelf?.client) {
      setClientDraft({
        fullName: clientSelf.client.fullName ?? "",
        email: clientSelf.client.email ?? userEmail ?? "",
        phone: clientSelf.client.phone ?? ""
      });
    }
  }, [clientSelf, userEmail]);

  const handleSaveProfile = async () => {
    if (!clientSelf?.client) return;
    if (!clientDraft?.phone) {
      toast.error("Ingresa un teléfono válido");
      return;
    }
    setSavingClient(true);
    try {
      const updateData = { tenantId, fullName: clientDraft.fullName, email: clientDraft.email, phone: clientDraft.phone };
      const url = `/api/appointments/public/clients${publicTenantParam}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "No pudimos actualizar el cliente" }));
        throw new Error(payload.error || "No pudimos actualizar el cliente");
      }
      const result = await res.json();
      const updatedClient = result.client || result;
      setClientDraft({ fullName: updatedClient.fullName ?? clientDraft.fullName, email: updatedClient.email ?? clientDraft.email, phone: updatedClient.phone ?? clientDraft.phone });
      if (mutateClientSelf) await mutateClientSelf();
      setIsEditingContact(false);
      toast.success("✅ Información actualizada correctamente");
    } catch (err: any) {
      console.error("Failed to save client data:", err);
      toast.error(err?.message || "No pudimos guardar los datos");
    } finally {
      setSavingClient(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!clientDraft.fullName.trim()) {
      toast.error("Nombre completo requerido");
      return;
    }
    setSavingClient(true);
    try {
      const payload = { tenantId, fullName: clientDraft.fullName.trim(), email: clientDraft.email.trim() || null, phone: clientDraft.phone.trim() || null };
      const url = `/api/appointments/public/clients${publicTenantParam}`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "No pudimos crear el cliente" }));
        
        // Manejar diferentes tipos de errores de duplicado
        const errorMsg = body.error || body.message || "";
        const isDuplicateError = 
          errorMsg.includes("already exists") || 
          errorMsg.includes("duplicate key") || 
          errorMsg.includes("unique constraint") ||
          errorMsg.includes("appointment_clients_email_key");
        
        if (isDuplicateError) {
          toast.success("✅ Este correo ya está registrado. Puedes continuar agendando tu cita.", { durationMs: 4000 });
          if (mutateClientSelf) await mutateClientSelf();
          return;
        }
        
        throw new Error(body.error || "No pudimos crear el perfil");
      }
      const result = await res.json();
      const created = result.client || result;
      setClientDraft({ fullName: created.fullName ?? clientDraft.fullName, email: created.email ?? clientDraft.email, phone: created.phone ?? clientDraft.phone });
      if (mutateClientSelf) await mutateClientSelf();
      toast.success("✅ Perfil guardado exitosamente. Ahora puedes agendar tu cita.");
    } catch (err: any) {
      console.error("Failed to create client:", err);
      
      // Manejar errores de duplicado en el catch también (por si acaso)
      const errorMsg = err?.message || "";
      const isDuplicateError = 
        errorMsg.includes("already exists") || 
        errorMsg.includes("duplicate key") || 
        errorMsg.includes("unique constraint") ||
        errorMsg.includes("appointment_clients_email_key");
      
      if (isDuplicateError) {
        toast.success("✅ Este correo ya está registrado. Puedes continuar agendando tu cita.", { durationMs: 4000 });
      } else {
        toast.error(err?.message || "No pudimos crear el perfil");
      }
    } finally {
      setSavingClient(false);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedService) {
      toast.error("Selecciona un servicio");
      return;
    }
    if (!selectedSlot) {
      toast.error("Selecciona un horario disponible");
      return;
    }

    // NUEVO: Validar que esté autenticado ANTES de agendar
    if (!isAuthenticated) {
      // Guardar toda la información en localStorage para recuperarla después del login
      const bookingData = {
        tenantId,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        startsAt: selectedSlot.isoStart,
        endsAt: selectedSlot.isoEnd,
        date: selectedDate.toISOString(),
        note: note.trim(),
        client: {
          fullName: clientDraft.fullName.trim(),
          email: clientDraft.email.trim(),
          phone: clientDraft.phone.trim()
        }
      };
      localStorage.setItem('pending_appointment', JSON.stringify(bookingData));
      
      // Mostrar mensaje y redirigir al login
      toast.error("Debes iniciar sesión para agendar una cita", { durationMs: 3000 });
      setTimeout(() => {
        window.location.href = `/auth/login?redirect=/appointments${tenantId ? `?tenant=${tenantId}` : ''}`;
      }, 1000);
      return;
    }

    // Validar que haya información de cliente
    if (!clientDraft.fullName.trim()) {
      toast.error("Por favor guarda tu información de contacto primero");
      return;
    }

    // Validar que haya un teléfono si el cliente está registrado
    if (clientSelf?.client && !clientDraft.phone.trim()) {
      toast.error("Por favor ingresa un teléfono de contacto antes de reservar");
      return;
    }

    // REMOVIDO: La validación de "una cita por día" estaba verificando TODAS las citas del tenant
    // en lugar de solo las citas del usuario actual. Esto causaba falsos positivos.
    // La validación debe hacerse en el backend si es necesaria.

    setBooking(true);
    try {
      // Always use public endpoint for this view
      const url = `/api/appointments/public/appointments${publicTenantParam}`;
      const bodyPayload: any = {
        serviceId: selectedService.id,
        startsAt: selectedSlot.isoStart,
        endsAt: selectedSlot.isoEnd,
        note: note.trim() || null,
        tenantId: tenantId // Always include tenantId
      };
      
      // Siempre incluir información del cliente (tanto autenticado como no autenticado)
      if (clientSelf?.client?.id) {
        // Si ya existe un cliente registrado, usar su ID
        bodyPayload.clientId = clientSelf.client.id;
      } else {
        // Si no existe, enviar los datos del cliente para crearlo
        bodyPayload.client = {
          fullName: clientDraft.fullName.trim() || "Cliente",
          email: clientDraft.email.trim() || null,
          phone: clientDraft.phone.trim() || null
        };
      }
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "No pudimos agendar la cita" }));
        throw new Error(payload.error);
      }
      toast.success("¡Cita agendada exitosamente! Te contactaremos pronto");
      setSelectedSlot(null);
      setNote("");
      await mutateSchedule();
      if (mutateClientSelf) await mutateClientSelf();
    } catch (error) {
      console.error("[booking] Error:", error);
      toast.error(error instanceof Error ? error.message : "No pudimos agendar la cita");
    } finally {
      setBooking(false);
    }
  };

  const isSlotSelected = (slot: SlotCandidate) => selectedSlot?.isoStart === slot.isoStart;

  const disableBooking = !selectedService || !selectedSlot || booking;

  // REMOVIDO: El bloqueo de vista para no autenticados
  // Ahora todos pueden ver la vista, pero solo los autenticados pueden confirmar la cita

  return (
    <div className={styles.publicContainer}>
      {/* NUEVO: Banner de estado de autenticación */}
      {!isAuthenticated && (
        <div className={styles.authBanner}>
          <div className={styles.authBannerContent}>
            <span className={styles.authBannerIcon}>ℹ️</span>
            <div className={styles.authBannerText}>
              <strong>Modo invitado</strong> - Puedes explorar los servicios y horarios. Para agendar una cita debes iniciar sesión.
            </div>
            <div className={styles.authBannerActions}>
              <Link href="/auth/login" className={styles.authBannerButton}>
                Iniciar sesión
              </Link>
              <Link href="/auth/signup" className={styles.authBannerButtonSecondary}>
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* NUEVO: Banner de usuario logueado */}
      {isAuthenticated && (
        <div className={styles.userBanner}>
          <div className={styles.userBannerContent}>
            <span className={styles.userBannerIcon}>👤</span>
            <div className={styles.userBannerText}>
              Sesión activa: <strong>{userEmail || 'Usuario'}</strong>
            </div>
            <button 
              onClick={() => setShowMyAppointments(true)}
              className={styles.userBannerButton}
            >
              📅 Mis Citas
            </button>
            <button 
              onClick={async () => {
                // Hacer logout y redirigir a la vista pública del mismo tenant
                await fetch('/api/auth/signout', { method: 'POST' });
                window.location.href = `/appointments${tenantId ? `?tenant=${tenantId}` : ''}`;
              }}
              className={styles.userBannerLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <header className={styles.hero}>
        <h1>Agenda tu cita</h1>
      </header>

      <div className={styles.layout}>
        <section className={styles.profileCard}>
          <h2>Información de contacto</h2>
          <div className={styles.clientInfo}>
            {clientSelf === undefined ? (
              <div className={styles.loadingProfile}>
                <div className={styles.loadingAvatar}></div>
                <div className={styles.loadingDetails}>
                  <div className={styles.loadingLine}></div>
                  <div className={styles.loadingLine}></div>
                </div>
              </div>
            ) : clientSelf?.client ? (
              <>
                <div className={styles.clientDetails}>
                  {!isEditingContact ? (
                    <>
                      <div className={styles.contactInfo}>
                        <p><strong>{clientSelf.client.fullName}</strong></p>
                        <p className={styles.infoLabel}>📧 {clientSelf.client.email || userEmail}</p>
                        <p className={styles.infoLabel}>📞 {clientSelf.client.phone || "No registrado"}</p>
                      </div>
                      <div className={styles.infoAlert}>
                        <p>✅ Tu información está guardada</p>
                        <button 
                          type="button" 
                          className={styles.secondaryButton}
                          onClick={() => setIsEditingContact(true)}
                        >
                          Editar información
                        </button>
                      </div>
                    </>
                  ) : (
                    <form
                      className={styles.profileForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveProfile();
                      }}
                    >
                      <label>
                        Nombre completo
                        <input
                          type="text"
                          value={clientDraft.fullName}
                          onChange={(event) => setClientDraft((current) => ({ ...current, fullName: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Correo electrónico
                        <input
                          type="email"
                          value={clientDraft.email}
                          onChange={(event) => setClientDraft((current) => ({ ...current, email: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Teléfono de contacto
                        <input
                          type="tel"
                          placeholder="Ingresa tu número de teléfono"
                          value={clientDraft.phone}
                          onChange={(event) => setClientDraft((current) => ({ ...current, phone: event.target.value }))}
                          required
                        />
                      </label>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="submit" disabled={savingClient} className={styles.primaryButton}>
                          {savingClient ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button 
                          type="button" 
                          className={styles.secondaryButton}
                          onClick={() => {
                            setIsEditingContact(false);
                            setClientDraft({
                              fullName: clientSelf.client?.fullName ?? "",
                              email: clientSelf.client?.email ?? userEmail ?? "",
                              phone: clientSelf.client?.phone ?? ""
                            });
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.clientDetails}>
                <form
                  className={styles.profileForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleCreateProfile();
                  }}
                >
                  <label>
                    Nombre completo
                    <input value={clientDraft.fullName} onChange={(event) => setClientDraft((c) => ({ ...c, fullName: event.target.value }))} required />
                  </label>
                  <label>
                    Correo
                    <input type="email" value={clientDraft.email} onChange={(event) => setClientDraft((c) => ({ ...c, email: event.target.value }))} required />
                  </label>
                  <label>
                    Teléfono (opcional)
                    <input type="tel" value={clientDraft.phone} onChange={(event) => setClientDraft((c) => ({ ...c, phone: event.target.value }))} />
                  </label>
                  <p className={styles.infoText}>Si guardas tus datos podremos confirmarte la cita por teléfono o correo.</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="submit" className={styles.primaryButton} disabled={savingClient}>{savingClient ? "Guardando..." : "Guardar contacto"}</button>
                    <button type="button" className={styles.secondaryButton} onClick={() => setClientDraft({ fullName: "", email: userEmail || "", phone: "" })}>Limpiar</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>

        <section className={styles.bookingCard}>
          <div className={styles.servicesHeader}>
            <h2>Selecciona un servicio</h2>
          </div>
          <div className={styles.serviceDropdown}>
            <label htmlFor="service-select">Servicio</label>
            <select
              id="service-select"
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                setSelectedSlot(null);
              }}
              className={styles.selectInput}
            >
              <option value="" disabled>Selecciona un servicio...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.durationMinutes} min
                  {service.price != null ? ` - ${service.price} ${service.currency ?? "USD"}` : ""}
                </option>
              ))}
            </select>
            {selectedService?.description && (
              <p className={styles.serviceDescription}>{selectedService.description}</p>
            )}
          </div>

          <div className={styles.dateSelector}>
            <div className={styles.dateHeader}>
              <h2>Agenda tu cita</h2>
              <div className={styles.dateNav}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(0)}
                  disabled={!canGoPrev}
                  className={styles.navButton}
                  aria-label="Semana anterior"
                >
                  ←
                </button>
                <span className={styles.pageIndicator}>
                  {currentPage === 0 ? "Próximos 7 días" : "Días 8-14"}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={!canGoNext}
                  className={styles.navButton}
                  aria-label="Siguiente semana"
                >
                  →
                </button>
              </div>
            </div>
            <div className={styles.dateList}>
              {visibleDays.map((day) => {
                const iso = day.toISOString().slice(0, 10);
                const isActive = iso === selectedDateIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`${styles.dateButton} ${isActive ? styles.dateButtonActive : ""}`}
                    onClick={() => {
                      setSelectedDate(day);
                      setSelectedSlot(null);
                    }}
                  >
                    <span>{formatShort(day)}</span>
                    <small>{day.toLocaleDateString("es-ES", { weekday: "short" })}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.slotsSection}>
            <div className={styles.slotsHeader}>
              <h3>Horarios disponibles</h3>
              {loadingSchedule ? <span className={styles.loading}>Consultando agenda...</span> : null}
            </div>
            <div className={styles.slotsGrid}>
              {slots.length ? (
                slots.map((slot: SlotCandidate) => (
                  <button
                    key={slot.isoStart}
                    type="button"
                    className={`${styles.slotButton} ${isSlotSelected(slot) ? styles.slotActive : ""}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot.label}
                  </button>
                ))
              ) : (
                <p className={styles.empty}>No hay horarios disponibles para este día.</p>
              )}
            </div>
          </div>

          <label className={styles.noteField}>
            Comentarios o notas adicionales (opcional)
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          <button type="button" className={styles.primaryButton} disabled={disableBooking} onClick={() => void handleBookSlot()}>
            {booking ? "Confirmando..." : "Confirmar cita"}
          </button>
        </section>
      </div>

      {/* Modal: Mis Citas */}
      {showMyAppointments && (
        <MyAppointmentsModal
          tenantId={tenantId}
          onClose={() => setShowMyAppointments(false)}
          toast={toast}
        />
      )}
    </div>
  );
}

// ===== COMPONENTE: Modal de Mis Citas =====
function MyAppointmentsModal({ tenantId, onClose, toast }: any) {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null);
  
  const myAppointmentsKey = `/api/appointments/public/my-appointments${tenantId ? `?tenant=${tenantId}` : ''}`;
  const { data, mutate, isLoading, error } = useSWR(myAppointmentsKey, fetcher);
  
  const appointments = data?.appointments ?? [];

  // Log para debugging
  useEffect(() => {
    console.log('[MyAppointmentsModal] Data:', { 
      isLoading, 
      error, 
      appointments: appointments.length,
      data 
    });
  }, [isLoading, error, appointments, data]);

  const handleCancelAppointment = async (appointmentId: string) => {
    setCancelling(appointmentId);
    try {
      const response = await fetch(`/api/appointments/public/my-appointments${tenantId ? `?tenant=${tenantId}` : ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cancelar la cita');
      }

      toast.success('✅ Cita cancelada correctamente');
      setConfirmingCancel(null);
      mutate(); // Recargar la lista
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar la cita');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: '⏳ Pendiente', className: styles.status_pending },
      confirmed: { label: '✅ Confirmada', className: styles.status_confirmed },
      completed: { label: '🎉 Completada', className: styles.status_completed },
      cancelled: { label: '❌ Cancelada', className: styles.status_cancelled },
      rejected: { label: '⛔ Rechazada', className: styles.status_rejected }
    };
    const badge = badges[status] || { label: status, className: '' };
    return <span className={badge.className}>{badge.label}</span>;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>📅 Mis Citas</h2>
          <button onClick={onClose} className={styles.modalClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {isLoading ? (
            <p className={styles.loading}>Cargando tus citas...</p>
          ) : error ? (
            <div className={styles.emptyState}>
              <p style={{ color: '#dc2626' }}>❌ Error al cargar las citas</p>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                {error?.message || 'Por favor, intenta de nuevo más tarde'}
              </p>
            </div>
          ) : appointments.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No tienes citas programadas</p>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Reserva tu primera cita para comenzar
              </p>
            </div>
          ) : (
            <div className={styles.appointmentsList}>
              {appointments.map((apt: any) => (
                <div key={apt.id} className={styles.myAppointmentCard}>
                  <div className={styles.appointmentCardHeader}>
                    <div className={styles.appointmentDateTime}>
                      <div className={styles.appointmentDate}>
                        📅 {new Date(apt.scheduled_start).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                      <div className={styles.appointmentTime}>
                        🕒 {new Date(apt.scheduled_start).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>
                  
                  <div className={styles.appointmentCardBody}>
                    <div className={styles.serviceInfo}>
                      <strong>✂️ {apt.service?.name || 'Servicio'}</strong>
                      <span className={styles.serviceDuration}>
                        ⏱️ {apt.service?.duration_minutes || 0} min
                      </span>
                      {apt.service?.price && (
                        <span className={styles.servicePrice}>
                          💰 ${apt.service.price}
                        </span>
                      )}
                    </div>
                    
                    {apt.client_note && (
                      <div className={styles.appointmentNote}>
                        <strong>📝 Nota:</strong> {apt.client_note}
                      </div>
                    )}
                    
                    <div className={styles.appointmentMeta}>
                      <span className={styles.createdAt}>
                        🗓️ Solicitada: {new Date(apt.created_at).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {(apt.status === 'pending' || apt.status === 'confirmed') && (
                    <>
                      {confirmingCancel === apt.id ? (
                        <div className={styles.inlineConfirmation}>
                          <div className={styles.confirmWarning}>
                            <span className={styles.warningIcon}>⚠️</span>
                            <div className={styles.warningText}>
                              <strong>¿Estás seguro de que deseas cancelar esta cita?</strong>
                              <p>Esta acción no se puede deshacer.</p>
                            </div>
                          </div>
                          <div className={styles.confirmButtons}>
                            <button
                              onClick={() => setConfirmingCancel(null)}
                              disabled={cancelling === apt.id}
                              className={styles.confirmCancelBtn}
                            >
                              No, mantener
                            </button>
                            <button
                              onClick={() => handleCancelAppointment(apt.id)}
                              disabled={cancelling === apt.id}
                              className={styles.confirmOkBtn}
                            >
                              {cancelling === apt.id ? 'Cancelando...' : 'Sí, cancelar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.appointmentCardActions}>
                          <button
                            onClick={() => setConfirmingCancel(apt.id)}
                            disabled={cancelling === apt.id}
                            className={styles.cancelButton}
                          >
                            {cancelling === apt.id ? 'Cancelando...' : '🗑️ Cancelar cita'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
