// === Blindbox Reveal Logic ===

const BLINDBOX_TYPES = ['prescription', 'prescription', 'prescription', 'prescription', 'prescription'];

// Pre-fetched AI content (starts loading during destruction)
let pendingAIBlindbox = null;
let pendingBoxType = null;

function startPreFetchBlindbox(complaint, rant) {
  pendingAIBlindbox = null;
  pendingBoxType = getRandomBlindboxType();
  if (typeof window.generateBlindboxContent === 'function') {
    window.generateBlindboxContent(complaint, rant, pendingBoxType)
      .then(aiText => {
        const parsed = parseAIBlindbox(pendingBoxType, aiText);
        if (parsed) pendingAIBlindbox = parsed;
      })
      .catch(() => { pendingAIBlindbox = null; });
  }
}

function getRandomBlindboxType() {
  return BLINDBOX_TYPES[Math.floor(Math.random() * BLINDBOX_TYPES.length)];
}

// Local fallbacks when AI is unavailable
function getFallbackBlindbox(boxType) {
  const fallbacks = {
    'soul-shard': {
      type: '灵魂碎片',
      content: `你的暴躁值 <b>${Math.floor(Math.random() * 30 + 70)}</b><br>超过了 <b>${Math.floor(Math.random() * 20 + 80)}%</b> 的打工人`,
      subtitle: randomTitle()
    },
    'wish-card': {
      type: '反向许愿签',
      content: randomWish(),
      subtitle: '✧ 许愿完成 ✧'
    },
    'handsome': {
      type: '命定之人',
      content: randomHandsome(),
      subtitle: '砸出了你的命定之人'
    },
    'prescription': {
      type: '离谱处方笺',
      content: randomPrescription(),
      subtitle: '谨遵医嘱，立即执行'
    }
  };
  return fallbacks[boxType] || fallbacks['soul-shard'];
}

// Try to parse AI JSON response for blindbox content
function parseAIBlindbox(boxType, aiText) {
  try {
    const json = JSON.parse(aiText);
    if (boxType === 'handsome') {
      return {
        type: '命定之人',
        content: `<div class="handsome-card-inner">
          <div class="handsome-avatar">✨</div>
          <div class="handsome-name">${json.name || '???'}</div>
          <div class="handsome-info">${json.job || ''} · ${json.hobby || ''}</div>
          <div class="handsome-line">"${json.pickup_line || ''}"</div>
        </div>`,
        subtitle: 'AI 为你匹配的命定之人'
      };
    } else if (boxType === 'soul-shard') {
      return {
        type: '灵魂碎片',
        content: `暴躁值 <b>${json.rage || 88}</b><br>超过了 <b>${json.rank || 92}%</b> 的打工人`,
        subtitle: json.title || randomTitle()
      };
    } else if (boxType === 'wish-card') {
      return {
        type: '反向许愿签',
        content: (json.wish || aiText).replace(/\n/g, '<br>'),
        subtitle: '✧ AI 许愿完成 ✧'
      };
    } else if (boxType === 'prescription') {
      const title = json.title || '离谱处方笺';
      let steps = json.steps || [];
      steps = steps.slice(0, 3);
      const useBullet = steps.length > 1;
      let html = `<div style="text-align:left;padding:8px 4px;">
        <div style="font-weight:700;font-size:17px;margin-bottom:14px;text-align:center;">${title}</div>`;
      steps.forEach((s) => {
        const prefix = useBullet ? '· ' : '';
        html += `<div style="margin-bottom:10px;line-height:1.6;font-size:15px;">
          ${prefix}${s}</div>`;
      });
      html += '</div>';
      return { type: '离谱处方笺', content: html, subtitle: '谨遵医嘱，立即执行' };
    }
  } catch (e) {
    if (boxType === 'wish-card') {
      return { type: '反向许愿签', content: aiText.replace(/\n/g, '<br>'), subtitle: '✧ 许愿完成 ✧' };
    }
    return null;
  }
  return null;
}

function randomHandsome() {
  const guys = [
    { name: '莫生气·逸轩', job: '情绪回收站站长', hobby: '收集暴躁情绪酿成美酒', line: '你的负能量，在我这里都能兑换成拥抱', img: 'assets/img/characters/handsome-1.png' },
    { name: '不上班·司夜', job: '逃跑计划策划师', hobby: '开法拉利带人去海边尖叫', line: '如果你明天也不想上班，副驾驶给你留着', img: 'assets/img/characters/handsome-2.png' },
    { name: '随便吧·允默', job: '精神离职协会会长', hobby: '在会议室里悄悄画小猪', line: '别努力了，我养你。反正我也不想努力', img: 'assets/img/characters/handsome-3.png' },
    { name: '别管我·临渊', job: '深夜烧烤摊主', hobby: '听客人吐槽并免费加辣', line: '你的故事太苦了，来，这串多加孜然', img: 'assets/img/characters/handsome-4.png' },
    { name: '关机吧·星泽', job: '24小时不回消息体验官', hobby: '帮人屏蔽工作群并假装信号不好', line: '我已经帮你把老板的微信备注改成了"对方正在生气"', img: 'assets/img/characters/handsome-5.png' },
    { name: '躺平了·晏清', job: '摆烂学终身教授', hobby: '在草地上数云朵并发表SCI', line: '你知道吗，有一篇论文证明：躺着呼吸也算运动', img: 'assets/img/characters/handsome-6.png' }
  ];
  const g = guys[Math.floor(Math.random() * guys.length)];
  return `<div class="handsome-card-inner">
    <div class="handsome-avatar">
      <img src="${g.img}" alt="${g.name}"
           onerror="this.style.display='none';this.parentElement.textContent='✨'"
           style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,0,0,0.1);">
    </div>
    <div class="handsome-name">${g.name}</div>
    <div class="handsome-info">${g.job} · ${g.hobby}</div>
    <div class="handsome-line">"${g.line}"</div>
  </div>`;
}

