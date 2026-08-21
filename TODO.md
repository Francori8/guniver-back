# TODO — Guniverse

Roadmap de trabajo pendiente. Prioridad de arriba hacia abajo dentro de cada sección.

## 0. Restablecer contraseña — ✅ Hecho

Implementado reutilizando el mecanismo de `inviteToken`/`inviteTokenExpiresAt`
que ya existía para activar cuenta:

- ✅ `POST /auth/forgot-password` — no revela si el email existe (siempre 200/201).
- ✅ `POST /auth/reset-password` — valida token + expiración (1h), invalida el
  token tras usarlo (no se puede reusar).
- ✅ `MailService.sendPasswordResetEmail`.
- ✅ Frontend: `/olvide-password` y `/reset-password`, link en `/login`.
- ✅ `POST /auth/change-password` (usuario ya logueado, requiere la contraseña
  actual) + formulario colapsable en `/profile` — antes solo existía el reset
  "sin sesión" y el `PUT /users/:id` admin-only; un estudiante logueado no tenía
  forma de cambiar su propia contraseña.
- ✅ 7 tests e2e nuevos en `test/auth.e2e-spec.ts` (16 total en el archivo).

Pendiente, no bloqueante:
- ✅ Rate limiting en `forgot-password` (2026-08-21): `@nestjs/throttler`,
  guard global 60 req/min + `@Throttle` específico de 3 cada 5 min en
  `forgot-password` (`auth.controller.ts`).

**Migración de auth: cookies httpOnly → Bearer token + localStorage
(2026-08-21).** Se detectó que la cookie cross-domain (`sameSite: 'none'`)
causaba fallos intermitentes de login (confirmado en un caso real: un usuario
no podía entrar, funcionaba en incógnito de forma inconsistente) — problema
típico de cookies cross-site según navegador/config. Se decidió migrar a
Bearer token en `localStorage` por simplicidad y debuggeabilidad, priorizando
eso sobre el hardening XSS que dan las cookies httpOnly (evaluado y aceptado
como trade-off razonable para esta etapa del proyecto, con `dompurify` ya
mitigando parcialmente).
- ✅ Backend: `auth.controller.ts` ya no setea/limpia cookies en
  login/activate-account/reset-password/logout — solo devuelve `access_token`
  en el body. `jwt.strategy.ts` simplificado a extraer solo de
  `Authorization: Bearer`. `main.ts` sin `cookie-parser` ni `credentials: true`
  en CORS.
- ✅ Frontend: `lib/axios.ts` con interceptor de request que inyecta
  `Authorization: Bearer <token>` desde `localStorage` (sin `withCredentials`).
  `AuthContext.tsx` con `login(token)`/`logout()` que manejan el
  `localStorage`; `checkAuth()` solo pega a `/auth/me` si hay token guardado.
  Actualizados `login`, `activar-cuenta`, `reset-password` para usar el nuevo
  `login()`.
- ✅ Usuarios con cookie vieja: logout transparente (mismo flujo que sesión
  expirada), no requiere ninguna migración de datos.
- ✅ Tests e2e de `auth.e2e-spec.ts` actualizados al nuevo contrato sin cookies
  (16 tests, todos pasan).

- ✅ **`JWT_SECRET` con fallback inseguro — arreglado (2026-08-21):**
  `auth.module.ts` y `jwt.strategy.ts` tenían `configService.get('JWT_SECRET')
  || 'secretKey'` — si faltaba la env var, la app arrancaba igual firmando
  tokens con un secreto trivial y público (visible en el propio repo). Ahora
  ambos lanzan `Error` al bootstrap si `JWT_SECRET` no está definida, en vez
  de caer al default. Confirmado que `JWT_SECRET` ya está seteada en
  `.env`/`.env.test`/`.env.example` y en las env vars de Railway (producción),
  así que el cambio no afecta ningún entorno existente.

## 1. Estudiantes pueden subir material con categoría

Hoy `POST /uploads` y `POST /study-materials` son exclusivos de `RoleName.ADMIN`
(`src/modules/Uploads/uploads.controller.ts`, `src/modules/StudyMaterial/study_material.controller.ts`).
Habilitar que un estudiante suba apuntes propios implica:

**Flujo decidido (sesión 2026-08-21):**
- Todo material subido por un estudiante queda marcado como tal (se guarda
  quién lo subió, ya existe `uploadedBy`) y **queda `pending` hasta que un
  admin lo apruebe** — no se publica directo, para evitar que alguien mande
  cualquier cosa sin revisión.
- La cola de revisión vive en una **sección nueva del panel admin**
  (`/admin/study-material-requests` o similar), mismo patrón que ya usan
  `AccessRequest`/`CareerRequest` — no se mezcla como filtro dentro de la
  vista actual de `/admin/materials` (que sigue siendo el catálogo ya
  aprobado/publicado).
- Límite de tamaño/tipo de archivo **más restrictivo que el del admin** (hoy
  admin sube hasta 20MB sin restricción de extensión — ver
  `uploads.controller.ts`): para estudiantes, limitar a extensiones típicas
  (PDF/imágenes/docs) y un tamaño menor (ej. 10MB), para reducir riesgo de
  abuso o archivos ejecutables.

