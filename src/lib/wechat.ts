/**
 * 微信公众号 API 客户端
 * 
 * 用于与微信公众号平台交互，包括获取 access_token、上传素材、创建草稿等
 * Requirements: 5.1, 5.2, 5.3, 6.3, 6.5
 */

import { WeChatConfig, WeChatArticle, WeChatApiError } from '@/types';

/**
 * 微信 API 错误码映射
 * Requirements: 6.4
 */
export const WECHAT_ERROR_MESSAGES: Record<number, string> = {
  40001: 'access_token 无效或过期',
  40013: 'AppID 无效',
  40125: 'AppSecret 无效',
  40002: '不合法的凭证类型',
  40003: '不合法的 OpenID',
  40004: '不合法的媒体文件类型',
  40005: '不合法的文件类型',
  40006: '不合法的文件大小',
  40007: '不合法的媒体文件 id',
  40008: '不合法的消息类型',
  40009: '不合法的图片文件大小',
  40010: '不合法的语音文件大小',
  40011: '不合法的视频文件大小',
  40012: '不合法的缩略图文件大小',
  41001: '缺少 access_token 参数',
  41002: '缺少 appid 参数',
  41003: '缺少 refresh_token 参数',
  41004: '缺少 secret 参数',
  42001: 'access_token 超时',
  43001: '需要 GET 请求',
  43002: '需要 POST 请求',
  44001: '多媒体文件为空',
  44002: 'POST 的数据包为空',
  45001: '多媒体文件大小超过限制',
  45002: '消息内容超过限制',
  45003: '标题字段超过限制',
  45004: '描述字段超过限制',
  45005: '链接字段超过限制',
  45006: '图片链接字段超过限制',
  45007: '语音播放时间超过限制',
  45008: '图文消息超过限制',
  45009: '接口调用超过限制',
  45010: '创建菜单个数超过限制',
  45015: '回复时间超过限制',
  45016: '系统分组，不允许修改',
  45017: '分组名字过长',
  45018: '分组数量超过上限',
};

/**
 * 获取微信错误描述
 * Requirements: 6.4
 */
export function getWeChatErrorMessage(errcode: number): string {
  return WECHAT_ERROR_MESSAGES[errcode] || `未知错误 (${errcode})`;
}


/**
 * 微信 API 响应基础结构
 */
interface WeChatBaseResponse {
  errcode?: number;
  errmsg?: string;
}

/**
 * access_token 响应
 */
interface AccessTokenResponse extends WeChatBaseResponse {
  access_token?: string;
  expires_in?: number;
}

/**
 * 上传素材响应
 */
interface UploadMediaResponse extends WeChatBaseResponse {
  media_id?: string;
  url?: string;
}

/**
 * 创建草稿响应
 */
interface CreateDraftResponse extends WeChatBaseResponse {
  media_id?: string;
}

/**
 * 微信公众号 API 客户端类
 */
export class WeChatClient {
  private config: WeChatConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl = 'https://api.weixin.qq.com';

  constructor(config: WeChatConfig) {
    this.config = config;
  }

  /**
   * 检查响应是否有错误
   */
  private checkResponse<T extends WeChatBaseResponse>(response: T, operation: string): void {
    if (response.errcode && response.errcode !== 0) {
      const message = getWeChatErrorMessage(response.errcode);
      console.error(JSON.stringify({
        level: 'error',
        message: `WeChat API error: ${operation}`,
        errcode: response.errcode,
        errmsg: response.errmsg || message,
        timestamp: new Date().toISOString(),
      }));
      throw new WeChatApiError(message, response.errcode);
    }
  }

  /**
   * 获取 access_token
   * 如果 token 已缓存且未过期，直接返回缓存的 token
   * Requirements: 6.3
   */
  async getAccessToken(): Promise<string> {
    // 检查缓存的 token 是否有效（提前 5 分钟过期）
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now + 5 * 60 * 1000) {
      return this.accessToken;
    }

