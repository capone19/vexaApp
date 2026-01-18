-- =====================================================
-- NOTIFICACIÓN AL CERRAR TICKET
-- =====================================================
-- Cuando un ticket se marca como "closed", se crea automáticamente
-- una notificación para el usuario que creó el ticket

-- 1. Agregar tipo 'ticket' al ENUM notification_type
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ticket';

-- 2. Crear función para notificar al creador del ticket
CREATE OR REPLACE FUNCTION public.notify_ticket_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo procesar si el status cambió a 'closed'
  IF OLD.status != 'closed' AND NEW.status = 'closed' THEN
    -- Verificar que el ticket tenga un created_by
    IF NEW.created_by IS NOT NULL THEN
      -- Insertar notificación para el usuario que creó el ticket
      INSERT INTO public.notifications (
        tenant_id,
        user_id,
        type,
        title,
        message,
        data,
        is_read,
        created_at
      ) VALUES (
        NEW.tenant_id,
        NEW.created_by,
        'ticket',
        'Ticket Resuelto',
        'Tu ticket ha sido resuelto. Ya puedes ir a revisarlo.',
        jsonb_build_object(
          'ticket_id', NEW.id,
          'ticket_title', NEW.title
        ),
        false,
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Crear trigger en la tabla tickets
CREATE TRIGGER on_ticket_closed
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_closed();
