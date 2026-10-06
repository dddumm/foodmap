// 카카오 장소 검색을 Promise로 감싼 헬퍼 — SearchBar와 "이 지역 재검색" 둘 다 사용
import { loadKakao } from './kakao'

export async function searchPlaces(keyword, center) {
  const kakao = await loadKakao()
  const ps = new kakao.maps.services.Places()

  // center가 있으면 그 위치 기준 거리순 정렬
  const options = center
    ? {
        location: new kakao.maps.LatLng(center.lat, center.lng),
        sort: kakao.maps.services.SortBy.DISTANCE,
      }
    : undefined

  return new Promise((resolve, reject) => {
    ps.keywordSearch(
      keyword,
      (data, status) => {
        if (status === kakao.maps.services.Status.OK) resolve(data)
        else if (status === kakao.maps.services.Status.ZERO_RESULT) resolve([])
        else reject(new Error('검색 중 문제가 생겼어요.'))
      },
      options
    )
  })
}