    const url = `${this.baseUrl}/cgi-bin/token?grant_type=client_credential&appid=${this.config.appId}&secret=${this.config.appSecret}`;
    
    const response = await fetch(url);
    const data: AccessTokenResponse = await response.json();

    this.checkResponse(data, 'getAccessToken');

    if (!data.access_token) {
      throw new WeChatApiError('获取 access_token 失败：响应中缺少 access_token', 0);
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in || 7200) * 1000;

    console.log(JSON.stringify({
      level: 'info',
      message: 'WeChat access_token obtained',
      expiresIn: data.expires_in,
      timestamp: new Date().toISOString(),
    }));

    return this.accessToken;
  }

  /**
   * 清除缓存的 access_token
   * 用于 40001 错误后强制刷新
   */
  clearAccessToken(): void {
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * 带 40001 错误自动重试的请求包装器
   * Requirements: 6.5
   */
  private async requestWithRetry<T extends WeChatBaseResponse>(
    operation: string,
    requestFn: (token: string) => Promise<T>
  ): Promise<T> {
    let token = await this.getAccessToken();
    let response = await requestFn(token);

    // 如果是 40001 错误，刷新 token 并重试一次
    if (response.errcode === 40001) {
      console.log(JSON.stringify({
        level: 'warn',
        message: 'access_token expired, refreshing and retrying',
        operation,
        timestamp: new Date().toISOString(),
      }));

      this.clearAccessToken();
      token = await this.getAccessToken();
      response = await requestFn(token);
    }

    this.checkResponse(response, operation);
    return response;
  }


  /**
   * 上传永久素材（封面图）
   * Requirements: 5.3
   * 
   * @param imageBuffer - 图片二进制数据
   * @param filename - 文件名
   * @returns media_id
   */
  async uploadImage(imageBuffer: Buffer, filename: string): Promise<string> {
    const response = await this.requestWithRetry<UploadMediaResponse>(
      'uploadImage',
      async (token) => {
        const url = `${this.baseUrl}/cgi-bin/material/add_material?access_token=${token}&type=image`;
        
        // 构建 multipart/form-data
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const body = Buffer.concat([
          Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
            `Content-Type: image/jpeg\r\n\r\n`
          ),
          imageBuffer,
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
        });

        return res.json();
      }
    );

    if (!response.media_id) {
      throw new WeChatApiError('上传素材失败：响应中缺少 media_id', 0);
    }

    console.log(JSON.stringify({
      level: 'info',
      message: 'Image uploaded to WeChat',
      mediaId: response.media_id,
      timestamp: new Date().toISOString(),
    }));

    return response.media_id;
  }

  /**
   * 上传图文消息内图片
   * 用于替换文章正文中的外部图片
   * Requirements: 5.6
   * 
   * @param imageUrl - 外部图片 URL
   * @returns 微信图片 URL
   */
  async uploadArticleImage(imageUrl: string): Promise<string> {
    // 先下载外部图片
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new WeChatApiError(`下载图片失败: ${imageUrl}`, 0);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const response = await this.requestWithRetry<UploadMediaResponse>(
      'uploadArticleImage',
      async (token) => {
        const url = `${this.baseUrl}/cgi-bin/media/uploadimg?access_token=${token}`;
        
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const body = Buffer.concat([
          Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="media"; filename="image.jpg"\r\n` +
            `Content-Type: image/jpeg\r\n\r\n`
          ),
          imageBuffer,
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
        });

        return res.json();
      }
    );

    if (!response.url) {
      throw new WeChatApiError('上传图文消息内图片失败：响应中缺少 url', 0);
    }

    console.log(JSON.stringify({
      level: 'info',
      message: 'Article image uploaded to WeChat',
      originalUrl: imageUrl,
      wechatUrl: response.url,
      timestamp: new Date().toISOString(),
    }));

    return response.url;
  }


  /**
   * 创建草稿
   * Requirements: 5.1, 5.2
   * 
   * @param articles - 文章数组
   * @returns media_id（草稿 ID）
   */
  async createDraft(articles: WeChatArticle[]): Promise<string> {
    const response = await this.requestWithRetry<CreateDraftResponse>(
      'createDraft',
      async (token) => {
        const url = `${this.baseUrl}/cgi-bin/draft/add?access_token=${token}`;
        
        // 转换为微信 API 格式
        const wechatArticles = articles.map(article => ({
          title: article.title,
          content: article.content,
          digest: article.digest,
          thumb_media_id: article.thumbMediaId,
          author: '',
          content_source_url: '',
          need_open_comment: 0,
          only_fans_can_comment: 0,
        }));

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ articles: wechatArticles }),
        });

        return res.json();
      }
    );

    if (!response.media_id) {
      throw new WeChatApiError('创建草稿失败：响应中缺少 media_id', 0);
    }

    console.log(JSON.stringify({
      level: 'info',
      message: 'Draft created on WeChat',
      mediaId: response.media_id,
      articleCount: articles.length,
      timestamp: new Date().toISOString(),
    }));

    return response.media_id;
  }
}

/**
 * 创建微信客户端实例
 */
export function createWeChatClient(): WeChatClient {
  const config: WeChatConfig = {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  };

  if (!config.appId || !config.appSecret) {
    throw new Error('Missing required WeChat configuration');
  }

  return new WeChatClient(config);
}

// ============================================================================
// 文章格式转换
// ============================================================================

/**
 * 外部图片 URL 正则
 */
const EXTERNAL_IMAGE_REGEX = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

/**
 * 微信图片域名
 */
const WECHAT_IMAGE_DOMAIN = 'mmbiz.qpic.cn';

/**
 * 检查 URL 是否为微信域名
 */
export function isWeChatImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === WECHAT_IMAGE_DOMAIN || parsed.hostname.endsWith('.' + WECHAT_IMAGE_DOMAIN);
  } catch {
    return false;
  }
}

/**
 * 提取 HTML 中的所有外部图片 URL
 */
export function extractExternalImageUrls(html: string): string[] {
  const urls: string[] = [];
  let match;
  
  while ((match = EXTERNAL_IMAGE_REGEX.exec(html)) !== null) {
    const url = match[1];
    if (!isWeChatImageUrl(url)) {
      urls.push(url);
    }
  }
  
  // 重置正则状态
  EXTERNAL_IMAGE_REGEX.lastIndex = 0;
  
  return urls;
}

/**
 * 替换 HTML 中的图片 URL
 */
export function replaceImageUrl(html: string, oldUrl: string, newUrl: string): string {
  return html.replace(new RegExp(escapeRegExp(oldUrl), 'g'), newUrl);
}

/**
 * 转义正则特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 格式化文章为微信 API 格式
 * 包括替换外部图片 URL
 * Requirements: 5.2, 5.6
 */
export async function formatForWeChat(
  article: {
    title: string;
    htmlContent: string;
    digest: string;
  },
  thumbMediaId: string,
  client: WeChatClient
): Promise<WeChatArticle> {
  let content = article.htmlContent;

  // 提取并替换外部图片
  const externalUrls = extractExternalImageUrls(content);
  
  for (const url of externalUrls) {
    try {
      const wechatUrl = await client.uploadArticleImage(url);
      content = replaceImageUrl(content, url, wechatUrl);
    } catch (error) {
      console.error(JSON.stringify({
        level: 'warn',
        message: 'Failed to upload article image, keeping original URL',
        originalUrl: url,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }));
      // 继续处理其他图片，不中断流程
    }
  }

  return {
    title: article.title,
    content,
    digest: article.digest.length > 100 ? article.digest.substring(0, 97) + '...' : article.digest,
    thumbMediaId,
  };
}
