// === Share / Screenshot via html2canvas ===

async function captureAndShare(target) {
  let sourceEl;

  if (target === 'paper') {
    sourceEl = document.getElementById('paper-stage');
    if (sourceEl) sourceEl.classList.remove('hidden');
    // Hide canvas temporarily
    const canvas = document.getElementById('destruction-canvas');
    if (canvas) canvas.classList.remove('active');
  } else {
    sourceEl = document.getElementById('blindbox-card');
  }

  if (!sourceEl) {
    showToast('截图失败：找不到元素');
    return;
  }

  try {
    let dataUrl;

    if (typeof html2canvas !== 'undefined') {
      const result = await html2canvas(sourceEl, {
        backgroundColor: target === 'paper' ? '#fef9f0' : null,
        scale: 2,
        useCORS: true
      });
      dataUrl = result.toDataURL('image/png');
    } else {
      // Fallback: if source is a canvas
      if (sourceEl.tagName === 'CANVAS') {
        dataUrl = sourceEl.toDataURL('image/png');
      } else {
        showToast('截图库未加载');
        return;
      }
    }

    const shareImg = document.getElementById('share-image');
    const shareModal = document.getElementById('share-modal');

    if (shareImg) shareImg.src = dataUrl;
    if (shareModal) shareModal.classList.remove('hidden');

    // Try native share on mobile
    if (navigator.share) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'facai-defu.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: '发疯得福',
          text: target === 'paper'
            ? '我的负鼠替身帮我骂的，你的呢？'
            : '看看我砸出了什么！'
        });
      } catch (e) {
        // User cancelled or not supported — modal is already shown
      }
    }
  } catch (e) {
    console.error('Screenshot failed:', e);
    showToast('截图失败，请重试');
  }

  // Restore paper stage
  if (target === 'paper') {
    const paperStage = document.getElementById('paper-stage');
    if (paperStage) paperStage.classList.add('hidden');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.add('hidden'), 2000);
}
