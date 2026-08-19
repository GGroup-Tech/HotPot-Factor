/**
 * Hand-written types for the `ttgusvxsfkguwrskzcmm` Supabase project.
 *
 * IMPORTANT: this file was NOT generated from the live schema. Before
 * shipping, replace it with the real thing:
 *
 *   npx supabase gen types typescript --project-id ttgusvxsfkguwrskzcmm > types/database.ts
 *
 * Tables below have been corrected against real information_schema.columns
 * output as bugs surfaced (see inline notes per table) — `usuarios`,
 * `pedidos`, `credito_movimientos`, and `compras` are now confirmed-real.
 * The rest are the original hand-written guesses and haven't caused
 * reported bugs, but are still unverified — regenerate this file for
 * real before launch (tracked as pending hardening work).
 *
 * Every table below declares `Relationships: []` even where a real FK
 * exists — @supabase/supabase-js's generic table constraint requires
 * that field to be present or its query builders silently collapse
 * row types to `never`. Once real types are generated this is filled
 * in automatically with the correct FK metadata.
 */

export type PedidoEstado = "programado" | "en_produccion" | "entregado" | "cancelado";
export type StaffRol = "admin" | "operaciones" | "reparto";
export type MovimientoTipo =
  | "compra"
  | "asignacion"
  | "consumo"
  | "cancelacion"
  | "ajuste_manual"
  | "comodin";

