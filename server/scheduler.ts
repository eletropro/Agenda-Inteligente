import { db } from './db';

class ReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Scheduler] Serviço de lembretes ativo e verificando a cada 15 segundos.');

    // Run immediately then on interval
    this.checkReminders();
    this.timer = setInterval(() => {
      this.checkReminders();
    }, 15000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  public checkReminders() {
    try {
      const dueReminders = db.getDueReminders();
      if (dueReminders.length > 0) {
        console.log(`[Scheduler] ${dueReminders.length} lembrete(s) pronto(s) para disparo:`);
        for (const ev of dueReminders) {
          console.log(`  -> Lembrete ativo para: "${ev.title}" marcado para ${ev.date} às ${ev.startTime}`);
          // Note: The client will poll /api/reminders/due and play the alert sound + show browser notification.
          // Once acknowledged by client or dispatched, the client calls /api/reminders/:id/ack to set reminderStatus='enviado'.
        }
      }
    } catch (err) {
      console.error('[Scheduler] Erro ao verificar lembretes:', err);
    }
  }
}

export const scheduler = new ReminderScheduler();
