// 1~5점 별점. readOnly면 보기 전용, 아니면 클릭/호버로 점수 지정
import { useState } from 'react'

export default function StarRating({ value = 0, onChange, readOnly = false, size = 24 }) {
  const [hover, setHover] = useState(0)
  const display = hover || value

  return (
    <div className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={'star' + (n <= display ? ' on' : '') + (readOnly ? ' readonly' : '')}
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n === value ? 0 : n)}
          aria-label={`${n}점`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
