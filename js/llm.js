// === DeepSeek API via fetch ===

// User should set their API key
let DEEPSEEK_API_KEY = '';

function setApiKey(key) {
  DEEPSEEK_API_KEY = key;
}

async function generateRant(complaint, character) {
  if (!DEEPSEEK_API_KEY) {
    console.warn('No DeepSeek API key set, using fallback');
    return getFallbackRant(character);
  }

  const systemPrompt = (typeof CHARACTER_PROMPTS !== 'undefined')
    ? CHARACTER_PROMPTS[character]
    : '你是一个角色扮演助手。';

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `我的抱怨：${complaint}` }
        ],
        max_tokens: 300,
        temperature: 0.9
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`DeepSeek API error (${res.status}):`, err);
      return getFallbackRant(character);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (e) {
    console.warn('DeepSeek fetch failed:', e);
    return getFallbackRant(character);
  }
}

async function generateBlindboxContent(complaint, characterRant, boxType) {
  if (!DEEPSEEK_API_KEY) {
    return getFallbackBlindbox(boxType);
  }

  const promptKey = `blindbox_${boxType}`;
  const systemPrompt = (typeof CHARACTER_PROMPTS !== 'undefined')
    ? CHARACTER_PROMPTS[promptKey]
    : '生成一个有趣的盲盒内容。';

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户抱怨：${complaint}\n角色文案：${characterRant}` }
        ],
        max_tokens: 200,
        temperature: 0.8
      })
    });

    if (!res.ok) return getFallbackBlindbox(boxType);
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (e) {
    return getFallbackBlindbox(boxType);
  }
}

// === Fallbacks (when no API key or network fails) ===

function getFallbackRant(character) {
  const fallbacks = {
    opossum: '啊啊啊啊\n受不了了受不了了\n我要就地躺下\n谁都不要管我\n我不干了！！',
    macaque: '就这？就这？？\n脑子呢？？\n惹到我算是你踢到钢板了\n别在这给我整活了',
    capybara: '哎呀，原来这就让你生气了呀\n放宽心，你已经尽力了\n毕竟不是每个人的进化\n都能那么完全的呢'
  };
  return fallbacks[character] || fallbacks.opossum;
}

function getFallbackBlindbox(boxType) {
  const fallbacks = {
    soul: JSON.stringify({ rage: 87, rank: 93, title: '暴躁吗喽·王' }),
    wish: '愿你的烦恼像手机电量一样\n以肉眼可见的速度消失',
    handsome: JSON.stringify({
      name: '莫生气·逸轩',
      job: '情绪回收站站长',
      hobby: '收集别人的暴躁并酿成美酒',
      pickup_line: '你的负能量，在我这里都能兑换成拥抱'
    })
  };
  return fallbacks[boxType] || fallbacks.soul;
}
