import Pinyin from 'pinyin'

/**
 * 获取中文公司名称的拼音首字母
 * 例如：一创证券 -> YCZQ
 */
export function getCompanyPinyin(company: string | null | undefined): string | null {
  if (!company) return null

  const pinyinArr = Pinyin(company, {
    style: Pinyin.STYLE_FIRST_LETTER, // 首字母风格
    heteronym: false, // 不显示多音字
  })

  return pinyinArr.map(item => (item[0] as string).toUpperCase()).join('')
}

/**
 * 获取中文机房名称的拼音首字母
 * 例如：南方机房 -> NFJF
 */
export function getDatacenterPinyin(datacenter: string | null | undefined): string | null {
  if (!datacenter) return null

  const pinyinArr = Pinyin(datacenter, {
    style: Pinyin.STYLE_FIRST_LETTER,
    heteronym: false,
  })

  return pinyinArr.map(item => (item[0] as string).toUpperCase()).join('')
}

/**
 * 获取中文公司名称的完整拼音（空格分隔）
 * 例如：一创证券 -> yi chuang zheng quan
 */
export function getCompanyFullPinyin(company: string | null | undefined): string | null {
  if (!company) return null

  const pinyinArr = Pinyin(company, {
    style: Pinyin.STYLE_NORMAL, // 普通风格
    heteronym: false,
  })

  return pinyinArr.map(item => item[0]).join(' ')
}
