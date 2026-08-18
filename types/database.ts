      // Reemplaza el bloque `usuarios: { ... }` completo dentro de
      // `Database["public"]["Tables"]` con esto. Esquema real
      // confirmado vía information_schema.columns (2026-08-17): sin
      // `email` (vive solo en auth.users), sin `direccion` (son
      // `calle_numero` + `codigo_postal`), `apellido` es columna
      // propia NOT NULL, timestamp es `creado_en` no `created_at`.
      // `fecha_nac` agregada 2026-08-18 para el registro de edad.
      usuarios: {
        Row: {
          id: string;
          nombre: string;
          apellido: string;
          telefono: string | null;
          fecha_nac: string | null;
          calle_numero: string | null;
          colonia: string | null;
          codigo_postal: string | null;
          referencias: string | null;
          zona_id: string | null;
          activo: boolean | null;
          creado_en: string | null;
          actualizado_en: string | null;
          desactivado_en: string | null;
          como_nos_conocio: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["usuarios"]["Row"]> & {
          id: string;
          nombre: string;
          apellido: string;
        };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Row"]>;
        Relationships: [];
      };