- [ ] Nuevo estado en `StudyMaterial` (`status: pending | approved | rejected`,
      similar a `AccessRequestStatus`) + endpoints de listar/aprobar/rechazar
      para admin, siguiendo el mismo patrón ya usado en
      `AccessRequest`/`CareerRequest` (incluido el use-case pattern del repo).
- [ ] Relajar el guard de `POST /uploads` y `POST /study-materials` para permitir
      cualquier usuario autenticado (no solo ADMIN), pero atado a que el material quede
      asociado a `uploadedBy` = el usuario logueado (ya existe el campo, solo falta usarlo
      para estudiantes en vez de siempre admins), y forzado a `status: pending`
      si quien sube no es ADMIN.
- [ ] "Categoría" = probablemente el `MaterialType` existente (TEORICO/PRACTICO/VIDEO/etc.),
      confirmar si alcanza o si un estudiante necesita categorías propias/libres.
- [ ] Backend: validación de extensión + tamaño más estricta cuando el uploader
      no es ADMIN (mismo endpoint de `uploads.controller.ts`, regla condicional
      por rol).
- [ ] Frontend: formulario de "subir apunte" accesible desde `/dashboard` (no solo
      desde `/admin/materials`), con selector de materia + tipo.
- [ ] Frontend admin: nueva sección de moderación (listar pending, aprobar,
      rechazar con motivo) — igual que `admin/access-requests` y
      `admin/career-requests`.
- [ ] Mostrar en la vista pública del material (una vez aprobado) que fue
      "Subido por un estudiante" con el nombre, para distinguirlo del material
      oficial curado por admin.

## 2. Vincular universidades

Repasar qué tan conectado está `University` al resto del dominio — hoy parece que
`Career` cuelga de una `University`, pero conviene confirmar:

- [ ] ¿Un estudiante puede pertenecer a más de una universidad (vía `StudentProfile`
      por carrera)? Revisar `ProfileService.createProfile` y si tiene sentido permitir
      múltiples `university` simultáneas por usuario.
- [ ] Filtrar `/dashboard/buscar` y el catálogo de materias por universidad del usuario,
      no solo por carrera — hoy `subjectService.getAll({ careerId })` no distingue
      universidad si dos carreras de distintas universidades comparten nombre.
- [ ] Revisar el formulario público `/solicitar-acceso`: ya carga `publicDirectoryService`
      con universidad → carrera en cascada; confirmar que ese flujo sigue siendo la
      única puerta de entrada, o si hace falta uno directo por universidad.
- [ ] Decidir alcance real de este punto con más detalle (este ítem quedó abierto,
      conviene una sesión aparte para precisar qué "vincular" significa en concreto).

## 3. CI/CD

- ✅ GitHub Actions básico (2026-08-21): `.github/workflows/ci.yml`, corre en
  cada PR y push a `main`, dos jobs en paralelo:
  - `build-and-unit`: `pnpm build` + `pnpm exec jest --passWithNoTests` (no
    hay unit tests todavía en `src/`, solo e2e — el flag evita que el job
    falle por "no tests found").
  - `e2e`: Postgres 16 como `services:` del runner (no via
    `docker compose`, más simple en GH Actions) + `jest --config
    ./test/jest-e2e.json --runInBand`. Verificado local: 8 suites, 58 tests,
    todos pasan.
- [ ] Considerar agregar al menos algún unit test real más adelante (hoy
  `build-and-unit` compila y corre "cero tests" con éxito — sirve para
  cachear el build/lint pero no agrega cobertura nueva).
- [ ] Bloquear merge a `main` si el CI falla (branch protection en GitHub —
      hay que configurarlo desde la UI de GitHub, no desde el repo).
- [ ] Deploy automático: hoy Railway/Vercel probablemente ya redeployan en push a
      `main` — confirmar que las migraciones corren *antes* de que el server nuevo
      reciba tráfico. Ver nota de riesgo más abajo sobre este mismo mecanismo.
- [ ] Cuando el proyecto tenga más de una instancia del backend corriendo a la vez,
      separar "correr migraciones" de "arrancar el server" en pasos de CI/CD
      distintos, en vez de encadenarlos en el Start Command de Railway (repetir
      la migración en cada réplica al arrancar deja de ser seguro con >1 instancia,
      y complica el rollback en migraciones destructivas).

## 4. Otras oportunidades de mejora (relevadas en esta sesión)

### Riesgo medio
- [ ] **`MaterialType` es un enum de TypeScript hardcodeado** (`study_material.entity.ts`),
      no una tabla editable. Agregar/renombrar una categoría hoy requiere tocar
      código + migración + redeploy, no algo que un admin pueda hacer desde la UI.
      Con 429 materiales ya cargados sobre las 7 categorías actuales, no hay
      presión concreta para migrar a tabla — pero si en algún momento se necesita
      que un admin cree categorías nuevas sin deploy (o categorías específicas
      por carrera), ahí sí vale la pena migrar a una entidad `MaterialCategory`
      con `ManyToOne` desde `StudyMaterial` (mismo patrón que `Career`/`Subject`),
      con su propio CRUD admin y una migración de datos para los 429 registros
      existentes.
