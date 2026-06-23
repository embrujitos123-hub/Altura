# ALTURA V2 DATA MODEL

## Estado

Modelo de Datos Oficial

## Objetivo

Definir la estructura principal de datos de ALTURA V2 utilizando Firebase Firestore, Firebase Storage y Firebase Authentication.

---

## Colecciones Principales

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

---

## users

Representa a toda persona registrada en la plataforma.

Campos principales:

- uid
- email
- name
- phone
- country
- city
- profileTypes
- verificationLevel
- isAdmin
- createdAt
- updatedAt

profileTypes puede incluir:

- owner
- investor
- owner_investor
- developer
- broker

verificationLevel:

- level_0: Sin verificar
- level_1: Correo verificado
- level_2: Teléfono verificado
- level_3: Identidad verificada
- level_4: Documentación validada

---

## properties

Representa propiedades en venta o alquiler.

Campos principales:

- id
- title
- description
- country
- state
- city
- address
- propertyType
- businessType
- price
- currency
- area
- bedrooms
- bathrooms
- parkingSpaces
- status
- ownerId
- images
- videos
- virtualTourUrl
- featured
- scoreCommercial
- scoreDocumentation
- createdAt
- updatedAt

propertyType:

- house
- apartment
- office
- commercial
- warehouse
- land
- farm
- hotel
- project

businessType:

- sale
- rent
- sale_rent

status:

- EN_REVISION
- AVAILABLE
- RESERVED
- LEASED
- SOLD
- REJECTED

---

## investment_opportunities

Representa oportunidades de inversión y coinversión.

Campos principales:

- id
- title
- summary
- description
- country
- state
- city
- capitalRequired
- minimumInvestment
- expectedReturn
- currency
- riskLevel
- investmentScore
- status
- ownerId
- dossierUrl
- images
- createdAt
- updatedAt

status:

- EN_REVISION
- ACTIVE
- FUNDED
- CLOSED
- REJECTED

riskLevel:

- LOW
- MEDIUM
- HIGH

Reglas base:

- capitalRequired mínimo: USD 250000
- minimumInvestment mínimo: USD 50000
- comisión de éxito ALTURA: 6% del capital levantado

---

## evaluations

Representa evaluaciones solicitadas por usuarios.

Campos principales:

- id
- userId
- propertyId
- investmentId
- evaluationType
- status
- price
- notes
- createdAt
- updatedAt

evaluationType:

- basic
- intermediate
- advanced

status:

- REQUESTED
- IN_PROGRESS
- COMPLETED
- REJECTED

---

## dossiers

Representa dossiers de inversión o presentación profesional.

Campos principales:

- id
- title
- propertyId
- investmentId
- ownerId
- fileUrl
- status
- createdAt
- updatedAt

status:

- REQUESTED
- IN_PROGRESS
- DELIVERED
- ARCHIVED

---

## favorites

Representa favoritos guardados por usuarios.

Campos principales:

- id
- userId
- propertyId
- investmentId
- createdAt

---

## notifications

Representa notificaciones internas.

Campos principales:

- id
- userId
- title
- message
- read
- createdAt

---

## messages

Representa mensajes internos o solicitudes de contacto.

Campos principales:

- id
- senderId
- receiverId
- propertyId
- investmentId
- subject
- message
- status
- createdAt

status:

- SENT
- READ
- ARCHIVED

---

## leads

Representa contactos comerciales recibidos desde WhatsApp, formularios o botones de interés.

Campos principales:

- id
- name
- phone
- email
- source
- propertyId
- investmentId
- message
- status
- createdAt

source:

- whatsapp
- form
- share
- social
- referral

status:

- NEW
- CONTACTED
- QUALIFIED
- CLOSED
- LOST

---

## service_requests

Representa solicitudes de servicios premium.

Campos principales:

- id
- userId
- propertyId
- investmentId
- serviceType
- status
- quotedPrice
- notes
- createdAt
- updatedAt

serviceType:

- photography
- video
- drone
- virtual_tour
- dossier
- digital_campaign
- legal_review
- valuation

status:

- REQUESTED
- QUOTED
- APPROVED
- IN_PROGRESS
- COMPLETED
- CANCELLED

---

## audit_logs

Registro interno de acciones administrativas.

Campos principales:

- id
- adminId
- action
- targetCollection
- targetId
- notes
- createdAt

Ejemplos de action:

- APPROVE_PROPERTY
- REJECT_PROPERTY
- UPDATE_SCORE
- APPROVE_INVESTMENT
- REJECT_INVESTMENT
- DELETE_PROPERTY
- UPDATE_USER

---

## Firebase Storage

Documentos privados:

- cedulas
- personerias
- planos
- contratos
- estudios_tecnicos
- avaluos
- dossiers
- imagenes_propiedades
- videos_propiedades

Regla:

Los documentos sensibles no deben ser públicos.

Solo administradores autorizados podrán acceder a documentos privados.

---

## Roles y Permisos

Visitante:

- Ver propiedades publicadas.
- Ver oportunidades activas.
- Contactar por WhatsApp.
- Compartir publicaciones.

Usuario registrado:

- Guardar favoritos.
- Subir propiedades.
- Solicitar evaluaciones.
- Solicitar servicios premium.
- Consultar estado de publicaciones.

Administrador:

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

## Monedas

Monedas iniciales:

- CRC
- USD
- EUR

---

## Idiomas

Idiomas previstos:

- es
- en

Idioma inicial:

- es

---

## Principios Técnicos

- No mostrar datos privados públicamente.
- Separar datos públicos de documentos sensibles.
- Mantener estados claros.
- Mantener timestamps en todas las entidades principales.
- Registrar acciones críticas en audit_logs.
- Diseñar para Costa Rica y España desde el inicio.
