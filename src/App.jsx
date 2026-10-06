import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseReady } from './lib/supabase'
import { hasKakaoKey } from './lib/kakao'
import { searchPlaces } from './lib/kakaoSearch'
import { averageRating } from './lib/ratings'
import SearchBar from './components/SearchBar'
import MapView from './components/MapView'
import PlaceForm from './components/PlaceForm'
import PlaceDetail from './components/PlaceDetail'
import StarRating from './components/StarRating'
import './App.css'

// 카카오 검색 결과 → 등록 폼 초안
function toDraft(r) {
  return {
    name: r.place_name,
    address: r.address_name,
    road_address: r.road_address_name,
    category: (r.category_name || '').split('>').pop().trim(),
    phone: r.phone,
    place_url: r.place_url,
    lat: Number(r.y),
    lng: Number(r.x),
    review: '',
    ratings: {},
    photos: [],
  }
}

export default function App() {
  const [places, setPlaces] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [mode, setMode] = useState('none') // none | search | form | detail | list
  const [draft, setDraft] = useState(null)
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(null)
  const [toast, setToast] = useState('')
  const [picking, setPicking] = useState(false) // 지도 탭으로 직접 추가 모드
  const [lastKeyword, setLastKeyword] = useState('') // 마지막 검색어 (재검색용)
  const [canResearch, setCanResearch] = useState(false) // 드래그 후 "이 지역 재검색" 버튼 표시
  const mapRef = useRef(null) // 카카오 지도 인스턴스 (현재 보는 위치 알아내기용)

  // 현재 지도 중심 좌표 — 검색 시 "가까운 곳 먼저" 정렬에 사용
  function getMapCenter() {
    const c = mapRef.current?.getCenter?.()
    return c ? { lat: c.getLat(), lng: c.getLng() } : null
  }

  const configOk = isSupabaseReady && hasKakaoKey()

  const loadPlaces = useCallback(async () => {
    if (!isSupabaseReady) return
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setPlaces(data || [])
  }, [])

  // 최초 로드 + 실시간 동기화 (둘이 같이 쓰므로 변경이 바로 반영됨)
  useEffect(() => {
    if (!isSupabaseReady) return
    loadPlaces()
    const channel = supabase
      .channel('places-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, loadPlaces)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadPlaces])

  function notify(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function handleResults(results, keyword) {
    setSearchResults(results)
    setMode(results.length ? 'search' : 'none')
    setSelected(null)
    if (keyword !== undefined) setLastKeyword(keyword)
    setCanResearch(false) // 새 검색이므로 재검색 버튼 숨김
  }

  // 지도를 드래그로 옮겼을 때 — 검색 중이면 "이 지역 재검색" 버튼 띄우기
  function handleMapMoved() {
    if (lastKeyword && searchResults.length > 0) setCanResearch(true)
  }

  // "이 지역에서 재검색" — 현재 지도 중심 기준으로 마지막 검색어 다시 검색
  async function researchHere() {
    setCanResearch(false)
    try {
      const results = await searchPlaces(lastKeyword, getMapCenter())
      setSearchResults(results)
      setMode(results.length ? 'search' : 'none')
      setSelected(null)
      if (results.length === 0) notify('이 지역엔 검색 결과가 없어요.')
    } catch (err) {
      notify(err.message)
    }
  }

  function openForm(draftObj) {
    setDraft(draftObj)
    setMode('form')
    setFocus({ lat: draftObj.lat, lng: draftObj.lng })
  }

  // 지도에서 위치를 탭했을 때 — 카카오에 없는 곳을 직접 추가
  function handlePick({ lat, lng }) {
    setPicking(false)
    setSearchResults([])
    openForm({
      name: '',
      address: '',
      road_address: '',
      category: '',
      phone: '',
      place_url: '', // place_url 없음 = 직접 추가(이름/주소 직접 입력)
      lat,
      lng,
      review: '',
      ratings: {},
      photos: [],
    })
  }

  function handleSelectSaved(place) {
    setSelected(place)
    setMode('detail')
    setFocus({ lat: place.lat, lng: place.lng })
  }

  function handleSaved(row) {
    setMode('none')
    setDraft(null)
    setSearchResults([])
    loadPlaces()
    notify('저장했어요! 🎉')
  }

  function handleDeleted() {
    setMode('none')
    setSelected(null)
    loadPlaces()
    notify('삭제했어요.')
  }

  if (!configOk) {
    return <SetupScreen />
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🍜 우리 맛집지도</div>
        <SearchBar onResults={handleResults} onError={notify} getCenter={getMapCenter} />
      </header>

      <div className="body">
      <div className="map-wrap">
        <MapView
          places={places}
          searchResults={searchResults}
          focus={focus}
          picking={picking}
          onPick={handlePick}
          onMoved={handleMapMoved}
          onReady={(map) => (mapRef.current = map)}
          onSelectSaved={handleSelectSaved}
          onSelectSearch={(r) => openForm(toDraft(r))}
        />
        {mode === 'search' && canResearch && !picking && (
          <button className="research-btn" onClick={researchHere}>
            🔍 이 지역에서 재검색
          </button>
        )}
        {picking ? (
          <div className="pick-banner">
            📍 추가할 식당 위치를 지도에서 탭하세요
            <button onClick={() => setPicking(false)}>취소</button>
          </div>
        ) : (
          <button className="add-fab" onClick={() => { setMode('none'); setPicking(true) }}>
            ➕ 카카오에 없는 식당 직접 추가
          </button>
        )}
      </div>

      <section className="main-list">
        <h3>우리가 남긴 맛집 {places.length}곳</h3>
        {places.length === 0 && (
          <p className="muted empty">아직 등록한 맛집이 없어요. 위에서 검색해서 추가해보세요!</p>
        )}
        {places.map((p) => {
          const avg = averageRating(p.ratings)
          return (
            <button key={p.id} className="saved-item" onClick={() => handleSelectSaved(p)}>
              <div className="saved-item-main">
                <strong>{p.name}</strong>
                <span className="muted">
                  {p.category}
                  {p.review ? ` · ${p.review}` : ''}
                </span>
              </div>
              <div className="saved-item-meta">
                {avg != null && <StarRating value={Math.round(avg)} readOnly size={14} />}
                {p.photos?.length > 0 && <span className="muted">📷 {p.photos.length}</span>}
              </div>
            </button>
          )
        })}
      </section>

      {mode === 'search' || mode === 'form' || mode === 'detail' ? (
        <div className="sheet">
          <button className="sheet-close" onClick={() => setMode('none')} aria-label="닫기">
            ✕
          </button>

          {mode === 'search' && (
            <div className="search-list">
              <h3>검색 결과 — 등록할 곳을 누르세요</h3>
              {searchResults.map((r) => (
                <button key={r.id} className="search-item" onClick={() => openForm(toDraft(r))}>
                  <strong>{r.place_name}</strong>
                  <span className="muted">{r.road_address_name || r.address_name}</span>
                </button>
              ))}
            </div>
          )}

          {mode === 'form' && draft && (
            <PlaceForm draft={draft} onSaved={handleSaved} onCancel={() => setMode('none')} />
          )}

          {mode === 'detail' && selected && (
            <PlaceDetail
              place={selected}
              onClose={() => setMode('none')}
              onEdit={(p) => {
                setDraft(p)
                setMode('form')
              }}
              onDeleted={handleDeleted}
            />
          )}

        </div>
      ) : null}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// 환경변수(키)가 아직 없을 때 보여주는 안내 화면
function SetupScreen() {
  return (
    <div className="setup">
      <h1>🍜 우리 맛집지도</h1>
      <p>앱을 켜려면 아래 키 2가지를 <code>.env</code> 파일에 넣어주세요.</p>
      <ol>
        <li>
          <strong>카카오맵 JavaScript 키</strong> —{' '}
          <a href="https://developers.kakao.com" target="_blank" rel="noreferrer">
            developers.kakao.com
          </a>{' '}
          → 내 애플리케이션 → 앱 키 → JavaScript 키
        </li>
        <li>
          <strong>Supabase URL + anon key</strong> —{' '}
          <a href="https://supabase.com" target="_blank" rel="noreferrer">
            supabase.com
          </a>{' '}
          → 프로젝트 → Settings → API
        </li>
      </ol>
      <pre>{`VITE_KAKAO_MAP_KEY=여기에_카카오_자바스크립트_키
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=여기에_anon_key`}</pre>
      <p className="muted">
        키를 넣고 <code>npm run dev</code>를 다시 실행하면 지도가 나타나요. 자세한 방법은 <code>SETUP.md</code> 참고!
      </p>
    </div>
  )
}
