/**
 * 接口请求封装
 *
 * 基于原生 fetch 实现，适配当前无构建工具的静态项目。
 *
 * 用法示例：
 *   // 非打包环境：通过 window.RjRequest.api 调用（见 index.html 引入顺序）
 *
 *   // GET
 *   const data = await api.get('/some/path', { page: 1 });
 *
 *   // POST
 *   const result = await api.post('/some/path', { name: 'test' });
 */

// ==================== 配置 ====================

// 根据当前域名自动判断环境
const isProduction = window.location.hostname === 'www.rjmart.cn';

const API_CONFIG = {
  baseURL: isProduction
    ? 'https://gateway.rjmart.cn'
    : 'https://gateway.test.rj-info.com',
  // 接口路径前缀
  apiPrefix: '',
  // 超时时间（毫秒）
  timeout: 15000,
};

// ==================== 鉴权存储 ====================

const AUTH_TOKEN_KEY = 'token';
const CURRENT_USER_ID_KEY = 'current_user_id';

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_ID_KEY) || '';
}

// ==================== rjk 签名 ====================

const RjkHeader = {
  getStringFromMultipleCode(codeArray) {
    return codeArray.map(c => String.fromCharCode(c)).join('');
  },

  simpleEncode(str) {
    if (!str || typeof str !== 'string') return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (31 * hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  },

  hasNonAsciiChar(str) {
    if (!str) return false;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) > 127) return true;
    }
    return false;
  },

  encodeIfNeeded(str) {
    if (!str || typeof str !== 'string') return str || '';
    if (this.hasNonAsciiChar(str)) {
      try {
        return btoa(unescape(encodeURIComponent(str)));
      } catch (_) {
        return str;
      }
    }
    return str;
  },

  /**
   * 生成 rjk 请求头的值
   * @param {object} options
   * @param {string} options.token   当前 token
   * @param {string|object} options.data 请求数据
   * @param {string} options.userFlag  用户标识
   * @returns {string} rjk 值
   */
  generate({ token = '', data = '', userFlag = '' }) {
    const version = this.getStringFromMultipleCode([120, 50, 51, 49]); // "x231"
    const ts = Date.now();
    const hasToken = token.length ? 1 : 0;
    const tokenLength = token.length || 0;

    const dataStr = typeof data === 'string' ? data : JSON.stringify(data || '');
    const encodedData = this.encodeIfNeeded(dataStr);
    const dataHash = this.simpleEncode(encodedData);

    const encodedUserFlag = this.encodeIfNeeded(String(userFlag || ''));
    const isSelenium = window.navigator?.webdriver ? 1 : 0;

    const parts = [
      version,
      this.simpleEncode(String(ts)),
      String(hasToken) + ts,
      dataHash,
      tokenLength,
      encodedUserFlag,
      isSelenium,
    ];
    const joined = parts.join('.');
    return joined + '.' + joined.length;
  },
};

// ==================== 错误处理 ====================

class RequestError extends Error {
  constructor(message, { status = 0, code = 0, data = null } = {}) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// ==================== 核心请求 ====================

/**
 * 发起请求
 * @param {string} url     请求路径（不含 baseURL）
 * @param {object} options 配置项
 * @param {string}  options.method  请求方法，默认 post
 * @param {object}  options.params  URL 查询参数（GET 用）
 * @param {object}  options.data    请求体（POST 用）
 * @param {object}  options.headers 自定义请求头
 * @param {number}  options.timeout 超时时间（毫秒）
 * @param {boolean} options.silent  为 true 时不弹错误提示
 * @returns {Promise<any>} 接口返回的 data 字段
 */
async function request(url, options = {}) {
  const {
    method = 'post',
    params,
    data,
    headers = {},
    timeout = API_CONFIG.timeout,
    silent = false,
  } = options;

  // 拼接完整 URL
  let fullURL = `${API_CONFIG.baseURL}${API_CONFIG.apiPrefix}${url}`;

  // 拼接查询参数
  if (params && Object.keys(params).length) {
    const query = new URLSearchParams(params).toString();
    fullURL += (fullURL.includes('?') ? '&' : '?') + query;
  }

  // 请求数据（用于 rjk 签名）
  const requestData = data || params || '';

  // 鉴权 —— token + rjk 签名
  const token = getAuthToken();
  const rjkHeaderName = RjkHeader.getStringFromMultipleCode([114, 106, 107]); // "rjk"
  const rjkValue = RjkHeader.generate({
    token,
    data: requestData,
    userFlag: getCurrentUserId(),
  });

  // 构建 fetch 配置
  const fetchOptions = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      [rjkHeaderName]: rjkValue,
      ...headers,
    },
  };

  // 请求体
  if (data !== undefined && method.toUpperCase() !== 'GET') {
    fetchOptions.body = JSON.stringify(data);
  }

  // 超时控制
  const controller = new AbortController();
  fetchOptions.signal = controller.signal;
  const timer = setTimeout(() => controller.abort(), timeout);

  console.log(`🚀 API Request: ${fetchOptions.method} ${fullURL}`);
  const startTime = Date.now();

  try {
    const response = await fetch(fullURL, fetchOptions);
    const duration = Date.now() - startTime;
    console.log(`✅ API Response: ${fetchOptions.method} ${fullURL} (${duration}ms)`);

    // HTTP 状态码异常
    if (!response.ok) {
      let errorData = null;
      try {
        errorData = await response.json();
      } catch (_) {
        // 响应体不是 JSON，忽略
      }
      const msg = errorData?.msg || errorData?.message || `请求失败 (${response.status})`;
      throw new RequestError(msg, {
        status: response.status,
        code: errorData?.code || response.status,
        data: errorData,
      });
    }

    // 解析响应
    const result = await response.json();

    // 业务状态码判断（适配 { code, data, msg } 格式）
    if (result && typeof result.code !== 'undefined' && result.code !== 200) {
      throw new RequestError(result.msg || '请求失败', {
        status: result.code,
        code: result.code,
        data: result,
      });
    }

    // 如果响应是标准信封格式，返回 data 字段；否则返回整个结果
    return result && typeof result.code !== 'undefined' ? result.data : result;
  } catch (error) {
    if (error instanceof RequestError) {
      if (!silent) {
        console.error(`❌ API Error: ${error.message}`);
      }
      throw error;
    }

    // 网络错误 / 超时
    const isTimeout = error.name === 'AbortError';
    const msg = isTimeout ? '请求超时，请稍后重试' : '网络异常，请检查连接后重试';
    console.error(`❌ ${msg}`, error);
    throw new RequestError(msg, { status: 0, code: 0 });
  } finally {
    clearTimeout(timer);
  }
}

// ==================== 快捷方法 ====================

const api = {
  get(url, params, options = {}) {
    return request(url, { ...options, method: 'GET', params });
  },
  post(url, data, options = {}) {
    return request(url, { ...options, method: 'POST', data });
  },
};

// ==================== 全局导出（供静态页 script 标签直接使用；勿改为 ES Module，否则 file:// 打开会失败） ====================

window.RjRequest = { API_CONFIG, RequestError, request, api };
