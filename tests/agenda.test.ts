import { db, calculateReminderTime } from '../server/db';
import { processVoiceOrTextIntent } from '../server/ai';

async function runTests() {
  console.log('====================================================');
  console.log('INICIANDO SUÍTE DE TESTES AUTOMATIZADOS: AGENDA INTELIGENTE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASSOU] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FALHOU] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  // TEST 1: Cálculo correto do Lembrete para 24 horas antes (Padrão)
  console.log('\n--- 1. TESTES DE AGENDAMENTO DE LEMBRETE (24H ANTES) ---');
  const appointmentDate = '2026-10-27';
  const startTime = '08:00';
  const reminder24h = calculateReminderTime(appointmentDate, startTime, '24h');
  const reminderDateObj = new Date(reminder24h);
  
  // Start: 2026-10-27 08:00. 24h before should be 2026-10-26 08:00
  const expectedReminderDate = new Date('2026-10-26T08:00:00');
  assert(
    reminderDateObj.getTime() === expectedReminderDate.getTime(),
    'Lembrete padrão é agendado exatamente 24 horas antes do compromisso',
    `Esperado: ${expectedReminderDate.toISOString()}, Obtido: ${reminderDateObj.toISOString()}`
  );

  // Lead time 1h
  const reminder1h = calculateReminderTime(appointmentDate, startTime, '1h');
  const expected1h = new Date('2026-10-27T07:00:00');
  assert(
    new Date(reminder1h).getTime() === expected1h.getTime(),
    'Lembrete de 1 hora antes calculado corretamente'
  );

  // TEST 2: Detecção de conflitos de horário
  console.log('\n--- 2. TESTES DE DETECÇÃO DE CONFLITOS DE HORÁRIO ---');
  // Clean / reset database
  db.resetToDemo();

  // Create a fixed event
  const baseEvent = db.createEvent({
    title: 'Visita Técnica Teste',
    serviceType: 'visita_tecnica',
    date: '2026-10-29',
    startTime: '10:00',
    endTime: '11:00',
    clientName: 'Cliente Conflito',
    location: 'Águas Claras',
    description: '',
    notes: '',
    priority: 'alta',
    status: 'pendente',
    reminderLeadTime: '24h',
  });

  // Test overlapping time
  const conflictCheck1 = db.checkConflicts('2026-10-29', '10:00', '11:00');
  assert(
    conflictCheck1.hasConflict === true,
    'Conflito detectado para evento exatamente no mesmo horário'
  );

  const conflictCheck2 = db.checkConflicts('2026-10-29', '10:30', '11:30');
  assert(
    conflictCheck2.hasConflict === true,
    'Conflito detectado para evento parcialmente sobreposto (10:30 - 11:30)'
  );

  const noConflictCheck = db.checkConflicts('2026-10-29', '11:00', '12:00');
  assert(
    noConflictCheck.hasConflict === false,
    'Sem conflito para evento em horário subsequente sem sobreposição (11:00 - 12:00)'
  );

  // Exclude self check when updating
  const selfCheck = db.checkConflicts('2026-10-29', '10:00', '11:00', baseEvent.id);
  assert(
    selfCheck.hasConflict === false,
    'Ao atualizar o próprio evento, ele não gera falso conflito consigo mesmo'
  );

  // TEST 3: CRUD e Persistência do Banco de Dados
  console.log('\n--- 3. TESTES DE CRUD E PERSISTÊNCIA ---');
  const newEv = db.createEvent({
    title: 'Reunião Diretoria',
    serviceType: 'reuniao',
    date: '2026-10-30',
    startTime: '15:00',
    endTime: '16:00',
    clientName: 'Diretor Silva',
    location: 'Sala 1',
    description: '',
    notes: 'Apresentar balanço',
    priority: 'urgente',
    status: 'pendente',
    reminderLeadTime: '24h',
  });

  assert(!!newEv.id, 'Evento criado com ID único');
  assert(newEv.reminderStatus === 'pendente', 'Status inicial do lembrete é pendente');

  // Read
  const fetched = db.getEventById(newEv.id);
  assert(fetched?.title === 'Reunião Diretoria', 'Evento recuperado do banco de dados com sucesso');

  // Update & Recalculate reminder
  const oldReminderTime = newEv.reminderTime;
  const updated = db.updateEvent(newEv.id, {
    startTime: '16:30',
  });
  assert(
    updated?.startTime === '16:30',
    'Horário do evento atualizado com sucesso'
  );
  assert(
    updated?.reminderTime !== oldReminderTime,
    'Lembrete recalculado automaticamente ao alterar o horário do evento'
  );

  // Cancellation
  const cancelled = db.updateEvent(newEv.id, {
    status: 'cancelado',
  });
  assert(
    cancelled?.status === 'cancelado' && cancelled.reminderStatus === 'cancelado',
    'Ao cancelar o compromisso, o lembrete associado é automaticamente cancelado'
  );

  // Deletion
  const deleteSuccess = db.deleteEvent(newEv.id);
  assert(deleteSuccess === true, 'Evento excluído do banco de dados');
  assert(db.getEventById(newEv.id) === undefined, 'Evento não existe mais após exclusão');

  // TEST 4: Batch Creation (Criação de múltiplos eventos em um clique)
  console.log('\n--- 4. TESTES DE CRIAÇÃO EM LOTE (BATCH) ---');
  const batchDrafts = [
    {
      title: 'Visita 1 - Cliente A',
      serviceType: 'visita_tecnica' as const,
      date: '2026-11-01',
      startTime: '09:00',
      endTime: '10:00',
      clientName: 'Cliente A',
      location: 'Local A',
      description: '',
      notes: '',
      priority: 'media' as const,
      reminderLeadTime: '24h' as const,
      reminderTime: '',
      recurrence: 'none' as const,
    },
    {
      title: 'Visita 2 - Cliente B',
      serviceType: 'visita_tecnica' as const,
      date: '2026-11-01',
      startTime: '14:00',
      endTime: '15:00',
      clientName: 'Cliente B',
      location: 'Local B',
      description: '',
      notes: '',
      priority: 'media' as const,
      reminderLeadTime: '24h' as const,
      reminderTime: '',
      recurrence: 'none' as const,
    },
  ];

  const createdBatch = db.batchCreateEvents(batchDrafts);
  assert(
    createdBatch.length === 2,
    'Dois compromissos criados simultaneamente a partir de lote de transcrição'
  );

  // TEST 5: Interpretação de áudio/texto e múltiplos compromissos
  console.log('\n--- 5. TESTES DE INTERPRETAÇÃO DE INTENÇÃO E EXTRAÇÃO ---');
  const sampleVoiceText =
    'Na próxima terça-feira tenho uma visita técnica para o Fulano, em Águas Claras, às oito da manhã. Na quarta, reunião com o cliente João às duas da tarde, no escritório.';

  const parseResult = await processVoiceOrTextIntent(sampleVoiceText, '2026-10-26T10:00:00', 'America/Sao_Paulo');
  
  assert(
    parseResult.intent === 'CREATE_APPOINTMENTS',
    'Intenção classificada corretamente como CREATE_APPOINTMENTS'
  );
  assert(
    parseResult.appointments.length >= 1,
    'Compromissos extraídos com sucesso da frase falada'
  );

  const firstApp = parseResult.appointments[0];
  console.log('  -> Compromisso extraído:', JSON.stringify(firstApp, null, 2));
  assert(
    firstApp.startTime.startsWith('08'),
    'Horário da manhã "às oito da manhã" interpretado como 08:00'
  );

  // TEST 6: Comando de voz de cancelamento
  console.log('\n--- 6. TESTES DE COMANDOS DE VOZ ---');
  const cancelCommand = 'Desmarque a reunião com João';
  const cancelResult = await processVoiceOrTextIntent(cancelCommand, '2026-10-26T10:00:00', 'America/Sao_Paulo');
  assert(
    cancelResult.intent === 'CANCEL_APPOINTMENT',
    'Comando "Desmarque..." classificado como CANCEL_APPOINTMENT'
  );

  // TEST 7: Auditoria e Estatísticas
  console.log('\n--- 7. TESTES DE AUDITORIA E MÉTRICAS ---');
  const stats = db.getStats();
  assert(typeof stats.total === 'number' && stats.total >= 2, 'Métricas estatísticas calculadas corretamente');
  const logs = db.getAuditLogs();
  assert(logs.length > 0, 'Histórico de auditoria registrado com sucesso');

  console.log('\n====================================================');
  console.log(`RELATÓRIO FINAL: ${passed} TESTES PASSARAM, ${failed} FALHARAM`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
