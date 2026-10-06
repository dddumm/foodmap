// 별점 항목 정의 — 순서/라벨을 여기서 한 번에 관리
export const RATING_FIELDS = [
  { key: 'taste', label: '맛' },
  { key: 'cleanliness', label: '청결도' },
  { key: 'composition', label: '구성' },
  { key: 'menu', label: '메뉴' },
  { key: 'service', label: '서비스' },
]

// ratings 객체의 평균(소수 1자리). 값이 하나도 없으면 null
export function averageRating(ratings = {}) {
  const values = RATING_FIELDS.map((f) => ratings?.[f.key]).filter((v) => typeof v === 'number' && v > 0)
  if (values.length === 0) return null
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return Math.round(avg * 10) / 10
}
