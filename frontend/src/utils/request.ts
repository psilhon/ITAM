import axios from 'axios'
import { toastService } from '../components/Toast'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// 响应拦截器：处理 401 未授权 + 全局错误 Toast
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || '请求失败'

    // 401 未授权
    if (status === 401) {
      toastService.error('登录已失效，请重新登录', { persistent: true })
      return Promise.reject(new Error('登录已失效，请重新登录'))
    }

    // 网络错误
    if (error.code === 'ECONNABORTED') {
      toastService.error('请求超时，请检查网络连接')
    } else if (!error.response) {
      toastService.error('网络连接失败，请检查网络')
    } else {
      toastService.error(message)
    }

    return Promise.reject(new Error(message))
  }
)

export default request
