"use client";

import { useMemo, useState } from "react";
import styles from "./users.module.css";
import { useToast } from "../../../../components/ToastProvider";

type MembershipRole = "system_admin" | "admin" | "member";

export type UserMembershipSummary = {
  tenantId: string;
  tenantName: string;
  role: MembershipRole;
};

export type UserSummary = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  isPlatformAdmin: boolean;
  memberships: UserMembershipSummary[];
};

type Props = {
  users: UserSummary[];
  currentUserId: string;
};

type ModalView = "manage" | "confirm-delete" | null;

const ROLE_OPTIONS: { label: string; value: MembershipRole }[] = [
  { label: "Admin", value: "admin" },
  { label: "Miembro", value: "member" }
];

const ROLE_LABELS: Record<MembershipRole, string> = {
  system_admin: "System Admin",
  admin: "Admin",
  member: "Miembro"
};

const ROLE_CLASS: Record<MembershipRole, string> = {
  system_admin: styles.roleSystem,
  admin: styles.roleAdmin,
  member: styles.roleMember
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es", {
  year: "numeric",
  month: "short",
  day: "numeric"
});

export function UserManagementClient({ users, currentUserId }: Props) {
  const [items, setItems] = useState(users);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalView, setModalView] = useState<ModalView>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, MembershipRole>>({});
  const [loadingAction, setLoadingAction] = useState(false);
  const toast = useToast();

  const filteredUsers = useMemo(() => {
    if (!query.trim()) {
      return items;
    }
    const normalized = query.trim().toLowerCase();
    return items.filter((user) => {
      return (
        user.email.toLowerCase().includes(normalized) ||
        user.fullName?.toLowerCase().includes(normalized) ||
        user.memberships.some((membership) => membership.tenantName.toLowerCase().includes(normalized))
      );
    });
  }, [items, query]);

  const selectedUser = useMemo(
    () => items.find((item) => item.id === selectedUserId) ?? null,
    [items, selectedUserId]
  );

  const openModal = (userId: string) => {
    const user = items.find((item) => item.id === userId);
    if (!user) return;
    setSelectedUserId(userId);
    setPendingRoles(
      user.memberships.reduce<Record<string, MembershipRole>>((acc, membership) => {
        if (membership.role !== "system_admin") {
          acc[membership.tenantId] = membership.role;
        }
        return acc;
      }, {})
    );
    setModalView("manage");
  };

  const closeModal = () => {
    setModalView(null);
    setSelectedUserId(null);
    setPendingRoles({});
    setLoadingAction(false);
  };

  const handleChangeRoleLocal = (tenantId: string, nextRole: MembershipRole) => {
    setPendingRoles((prev) => ({ ...prev, [tenantId]: nextRole }));
  };

  const applyRoleChange = async (tenantId: string) => {
    if (!selectedUser) return;
    const nextRole = pendingRoles[tenantId];
    if (!nextRole) return;

    setLoadingAction(true);
    try {
      const response = await fetch("/api/admin/users/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, tenantId, role: nextRole })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos actualizar el rol.");
      }

      setItems((current) =>
        current.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                memberships: user.memberships.map((membership) =>
                  membership.tenantId === tenantId ? { ...membership, role: nextRole } : membership
                )
              }
            : user
        )
      );
      toast.success("Rol actualizado", { position: "top-right" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos actualizar el rol.";
      toast.error(message, { position: "top-right" });
    } finally {
      setLoadingAction(false);
    }
  };

  const togglePlatformAdmin = async () => {
    if (!selectedUser) return;
    const promote = !selectedUser.isPlatformAdmin;
    setLoadingAction(true);
    try {
      const response = await fetch("/api/admin/users/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, promote })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos actualizar el rol de plataforma.");
      }
      setItems((current) =>
        current.map((user) => (user.id === selectedUser.id ? { ...user, isPlatformAdmin: promote } : user))
      );
      toast.success(promote ? "Usuario promovido" : "Rol de plataforma revocado", { position: "top-right" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No pudimos actualizar el rol de plataforma para el usuario.";
      toast.error(message, { position: "top-right" });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setLoadingAction(true);
    try {
      const response = await fetch("/api/admin/users/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos eliminar el usuario.");
      }
      setItems((current) => current.filter((user) => user.id !== selectedUser.id));
      toast.success("Usuario eliminado", { position: "top-right" });
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos eliminar el usuario.";
      toast.error(message, { position: "top-right" });
      setLoadingAction(false);
    }
  };

  const allowSensitiveActions = Boolean(selectedUser && selectedUser.id !== currentUserId);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div>
          <h1>Gestion de usuarios</h1>
          <p>Administra roles, accesos y miembros de tenants. Solo los System Admin pueden acceder a esta vista.</p>
        </div>
        <div className={styles.searchWrapper}>
          <input
            className={styles.search}
            placeholder="Buscar por email, nombre o tenant..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar usuarios"
          />
        </div>
      </header>

      <section className={styles.grid}>
        {filteredUsers.map((user) => {
          const tenantsCount = user.memberships.length;
          const topRole: MembershipRole = user.isPlatformAdmin
            ? "system_admin"
            : user.memberships[0]?.role ?? "member";
          const createdLabel = user.createdAt ? DATE_FORMATTER.format(new Date(user.createdAt)) : "N/D";
          const lastSignInLabel = user.lastSignInAt ? DATE_FORMATTER.format(new Date(user.lastSignInAt)) : "Nunca";

          return (
            <article key={user.id} className={styles.card}>
              <header className={styles.cardHeader}>
                <div className={styles.cardIdentity}>
                  <div className={styles.cardAvatar}>{(user.fullName ?? user.email).charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{user.fullName ?? "Sin nombre"}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>
                <span className={`${styles.roleBadge} ${ROLE_CLASS[topRole]}`}>
                  {ROLE_LABELS[topRole]}
                </span>
              </header>

              <dl className={styles.meta}>
                <div>
                  <dt>Negocios</dt>
                  <dd>{tenantsCount}</dd>
                </div>
                <div>
                  <dt>Creado</dt>
                  <dd>{createdLabel}</dd>
                </div>
                <div>
                  <dt>Ultimo acceso</dt>
                  <dd>{lastSignInLabel}</dd>
                </div>
              </dl>

              <footer className={styles.cardActions}>
                <button type="button" onClick={() => openModal(user.id)} className={styles.manageButton}>
                  Gestionar
                </button>
              </footer>
            </article>
          );
        })}

        {!filteredUsers.length ? (
          <div className={styles.emptyState}>
            <h2>No encontramos resultados</h2>
            <p>Intenta con otra busqueda o revisa los filtros.</p>
          </div>
        ) : null}
      </section>

      {selectedUser && modalView === "manage" ? (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="manage-user-title">
          <div className={styles.modalContent}>
            <header className={styles.modalHeader}>
              <div>
                <h2 id="manage-user-title">{selectedUser.fullName ?? selectedUser.email}</h2>
                <p>{selectedUser.email}</p>
              </div>
              <button type="button" onClick={closeModal} className={styles.closeButton} aria-label="Cerrar">
                ×
              </button>
            </header>

            <section className={styles.modalSection}>
              <h3>Negocios</h3>
              {selectedUser.memberships.length ? (
                <ul className={styles.membershipList}>
                  {selectedUser.memberships.map((membership) => (
                    <li key={membership.tenantId}>
                      <div className={styles.membershipInfo}>
                        <span>{membership.tenantName}</span>
                        <small>ID: {membership.tenantId}</small>
                      </div>
                      <div className={styles.membershipActions}>
                        {membership.role === "system_admin" ? (
                          <span className={styles.systemRoleTag}>System Admin</span>
                        ) : (
                          <>
                            <select
                              value={pendingRoles[membership.tenantId] ?? membership.role}
                              onChange={(event) =>
                                handleChangeRoleLocal(
                                  membership.tenantId,
                                  event.target.value as MembershipRole
                                )
                              }
                              disabled={loadingAction}
                            >
                              {ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => applyRoleChange(membership.tenantId)}
                              disabled={loadingAction}
                            >
                              Guardar
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyMemberships}>Este usuario no tiene negocios asignados.</p>
              )}
            </section>

            <section className={styles.modalSection}>
              <h3>Rol de plataforma</h3>
              <p>
                Los System Admin tienen acceso total al panel de gestion. Usa esta opcion para promover o revocar el
                rol.
              </p>
              <div className={styles.sectionActions}>
                <button
                  type="button"
                  onClick={togglePlatformAdmin}
                  disabled={loadingAction || !allowSensitiveActions}
                  className={styles.promoteButton}
                >
                  {selectedUser.isPlatformAdmin ? "Revocar System Admin" : "Promover a System Admin"}
                </button>
                {!allowSensitiveActions ? (
                  <small className={styles.helperText}>No puedes modificar tu propio rol de plataforma.</small>
                ) : null}
              </div>
            </section>

            <section className={styles.modalSection}>
              <h3>Acciones avanzadas</h3>
              <p>Eliminar un usuario removera sus memberships, perfiles y acceso a la plataforma.</p>
              <button
                type="button"
                onClick={() => setModalView("confirm-delete")}
                disabled={!allowSensitiveActions}
                className={styles.deleteButton}
              >
                Eliminar usuario
              </button>
              {!allowSensitiveActions ? (
                <small className={styles.helperText}>No puedes eliminar tu propia cuenta.</small>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {selectedUser && modalView === "confirm-delete" ? (
        <div className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title">
          <div className={styles.modalContent}>
            <header className={styles.modalHeader}>
              <div>
                <h2 id="delete-user-title">Eliminar usuario</h2>
                <p>Esta accion es permanente e irreversible.</p>
              </div>
            </header>
            <section className={styles.modalSection}>
              <p>
                Estas a punto de eliminar <strong>{selectedUser.email}</strong>. Se removeran sus memberships y acceso a
                la plataforma.
              </p>
            </section>
            <footer className={styles.modalFooter}>
              <button type="button" onClick={() => setModalView("manage")} disabled={loadingAction}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className={styles.deleteButton}
                disabled={loadingAction}
              >
                Confirmar eliminacion
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
