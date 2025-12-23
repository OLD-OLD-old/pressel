const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Só aceita POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    console.log('📥 Recebido do frontend:', {
      event_name: data.event_name,
      event_id: data.event_id,
      fbp: data.fbp ? 'presente' : 'ausente',
      fbc: data.fbc ? 'presente' : 'ausente'
    });

    // ========== PEGA CREDENCIAIS DAS ENVIRONMENT VARIABLES ==========
    const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
    const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      console.error('❌ Credenciais faltando nas Environment Variables!');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: 'Credenciais do Facebook não configuradas no servidor' 
        })
      };
    }

    console.log('✅ Credenciais carregadas das Environment Variables');
    console.log('  - Pixel ID:', PIXEL_ID);

    // Valida dados obrigatórios
    if (!data.event_name || !data.event_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'event_name e event_id são obrigatórios' 
        })
      };
    }

    // Timestamp atual
    const eventTime = Math.floor(Date.now() / 1000);

    // Monta payload para Conversions API
    const payload = {
      data: [{
        event_name: data.event_name,
        event_time: eventTime,
        event_id: data.event_id,
        event_source_url: data.event_source_url || '',
        action_source: 'website',
        user_data: {
          client_user_agent: data.user_agent || '',
          fbp: data.fbp || null,
          fbc: data.fbc || null
        },
        custom_data: data.custom_data || {}
      }]
    };

    console.log('📤 Enviando para Facebook Conversions API:', {
      pixel_id: PIXEL_ID,
      event_name: data.event_name,
      event_id: data.event_id,
      fbp: data.fbp ? '✅ OK' : '❌ FALTANDO',
      fbc: data.fbc ? '✅ OK' : '❌ FALTANDO',
      value: data.custom_data?.value,
      currency: data.custom_data?.currency,
      content_name: data.custom_data?.content_name
    });

    // Envia para Facebook
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Conversão enviada com sucesso!');
      console.log('📊 Resposta do Facebook:', JSON.stringify(result, null, 2));
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          event_id: data.event_id,
          facebook_response: result
        })
      };
    } else {
      console.error('❌ Erro do Facebook:', JSON.stringify(result, null, 2));
      
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: result.error || 'Erro desconhecido do Facebook',
          facebook_response: result
        })
      };
    }

  } catch (error) {
    console.error('❌ Erro na função:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
