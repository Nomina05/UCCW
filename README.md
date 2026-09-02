# UCCW — Sistema de Registro de Casos

Aplicación web ASP.NET Core 8 para el registro y seguimiento de casos. Esta primera versión contiene el acceso de usuarios y una página de inicio protegida.

## Requisitos

- [.NET SDK 8](https://dotnet.microsoft.com/download/dotnet/8.0)

## Inicio local

1. Copie `appsettings.Development.example.json` como `appsettings.Development.json`.
2. Indique un correo y una contraseña segura para `InitialAdmin`. Este archivo no se sube a GitHub.
3. Ejecute:

```powershell
dotnet restore
dotnet run
```

Abra la dirección mostrada por la consola. La primera ejecución crea la base de datos SQLite y la cuenta administrativa configurada.

## Seguridad y GitHub

No suba contraseñas, `appsettings.Development.json` ni archivos `.db`. Para producción, use secretos del proveedor de alojamiento o variables de entorno:

```text
InitialAdmin__Email=admin@suorganizacion.gob.do
InitialAdmin__Password=UnaClaveLargaYUnica
```

El archivo `.gitignore` excluye la base local, secretos de desarrollo y archivos generados.
