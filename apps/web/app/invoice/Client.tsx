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

  const selectedDateIso = useMemo(() => {
    const clone = new Date(selectedDate);
    clone.setHours(0, 0, 0, 0);
    return clone.toISOString().slice(0, 10);
  }, [selectedDate]);

  const publicTenantParam = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : "";
  const servicesKey = isAuthenticated ? "/api/appointments/services" : `/api/appointments/public/services${publicTenantParam}`;
  const availabilityKey = isAuthenticated ? "/api/appointments/availability" : `/api/appointments/public/availability${publicTenantParam}`;
  const scheduleKey = isAuthenticated
    ? `/api/appointments/schedule?date=${selectedDateIso}`
    : `/api/appointments/public/schedule?date=${selectedDateIso}${tenantId ? `&tenant=${encodeURIComponent(tenantId)}` : ""}`;
  const clientKey = isAuthenticated ? "/api/appointments/clients" : `/api/appointments/public/clients${publicTenantParam}`;

  const { data: servicesData } = useSWR<ServicesResponse>(servicesKey, fetcher, { fallbackData: { services: [] } });
  const { data: availabilityData } = useSWR<AvailabilityResponse>(availabilityKey, fetcher, {
    fallbackData: { availability: [], timeOff: [], breaks: [] }
  });
  const { data: scheduleData, isValidating: loadingSchedule, mutate: mutateSchedule } = useSWR<ScheduleResponse>(
    scheduleKey,
    fetcher,
    { fallbackData: { appointments: [] }, revalidateOnFocus: false }
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

  // Generar array de 14 días disponibles
  const availableDays = useMemo(() => {
    return Array.from({ length: 14 }).map((_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      day.setHours(0, 0, 0, 0);
      return day;
    });
  }, [today]);

  // Días visibles en la página actual (7 días)
  const visibleDays = useMemo(() => {
    const startIndex = currentPage * 7;
    return availableDays.slice(startIndex, startIndex + 7);
  }, [availableDays, currentPage]);

  const canGoNext = currentPage < 1; // Máximo 2 páginas (0 y 1)
  const canGoPrev = currentPage > 0;

  const slots = useMemo(() => {
    if (!selectedService) return [];
    return buildSlotsForDate({
      date: selectedDate,
      durationMinutes: selectedService.durationMinutes,
      availability: dayAvailability,
      timeOff,
      busy: busySlots,
      breaks
    });
  }, [selectedDate, selectedService, dayAvailability, timeOff, busySlots, breaks]);

  useEffect(() => {
    if (services.length && !selectedServiceId) setSelectedServiceId(services[0].id);
  }, [services, selectedServiceId]);

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
      const updateData = { ...clientSelf.client, phone: clientDraft.phone };
      const res = await fetch("/api/appointments/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "No pudimos actualizar el cliente" }));
        throw new Error(payload.error || "No pudimos actualizar el cliente");
      }
      const updatedClient = await res.json();
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
      const payload = { fullName: clientDraft.fullName.trim(), email: clientDraft.email.trim() || null, phone: clientDraft.phone.trim() || null };
      const res = await fetch("/api/appointments/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "No pudimos crear el cliente" }));
        // Si el error es de duplicado
        if (body.error && body.error.includes("already exists")) {
          toast.error("✅ Tu información ya está guardada. Puedes continuar agendando tu cita.");
          if (mutateClientSelf) await mutateClientSelf();
          return;
        }
        throw new Error(body.error || "No pudimos crear el perfil");
      }
      const created = await res.json();
      setClientDraft({ fullName: created.fullName ?? clientDraft.fullName, email: created.email ?? clientDraft.email, phone: created.phone ?? clientDraft.phone });
      if (mutateClientSelf) await mutateClientSelf();
      toast.success("✅ Perfil guardado exitosamente. Ahora puedes agendar tu cita.");
    } catch (err: any) {
      console.error("Failed to create client:", err);
      toast.error(err?.message || "No pudimos crear el perfil");
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

    // Validar que el usuario no tenga más de una cita el mismo día
    const selectedDayStr = selectedDate.toISOString().slice(0, 10);
    const hasCitaToday = busySlots.some(busy => {
      const busyDate = new Date(busy.startsAt).toISOString().slice(0, 10);
      return busyDate === selectedDayStr;
    });
    
    if (hasCitaToday) {
      toast.error("Ya tienes una cita agendada para este día. Solo puedes tener una cita por día.");
      return;
    }

    setBooking(true);
    try {
      const url = isAuthenticated ? "/api/appointments/appointments" : `/api/appointments/public/appointments${publicTenantParam}`;
      const bodyPayload: any = {
        serviceId: selectedService.id,
        startsAt: selectedSlot.isoStart,
        endsAt: selectedSlot.isoEnd,
        note: note.trim() || null
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

  if (!isAuthenticated) {
    return (
      <section className={styles.authNotice}>
        <h1>Agenda tus citas en minutos</h1>
        <p>
          Inicia sesión o crea una cuenta para reservar servicios, administrar tus citas y recibir recordatorios.
        </p>
        <div className={styles.authActions}>
          <Link href="/auth/login" className={styles.primaryButton}>
            Iniciar sesión
          </Link>
          <Link href="/auth/signup" className={styles.secondaryButton}>
            Crear cuenta
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.publicContainer}>
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
                <div className={styles.clientAvatar}>
                  <span>{clientSelf.client.fullName?.charAt(0) || "?"}</span>
                </div>
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
    </div>
  );
}