function randomPrescription() {
  const plans = [
    {
      title: '急性人间排斥 · 处方',
      steps: ['出门左转，钻进第一个垃圾', '在里面蹲三分钟，想象自己', '爬出来跟路人说"我重生了', '走回家给自己煮碗泡面加蛋', '已被社会暂时除名']
    },
    {
      title: '精神离职 · 重症监护方案',
      steps: ['把工牌埋在公司花盆里', '对着电脑说三遍我不属于', '用便利贴把自己贴满装艺术品', '躺会议室地板宣布光合作用', '你是植物不需要工作了']
    },
    {
      title: '老板排异反应 · 急救处方',
      steps: ['每次老板说话你就低头看鞋', '在鞋面上画微型自己划船', '划到十五下站起来说到了', '走出会议室不要解释', '如果被问就说船靠岸了']
    },
    {
      title: '地球不适合我 · 撤离方案',
      steps: ['穿上最像宇航员的衣服', '去便利店买三瓶水当返程燃料', '坐地铁到终点离太空最近', '对着天空告诉外星人准备好了', '没人来接就先打个车回家']
    }
  ];
  // Don't repeat last prescription
  let idx = Math.floor(Math.random() * plans.length);
  if (plans.length > 1 && idx === randomPrescription._lastIdx) {
    idx = (idx + 1) % plans.length;
  }
  randomPrescription._lastIdx = idx;
  const p = plans[idx];
  const maxSteps = 3;  // shorter lines, more of them
  const steps = p.steps.slice(0, maxSteps);
  const useBullet = steps.length > 1;
  let html = `<div style="text-align:left;padding:8px 4px;">
    <div style="font-weight:700;font-size:17px;margin-bottom:14px;text-align:center;">${p.title}</div>`;
  steps.forEach((s) => {
    const prefix = useBullet ? '· ' : '';
    html += `<div style="margin-bottom:10px;line-height:1.6;font-size:15px;">
      ${prefix}${s}</div>`;
  });
  html += '</div>';
  return html;
}

function randomTitle() {
  const titles = ['称号：情绪管理大师（反向）', '称号：暴躁吗喽·王', '称号：负能量收藏家', '称号：发疯文学博士', '称号：纸毁灭者'];
  return titles[Math.floor(Math.random() * titles.length)];
}

function randomWish() {
  const wishes = [
    '愿你讨厌的人<br>明天网速卡成PPT<br>咖啡永远不够烫',
    '愿你的烦恼<br>像周一一样<br>来了又走，走了别来',
    '愿所有让你加班的人<br>手机永远只剩1%电<br>充电器永远找不到',
    '愿你接下来的日子<br>遇到的甲方都是正常人<br>（虽然概率不大）'
  ];
  return wishes[Math.floor(Math.random() * wishes.length)];
}

// Update blindbox DOM — show fallback instantly, swap in AI when ready
function renderBlindboxDOM(content, boxType) {
  const typeEl = document.getElementById('blindbox-type');
  const contentEl = document.getElementById('blindbox-content');
  const subtitleEl = document.getElementById('blindbox-subtitle');
  const card = document.getElementById('blindbox-card');
  const inner = card ? card.querySelector('.blindbox-inner') : null;
  const reveal = document.getElementById('blindbox-reveal');

  if (typeEl) typeEl.textContent = content.type;
  if (contentEl) contentEl.innerHTML = content.content;
  if (subtitleEl) subtitleEl.textContent = content.subtitle || '';

  if (card) card.setAttribute('data-box-type', boxType);

  const shareCardNum = Math.floor(Math.random() * 3) + 1;
  if (inner) {
    inner.style.backgroundImage = `url('assets/img/share-card-${shareCardNum}.png')`;
    inner.style.backgroundSize = 'cover';
    inner.style.backgroundPosition = 'center';
  }

  if (reveal) reveal.classList.remove('hidden');

  if (boxType === 'handsome' && typeof audioManager !== 'undefined') {
    audioManager.play('whistle');
  }
}

async function showBlindboxResult(boxType) {
  // Use pre-fetched AI if available, otherwise fallback
  let content = null;
  if (pendingAIBlindbox && pendingBoxType === boxType) {
    content = pendingAIBlindbox;
  }
  if (!content) {
    content = getFallbackBlindbox(boxType);
  }
  // Clear pending
  pendingAIBlindbox = null;
  pendingBoxType = null;

  renderBlindboxDOM(content, boxType);

  // GSAP flip-in animation
  const card = document.getElementById('blindbox-card');
  if (card && typeof gsap !== 'undefined') {
    gsap.fromTo(card, {
      rotateY: 90, scale: 0.7, opacity: 0
    }, {
      rotateY: 0, scale: 1, opacity: 1,
      duration: 0.7, ease: 'back.out(1.4)'
    });
    gsap.fromTo('.blindbox-actions', {
      y: 30, opacity: 0
    }, {
      y: 0, opacity: 1,
      duration: 0.4, ease: 'power2.out',
      delay: 0.4
    });
  }
}