- [ ] **Sin tests e2e de StudyMaterial/Uploads/Profile.** Los 8 módulos con más
      tests (Auth, AccessRequest, CareerRequest, Role, User, University, Career,
      Subject — 51 tests total) están cubiertos; StudyMaterial (con el nuevo campo
      `order` y el endpoint de `reorder`) no tiene ninguno todavía.
- ✅ **Patrón de bug repetido — revisado (2026-08-21):** ya aparecieron y se
      arreglaron 5 veces services que usaban `Object.assign(entity, updates)`
      directo en vez de `repository.assign(entity, updates, { ignoreUndefined:
      true })`, lo que pisaba campos no enviados con `NULL`. Confirmado que
      los 5 módulos (`user.service.ts:118`, `university.service.ts:56`,
      `career.service.ts:95`, `subject.service.ts:124`,
      `study_material.service.ts:150`) usan el patrón correcto hoy — no
      quedó ningún `update()` con el bug suelto. Los `Object.assign(this,
      partial)` que aparecen en `*.response.dto.ts` son otra cosa (constructor
      de DTO, no entidad persistida) y no aplica el mismo riesgo. Si se agrega
      un `update()` nuevo a mano en otro módulo, replicar el patrón correcto
      desde el arranque.
- ✅ **Paginación — implementada parcialmente (2026-08-21):** contrato
      `GET /recurso?page=1&limit=20` → `{ data, total, page, limit }`, mismo
      endpoint (sin ruta nueva) para no duplicar caminos. Helper genérico
      `BaseRepository.findPaginated()` + `PaginationQueryDto` /
      `PaginatedResult<T>` compartidos (`src/shared/`).
      - Paginados: `GET /users`, `GET /universities`, `GET /careers`,
        `GET /subjects` (con filtros `careerId`/`q` combinables), y nuevo
        `GET /careers/university/:id/paginated` (pensado para el flujo
        anidado de admin, ver abajo).
      - **`GET /study-materials` queda sin paginar a propósito.** El admin
        de materiales (`admin/materials/page.tsx`) hace drag & drop que
        necesita el array completo de cada `(subject, type)` para reordenar
        — paginar ahí requiere repensar esa pantalla, no es un cambio de
        contrato simple. Pendiente cuando se toque esa página puntualmente.
      - `GET /careers/university/:id` (sin `/paginated`) y
        `subjectService.getAll` con `careerId` en casos de "selector chico"
        (cascada universidad→carrera en formularios) se dejaron sin paginar
        deliberadamente — son listas acotadas por naturaleza, paginarlas
        agregaría complejidad sin beneficio.
      - Frontend: todos los consumidores de `userService`/`universityService`/
        `careerService`/`subjectService`.`getAll` actualizados al nuevo shape
        `{ data, total, page, limit }`. Las vistas que necesitan "todo" (no
        una página) piden `limit=1000` explícito en vez de armar UI de
        paginación — pragmático por ahora, no es la solución final para
        cuando el volumen crezca de verdad.
      - Tests e2e actualizados (`user`, `university`, `subject` e2e-spec) —
        8 suites, 58 tests, todos pasan.
      - **Pendiente:** UI de paginación real (botones página siguiente/
        anterior) en las tablas admin — hoy se "resuelve" pidiendo
        `limit=1000`, que no escala indefinidamente. Ligado a la mejora de
        UX del admin ya anotada en la sección 5.
- ✅ **`order` sin autocompletar al crear material — arreglado (2026-08-21):**
      `study_material.service.ts` `create()` no seteaba `order` (quedaba en
      `0` por default de la entidad), chocando con cualquier otro material ya
      en `0` dentro del mismo `(subject, type)` — el orden real dependía de
      un desempate no intencional hasta que un admin lo arreglaba a mano vía
      drag & drop. Ahora `StudyMaterialRepository.getNextOrder(subjectId,
      type)` calcula `MAX(order) + 1` dentro de ese grupo y se usa como
      default en `create()`; `CreateStudyMaterialDto.order` sigue siendo
      opcional por si se quiere forzar una posición específica. Frontend no
      necesitó cambios — ya no manda `order` en el payload de creación, así
      que se beneficia del autocompletado sin tocar nada.
- [ ] **`viewCount`/`downloadCount` ya se incrementan pero no se muestran en
      ningún lado del frontend.** `findPopular()` en el repo ya ordena por
      `viewCount` — falta exponer un ranking de "más populares" en algún panel
      (admin o dashboard del estudiante).
