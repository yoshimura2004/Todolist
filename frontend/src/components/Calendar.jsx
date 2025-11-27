// src/components/Calendar.jsx
import { useMemo } from "react"

function Calendar({ year, month, selectedDate, onSelectDate, todoDates = [] }) {
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

  // 🔹 이 날짜에 Todo가 있는지 확인
  const hasTodoOn = (d) => {
    if (!d) return false
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`
    return todoDates.includes(dateStr)
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
      {/* ❌ 헤더 제거됨 → Home.jsx에서만 월/년 표시 */}

      {/* 요일 헤더 */}
      <div className="calendar-weekdays">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="calendar-weekday">
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="calendar-grid">
        {weeks.map((week, wi) =>
          week.map((d, di) => {
            const hasTodo = hasTodoOn(d)
            const selected = d && isSameDate(d)

            const classNames = [
              "calendar-day",
              d ? "" : "empty",
              selected ? "selected" : "",
              hasTodo ? "has-todo" : "",
            ]
              .filter(Boolean)
              .join(" ")

            return (
              <button
                key={`${wi}-${di}`}
                className={classNames}
                onClick={() => handleClick(d)}
                disabled={!d}
              >
                {d ?? ""}
                {hasTodo && <span className="calendar-dot" />}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

export default Calendar
