var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'EcoBot API activa. Usa POST /agente/chat para conversar.'
  });
});

router.post('/chat', async (req, res) => {
  const { mensaje, historial } = req.body;

  if (!mensaje) {
    return res.status(400).json({ error: 'El mensaje es requerido' });
  }

  const endpoint = process.env.AZURE_AGENT_ENDPOINT;
  const apiKey = process.env.AZURE_API_KEY;

  if (!endpoint || !apiKey) {
    return res.status(500).json({ error: 'Falta configurar AZURE_AGENT_ENDPOINT o AZURE_API_KEY en el .env' });
  }

  // Construir historial de mensajes
  const mensajesPrevios = Array.isArray(historial) ? historial : [];
  const mensajes = [
    ...mensajesPrevios,
    { role: 'user', content: mensaje }
  ];

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        input: mensajes
      })
    });

    const data = await response.json();
    console.log('Respuesta Azure:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('Error de Azure:', JSON.stringify(data, null, 2));
      return res.status(response.status).json({
        error: data.error?.message || 'Error al conectar con EcoBot'
      });
    }

    // Extraer la respuesta del agente
   const respuesta = data.output?.find(o => o.type === 'message')
    ?.content?.find(c => c.type === 'output_text')
    ?.text
    || 'EcoBot no devolvió una respuesta.';

    // Devolver respuesta y el historial actualizado para mantener contexto
    const historialActualizado = [
      ...mensajes,
      { role: 'assistant', content: respuesta }
    ];

    res.json({ respuesta, historial: historialActualizado });

  } catch (error) {
    console.error('Error al conectar con EcoBot:', error.message);
    res.status(500).json({ error: 'Error al conectar con EcoBot: ' + error.message });
  }
});

module.exports = router;