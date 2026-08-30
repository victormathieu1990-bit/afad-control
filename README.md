# AFAD Control v2

Aplicación Next.js conectada al proyecto Supabase AFAD.

## Variables
Copia `.env.local.example` a `.env.local` y coloca la Publishable key.

## Ejecutar
npm install
npm run dev

## Primer usuario
Crea el usuario desde Supabase Auth. El trigger de la base crea automáticamente su perfil.
Por seguridad, asigna manualmente el primer administrador desde SQL:
UPDATE public.profiles SET role='admin' WHERE id='UUID_DEL_USUARIO';

## Importante
La publishable key puede estar en el frontend. Nunca pongas una `sb_secret_...` o `service_role` en el navegador.

## v3
Incluye expedientes, historial, actividades, salidas y carga de fotos.

## v4
Las fotos del bucket privado se cargan mediante signed URLs y se muestran en una galería dentro del expediente.

## v5
Incluye QR por expediente y eventos médicos: vacuna, esterilización, tratamiento, desparasitación y medicamento.