- ✅ **Log de auditoría de acciones admin — backend implementado (2026-08-21).**
      Motivación: con varios admins operando, hoy no había forma de saber quién
      borró/aprobó/rechazó algo si hacía falta investigar un cambio raro (surgió
      justo el mismo día por un caso real: un usuario promovido a ADMIN seguía
      viendo 403 porque su JWT viejo tenía el rol anterior — con el log ahora
      queda trazado quién y cuándo hizo el cambio de rol).
      - Módulo nuevo `AuditLog` (`entity`, `repository`, `service`,
        `controller`, `module`) siguiendo el mismo patrón `BaseRepository` del
        resto del repo. Tabla `audit_log` (`id`, `actor_id` FK a `user`,
        `action: CREATE|UPDATE|DELETE|APPROVE|REJECT|ROLE_CHANGE`,
        `entity_type: User|University|Career|Subject|StudyMaterial|
        AccessRequest|CareerRequest`, `entity_id`, `metadata jsonb?`,
        `created_at`) — migración `Migration20260821184629` ya generada y
        aplicada.
      - `AuditLogService.log(actorUserId, action, entityType, entityId,
        metadata?)` conectado en los puntos de mutación de los 5 módulos CRUD
        (`University`/`Career`/`Subject`/`StudyMaterial`/`User` — create/
        update/delete, más restore/permanentDelete en StudyMaterial) y los 4
        use-cases de aprobar/rechazar (`AccessRequest`/`CareerRequest`). Los
        controllers que no recibían `@Request()` lo agregaron para pasar
        `req.user.userId` como actor.
      - `UserService.updateUser` distingue `ROLE_CHANGE` de `UPDATE` normal
        cuando el `roleId` cambia, guardando `{ from, to }` en `metadata`.
      - `GET /audit-logs` (admin-only, paginado) para consultar — sin UI en
        el frontend todavía, el valor está en que el dato exista y sea
        consultable (por API o SQL directo) si hace falta investigar algo.
      - 3 tests e2e nuevos (`audit-log.e2e-spec.ts`): acceso restringido a
        admin, entrada `CREATE` al crear una universidad, entrada
        `ROLE_CHANGE` con `from`/`to` correctos al cambiar el rol de un
        usuario. 9 suites, 61 tests totales, todos pasan.
      - Explícitamente fuera de alcance: analytics de estudiantes (ver ítem
        siguiente) — son dos cosas separadas con dueños distintos (seguridad/
        trazabilidad vs. producto), no mezcladas en la misma tabla.
      - **Pendiente:** vista de solo lectura en el panel admin (tabla
        filtrable por usuario/entidad/fecha) — hoy el endpoint existe pero no
        hay UI que lo consuma.
- [ ] **Analytics de uso de estudiantes** (idea 2026-08-21, más grande que el
      log de auditoría de arriba — evaluar bien el esfuerzo antes de
      arrancar). Ya existe `viewCount`/`downloadCount` por `StudyMaterial`,
      pero es solo un contador agregado (`+1` sin guardar quién ni cuándo) —
      **el número fácil de leer en un vistazo debe seguir existiendo tal
      cual está**, pero además tiene que poder desglosarse (aunque sea con
      una query SQL directa, no necesariamente con UI): "¿quién de esas 47
      vistas fue, y cuándo?".
      - Requiere una tabla de eventos individual además del contador
        agregado — algo tipo `MaterialView`
        (`id`, `student_user_id`, `study_material_id`, `viewed_at`) y
        `MaterialDownload` equivalente (o una tabla genérica de eventos con
        `type: view | download` si se prefiere no duplicar estructura).
      - El contador (`viewCount`/`downloadCount`) se mantiene igual —
        seguiría siendo un `+1` en el mismo momento en que se inserta el
        evento detallado, no se reemplaza, son dos cosas que conviven (una
        para el vistazo rápido, otra para el desglose).
      - Expandir la idea a nivel sesión/usuario para entender patrones de uso
        reales (qué materias/materiales se miran más, por qué carrera, en qué
        época del cuatri).
      - Sin decisiones de modelo cerradas del todo — pendiente de una sesión
        de diseño aparte si se decide encarar (ej. si además de material
        conviene trackear "entró a tal materia", no solo "vio tal archivo").

### Riesgo bajo / pulido
- [ ] **Frontend sin tests** (se decidió priorizar backend por ahora — revisar
      si conviene sumar al menos smoke tests de los flujos críticos: login,
      crear solicitud, aprobar/rechazar).
- [ ] Sin páginas 403/404 personalizadas en el frontend.
- [ ] El `Modal` (`app/components/Modal.tsx`) no se verificó visualmente en
      viewports muy chicos (320–375px) — revisar padding lateral.
- [ ] `MarkdownViewer` hace `fetch()` directo del navegador a la URL firmada de
      Cloudinary — funciona hoy, pero si en algún momento Cloudinary cambia el
      comportamiento de CORS para recursos `authenticated`, va a hacer falta un
      proxy en el backend que traiga el contenido en vez del fetch directo.
- [ ] `.env.example` del frontend no existe — solo el del backend. Sumarlo para
      documentar `NEXT_PUBLIC_API_URL` y bajar la fricción de onboarding.

## 5. UX del panel admin (auditoría 2026-08-21)

Relevado sobre las 9 páginas de `app/(dashboard)/admin/`. Ordenado por qué es
más molesto para un admin usando esto día a día.

