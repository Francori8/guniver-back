# TODO — Guniverse

Roadmap de trabajo pendiente. Prioridad de arriba hacia abajo dentro de cada sección.

## 1. Estudiantes pueden subir material con categoría

Hoy `POST /uploads` y `POST /study-materials` son exclusivos de `RoleName.ADMIN`
(`src/modules/Uploads/uploads.controller.ts`, `src/modules/StudyMaterial/study_material.controller.ts`).
Habilitar que un estudiante suba apuntes propios implica:

- [ ] Definir el flujo: ¿el material de un estudiante se publica directo, o queda
      `pending` hasta que un admin lo apruebe? (recomendado: pending, mismo patrón
      que `AccessRequest`/`CareerRequest` — evita spam/contenido no verificado).
- [ ] Si hay aprobación: nuevo estado en `StudyMaterial` (`status: pending | approved | rejected`,
      similar a `AccessRequestStatus`) + endpoints de listar/aprobar/rechazar para admin.
- [ ] Relajar el guard de `POST /uploads` y `POST /study-materials` para permitir
      cualquier usuario autenticado (no solo ADMIN), pero atado a que el material quede
      asociado a `uploadedBy` = el usuario logueado (ya existe el campo, solo falta usarlo
      para estudiantes en vez de siempre admins).
- [ ] "Categoría" = probablemente el `MaterialType` existente (TEORICO/PRACTICO/VIDEO/etc.),
      confirmar si alcanza o si un estudiante necesita categorías propias/libres.
- [ ] Límite de tamaño/tipo de archivo más estricto para uploads de estudiantes
      (hoy `20MB` sin restricción de extensión — ver `uploads.controller.ts`).
- [ ] Frontend: formulario de "subir apunte" accesible desde `/dashboard` (no solo
      desde `/admin/materials`), con selector de materia + tipo.
- [ ] Frontend admin: vista de moderación si se implementa aprobación.

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

- [ ] GitHub Actions (u otro CI) que en cada PR corra:
  - `pnpm build` (falla si no compila)
  - `pnpm test` (unit)
  - `pnpm test:e2e` (necesita levantar `docker-compose.test.yml` en el runner — el
    workflow ya tiene todo lo necesario del lado del repo, solo falta el YAML)
- [ ] Bloquear merge a `main` si el CI falla (branch protection en GitHub).
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
- [ ] **Sin tests e2e de StudyMaterial/Uploads/Profile.** Los 8 módulos con más
      tests (Auth, AccessRequest, CareerRequest, Role, User, University, Career,
      Subject — 51 tests total) están cubiertos; StudyMaterial (con el nuevo campo
      `order` y el endpoint de `reorder`) no tiene ninguno todavía.
- [ ] **Patrón de bug repetido a vigilar:** ya aparecieron y se arreglaron 5 veces
      services que usaban `Object.assign(entity, updates)` directo en vez de
      `repository.assign(entity, updates, { ignoreUndefined: true })`, lo que
      pisaba campos no enviados con `NULL` (User, University, Career, Subject,
      StudyMaterial). Si se agrega un `update()` nuevo a mano en otro módulo,
      replicar el patrón correcto desde el arranque.
- [ ] **Paginación ausente** en los listados (`GET /users`, `GET /study-materials`,
      etc.) — no urge con el volumen actual pero escala mal.
- [ ] **`viewCount`/`downloadCount` ya se incrementan pero no se muestran en
      ningún lado del frontend.** `findPopular()` en el repo ya ordena por
      `viewCount` — falta exponer un ranking de "más populares" en algún panel
      (admin o dashboard del estudiante).

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

## Hecho (para referencia, no repetir)

- ✅ Tests e2e con Postgres real en Docker para Auth/AccessRequest/CareerRequest/
  Role/User/University/Career/Subject (51 tests).
- ✅ Deploy en producción: backend+DB en Railway, frontend en Vercel, CORS y
  cookie cross-domain (`sameSite: 'none'` en prod) resueltos.
- ✅ Visor de archivos `.md` (antes forzaban descarga) vía `MarkdownViewer` +
  `marked` + `dompurify`.
- ✅ Botón de descarga explícito en la vista de detalle de materia.
- ✅ Contadores `viewCount`/`downloadCount` cableados de punta a punta (antes
  existían en la entidad pero nunca se incrementaban).
- ✅ Campo `order` + reordenamiento drag & drop (admin) de materiales dentro de
  cada materia/tipo.
- ✅ Navegación mobile (bottom nav) — antes el sidebar desaparecía sin reemplazo
  por debajo de `md` y dejaba el dashboard/admin sin forma de navegar.
- 🚧 **Migraciones automáticas en cada deploy de Railway — en progreso, no
  resuelto todavía.** Configurado Build Command explícito (`pnpm install &&
  pnpm build`) + Pre-Deploy Command (`pnpm migration:up`) + Start Command simple
  (`pnpm start:prod`) en Settings → Deploy. El build log muestra `nest build`
  corriendo sin error, pero el runtime crashea en loop con
  `Cannot find module '/app/dist/main'`. Se descartó que sea el Pre-Deploy
  Command (falla igual sin él). Build logs muestran todo `cached` en corridas
  sucesivas — sospecha: caché de Railpack corrupto de intentos previos con el
  Start Command compuesto (`start:prod:migrate`, `&&` en un solo comando).
  Próximo paso: forzar un build 100% sin caché (commit con cambio real, o
  buscar un toggle de "no cache" en Railway) y confirmar si el crash persiste.
  Si persiste, revisar memoria del plan (free tier) por si es OOM en el arranque,
  no un problema de build.
