var express = require('express');
var router = express.Router();

const AGENT_ID = 'ecomotor-agent';
const PROJECT = 'ecomotor-agent';

router.post('/chat', async (req, res) => {
  const { mensaje, threadId } = req.body;

  if (!mensaje) {
    return res.status(400).json({ error: 'El mensaje es requerido' });
  }

  const endpoint = process.env.AZURE_AGENT_ENDPOINT;
  const apiKey = process.env.AZURE_API_KEY;
  const baseUrl = `${endpoint}api/projects/${PROJECT}/agents/${AGENT_ID}`;

  try {
    // 1. Crear o reutilizar hilo de conversación
    let currentThreadId = threadId;

    if (!currentThreadId) {
      const threadRes = await fetch(`${baseUrl}/threads?api-version=2025-05-15-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({})
      });
      const threadData = await threadRes.json();
      currentThreadId = threadData.id;
    }

    // 2. Enviar mensaje al hilo
    await fetch(`${baseUrl}/threads/${currentThreadId}/messages?api-version=2025-05-15-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({ role: 'user', content: mensaje })
    });

    // 3. Ejecutar el agente
    const runRes = await fetch(`${baseUrl}/threads/${currentThreadId}/runs?api-version=2025-05-15-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({ assistant_id: AGENT_ID })
    });
    const runData = await runRes.json();
    const runId = runData.id;

    // 4. Esperar que el agente termine (polling)
    let status = runData.status;
    let intentos = 0;
    while (status !== 'completed' && status !== 'failed' && intentos < 30) {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch(`${baseUrl}/threads/${currentThreadId}/runs/${runId}?api-version=2025-05-15-preview`, {
        headers: { 'api-key': apiKey }
      });
      const pollData = await pollRes.json();
      status = pollData.status;
      intentos++;
    }

    if (status !== 'completed') {
      return res.status(500).json({ error: 'El agente no pudo completar la solicitud' });
    }

    // 5. Obtener la respuesta
    const msgsRes = await fetch(`${baseUrl}/threads/${currentThreadId}/messages?api-version=2025-05-15-preview`, {
      headers: { 'api-key': apiKey }
    });
    const msgsData = await msgsRes.json();
    const mensajeAgente = msgsData.data[0].content[0].text.value;

    res.json({ respuesta: mensajeAgente, threadId: currentThreadId });

  } catch (error) {
    console.error('Error al conectar con el agente:', error);
    res.status(500).json({ error: 'Error al conectar con EcoBot' });
  }
});

module.exports = router;