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
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          imagen_url: string | null;
          categoria: string | null;
          // Nutrición — el Figma (Landing v2, sección Menú semanal) muestra
          // kcal + macros por platillo; no estaban en la lista de columnas
          // del brief, así que se agregan como opcionales. Confirmar con
          // el esquema real al regenerar los tipos.
          etiqueta: string | null; // "ALTO EN PROTEÍNA", "VEGETARIANO", etc.
          kcal: number | null;
          proteina_g: number | null;
          carbohidratos_g: number | null;
          grasa_g: number | null;
          // "Arma tu mes" (Figma 108:2) ofrece un par de platillos
          // comodín distintos al menú fijo semanal — se asume esta
          // bandera para poder consultarlos. Confirmar con el cliente.
          disponible_comodin: boolean | null;
          activo: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["platillos"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["platillos"]["Row"]>;
        Relationships: [];
      };
      menu_mes: {
        Row: {
          id: string;
          mes: string; // 'YYYY-MM-01'
          platillo_id: string;
          publicado: boolean; // menu publishes on the 20th
          publicado_at: string | null;
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
      comodines_mes: {
        Row: {
          id: string;
          usuario_id: string;
          mes: string; // 'YYYY-MM-01'
          usados: number; // max 2 / month, but usage itself is unlimited per rule
        };
        Insert: Partial<Database["public"]["Tables"]["comodines_mes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["comodines_mes"]["Row"]>;
        Relationships: [];
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
      cupones: {
        Row: {
          id: string;
          codigo: string;
          descuento_pct: number | null;
          descuento_mxn: number | null;
          activo: boolean;
          expira_at: string | null;
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
          created_at: string;
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
          categoria_id: string;
          descripcion: string;
          monto_mxn: number;
          fecha: string;
          created_at: string;
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
          mes: string; // 'YYYY-MM-01'
          cerrado: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["meses_contables"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["meses_contables"]["Row"]>;
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
