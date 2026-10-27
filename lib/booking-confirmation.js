// Render only after the payment webhook and the stored reservation are verified.
// This module does not send email or confirm a reservation itself.
function bookingConfirmation(booking) {
  const contact = 'flgarage@factorlambda.com';
  const date = booking.date ? new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Madrid',
  }).format(new Date(booking.date + 'T12:00:00+01:00')) : null;
  const phone = booking.mode === 'phone';
  return {
    to: booking.email,
    subject: 'Factor Lambda · Confirmación de pago y cita · ' + booking.reference,
    text: [
      'Hola ' + booking.name + ',',
      '',
      'Hemos recibido tu pago y confirmado tu cita en Factor Lambda.',
      'Referencia: ' + booking.reference,
      'Servicio: ' + (phone ? 'Consulta telefónica de 30 minutos' : 'Consulta presencial'),
      'Profesional: ' + (booking.topic === 'tuning' ? 'Joaquín · Reprogramaciones' : 'Germán · Mecánica'),
      'Motivo: ' + ({ mechanics: 'Mecánica', tuning: 'Reprogramaciones', 'online-quote': 'Presupuesto online', 'quick-mechanics': 'Mecánica rápida' }[booking.topic] || booking.topic),
      date ? 'Fecha: ' + date + ' a las ' + booking.time + ' (hora de España peninsular)' : 'Fecha y hora: por acordar con el taller.',
      'Importe abonado: ' + (phone ? '40 €' : '45 €') + ' IVA incluido.',
      'El importe abonado por la consulta se descontará del presupuesto asignado si la reparación se realiza con nosotros.',
      'Vehículo: ' + booking.vehicle,
      '',
      'Para cualquier modificación o anulación, envía un correo a ' + contact + ' indicando tu referencia, la fecha de la cita y explicando la situación.',
      'En caso de anulación sin justificación, inasistencia o falta de respuesta del cliente a la hora acordada sin justificación, no se devolverá el importe abonado, sin perjuicio de los derechos que legalmente correspondan.',
      '',
      'Gracias por confiar en Factor Lambda.',
    ].join('\n'),
  };
}

module.exports = { bookingConfirmation };
