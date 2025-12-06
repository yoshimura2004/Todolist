// src/components/Calendar.jsx
import { useMemo } from "react"

const HOLIDAYS_2026 = {
  "2025-12-25": "크리스마스",
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "3·1절",
  "2026-03-02": "대체공휴일",
  "2026-05-05": "어린이날",
  "2026-05-24": "석가탄신일",
  "2026-05-25": "대체공휴일",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "크리스마스",
}

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
  const isHolidayOn = (d) => {
    if (!d) return false
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`
    return HOLIDAYS_2026[dateStr] != null
  }

  const getHolidayName = (d) => {
    if (!d) return null
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`
    return HOLIDAYS_2026[dateStr] ?? null
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
        {/* <span>
          {year}년 {month + 1}월
        </span> */}
      </div>

      <div className="calendar-grid">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="calendar-cell calendar-weekday">
            {d}
          </div>
        ))}

        {weeks.map((week, wi) =>
          week.map((d, di) => {
            const hasTodo = hasTodoOn(d)
            const isHoliday = isHolidayOn(d)
            const holidayName = getHolidayName(d)

            const className =
              "calendar-cell calendar-day" +
              (d && isSameDate(d) ? " selected" : "") +
              (hasTodo ? " has-todo" : isHoliday ? " has-holiday" : "")

            return (
              <button
                key={`${wi}-${di}`}
                className={className}
                onClick={() => handleClick(d)}
                disabled={!d}
                title={holidayName || undefined}
              >
                {/* 날짜 숫자 가운데 */}
                <span className="calendar-day-number">{d ?? ""}</span>

                {/* ✅ 점: Todo가 있으면 빨간 점만, 없고 공휴일만 있으면 파란 점 */}
                {hasTodo ? (
                  <div className="calendar-dot todo-dot" />
                ) : isHoliday ? (
                  <div className="calendar-dot holiday-dot" />
                ) : null}

                {/* 휴일 이름 (아래쪽, 늘 같은 위치) */}
                {holidayName && (
                  <div className="holiday-label">{holidayName}</div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Calendar
