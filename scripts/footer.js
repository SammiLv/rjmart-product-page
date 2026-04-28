/**
 * 页脚版权信息动态加载
 */

function escapeHtml(str) {
  if (str == null) {
    return '';
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

/**
 * 接口常返回以 / 开头的相对路径；挂在 GitHub Pages 时浏览器会按当前站点域名解析导致裂图。
 * 统一补全为网关绝对地址（与 request.js 中 API_CONFIG.baseURL 一致）。
 */
function resolveAssetUrl(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  const u = raw.trim();
  if (!u || u === ' ') {
    return '';
  }
  if (/^https?:\/\//i.test(u)) {
    return u;
  }
  if (u.startsWith('//')) {
    return `${window.location.protocol}${u}`;
  }
  const base = window.RjRequest?.API_CONFIG?.baseURL || '';
  if (!base) {
    return u;
  }
  const baseNorm = base.replace(/\/$/, '');
  if (u.startsWith('/')) {
    return `${baseNorm}${u}`;
  }
  return `${baseNorm}/${u}`;
}

/** 取排序权重：兼容多种后端字段名 */
function sortKey(obj, fallback = 0) {
  if (!obj || typeof obj !== 'object') {
    return fallback;
  }
  const v =
    obj.sort ??
    obj.sortNum ??
    obj.order ??
    obj.columnSort ??
    obj.rowSort ??
    obj.index ??
    obj.seq;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sortRowBottoms(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  const sorted = [...rows].sort((a, b) => sortKey(a) - sortKey(b));
  return sorted;
}

function normalizeColumnBottoms(columnBottoms) {
  if (!Array.isArray(columnBottoms)) {
    return [];
  }
  const filtered = columnBottoms.filter(col => {
    const item = col && col.bottom;
    if (!item) {
      return false;
    }
    const text = (item.displayNameCn || item.displayNameEn || '').trim();
    const logoUrl = item.logoUrl && String(item.logoUrl).trim() && String(item.logoUrl).trim() !== ' ';
    return Boolean(text || logoUrl);
  });
  const sorted = filtered.sort((a, b) => sortKey(a) - sortKey(b));

  const seen = new Set();
  const deduped = [];
  for (const col of sorted) {
    const sig = columnDedupeSignature(col);
    if (seen.has(sig)) {
      continue;
    }
    seen.add(sig);
    deduped.push(col);
  }
  return deduped;
}

/** 去掉后端重复的栏目（相同文案/图标/链接配置） */
function columnDedupeSignature(col) {
  const item = col && col.bottom;
  if (!item) {
    return '';
  }
  const text = (item.displayNameCn || item.displayNameEn || '').trim();
  const logoRaw =
    item.logoUrl && String(item.logoUrl).trim() && String(item.logoUrl).trim() !== ' '
      ? String(item.logoUrl).trim()
      : '';
  const logoResolved = logoRaw ? resolveAssetUrl(logoRaw) : '';
  const attachRaw =
    item.attachment && String(item.attachment).trim() && String(item.attachment).trim() !== ' '
      ? String(item.attachment).trim()
      : '';
  const hrefResolved = attachRaw ? resolveAssetUrl(attachRaw) : '';
  const ct = item.clickType != null ? String(item.clickType) : '';
  return [ct, text, logoResolved, hrefResolved].join('\u0001');
}

async function loadFooterLegalInfo() {
  console.log('开始加载页脚版权信息...');

  try {
    if (!window.RjRequest) {
      console.error('RjRequest 未定义');
      return;
    }

    const { api } = window.RjRequest;
    console.log('调用接口...');

    const result = await api.post('/store/config/anonymous/getWebsiteBottomConfigs', {
      domain: 'srm.test.rj-info.com'
    });

    console.log('接口返回数据:', result);

    if (!result || !result.sortBottoms || !result.sortBottoms.length) {
      console.warn('页脚版权信息接口返回数据为空');
      return;
    }

    // 取第一个语言配置（ZH_CN）
    const config = result.sortBottoms[0];
    const rowBottoms = sortRowBottoms(config.rowBottoms);

    if (!rowBottoms.length) {
      console.warn('页脚版权信息行数据为空');
      return;
    }

    console.log('开始渲染页脚...');

    const legalRoot = document.querySelector('.footer-legal');

    // 渲染第一行
    const line1Container = document.getElementById('footer-legal-line1');
    if (line1Container && rowBottoms[0]) {
      renderFooterLine(line1Container, rowBottoms[0].columnBottoms);
      console.log('第一行渲染完成');
    }

    // 渲染第二行（若接口只返回一行，清空第二行占位，避免与设计稿不一致）
    const line2Container = document.getElementById('footer-legal-line2');
    if (line2Container) {
      if (rowBottoms[1]) {
        renderFooterLine(line2Container, rowBottoms[1].columnBottoms);
        console.log('第二行渲染完成');
      } else {
        line2Container.innerHTML = '';
      }
    }

    // 接口数据已覆盖文案：隐藏静态占位顶栏 Logo（设计稿仅为两行备案信息 + 行内图标）
    legalRoot?.classList.add('footer-legal--from-api');
  } catch (error) {
    console.error('加载页脚版权信息失败:', error);
  }
}

function renderFooterLine(container, columnBottoms) {
  const cols = normalizeColumnBottoms(columnBottoms);
  if (!cols.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = cols
    .map((col, index) => {
      const item = col.bottom;
      if (!item) {
        return '';
      }
      const chunk = renderFooterCell(item);
      const divider = index < cols.length - 1 ? '<span class="footer-divider">|</span>' : '';
      return chunk + divider;
    })
    .join('');
}

/**
 * 单个备案格子：外链类型下图标与文案合并为同一个 <a>，避免两个链接叠在同一语义上、看起来像「文案重复」。
 */
function renderFooterCell(item) {
  const text = (item.displayNameCn || item.displayNameEn || '').trim();
  const logoRaw =
    item.logoUrl && String(item.logoUrl).trim() && String(item.logoUrl).trim() !== ' '
      ? String(item.logoUrl).trim()
      : '';
  const logoUrl = logoRaw ? resolveAssetUrl(logoRaw) : '';
  const clickType = item.clickType;
  const attachRaw =
    item.attachment && String(item.attachment).trim() && String(item.attachment).trim() !== ' '
      ? String(item.attachment).trim()
      : '';
  const attachment = attachRaw ? resolveAssetUrl(attachRaw) : '';

  const textHtml = escapeHtml(text);

  const hasLink = Boolean(attachment && (clickType === 2 || clickType === 3));
  if (hasLink && (logoUrl || text)) {
    const innerParts = [];
    if (logoUrl) {
      innerParts.push(
        `<img src="${escapeAttr(logoUrl)}" alt="" class="footer-legal-inline-icon" loading="lazy" decoding="async" />`
      );
    }
    if (text) {
      innerParts.push(`<span class="footer-legal-cell-text">${textHtml}</span>`);
    }
    const inner = innerParts.join('');
    if (clickType === 3) {
      return `<a href="${escapeAttr(attachment)}" target="_blank" rel="noopener noreferrer" download class="footer-legal-inline-link footer-legal-cell-link">${inner}</a>`;
    }
    return `<a href="${escapeAttr(attachment)}" target="_blank" rel="noopener noreferrer" class="footer-legal-inline-link footer-legal-cell-link">${inner}</a>`;
  }

  const parts = [];
  if (logoUrl) {
    parts.push(
      `<img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(text || 'icon')}" class="footer-legal-inline-icon" loading="lazy" decoding="async" />`
    );
  }
  if (text) {
    if (clickType === 2 && attachment) {
      parts.push(
        `<a href="${escapeAttr(attachment)}" target="_blank" rel="noopener noreferrer" class="footer-legal-inline-link">${textHtml}</a>`
      );
    } else if (clickType === 3 && attachment) {
      parts.push(
        `<a href="${escapeAttr(attachment)}" target="_blank" rel="noopener noreferrer" download class="footer-legal-inline-link">${textHtml}</a>`
      );
    } else {
      parts.push(`<span>${textHtml}</span>`);
    }
  }
  return parts.join('');
}

// 等待 RjRequest 加载完成后执行
function waitForRjRequest() {
  if (window.RjRequest) {
    loadFooterLegalInfo();
  } else {
    // 每 50ms 检查一次，最多等待 5 秒
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.RjRequest) {
        clearInterval(checkInterval);
        loadFooterLegalInfo();
      } else if (attempts > 100) {
        clearInterval(checkInterval);
        console.error('RjRequest 加载超时');
      }
    }, 50);
  }
}

// 页面加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForRjRequest);
} else {
  waitForRjRequest();
}
