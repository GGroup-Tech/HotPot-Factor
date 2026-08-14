/**
 * Hand-written types for the `ttgusvxsfkguwrskzcmm` Supabase project,
 * inferred from the business rules in the project brief.
 *
 * IMPORTANT: this file was NOT generated from the live schema (this
 * environment has no direct DB connection). Before shipping, replace
 * it with the real thing:
 *
 *   npx supabase gen types typescript --project-id ttgusvxsfkguwrskzcmm > types/database.ts
 *
 * Everything downstream (queries, RSC, RLS assumptions) is written
 * against the shapes below, so regenerate early and diff.
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
      usuarios: {
        Row: {
          id: string; // = auth.users.id, set by on_auth_user_created trigger
          nombre: string;
          email: string;
          telefono: string | null;
          colonia: string | null;
          direccion: string | null;
          activo: boolean;
          // Agregada 2026-08-13 para poder calcular churn real en
          // Finanzas — se llena cuando staff desactiva al cliente
          // (ver `alternarClienteActivo` en actions.ts) y se limpia si
          // se reactiva.
          desactivado_en: string | null;
          // Agregada 2026-08-14 para medir ROI de marketing por canal.
          como_nos_conocio: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["usuarios"]["Row"]> & {
          id: string;
          email: string;
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
        // Esquema real confirmado 2026-08-13 vía information_schema.columns
        // (nunca se había verificado — el comentario original de este
        // archivo decía "confirmar al regenerar tipos" y no se hizo).
        // Nombres reales, distintos a lo que se había asumido: `foto_url`
        // (no `imagen_url`), `calorias` (no `kcal`), `carbs_g` (no
        // `carbohidratos_g`). Las columnas `categoria`, `etiqueta` y
        // `disponible_comodin` NO EXISTEN — se habían inventado sin
        // verificar, y como se usaban dentro de `.select("platillos(...)")`
        // anidados, causaban que PostgREST rechazara la consulta COMPLETA
        // (error 400, no solo un campo null) — esto rompía en silencio el
        // menú semanal del sitio público y "Menú del mes" en el admin.
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          foto_url: string | null;
          calorias: number | null;
          proteina_g: number | null;
          carbs_g: number | null;
          grasa_g: number | null;
          // Agregadas 2026-08-13 para que coincidan con la tabla de
          // información nutrimental real del recetario (Energía,
          // Proteína, Carbohidratos, Grasa total, Grasa saturada,
          // Fibra, Sodio, Alérgenos) — antes solo se capturaban 4 de
          // los 7 datos nutrimentales.
          grasa_saturada_g: number | null;
          fibra_g: number | null;
          sodio_mg: number | null;
          alergenos: string | null;
          // Agregada 2026-08-13 para poder calcular costo de
          // producción / margen / punto de equilibrio en Finanzas —
          // costo de ingredientes + mano de obra por porción.
          costo_mxn: number | null;
          activo: boolean;
          creado_en: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["platillos"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["platillos"]["Row"]>;
        Relationships: [];
      };
      // Esquema confirmado 2026-08-13 vía information_schema.columns —
      // `menu_mes`, `comodines_mes` y `meses_contables` usan `anio` +
      // `mes` como columnas INTEGER separadas, no un solo `mes` de tipo
      // fecha/texto 'YYYY-MM-01' como se había asumido en todo el
      // código (incluido este archivo) desde antes de esta sesión.
      // Además usan sufijo `_en` para timestamps (creado_en,
      // publicado_en, cerrado_en), no `_at` como el resto de las
      // tablas — convención mixta real de esta base de datos.
      menu_mes: {
        Row: {
          id: string;
          anio: number;
          mes: number; // 1-12
          platillo_id: string;
          publicado: boolean; // menu publishes on the 20th
          publicado_en: string | null;
          creado_en: string;
          // "Menú fijo" en Arma tu mes asigna un platillo por día de la
          // semana (1=lunes .. 5=viernes). Se asume esta columna;
          // confirmar con el esquema real.
          dia_semana: number | null;
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
      // NO es un contador de uso por usuario (no tiene usuario_id ni
      // `usados` — se asumió eso antes y estaba mal). Es, igual que
      // `menu_mes`, una tabla de configuración: qué platillos son
      // válidos como comodín en un anio/mes dado. Cuántos comodines ya
      // usó un usuario se deriva contando `pedidos` con `es_comodin =
      // true` en el mes, igual que el saldo de créditos se deriva de
      // `credito_movimientos` — nunca un contador cacheado.
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
      compras: {
        Row: {
          id: string;
          usuario_id: string;
          paquete_id: string;
          monto_mxn: number;
          stripe_payment_intent_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["compras"]["Row"]>;
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
      credito_movimientos: {
        // Append-only ledger. No UPDATE / DELETE — enforce with RLS +
        // a DB trigger that raises on those ops. Balance is ALWAYS
        // SUM(cantidad), never a stored counter.
        Row: {
          id: string;
          usuario_id: string;
          cantidad: number; // + para compras/reingresos, - para consumo
          tipo: MovimientoTipo;
          pedido_id: string | null;
          compra_id: string | null;
          nota: string | null;
          creado_por: string | null; // staff.id when it's a manual adjustment
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["credito_movimientos"]["Row"]> & {
          usuario_id: string;
          cantidad: number;
          tipo: MovimientoTipo;
        };
        Update: Partial<Database["public"]["Tables"]["credito_movimientos"]["Row"]>; // nunca se usa .update() en código — la tabla es append-only por convención + RLS/trigger en la DB
        Relationships: [];
      };
      pedidos: {
        // UNIQUE(usuario_id, fecha_entrega)
        Row: {
          id: string;
          usuario_id: string;
          fecha_entrega: string; // date
          estado: PedidoEstado;
          platillo_id: string | null;
          es_comodin: boolean;
          direccion_entrega: string | null;
          created_at: string;
          updated_at: string;
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
      // Esquema confirmado 2026-08-13 vía information_schema.columns —
      // muy distinto de lo que se había asumido antes (sin
      // descuento_pct/descuento_mxn/expira_at; con tipo/valor/aplica_a/
      // usos_max/usos_por_usuario/fecha_inicio/fecha_fin/notas). `tipo`
      // y `aplica_a` son `text` libre en la base (no enums) — el código
      // asume los valores "porcentaje"/"monto_fijo" para `tipo` por ser
      // la convención más común; si la base ya tiene otra convención,
      // ajustar el select de `CuponForm`.
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
      categorias_gasto: {
        Row: {
          id: string;
          nombre: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categorias_gasto"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["categorias_gasto"]["Row"]>;
        Relationships: [];
      };
      gastos: {
        Row: {
          id: string;
          descripcion: string;
          categoria_id: string | null;
          monto_mxn: number;
          fecha: string;
          proveedor: string | null;
          recurrente: boolean;
          mes_contable: number;
          anio_contable: number;
          registrado_por: string | null; // staff.id
          // Agregadas 2026-08-13 para Cuentas por pagar — antes todo
          // gasto se asumía pagado al capturarse.
          pagado: boolean;
          fecha_vencimiento: string | null;
          creado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["gastos"]["Row"]>;
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
      meses_contables: {
        Row: {
          id: string;
          anio: number;
          mes: number; // 1-12
          cerrado: boolean;
          cerrado_en: string | null;
          cerrado_por: string | null; // staff.id
        };
        Insert: Partial<Database["public"]["Tables"]["meses_contables"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["meses_contables"]["Row"]>;
        Relationships: [];
      };
      // 5 tablas agregadas 2026-08-13 para las secciones de Finanzas
      // que antes mostraban "no disponible" (Metas del mes, costo de
      // producción/depreciación/ISR, balance general, cuentas por
      // pagar). Esquema propio (no había nada que "confirmar" — se
      // crearon a propósito para esto), documentado en el chat con el
      // usuario cuando se dieron de alta.
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
      // Tabla singleton — siempre se usa la fila más reciente
      // (`order("actualizado_en", { ascending: false }).limit(1)`).
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
      pagos_procesados: {
        // PRIMARY KEY (payment_intent_id) -> makes the Stripe webhook
        // handler idempotent by construction (INSERT ... ON CONFLICT DO NOTHING).
        Row: {
          payment_intent_id: string;
          compra_id: string | null;
          procesado_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["pagos_procesados"]["Row"]> & {
          payment_intent_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["pagos_procesados"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      saldo_creditos: {
        Row: {
          usuario_id: string;
          saldo: number; // SUM(credito_movimientos.cantidad) — never stored elsewhere
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
