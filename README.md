# UCCW — Sistema de Registro de Casos

Aplicación web creada con Next.js y TypeScript para registrar y dar seguimiento a casos. Está preparada para desplegarse en Vercel.

## Inicio local

1. Copie `.env.example` como `.env.local`.
2. Establezca un correo y contraseña seguros para el administrador.
3. Ejecute `npm install` y luego `npm run dev`.

## Variables de entorno

```text
ADMIN_EMAIL=admin@suorganizacion.gob.do
ADMIN_PASSWORD=UnaClaveLargaYUnica
SESSION_SECRET=UnaCadenaLargaAleatoriaDeAlMenos32Caracteres
```

Configure estas tres variables en Vercel antes de publicar. Nunca suba `.env.local` al repositorio.
