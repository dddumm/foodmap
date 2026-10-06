// 카카오맵 SDK는 index.html에서 autoload=false로 불러오므로,
// 실제 사용 전에 kakao.maps.load()로 초기화를 기다려야 한다.
let loadPromise = null

export function loadKakao() {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const kakao = window.kakao
    if (!kakao || !kakao.maps) {
      reject(new Error('카카오맵 SDK가 로드되지 않았습니다. VITE_KAKAO_MAP_KEY를 확인하세요.'))
      return
    }
    kakao.maps.load(() => resolve(window.kakao))
  })

  return loadPromise
}

export function hasKakaoKey() {
  // 키가 비어 있으면 SDK 스크립트가 maps 객체를 만들지 못한다.
  return Boolean(window.kakao && window.kakao.maps)
}
