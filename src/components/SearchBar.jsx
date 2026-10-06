// 카카오 장소 검색 — 식당 이름으로 검색해서 결과를 부모로 넘김
import { useState } from 'react'
import { searchPlaces } from '../lib/kakaoSearch'

export default function SearchBar({ onResults, onError, getCenter }) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  async function search(e) {
    e.preventDefault()
    const q = keyword.trim()
    if (!q) return
    setLoading(true)
    try {
      // 현재 보고 있는 지도 위치 기준으로 가까운 곳 먼저
      const results = await searchPlaces(q, getCenter?.())
      setLoading(false)
      if (results.length === 0) onError?.('검색 결과가 없어요. 다른 이름으로 찾아보세요.')
      onResults(results, q)
    } catch (err) {
      setLoading(false)
      onError?.(err.message)
    }
  }

  return (
    <form className="searchbar" onSubmit={search}>
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="식당 이름 검색 (예: 을지로 골뱅이)"
      />
      <button type="submit" disabled={loading}>
        {loading ? '…' : '검색'}
      </button>
    </form>
  )
}
