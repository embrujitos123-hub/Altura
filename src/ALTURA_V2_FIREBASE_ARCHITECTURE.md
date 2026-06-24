# ALTURA V2 FIREBASE ARCHITECTURE

## Estado

Arquitectura Firebase Oficial

## Objetivo

Definir la arquitectura técnica de ALTURA V2 usando Firebase Authentication, Firestore y Firebase Storage.

---

## Firebase Authentication

### Método de Login Fase 1

ALTURA V2 utilizará:

- Correo electrónico
- Contraseña

No se activarán inicialmente:

- Google Login
- Apple Login
- Teléfono OTP

La prioridad será simplicidad, estabilidad y bajo soporte técnico.

---

## Roles de Usuario

### Visitante

Puede:

- Ver propiedades publicadas.
- Ver oportunidades activas.
- Compartir publicaciones.
- Contactar a ALTURA por WhatsApp.

No requiere login.

---

### Usuario Registrado

Puede:

- Guardar favoritos.
- Subir propiedades gratis.
- Solicitar evaluaciones.
- Solicitar servicios premium.
- Consultar estado de publicaciones.

---

### Administrador

Puede:

- Aprobar publicaciones.
- Rechazar publicaciones.
- Editar publicaciones.
- Gestionar usuarios.
- Ver documentos privados.
- Gestionar inversiones.
- Gestionar servicios premium.
- Ver métricas.
- Registrar acciones administrativas.

---

## Publicación de Propiedades

Publicar una propiedad será gratuito.

Toda propiedad enviada por un usuario entra inicialmente como:

EN_REVISION

La propiedad no será visible públicamente hasta aprobación administrativa.

---

## Requisitos Mínimos para Enviar a Revisión

Antes de enviar una propiedad a revisión, el usuario deberá completar:

- Nombre del propietario o representante.
- Correo electrónico.
- Teléfono.
- Tipo de propiedad.
- País.
- Ciudad.
- Tipo de operación: venta, alquiler o ambos.
- Precio.
- Moneda.
- Área.
- Descripción básica.
- Mínimo 1 imagen.
- Aceptación del Listing Agreement.
- Declaración de veracidad de información.

---

## Imágenes

Máximo por propiedad en Fase 1:

5 imágenes.

Las imágenes se almacenarán en Firebase Storage.

Las URLs públicas o controladas se guardarán en Firestore dentro de la propiedad.

---

## Video

Fase 1 permitirá:

- Máximo 1 video por propiedad.
- Duración máxima: 30 segundos.

El video será opcional.

---

## Tour Virtual

No estará disponible en Fase 1.

Se contemplará en Fase 2 como servicio premium.

---

## Listing Agreement

### Fase 1

El Listing Agreement será aceptado digitalmente.

El usuario deberá marcar casillas obligatorias:

- He leído y acepto el Listing Agreement de ALTURA.
- Declaro que soy propietario o representante autorizado.
- Declaro que la información suministrada es verdadera.

El sistema deberá guardar:

- userId
- propertyId
- agreementVersion
- acceptedAt
- ipAddress si técnicamente es posible
- status
- createdAt

---

## Oportunidades de Inversión

Para oportunidades de inversión se exigirá mayor validación.

Requisitos:

- Identidad validada.
- Documentación del proyecto.
- Acuerdo de publicación firmado.
- Revisión administrativa obligatoria.
- Evaluación previa por ALTURA.

---

## Firestore Collections

Colecciones principales:

- users
- properties
- investment_opportunities
- evaluations
- dossiers
- favorites
- notifications
- messages
- leads
- service_requests
- audit_logs
- listing_agreements

---

## listing_agreements

Campos:

- id
- userId
- propertyId
- investmentId
- agreementType
- agreementVersion
- acceptedAt
- ipAddress
- status
- documentUrl
- createdAt
- updatedAt

Estados:

- ACCEPTED
- SIGNED
- REVOKED
- ARCHIVED

---

## Firebase Storage

### Archivos Públicos o Semipúblicos

- Imágenes de propiedades.
- Videos de propiedades.
- Imágenes de oportunidades de inversión.

### Archivos Privados

- Cédulas.
- Personerías.
- Planos.
- Contratos.
- Estudios técnicos.
- Avalúos.
- Dossiers.
- Acuerdos firmados.

Los documentos privados solo podrán ser vistos por administradores autorizados.

---

## Reglas Generales de Seguridad

### Lectura Pública

Los visitantes solo podrán leer:

- Propiedades con status AVAILABLE.
- Oportunidades con status ACTIVE.

---

### Usuario Registrado

El usuario registrado podrá:

- Leer sus propios documentos.
- Crear propiedades propias.
- Crear solicitudes propias.
- Ver estado de sus publicaciones.

No podrá aprobar, publicar ni modificar propiedades de otros usuarios.

---

### Administrador

El administrador podrá:

- Leer todo.
- Aprobar.
- Rechazar.
- Editar.
- Archivar.
- Gestionar documentación privada.

---

## Notificaciones

Cuando un usuario suba una propiedad, el sistema deberá generar:

- Notificación interna para administrador.
- Registro en audit_logs.
- Futuro envío por correo electrónico.
- Futuro aviso por WhatsApp.

---

## Estados de Propiedad

- EN_REVISION
- AVAILABLE
- RESERVED
- LEASED
- SOLD
- REJECTED

---

## Estados de Inversión

- EN_REVISION
- ACTIVE
- FUNDED
- CLOSED
- REJECTED

---

## Principios Técnicos

- Mobile first.
- Seguridad por roles.
- Documentos privados protegidos.
- Publicación pública solo después de aprobación.
- Registro de acciones críticas.
- Preparado para Costa Rica y España.
- Preparado para español e inglés.
