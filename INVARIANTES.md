# INVARIANTES DEL SISTEMA

Estas reglas no se negocian. Si un PR viola cualquiera de ellas, no se mergea.

## 1. El saldo de créditos se calcula — nunca se almacena

El saldo real de un cliente es siempre la suma de credito_movimientos.
No existe campo creditos editable en ninguna tabla.

## 2. Créditos solo se mueven dentro de transacciones

Toda operación que mueva créditos debe hacerse dentro de una transacción
que valide que el saldo resultante no sea negativo.

## 3. credito_movimientos es append-only

Sin UPDATE ni DELETE. Los errores se corrigen con movimiento inverso.

## 4. UNIQUE (usuario_id, fecha_entrega) en pedidos

Un cliente no puede tener dos pedidos el mismo día.

## 5. Webhooks de Stripe son idempotentes

Usar tabla pagos_procesados con payment_intent_id como PRIMARY KEY.
Nunca acreditar dos veces el mismo pago.

## 6. Rutas del admin siempre verifican sesión y rol

Sin modo debug, sin bypass. Todas las rutas /api/admin/* validan siempre.

## 7. Zonas de cobertura en BD, no en código

Agregar una colonia es un INSERT, no un deploy.

## 8. El corte de 48h no tiene excepciones de código

No existe endpoint que edite pedidos después del corte.

## 9. RLS activo en todas las tablas de usuario

El cliente Supabase de la app usa sesión del usuario.
service_role solo en rutas que ya verificaron rol admin.

## 10. Gastos inmutables al cerrar el mes

Una vez cerrado el mes en meses_contables, no se modifican gastos.
