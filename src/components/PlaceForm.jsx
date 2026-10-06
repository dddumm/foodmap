// 맛집 등록/수정 폼 — 한줄평, 5가지 별점, 사진, 작성자
import { useState } from 'react'
import { supabase, PHOTO_BUCKET } from '../lib/supabase'
import { RATING_FIELDS } from '../lib/ratings'
import StarRating from './StarRating'

export default function PlaceForm({ draft, onSaved, onCancel }) {
  const [review, setReview] = useState(draft.review || '')
  const [ratings, setRatings] = useState(draft.ratings || {})
  const [author, setAuthor] = useState(draft.author || '')
  const [photos, setPhotos] = useState(draft.photos || []) // 이미 저장된 사진 URL
  const [files, setFiles] = useState([]) // 새로 추가할 파일
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 직접 추가한 곳(카카오에 없는 곳)은 이름·주소를 손으로 입력
  const isManual = !draft.place_url
  const [name, setName] = useState(draft.name || '')
  const [address, setAddress] = useState(draft.road_address || draft.address || '')

  const isEdit = Boolean(draft.id)

  function setRating(key, val) {
    setRatings((r) => ({ ...r, [key]: val }))
  }

  function addFiles(e) {
    const picked = Array.from(e.target.files || [])
    setFiles((f) => [...f, ...picked])
    e.target.value = '' // 같은 파일 다시 선택 가능하게
  }

  async function uploadPhotos() {
    const urls = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    return urls
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (isManual && !name.trim()) {
      setError('식당 이름을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const newUrls = files.length ? await uploadPhotos() : []
      const row = {
        name: isManual ? name.trim() : draft.name,
        address: isManual ? address.trim() : draft.address,
        road_address: isManual ? address.trim() : draft.road_address,
        category: draft.category,
        phone: draft.phone,
        place_url: draft.place_url,
        lat: draft.lat,
        lng: draft.lng,
        review,
        ratings,
        photos: [...photos, ...newUrls],
        author,
      }
      let result
      if (isEdit) {
        result = await supabase.from('places').update(row).eq('id', draft.id).select().single()
      } else {
        result = await supabase.from('places').insert(row).select().single()
      }
      if (result.error) throw result.error
      onSaved(result.data)
    } catch (err) {
      setError(err.message || '저장에 실패했어요.')
      setSaving(false)
    }
  }

  return (
    <form className="place-form" onSubmit={handleSubmit}>
      {isManual ? (
        <div className="form-head">
          <label className="field">
            <span>식당 이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 우리동네 백반집"
            />
          </label>
          <label className="field">
            <span>주소 (선택)</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="예: 서울 성동구 성수동 123"
            />
          </label>
        </div>
      ) : (
        <div className="form-head">
          <h2>{draft.name}</h2>
          {draft.category && <span className="muted">{draft.category}</span>}
          {draft.road_address && <p className="muted">{draft.road_address}</p>}
        </div>
      )}

      <label className="field">
        <span>작성자</span>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="이름을 입력하세요 (예: 예진)"
        />
      </label>

      <div className="ratings">
        {RATING_FIELDS.map((f) => (
          <div className="rating-row" key={f.key}>
            <span>{f.label}</span>
            <StarRating value={ratings[f.key] || 0} onChange={(v) => setRating(f.key, v)} />
          </div>
        ))}
      </div>

      <label className="field">
        <span>한줄평</span>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="예: 골뱅이무침이 매콤달콤 최고! 재방문 의사 100%"
          rows={3}
        />
      </label>

      <div className="field">
        <span>음식 사진</span>
        <div className="photo-grid">
          {photos.map((url, i) => (
            <div className="photo-thumb" key={url}>
              <img src={url} alt="" />
              <button type="button" onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}>
                ×
              </button>
            </div>
          ))}
          {files.map((file, i) => (
            <div className="photo-thumb pending" key={i}>
              <img src={URL.createObjectURL(file)} alt="" />
              <button type="button" onClick={() => setFiles((f) => f.filter((_, idx) => idx !== i))}>
                ×
              </button>
            </div>
          ))}
          <label className="photo-add">
            +
            <input type="file" accept="image/*" multiple onChange={addFiles} hidden />
          </label>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? '저장 중…' : isEdit ? '수정' : '등록'}
        </button>
      </div>
    </form>
  )
}
