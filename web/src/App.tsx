import { useMemo, useState } from 'react';

import { calendarPosition, getWeek, today, weekCount } from '@shared/index.ts';
import { curriculum } from './lib/data.ts';
import { CurrentWeekBanner } from './components/CurrentWeekBanner.tsx';
import { WeekList } from './components/WeekList.tsx';
import { WeekDetail } from './components/WeekDetail.tsx';

export function App() {
  // Evaluated once per mount. The current week only changes at midnight, and a
  // tech reloads far more often than that.
  const now = useMemo(() => today(), []);

  const currentWeek = useMemo(() => {
    const position = calendarPosition(curriculum, now);
    return position.state === 'in_progress' ? position.week.week : null;
  }, [now]);

  // Open on the current week when the year is running, otherwise on Week 1.
  const [selectedWeek, setSelectedWeek] = useState(() => currentWeek ?? 1);

  const week = getWeek(curriculum, selectedWeek);

  return (
    <div className="app">
      <header className="masthead">
        <h1>{curriculum.title}</h1>
        <p>
          {weekCount(curriculum)} weeks · one lab per week · built for{' '}
          {curriculum.client.name}, {curriculum.client.staff} staff across{' '}
          {curriculum.client.sites} sites
        </p>
      </header>

      <CurrentWeekBanner
        curriculum={curriculum}
        now={now}
        onSelectWeek={setSelectedWeek}
      />

      <div className="columns">
        <WeekList
          curriculum={curriculum}
          selectedWeek={selectedWeek}
          currentWeek={currentWeek}
          onSelectWeek={setSelectedWeek}
        />

        {week ? (
          <WeekDetail
            curriculum={curriculum}
            week={week}
            now={now}
            onSelectWeek={setSelectedWeek}
          />
        ) : (
          <p className="empty">Week {selectedWeek} is not in this curriculum.</p>
        )}
      </div>

      <footer className="footnote">
        Read-only for now. Sign-in, status, hours, notes, dependency warnings and
        artifact verification are still to come — see the roadmap in CLAUDE.md.
      </footer>
    </div>
  );
}
