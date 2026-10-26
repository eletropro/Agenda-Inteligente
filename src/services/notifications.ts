import { Appointment } from '../types/index';

class NotificationService {
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return 'denied';
    }
  }

  /**
   * Dispatches a rich browser notification for an appointment
   * Formats exactly as required:
   * "LEMBRETE DE COMPROMISSO
   * Amanhã você tem: Visita técnica — Fulano.
   * Horário: 08:00. Local: Águas Claras.
   * Toque para abrir os detalhes."
   */
  public showAppointmentNotification(event: Appointment, onOpenCallback?: () => void): boolean {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const title = 'LEMBRETE DE COMPROMISSO';
      const locText = event.location ? ` Local: ${event.location}.` : '';
      const body = `Você tem: ${event.title}\nHorário: ${event.startTime}.${locText}\nToque para abrir os detalhes.`;

      const notification = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `reminder-${event.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onOpenCallback) {
          onOpenCallback();
        }
      };

      return true;
    } catch (err) {
      console.warn('Could not display browser notification:', err);
      return false;
    }
  }

  public showSimpleNotification(title: string, body: string): boolean {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export const notificationService = new NotificationService();