### Prioridad alta
- ✅ **Sistema de toasts + captura de errores — resuelto (2026-08-21).**
      Nuevo `ToastContext`/`ToastContainer` (`app/context/ToastContext.tsx`,
      `app/components/ToastContainer.tsx`), montado a nivel raíz en
      `layout.tsx`. `ConfirmDialog.tsx` arreglado: antes el `try/finally` sin
      `catch` dejaba que el error de `onConfirm` (delete/reject/restore) se
      perdiera en silencio; ahora captura, muestra el mensaje inline en el
      diálogo y dispara un toast de error. Agregado `successMessage` en los
      13 usos de `ConfirmDialog` (delete/reject/restore/permanent-delete) y
      toast de éxito en los 9 `handleSubmit` de crear/editar (universidades,
      carreras, materias, usuarios, roles, materiales, access-requests,
      career-requests). El rollback silencioso del drag & drop de materiales
      (`materials/page.tsx`) ahora también dispara un toast de error antes de
      revertir.

### Prioridad media
- [ ] **Sin paginación, búsqueda ni filtros** en `users`, `roles`,
      `universities`, `careers`, `subjects`, `access-requests`,
      `career-requests`, `materials/papelera` (7 de 9 páginas). El *backend*
      ya soporta paginación (ver sección "Riesgo medio" arriba) pero el
      *frontend* pide `limit=1000` en vez de armar controles de página
      siguiente/anterior — sigue siendo "traer todo" desde la perspectiva del
      usuario, solo que ahora el contrato del backend ya no es el bloqueante.
      `materials/page.tsx` sigue siendo la única con buscador + filtro real.
- [ ] `users/page.tsx` reemplaza toda la página con un `<div>Loading...</div>`
      en texto plano (en inglés, inconsistente con el resto de la app en
      español) mientras carga `roles` — pierde el layout completo
      (back-link, título) a diferencia de las otras 8 páginas, que delegan
      el loading solo a la tabla.
- ✅ **"Restaurar" en `materials/papelera` sin `ConfirmDialog` — resuelto
      (2026-08-21).** Ahora pasa por `ConfirmDialog` (`variant="primary"`,
      con `successMessage`) igual que el resto de acciones del admin, en vez
      de ejecutarse directo al click sin ningún paso intermedio.
- [ ] Cuando falla la carga de datos dependientes de un `<select>` (ej.
      universidades/carreras en el modal de aprobar acceso), el error nunca
      se muestra — el selector queda vacío sin explicar si no hay datos o si
      falló la request (`access-requests`, `subjects`, `materials`).
- [ ] Buscador ausente en el checklist de carreras del modal de Materias
      (`subjects/page.tsx`) — lista scrolleable sin forma de filtrar si hay
      muchas universidades/carreras.

### Prioridad baja
- [ ] `AdminGuard.tsx` usa clases de color hardcodeadas (`bg-gray-900
      text-white`) en vez de las variables de tema del resto de la app — si
      se agrega modo claro, la pantalla de "Verificando permisos..." queda
      inconsistente.
- [ ] Tablas con muchas columnas (ej. `access-requests`, 5 columnas con
      contenido ancho) generan scroll horizontal constante en mobile — no
      roto (`overflow-x-auto` ya está), pero sin columnas prioritarias/
      colapsables para achicar la fricción.
- ✅ **Breadcrumbs reales — resuelto para el flujo anidado (2026-08-21),
      pendiente en el resto.** Nuevo componente `Breadcrumb.tsx` con navegación
      real (`Admin > Universidades > UNQ > Tec. en Prog. > Bases de Datos`) en
      las 3 páginas nuevas del flujo anidado (ver sección más abajo). Las
      páginas planas viejas (`admin/materials/papelera`, etc.) siguen usando
      solo `AdminBackLink` — no se tocaron, quedan como estaban.
- [ ] Formularios validan solo con `required` nativo de HTML5, sin mensajes
      inline por campo (ej. formato de email, longitud de password) — todo
      el feedback de validación depende del error genérico del backend tras
      el submit.

## 6. Flujo anidado de admin: Universidad → Carrera → Materia → Material (2026-08-21)

Antes las 4 entidades se administraban en páginas planas sin relación visual
entre sí (`/admin/universities`, `/admin/careers`, `/admin/subjects`,
`/admin/materials`), a pesar de ser una jerarquía real
(`University → Career → Subject → StudyMaterial`). Se agregó un camino de
navegación por "drill-down" con breadcrumb, **sin reemplazar** las páginas
planas existentes (conviven ambas — la plana sirve para ver/filtrar todo de
una entidad sin importar el padre, ej. todas las materias del sistema; la
anidada sirve para trabajar dentro del contexto de una universidad/carrera
puntual).

- ✅ Rutas nuevas: `/admin/universities/[id]` (carreras de esa universidad),
  `/admin/universities/[id]/careers/[careerId]` (materias de esa carrera),
  `/admin/universities/[id]/careers/[careerId]/subjects/[subjectId]`
  (materiales de esa materia).
- ✅ Cada nivel es clickeable desde el nivel anterior (fila de la tabla →
  siguiente nivel) y muestra `Breadcrumb` con navegación real.
- ✅ El botón "Crear" en cada nivel precompleta el campo padre (universidad/
  carrera/materia) sin pedirlo en el formulario — ej. crear una materia desde
  dentro de una carrera ya manda `careerIds: [careerId]` fijo.
