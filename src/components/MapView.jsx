// 카카오맵 + 마커 렌더링
// - 저장된 맛집: 빨간 핀 (클릭하면 상세 보기)
// - 검색 결과: 파란 핀 (클릭하면 등록 폼)
import { useEffect, useRef } from 'react'
import { loadKakao } from '../lib/kakao'

// 색상별 SVG 핀을 MarkerImage로 만들어 줌
function pinImage(kakao, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 11.9 17 29 17 29s17-17.1 17-29C34 7.6 26.4 0 17 0z" fill="${color}"/>
      <circle cx="17" cy="17" r="7" fill="#fff"/>
    </svg>`
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  return new kakao.maps.MarkerImage(url, new kakao.maps.Size(34, 46), {
    offset: new kakao.maps.Point(17, 46),
  })
}

export default function MapView({
  places,
  searchResults,
  focus,
  picking,
  onPick,
  onMoved,
  onReady,
  onSelectSaved,
  onSelectSearch,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const kakaoRef = useRef(null)
  const savedMarkersRef = useRef([])
  const searchMarkersRef = useRef([])
  const imagesRef = useRef({})
  const pickRef = useRef(null) // 위치 찍기 모드일 때만 콜백을 담아둠
  const movedRef = useRef(null) // 지도 드래그 시 호출할 콜백

  // 리스너는 1회만 등록되므로, 최신 콜백/상태를 ref로 전달
  useEffect(() => {
    pickRef.current = picking ? onPick : null
  }, [picking, onPick])
  useEffect(() => {
    movedRef.current = onMoved
  }, [onMoved])

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    let cancelled = false
    loadKakao()
      .then((kakao) => {
        if (cancelled || mapRef.current) return
        kakaoRef.current = kakao
        const center = new kakao.maps.LatLng(37.5665, 126.978) // 기본: 서울시청
        const map = new kakao.maps.Map(containerRef.current, { center, level: 5 })
        mapRef.current = map
        imagesRef.current = {
          saved: pinImage(kakao, '#ff6b6b'),
          search: pinImage(kakao, '#4dabf7'),
        }
        // 지도 빈 곳을 클릭하면(위치 찍기 모드일 때만) 그 좌표를 전달
        kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
          const fn = pickRef.current
          if (!fn) return
          const ll = mouseEvent.latLng
          fn({ lat: ll.getLat(), lng: ll.getLng() })
        })
        // 사용자가 지도를 드래그로 옮기면 알림 ("이 지역 재검색" 버튼 띄우기용)
        kakao.maps.event.addListener(map, 'dragend', () => {
          const c = map.getCenter()
          movedRef.current?.({ lat: c.getLat(), lng: c.getLng() })
        })
        onReady?.(map)
        renderSaved()
        renderSearch()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 저장된 맛집 마커
  function renderSaved() {
    const kakao = kakaoRef.current
    const map = mapRef.current
    if (!kakao || !map) return
    savedMarkersRef.current.forEach((m) => m.setMap(null))
    savedMarkersRef.current = (places || []).map((p) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(p.lat, p.lng),
        image: imagesRef.current.saved,
        map,
      })
      kakao.maps.event.addListener(marker, 'click', () => onSelectSaved?.(p))
      return marker
    })
  }

  // 검색 결과 마커
  function renderSearch() {
    const kakao = kakaoRef.current
    const map = mapRef.current
    if (!kakao || !map) return
    searchMarkersRef.current.forEach((m) => m.setMap(null))
    searchMarkersRef.current = (searchResults || []).map((r) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(Number(r.y), Number(r.x)),
        image: imagesRef.current.search,
        map,
      })
      kakao.maps.event.addListener(marker, 'click', () => onSelectSearch?.(r))
      return marker
    })
    // 검색 결과가 있으면, 줌아웃하지 않고 가장 가까운(첫) 결과로만 부드럽게 이동
    if (searchResults && searchResults.length > 0) {
      const nearest = searchResults[0]
      map.panTo(new kakao.maps.LatLng(Number(nearest.y), Number(nearest.x)))
    }
  }

  useEffect(renderSaved, [places]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(renderSearch, [searchResults]) // eslint-disable-line react-hooks/exhaustive-deps

  // 특정 위치로 지도 이동
  useEffect(() => {
    const kakao = kakaoRef.current
    const map = mapRef.current
    if (!kakao || !map || !focus) return
    map.panTo(new kakao.maps.LatLng(focus.lat, focus.lng))
  }, [focus])

  return <div ref={containerRef} className={'map' + (picking ? ' picking' : '')} />
}
