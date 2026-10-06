// 저장된 맛집 상세 보기
import { supabase } from '../lib/supabase'
import { RATING_FIELDS, averageRating } from '../lib/ratings'
import StarRating from './StarRating'

export default function PlaceDetail({ place, onClose, onEdit, onDeleted }) {
  const avg = averageRating(place.ratings)

  async function handleDelete() {
    if (!confirm(`'${place.name}'을(를) 지도에서 삭제할까요?`)) return
    const { error } = await supabase.from('places').delete().eq('id', place.id)
    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }
    onDeleted(place.id)
  }

  return (
    <div className="place-detail">
      <div className="form-head">
        <h2>{place.name}</h2>
        {place.category && <span className="muted">{place.category}</span>}
        {place.road_address && <p className="muted">{place.road_address}</p>}
        {place.phone && <p className="muted">☎ {place.phone}</p>}
      </div>

      {avg != null && (
        <p className="avg">
          평균 <strong>{avg}</strong> <StarRating value={Math.round(avg)} readOnly size={18} />
          <span className="muted"> · {place.author} 평가</span>
        </p>
      )}

      {place.photos?.length > 0 && (
        <div className="photo-grid">
          {place.photos.map((url) => (
            <div className="photo-thumb" key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="" />
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="ratings">
        {RATING_FIELDS.map((f) => (
          <div className="rating-row" key={f.key}>
            <span>{f.label}</span>
            <StarRating value={place.ratings?.[f.key] || 0} readOnly size={18} />
          </div>
        ))}
      </div>

      {place.review && <p className="review">“{place.review}”</p>}

      {place.place_url && (
        <a className="kakao-link" href={place.place_url} target="_blank" rel="noreferrer">
          카카오맵에서 보기 →
        </a>
      )}

      <div className="form-actions">
        <button type="button" className="ghost danger" onClick={handleDelete}>
          삭제
        </button>
        <button type="button" className="ghost" onClick={onClose}>
          닫기
        </button>
        <button type="button" className="primary" onClick={() => onEdit(place)}>
          수정
        </button>
      </div>
    </div>
  )
}