- ✅ `careerService.getOne`/`universityService.getOne` agregados (no existían).
- ✅ Toasts de éxito/error en los 3 niveles nuevos (mismo patrón que el resto
  del admin, ver sección 5).
- [ ] La página de materiales dentro de este flujo
  (`subjects/[subjectId]/page.tsx`) es una lista plana simple (crear/editar/
  eliminar), **sin** el drag & drop de reordenar que sí tiene
  `admin/materials/page.tsx` — si se quiere reordenar, hay que ir a la
  página plana general. No se duplicó esa lógica a propósito (es compleja,
  con estado local optimista) — evaluar si vale la pena unificar más
  adelante.
- [ ] Verificado con `tsc --noEmit` y `next build` en ambos casos, pero
  **falta la prueba visual completa en navegador** (crear en cada nivel,
  navegar los 4 niveles) — pendiente de confirmar por el usuario.

## Fase 2 (después de todo lo anterior)

Trabajo más grande, a encarar recién cuando los puntos 0–4 de arriba estén
resueltos. No son mejoras chicas — cada uno es una feature nueva que merece su
propia sesión de diseño.

### Vista de estado de carrera (árbol de correlativas)

Que un estudiante pueda ver su avance en la carrera como un árbol/mapa visual:
qué materias aprobó, cuáles tiene habilitadas para cursar, y cuáles le faltan
por correlativas pendientes. Hoy el dominio no tiene ningún concepto de
"correlatividad", "módulo de carrera" ni de "materia aprobada por un alumno"
— es una feature nueva de punta a punta, no una extensión de algo existente.

**Modelo acordado** (basado en cómo lo expone el SIU Guaraní real — ver sesión
2026-08-21): una `Subject` hoy es `ManyToMany` con `Career` sin atributos
propios (`subject.entity.ts`), y `credits` vive en `Subject` como si fuera un
valor único global. Eso no alcanza: la misma materia puede pesar distinto
crédito y pertenecer a un módulo distinto según la carrera (confirmado con
planes reales de Tec. en Prog. y Lic. en Informática de UNQ, misma materia,
créditos iguales por coincidencia pero no garantizado). Además el SIU expone
correlativas con esta estructura (no es solo "materia A requiere materia B"):

- Requisitos separados para **"Para cursar"** y **"Para aprobar"** (pueden
  diferir).
- Dentro de cada uno, una o más **opciones alternativas** ("Opción 1",
  "Opción 2"... = OR entre grupos; dentro de un grupo, todas las condiciones
  son AND).
- Cada condición es de uno de tres tipos: materia puntual aprobada, créditos
  acumulados dentro de un módulo específico, o módulo completo aprobado.
- Los módulos también pueden ser **optativos por umbral de créditos** (ej.
  "Núcleo de Orientación": ~10 materias listadas, pero se cursan solo las
  necesarias para acumular N créditos, no todas — con materias que a veces
  se comparten entre dos núcleos distintos).

Entidades nuevas:
- `CareerModule` (`id`, `career_id`, `name`, `order`, `type: 'obligatorio' |
  'optativo_por_creditos'`, `required_credits?`).
- `CareerSubject` (`id`, `career_id`, `subject_id`, `module_id`, `credits`) —
  reemplaza el M2M simple actual; es la entidad real de "esta materia dentro
  de esta carrera", con sus atributos propios de esa carrera.
- `RequirementGroup` (`id`, `career_subject_id`, `kind: 'cursar' | 'aprobar'`,
  `option_number`) — una "opción" evaluable independientemente.
- `RequirementItem` (`id`, `requirement_group_id`, `type: 'subject_approved' |
  'module_credits' | 'module_complete'`, `target_subject_id?`,
  `target_module_id?`, `required_credits?`).
- Regla de evaluación: al menos un `RequirementGroup` del `kind` correspondiente
  debe cumplirse por completo (todos sus `RequirementItem` en AND) para
  habilitar cursar/aprobar esa materia.

**Alcance para la primera versión (acordado explícitamente):** el modelo se
diseña genérico (soporta múltiples opciones OR, y cursar/aprobar con reglas
distintas, porque otras universidades sí lo usan así) pero la implementación
inicial —carga de datos y lógica de evaluación— se simplifica al caso real
de la carrera propia: una sola opción por materia, y "para cursar" = "para
aprobar" siempre. No construir UI para múltiples opciones ni para reglas
cursar/aprobar distintas todavía; el schema ya las soporta para cuando haga
falta.

**Subdividido en 3 entregas incrementales** (acordado 2026-08-21), cada una
shippeable y útil por sí sola sin esperar a la siguiente:

#### Fase 2 — Árbol estático (solo catálogo, sin progreso por usuario)

Vista de consulta: todas las materias de la carrera con sus correlativas
visibles, para que el estudiante entienda el mapa completo y sepa qué sigue
— sin todavía guardar el progreso de nadie. Es la base de datos (catálogo) +
el visual, nada de estado por usuario.