export interface Database {
  public: {
    Tables: {
      // Esquema real confirmado 2026-08-17/18 vía information_schema.columns.
      // Sin `email` (vive solo en auth.users, nunca en esta tabla) ni
      // `direccion` (son `calle_numero` + `codigo_postal` por separado).
      // `apellido` es columna propia NOT NULL, no parte de `nombre`.
      // `fecha_nac` agregada 2026-08-18 para registrar la edad del cliente.
      usuarios: {
        Row: {
          id: string; // = auth.users.id, puesto por el trigger on_auth_user_created
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
      staff: {
        Row: {
          id: string; // = auth.users.id
          nombre: string;
          email: string;
          rol: StaffRol;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["staff"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff"]["Row"]>;
        Relationships: [];
      };
      paquetes: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          creditos: number;
          precio_mxn: number;
          activo: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["paquetes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["paquetes"]["Row"]>;
        Relationships: [];
      };
      platillos: {
        // Esquema real confirmado 2026-08-13 vía information_schema.columns.
        // Nombres reales: `foto_url` (no `imagen_url`), `calorias` (no
        // `kcal`), `carbs_g` (no `carbohidratos_g`). Las columnas
        // `categoria`, `etiqueta` y `disponible_comodin` NO EXISTEN.
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          foto_url: string | null;
          calorias: number | null;
          proteina_g: number | null;
          carbs_g: number | null;
          grasa_g: number | null;
          grasa_saturada_g: number | null;
          fibra_g: number | null;
          sodio_mg: number | null;
          alergenos: string | null;
          costo_mxn: number | null;
          activo: boolean;
          creado_en: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["platillos"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["platillos"]["Row"]>;
        Relationships: [];
      };
      // Esquema confirmado 2026-08-13 — `menu_mes`/`comodines_mes`/
      // `meses_contables` usan `anio` + `mes` como columnas INTEGER
      // separadas, no un solo campo de fecha. Sufijo `_en` para
      // timestamps (creado_en, publicado_en), no `_at`.
      menu_mes: {
        Row: {
          id: string;
          anio: number;
          mes: number; // 1-12
          platillo_id: string;
          publicado: boolean; // el menú se publica el día 20
          publicado_en: string | null;
          creado_en: string;
          dia_semana: number | null; // 1=lunes .. 5=viernes
        };
        Insert: Partial<Database["public"]["Tables"]["menu_mes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["menu_mes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "menu_mes_platillo_id_fkey";
            columns: ["platillo_id"];
            isOneToOne: false;
            referencedRelation: "platillos";
            referencedColumns: ["id"];
          },
        ];
      };
      // NO es un contador de uso por usuario — es config de qué
      // platillos son válidos como comodín en un anio/mes dado.
      comodines_mes: {
        Row: {
          id: string;
          anio: number;
          mes: number; // 1-12
          platillo_id: string;
          creado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["comodines_mes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["comodines_mes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "comodines_mes_platillo_id_fkey";
            columns: ["platillo_id"];
            isOneToOne: false;
            referencedRelation: "platillos";
            referencedColumns: ["id"];
          },
        ];
      };
      zonas_cobertura: {
        Row: {
          id: string;
          colonia: string;
          activa: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["zonas_cobertura"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["zonas_cobertura"]["Row"]>;
        Relationships: [];
      };
      lista_espera: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          colonia: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lista_espera"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["lista_espera"]["Row"]>;
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema.columns
      // (auditoría de Finanzas). `creditos` (snapshot de créditos
      // otorgados EN ESA compra, no viene de `paquetes`) y `payment_ref`
      // (no `stripe_payment_intent_id`) son NOT NULL — el nombre viejo
      // de esa columna hacía fallar el insert del webhook de Stripe en
      // CADA pago exitoso. `cupon_id`/`descuento_mxn` existen pero
      // ningún flujo los llena todavía (no hay cupones conectados al
      // checkout). Timestamp es `creado_en`, no `created_at`.
      compras: {
        Row: {
          id: string;
          usuario_id: string;
          paquete_id: string;
          creditos: number;
          monto_mxn: number;
          cupon_id: string | null;
          descuento_mxn: number | null;
          payment_ref: string;
          creado_en: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["compras"]["Row"]> & {
          usuario_id: string;
          paquete_id: string;
          creditos: number;
          monto_mxn: number;
          payment_ref: string;
        };
        Update: Partial<Database["public"]["Tables"]["compras"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "compras_paquete_id_fkey";
            columns: ["paquete_id"];
            isOneToOne: false;
            referencedRelation: "paquetes";
            referencedColumns: ["id"];
          },
        ];
      };
      // Esquema real confirmado 2026-08-17 vía information_schema.columns.
      // Append-only ledger (nunca UPDATE/DELETE). Columnas reales:
      // `referencia_id` (no `pedido_id` ni `compra_id` por separado) y
      // `notas` (no `nota`). Timestamp es `creado_en`, no `created_at`.
      credito_movimientos: {
        Row: {
          id: string;
          usuario_id: string;
          cantidad: number; // + para compras/reingresos, - para consumo
          tipo: MovimientoTipo;
          referencia_id: string | null; // id del pedido o de la compra, según `tipo`
          notas: string | null;
          creado_en: string | null;
          creado_por: string | null; // staff.id cuando es un ajuste manual
        };
        Insert: Partial<Database["public"]["Tables"]["credito_movimientos"]["Row"]> & {
          usuario_id: string;
          cantidad: number;
          tipo: MovimientoTipo;
        };
        Update: Partial<Database["public"]["Tables"]["credito_movimientos"]["Row"]>; // nunca se usa .update() en código — append-only por convención + RLS/trigger en la DB
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-17 vía information_schema.columns.
      // Sin `direccion_entrega` (no existe — la dirección de entrega
      // sale de `usuarios`). Timestamps son `creado_en`/`actualizado_en`,
      // no `created_at`/`updated_at`. `corte_edicion` es NOT NULL.
      pedidos: {
        // UNIQUE(usuario_id, fecha_entrega)
        Row: {
          id: string;
          usuario_id: string;
          fecha_entrega: string; // date
          platillo_id: string | null;
          es_comodin: boolean | null;
          estado: PedidoEstado;
          corte_edicion: string; // timestamptz, NOT NULL
          creado_en: string | null;
          actualizado_en: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["pedidos"]["Row"]> & {
          usuario_id: string;
          fecha_entrega: string;
        };
        Update: Partial<Database["public"]["Tables"]["pedidos"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "pedidos_platillo_id_fkey";
            columns: ["platillo_id"];
            isOneToOne: false;
            referencedRelation: "platillos";
            referencedColumns: ["id"];
          },
        ];
      };
      // Esquema confirmado 2026-08-13 — sin descuento_pct/descuento_mxn/
      // expira_at; con tipo/valor/aplica_a/usos_max/usos_por_usuario/
      // fecha_inicio/fecha_fin/notas. `tipo` y `aplica_a` son texto
      // libre (no enums).
      cupones: {
        Row: {
          id: string;
          codigo: string;
          tipo: string; // se asume "porcentaje" | "monto_fijo"
          valor: number;
          aplica_a: string | null;
          usos_max: number | null;
          usos_por_usuario: number | null;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          activo: boolean;
          notas: string | null;
          creado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["cupones"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["cupones"]["Row"]>;
        Relationships: [];
      };
      uso_cupones: {
        Row: {
          id: string;
          cupon_id: string;
          usuario_id: string;
          compra_id: string | null;
          descuento_mxn: number;
          usado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["uso_cupones"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["uso_cupones"]["Row"]>;
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema.columns.
      categorias_gasto: {
        Row: {
          id: string;
          nombre: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categorias_gasto"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["categorias_gasto"]["Row"]>;
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema.columns.
      // `categoria_id` es NOT NULL — un formulario que mandara `null`
      // (opción "Sin categoría") hacía fallar el insert siempre.
      gastos: {
        Row: {
          id: string;
          descripcion: string;
          categoria_id: string;
          monto_mxn: number;
          fecha: string;
          proveedor: string | null;
          recurrente: boolean | null;
          mes_contable: number;
          anio_contable: number;
          registrado_por: string | null; // staff.id
          pagado: boolean;
          fecha_vencimiento: string | null;
          creado_en: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["gastos"]["Row"]> & {
          descripcion: string;
          categoria_id: string;
          monto_mxn: number;
          fecha: string;
          mes_contable: number;
          anio_contable: number;
          pagado: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["gastos"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias_gasto";
            referencedColumns: ["id"];
          },
        ];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema.columns.
      meses_contables: {
        Row: {
          id: string;
          anio: number;
          mes: number; // 1-12
          cerrado: boolean | null;
          cerrado_en: string | null;
          cerrado_por: string | null; // staff.id
        };
        Insert: Partial<Database["public"]["Tables"]["meses_contables"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["meses_contables"]["Row"]>;
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema.columns.
      metas_mensuales: {
        Row: {
          id: string;
          anio: number;
          mes: number; // 1-12
          ingreso_meta_mxn: number | null;
          margen_meta_pct: number | null;
          gasto_operativo_max_mxn: number | null;
          creado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["metas_mensuales"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["metas_mensuales"]["Row"]>;
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema.columns.
      activos_fijos: {
        Row: {
          id: string;
          nombre: string;
          valor_compra_mxn: number;
          fecha_compra: string; // date
          vida_util_meses: number;
          activo: boolean;
          creado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activos_fijos"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["activos_fijos"]["Row"]>;
        Relationships: [];
      };
      // Tabla singleton — siempre se usa la fila más reciente. Esquema
      // real confirmado 2026-08-19 vía information_schema.columns.
      configuracion_financiera: {
        Row: {
          id: string;
          isr_tasa_pct: number | null;
          capacidad_produccion_diaria: number | null;
          actualizado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["configuracion_financiera"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["configuracion_financiera"]["Row"]>;
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema.columns.
      cuentas_bancarias: {
        Row: {
          id: string;
          nombre: string;
          saldo_mxn: number;
          actualizado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["cuentas_bancarias"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["cuentas_bancarias"]["Row"]>;
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema.columns.
      // `nota` (singular) — confirmado, distinto de `credito_movimientos.notas`.
      capital_movimientos: {
        Row: {
          id: string;
          tipo: string; // 'aportacion' | 'retiro'
          monto_mxn: number;
          fecha: string; // date
          nota: string | null;
          creado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["capital_movimientos"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["capital_movimientos"]["Row"]>;
        Relationships: [];
      };
      // Esquema real confirmado 2026-08-19 vía information_schema +
      // table_constraints (el bloque anterior tenía columnas
      // inventadas — payment_intent_id/compra_id/procesado_at NO
      // existen — que causaron un 500 real en el primer intento de
      // compra de prueba). PRIMARY KEY (payment_ref) -> hace
      // idempotente al webhook de Stripe por construcción. No tiene
      // relación hacia `compras` (es solo un log plano de "ya visto").
      pagos_procesados: {
        Row: {
          payment_ref: string;
          usuario_id: string;
          monto_mxn: number;
          procesado_en: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["pagos_procesados"]["Row"]> & {
          payment_ref: string;
          usuario_id: string;
          monto_mxn: number;
        };
        Update: Partial<Database["public"]["Tables"]["pagos_procesados"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      saldo_creditos: {
        Row: {
          usuario_id: string;
          saldo: number; // SUM(credito_movimientos.cantidad) — nunca se guarda aparte
        };
        Relationships: [];
      };
    };
    Functions: {
      liberar_comodin: {
        Args: { p_usuario_id: string; p_mes: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
