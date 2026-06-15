var express = require('express');
var router = express.Router();

const DEFAULT_API_VERSION = '2025-05-01';
const LEGACY_PROJECT = 'ecomotor-agent';

function normalizeProjectEndpoint(endpoint, projectName) {
  const cleanEndpoint = String(endpoint || '').replace(/\/+$/, '');

  if (!cleanEndpoint) {
    return '';
  }

  if (cleanEndpoint.includes('/api/projects/')) {
    return cleanEndpoint;
  }

  if (!projectName) {
    return cleanEndpoint;
  }

  return `${cleanEndpoint}/api/projects/${encodeURIComponent(projectName)}`;
}

function buildHeaders() {
  const token = process.env.AZURE_AGENT_TOKEN || process.env.AGENT_TOKEN;
  const apiKey = process.env.AZURE_API_KEY;
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (apiKey) {
    headers['api-key'] = apiKey;
  }

  return headers;
}

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

async function foundryFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {})
    }
  });
  const data = await readJson(response);

  if (!response.ok) {
    const message = data.error?.message || data.message || data.raw || response.statusText;
    const error = new Error(`Foundry ${response.status}: ${message}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

function getAssistantText(messagesData) {
  const messages = Array.isArray(messagesData.data) ? messagesData.data : [];
  const assistantMessage = messages.find((message) => message.role === 'assistant') || messages[0];
  const content = Array.isArray(assistantMessage?.content) ? assistantMessage.content : [];
  const textContent = content.find((item) => item.type === 'text' && item.text?.value);

  return textContent?.text?.value || 'EcoBot no devolvio una respuesta de texto.';
}

router.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'EcoBot API activa. Usa POST /agente/chat para conversar.'
  });
});

router.post('/chat', async (req, res) => {
  const { mensaje, threadId } = req.body;

  if (!mensaje) {
    return res.status(400).json({ error: 'El mensaje es requerido' });
  }

  const agentId = process.env.AZURE_AGENT_ID || process.env.AGENT_ID;
  const projectName = process.env.AZURE_PROJECT_NAME || process.env.PROJECT_NAME || LEGACY_PROJECT;
  const endpoint = normalizeProjectEndpoint(process.env.AZURE_AGENT_ENDPOINT, projectName);
  const apiVersion = process.env.AZURE_AGENT_API_VERSION || DEFAULT_API_VERSION;
  const query = `api-version=${encodeURIComponent(apiVersion)}`;

  const missingConfig = [];
  if (!endpoint) {
    missingConfig.push('AZURE_AGENT_ENDPOINT');
  }
  if (!agentId) {
    missingConfig.push('AZURE_AGENT_ID');
  }

  if (missingConfig.length > 0) {
    return res.status(500).json({
      error: `Falta configurar ${missingConfig.join(', ')} en el backend`
    });
  }

  if (!process.env.AZURE_AGENT_TOKEN && !process.env.AGENT_TOKEN && !process.env.AZURE_API_KEY) {
    return res.status(500).json({
      error: 'Falta configurar AZURE_AGENT_TOKEN o AZURE_API_KEY para autenticar con Foundry'
    });
  }

  try {
    let currentThreadId = threadId;

    if (!currentThreadId) {
      const threadData = await foundryFetch(`${endpoint}/threads?${query}`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      currentThreadId = threadData.id;
    }

    await foundryFetch(`${endpoint}/threads/${currentThreadId}/messages?${query}`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: mensaje })
    });

    const runData = await foundryFetch(`${endpoint}/threads/${currentThreadId}/runs?${query}`, {
      method: 'POST',
      body: JSON.stringify({ assistant_id: agentId })
    });

    const runId = runData.id;
    let status = runData.status;
    let intentos = 0;

    while (status !== 'completed' && status !== 'failed' && status !== 'cancelled' && intentos < 30) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const pollData = await foundryFetch(`${endpoint}/threads/${currentThreadId}/runs/${runId}?${query}`);
      status = pollData.status;
      intentos++;
    }

    if (status !== 'completed') {
      return res.status(500).json({ error: `El agente no pudo completar la solicitud. Estado: ${status}` });
    }

    const msgsData = await foundryFetch(`${endpoint}/threads/${currentThreadId}/messages?${query}`);
    const mensajeAgente = getAssistantText(msgsData);

    res.json({ respuesta: mensajeAgente, threadId: currentThreadId });
  } catch (error) {
    console.error('Error al conectar con el agente:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Error al conectar con EcoBot'
    });
  }
});

module.exports = router;