- [ ] Migrar `Subject`↔`Career` de M2M simple a `CareerSubject` (con datos
      existentes: script de migración que cree una fila `CareerSubject` por
      cada par actual, usando el `credits` que hoy tiene `Subject`).
- [ ] Modelar `CareerModule`, `RequirementGroup`, `RequirementItem` como
      arriba.
- [ ] Carga inicial de correlativas: 100% manual (el SIU no las expone
      exportables/estructuradas, solo se ven en su UI web). Es data entry
      considerable (~40-50 materias por carrera) — evaluar si conviene una
      pantalla de admin cómoda para cargar esto desde el día uno, en vez de
      insertar a mano por SQL/seed.
- [ ] Admin: carga masiva de correlativas por carrera (probablemente vía CSV o
      un formulario dedicado, dado el volumen — una carrera puede tener 30+
      materias con dependencias entre sí).
- [ ] Backend: endpoint para consultar el árbol completo de una carrera
      (catálogo, sin progreso de usuario todavía).
- [ ] Frontend: componente de árbol/grafo visual (evaluar librería — algo tipo
      React Flow para nodos conectados, o un layout más simple de columnas por
      "nivel" si las correlativas no forman ciclos complejos).

#### Fase 2.5 — Progreso personal por cuatrimestre

Sobre el árbol estático de la Fase 2, el estudiante empieza a marcar su propio
avance agrupado por `Term`: qué cursó y qué aprobó cada cuatrimestre. El árbol
deja de ser genérico y pasa a reflejar el progreso real de cada usuario,
habilitando/deshabilitando materias en base a eso.

**Cargar un `Term` tiene que soportar retroactivo desde el día uno**, no solo
el cuatri en curso — el estudiante tiene que poder cargar cuatris ya pasados
(para reconstruir su historial completo) sin que el horario sea un requisito.
El horario (Fase 3, `ScheduledSubject`) es siempre opcional y typically
ausente en cuatris viejos, nadie va a reconstruir a mano el horario de algo
que ya pasó — el `Term` tiene que quedar completo y útil (materias + notas)
aunque nunca tenga horario asociado.

- [ ] Modelar `Term` (cuatrimestre: `id`, `year`, `period` ej. 1ero/2do) sin
      asumir que es siempre el actual — el estudiante puede crear/cargar
      `Term`s pasados retroactivamente para completar su historial.
- [ ] Modelar el estado de cursada del estudiante: `SubjectProgress`
      (`student`, `career_subject`, `term_id?`,
      `status: aprobada | cursando | pendiente | habilitada`) — hoy
      `StudentProfile` solo guarda la carrera/universidad, no el detalle
      materia por materia.
- [ ] Import opcional desde PDF del historial del SIU (idea 2026-08-21): el
      "Plan de estudios" que exporta el SIU Guaraní es texto extraíble (no
      imagen escaneada) con materia, nota, créditos por fila — se podría
      parsear para precargar `Term`s pasados y `SubjectProgress` en vez de
      tipear todo a mano. Mejora sobre la carga manual, no un requisito para
      que Fase 2.5 funcione — evaluar recién cuando la carga manual ya ande.
- [ ] Decidir cómo se carga ese estado: ¿autodeclarado por el estudiante,
      cargado por un admin, o importado de un sistema académico externo?
      (afecta mucho el diseño — no es lo mismo confiar en el usuario que
      requerir aprobación).
- [ ] Backend: endpoints para que el estudiante cree/gestione sus `Term`, les
      agregue materias (idealmente solo las que el árbol marca como
      habilitadas), y marque resultado (nota + aprobada/regularizada/libre)
      al cerrar el cuatri — eso actualiza `SubjectProgress` y recalcula qué
      se habilita después.
- [ ] Frontend: el árbol de la Fase 2 ahora se pinta con el progreso real del
      usuario logueado (aprobada/cursando/pendiente/habilitada), y una vista
      de "mis cuatrimestres" para armar/cerrar cada uno.
- [ ] **Nota de diseño (pendiente de decidir):** hoy el `order` de `StudyMaterial`
      (drag & drop en `admin/materials`) es un orden manual, independiente de
      cualquier estructura de la carrera. Cuando exista el árbol de correlativas,
      evaluar si el orden de "Mis Materias" (`/dashboard`, con buscador agregado)
      debería reflejar el árbol (materias más tempranas primero según nivel/año)
      en vez del orden alfabético actual de `SubjectCard`. No es lo mismo
      ordenar *materiales dentro de una materia* (ya resuelto) que ordenar
      *materias dentro de una carrera* según su posición en el plan de estudios
      (no resuelto, y depende de que el árbol de correlativas exista primero).

### Fase 3: Calendario dinámico por cuatrimestre

Idea (sesión 2026-08-21): retomar y adaptar https://francori8.github.io/calendarioDinamico/
(prototipo standalone previo del mismo autor, código no disponible en este repo
— habría que rehacerlo integrado, no portar el proyecto viejo). La versión
vieja era un generador manual de horarios: el usuario agrega materias y define
franjas horarias (día, hora inicio/fin) a mano, sin persistencia ni conexión a
ningún dato real de la carrera.

