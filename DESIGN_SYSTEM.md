# 🎨 Sistema de Diseño - Guía de Uso

## ✅ **¿Qué acabamos de crear?**

Hemos establecido los **fundamentos del sistema de diseño** sin romper nada existente:

1. ✅ **design-tokens.css** - Variables CSS globales
2. ✅ **utilities.css** - Clases reutilizables
3. ✅ Importado en `globals.css` - Disponible en toda la app

---

## 📚 **Cómo usar las Variables**

### **Colores**

```css
.mi-componente {
  /* Usar variables en lugar de colores hardcoded */
  background: var(--color-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}
```

### **Espaciado**

```css
.mi-card {
  padding: var(--spacing-xl);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
}
```

### **Tipografía**

```css
.mi-titulo {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}
```

### **Sombras y Bordes**

```css
.mi-tarjeta {
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}
```

---

## 🎯 **Clases Utilitarias Listas para Usar**

### **Contenedores Responsivos**

```html
<div className="container-responsive">
  <!-- Se ajusta automáticamente según el tamaño de pantalla -->
</div>
```

### **Cards**

```html
<div className="card">
  <!-- Card con estilos modernos y hover effect -->
</div>

<div className="card card-elevated">
  <!-- Card con sombra más pronunciada -->
</div>
```

### **Botones**

```html
<button className="btn btn-primary">Acción Principal</button>
<button className="btn btn-secondary">Acción Secundaria</button>
<button className="btn btn-success">Guardar</button>
<button className="btn btn-error">Eliminar</button>
```

### **Inputs**

```html
<input className="input" type="text" placeholder="Nombre" />
<input className="input input-error" type="email" />
```

### **Badges**

```html
<span className="badge badge-primary">Nuevo</span>
<span className="badge badge-success">Activo</span>
<span className="badge badge-warning">Pendiente</span>
<span className="badge badge-error">Cancelado</span>
```

### **Tipografía**

```html
<h1 className="heading-1">Título Principal</h1>
<h2 className="heading-2">Título Secundario</h2>
<p className="text-body">Texto normal</p>
<p className="text-small">Texto pequeño</p>
```

### **Layout**

```html
<div className="flex-between">
  <!-- Elementos distribuidos entre inicio y fin -->
</div>

<div className="flex-center">
  <!-- Elementos centrados -->
</div>

<div className="grid-auto-fit">
  <!-- Grid responsivo automático -->
</div>
```

### **Spacing Stack**

```html
<div className="spacing-stack-lg">
  <p>Item 1</p>
  <p>Item 2</p>
  <p>Item 3</p>
  <!-- Cada item tiene margin-top automático -->
</div>
```

### **Animaciones**

```html
<div className="fade-in">Aparece con fade</div>
<div className="slide-up">Sube deslizándose</div>
<div className="scale-in">Aparece con escala</div>
```

---

## 📱 **Breakpoints Responsivos**

Usar en CSS:

```css
/* Mobile first */
.mi-elemento {
  font-size: 1rem;
}

/* Tablet y superior */
@media (min-width: 768px) {
  .mi-elemento {
    font-size: 1.25rem;
  }
}

/* Desktop y superior */
@media (min-width: 1024px) {
  .mi-elemento {
    font-size: 1.5rem;
  }
}
```

---

## 🎨 **Paleta de Colores Disponible**

### **Primarios (Azul)**

- `--color-primary-50` a `--color-primary-900`
- `--color-primary` (defecto: 600)

### **Neutros (Grises)**

- `--color-neutral-50` a `--color-neutral-900`

### **Semánticos**

- Success (Verde): `--color-success-*`
- Warning (Amarillo): `--color-warning-*`
- Error (Rojo): `--color-error-*`
- Info (Cyan): `--color-info-*`

---

## ✨ **Ventajas de este Sistema**

✅ **No rompe nada** - Todo el código existente sigue funcionando
✅ **Consistencia** - Mismos colores/espaciados en toda la app
✅ **Fácil de cambiar** - Cambia una variable, actualiza toda la app
✅ **Responsive** - Breakpoints y containers listos
✅ **Profesional** - Basado en mejores prácticas de diseño
✅ **Escalable** - Fácil agregar nuevas utilidades

---

## 🚀 **Próximos Pasos**

Ahora que tenemos los fundamentos, podemos:

1. **Mejorar Landing Page** usando estas variables
2. **Crear componentes reutilizables** (Navbar, Footer, etc.)
3. **Migrar módulos gradualmente** a usar el nuevo sistema
4. **Agregar tema oscuro** (ya está preparado)

---

## 💡 **Ejemplo de Uso Completo**

```tsx
// Componente usando el nuevo sistema
function MyCard() {
  return (
    <div className="card fade-in">
      <h2 className="heading-3">Título del Card</h2>
      <p className="text-body">Descripción del contenido</p>
      <div className="flex-between">
        <span className="badge badge-success">Activo</span>
        <button className="btn btn-primary">Acción</button>
      </div>
    </div>
  );
}
```

---

**¿Todo claro? ¡Listo para comenzar a mejorar la Landing Page!** 🎉
