// src/components/Calendar.jsx
import { useMemo } from "react"

function Calendar({ year, month, selectedDate, onSelectDate }) {
  // month: 0~11 (JS Date 방식)

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekDay = firstDay.getDay() // 0=Sun

    const days = []

    // 앞쪽 빈칸
    for (let i = 0; i < startWeekDay; i++) {
      days.push(null)
    }

    // 실제 날짜들
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(d)
    }

    // 7일씩 끊어서 주 단위 배열로 만들기
    const result = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [year, month])

  const isSameDate = (d) => {
    if (!selectedDate || !d) return false
    const sd = new Date(selectedDate)
    return (
      sd.getFullYear() === year &&
      sd.getMonth() === month &&
      sd.getDate() === d
    )
  }

  const handleClick = (d) => {
    if (!d) return
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`
    onSelectDate?.(dateStr)
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <span>{year}년 {month + 1}월</span>
      </div>
      <div className="calendar-grid">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="calendar-cell calendar-weekday">
            {d}
          </div>
        ))}

        {weeks.map((week, wi) =>
          week.map((d, di) => (
            <button
              key={`${wi}-${di}`}
              className={
                "calendar-cell calendar-day" +
                (d && isSameDate(d) ? " selected" : "")
              }
              onClick={() => handleClick(d)}
              disabled={!d}
            >
              {d ?? ""}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default Calendar