Objetivo para Guniverse: que cada cuatrimestre el estudiante pueda cargar (o
en el futuro importar) los horarios reales de sus materias — con la
particularidad de que el SIU suele publicar primero un horario **tentativo**
y después uno **definitivo/seguro**, así que el modelo tiene que soportar ese
estado intermedio, no asumir que el horario cargado es siempre final. A partir
de esos horarios se arma el calendario visual del cuatri.

**Es una capa visual sobre la Fase 2.5, no una feature aparte.** El `Term` y
el flujo de agregar materias/cerrar con nota ya se definen en la Fase 2.5 —
acá solo se suma el horario (día/hora) de cada materia dentro de ese mismo
`Term`, opcional: si no se carga horario, el `Term` funciona igual sin
calendario visual (el calendario "aparece solo" cuando hay datos cargados).

Los horarios se guardan **atados al `Term` histórico**, no solo al cuatri
activo — tiene que poder consultarse "qué cursé y a qué hora en 2026-2do" en
cualquier momento futuro, no solo mientras ese cuatri está en curso.

- [ ] Modelar `ScheduledSubject` (`career_subject_id`, `term_id`, `status:
      tentativo | confirmado`) — vincula el horario de una materia a un `Term`
      concreto ya existente (Fase 2.5), y persiste en el histórico del
      estudiante (no se pisa entre cuatris).
- [ ] Modelar los horarios en sí: franjas día/hora por `ScheduledSubject`
      (posible entidad `ScheduleSlot`: `day_of_week`, `start_time`, `end_time`).
- [ ] Carga manual primero (formulario tipo el prototipo viejo, pero guardando
      en el modelo de arriba en vez de solo en memoria/localStorage). Evaluar
      import automático desde el SIU recién como mejora posterior — depende de
      si el SIU expone algo parseable (no confirmado todavía, igual que pasa
      con las correlativas).
- [ ] Vincular `ScheduledSubject` con el resultado final: nota + estado
      (aprobada/regularizada/libre) al cerrar el cuatri — esto es lo que
      termina alimentando `SubjectProgress` de la Fase 2.
- [ ] Frontend: vista de calendario semanal (grilla día × hora) generada a
      partir de los `ScheduleSlot` del cuatri activo.

## Hecho (para referencia, no repetir)

- ✅ Tests e2e con Postgres real en Docker para Auth/AccessRequest/CareerRequest/
  Role/User/University/Career/Subject (51 tests).
- ✅ Deploy en producción: backend+DB en Railway, frontend en Vercel, CORS
  resuelto. (Nota: originalmente usaba cookie cross-domain `sameSite: 'none'`;
  migrado a Bearer token + localStorage el 2026-08-21, ver sección 0 arriba —
  esta entrada queda solo como referencia histórica del deploy en sí.)
- ✅ Visor de archivos `.md` (antes forzaban descarga) vía `MarkdownViewer` +
  `marked` + `dompurify`.
- ✅ Botón de descarga explícito en la vista de detalle de materia.
- ✅ Contadores `viewCount`/`downloadCount` cableados de punta a punta (antes
  existían en la entidad pero nunca se incrementaban).
- ✅ Campo `order` + reordenamiento drag & drop (admin) de materiales dentro de
  cada materia/tipo.
- ✅ Navegación mobile (bottom nav) — antes el sidebar desaparecía sin reemplazo
  por debajo de `md` y dejaba el dashboard/admin sin forma de navegar.
- ✅ Migraciones automáticas en cada deploy de Railway, vía **Pre-Deploy Command**
  (`pnpm migration:up`) en Settings → Deploy. **Importante:** dejar **Build
  Command y Start Command vacíos** (autodetección de Railpack) — poner un Start
  Command explícito ahí (probado con `pnpm start:prod` y con el comando
  compuesto `start:prod:migrate`) hacía que Railpack no reconociera que debía
  correr `nest build` antes, y el runtime crasheaba en loop con
  `Cannot find module '/app/dist/main'` aunque el build log mostrara `nest build`
  completándose sin error. Se descartó que fuera código (build/start funcionan
  igual en local) y que fuera el Pre-Deploy en sí (falla igual sin él). Solución
  final: Build/Start Command en blanco + solo Pre-Deploy Command con la migración.
- ✅ Puertos locales configurables sin pisar otro proyecto corriendo en la
  misma máquina (2026-08-21): el autor corre esto en paralelo con el
  proyecto del trabajo, que ya usa 3000/3001/5432. Back: `PORT` en `.env`
  (ya lo leía `process.env.PORT ?? 3000` en `main.ts`, no hubo que tocar
  código). Front: `package.json` `"dev": "next dev"` (antes tenía `-p 3001`
  hardcodeado) + `PORT` en `.env`, mismo patrón que el back. Local del autor:
  back en 3010, front en 3011, DB en el Postgres compartido con otra base
  (`DB_NAME` distinto). CORS del back (`main.ts`) tiene ambos orígenes
  (3001 y 3011) en la whitelist para que no rompa si conviven. Nada de esto
  afecta prod — las plataformas (Railway/Vercel) inyectan su propio `PORT`.
